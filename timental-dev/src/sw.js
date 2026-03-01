import { precacheAndRoute } from 'workbox-precaching';

// Precache and route all assets (manifest is injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);
