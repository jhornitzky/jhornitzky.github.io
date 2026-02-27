PWA Icon Requirements
=====================

This app needs the following icon files to function as a complete PWA:

Required Icons:
- pwa-192x192.png (192x192 pixels)
- pwa-512x512.png (512x512 pixels)
- apple-touch-icon.png (180x180 pixels)
- favicon.ico

Currently, placeholder references exist in the manifest. To complete the PWA setup:

1. Create your icon designs (recommend a brain or mental health symbol)
2. Use a tool like https://realfavicongenerator.net/ to generate all sizes
3. Replace the placeholder files in this /public directory

Alternatively, you can use the pwa-asset-generator CLI:
npm install -g pwa-asset-generator
pwa-asset-generator [source-image] ./public --icon-only

The app will work without these but won't have proper icons when installed.
