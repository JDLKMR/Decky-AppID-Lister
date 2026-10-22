import decky


class Plugin:
    # The list is built entirely in the frontend from Steam's own stores,
    # so the backend has nothing to do.
    async def _main(self):
        decky.logger.info("AppID Lister loaded")

    async def _unload(self):
        decky.logger.info("AppID Lister unloading")
