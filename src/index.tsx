import { definePlugin, toaster } from "@decky/api";
import { ButtonItem, Field, PanelSection, PanelSectionRow, staticClasses } from "@decky/ui";
import { useCallback, useEffect, useState } from "react";
import { FaChevronDown, FaChevronRight, FaHashtag } from "react-icons/fa";

// EAppType values: 1 = Game, 1073741824 = non-Steam shortcut.
// Tools (Proton, Steam Linux Runtime, etc.) are left out.
const GAME_APP_TYPE = 1;
const SHORTCUT_APP_TYPE = 1073741824;

interface GameEntry {
  appid: number;
  name: string;
  isShortcut: boolean;
}

function toArray(x: any): any[] {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x.values === "function") return Array.from(x.values());
  return Object.values(x);
}

function isShortcut(app: any): boolean {
  if (app?.app_type === SHORTCUT_APP_TYPE) return true;
  try {
    return typeof app?.BIsModOrShortcut === "function" && !!app.BIsModOrShortcut();
  } catch {
    return false;
  }
}

function loadInstalledGames(): GameEntry[] {
  const w = window as any;
  const found = new Map<number, GameEntry>();

  const add = (app: any) => {
    if (!app || typeof app.appid !== "number" || found.has(app.appid)) return;
    found.set(app.appid, {
      appid: app.appid,
      name: app.display_name ?? `App ${app.appid}`,
      isShortcut: isShortcut(app),
    });
  };

  // Installed Steam games (and any shortcuts this collection happens to hold).
  for (const app of toArray(w.collectionStore?.localGamesCollection?.allApps)) {
    if (app.app_type === GAME_APP_TYPE || isShortcut(app)) add(app);
  }

  // Non-Steam shortcuts: not guaranteed to be in localGamesCollection, so also
  // pull them from the all-games collection and the app store directly.
  for (const app of toArray(w.collectionStore?.allGamesCollection?.allApps)) {
    if (isShortcut(app)) add(app);
  }
  for (const app of toArray(w.appStore?.allApps)) {
    if (isShortcut(app)) add(app);
  }

  return Array.from(found.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

async function copyAppId(game: GameEntry) {
  const ok = await copyText(String(game.appid));
  toaster.toast({
    title: ok ? "Copied App ID" : "Copy failed",
    body: `${game.name}: ${game.appid}`,
  });
}

function GameGroup({ title, games }: { title: string; games: GameEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <PanelSection>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => setOpen((o) => !o)}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {open ? <FaChevronDown /> : <FaChevronRight />}
            {title} ({games.length})
          </span>
        </ButtonItem>
      </PanelSectionRow>
      {open && games.length === 0 && (
        <PanelSectionRow>
          <Field label="None found" bottomSeparator="none" />
        </PanelSectionRow>
      )}
      {open &&
        games.map((game) => (
          <PanelSectionRow key={game.appid}>
            <Field
              label={game.name}
              focusable
              highlightOnFocus
              bottomSeparator="none"
              onClick={() => copyAppId(game)}
            >
              {game.appid}
            </Field>
          </PanelSectionRow>
        ))}
    </PanelSection>
  );
}

function Content() {
  const [games, setGames] = useState<GameEntry[]>([]);

  const refresh = useCallback(() => setGames(loadInstalledGames()), []);
  useEffect(refresh, [refresh]);

  return (
    <>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            Refresh
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
      <GameGroup title="Steam Games" games={games.filter((g) => !g.isShortcut)} />
      <GameGroup title="Non-Steam Games" games={games.filter((g) => g.isShortcut)} />
    </>
  );
}

export default definePlugin(() => ({
  name: "AppID Lister",
  titleView: <div className={staticClasses.Title}>AppID Lister</div>,
  content: <Content />,
  icon: <FaHashtag />,
  onDismount() {},
}));
