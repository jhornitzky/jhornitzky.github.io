# Feed Dashboard Start Page (Chrome Extension)

A Manifest V3 extension that replaces the Chrome new tab page with an interactive feed dashboard.

## Features

- Add and remove multiple feed links.
- Opens each unchecked feed in a **400px-wide iframe** on the same start page.
- "✓ Done today" closes that iframe and marks the link complete for the current day.
- Daily completion state resets automatically each new day.
- Graceful handling for sites that block iframes via `X-Frame-Options` or CSP (`frame-ancestors`):
  - Shows a notice
  - Offers one-click "Open in new tab"

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `feed-dashboard-extension`.

Open a new tab to use the dashboard.

## Security notes

- Only `http` and `https` URLs are accepted.
- Iframes use a restrictive sandbox policy and `referrerpolicy="no-referrer"`.
- Browser security headers cannot be bypassed by regular extensions; blocked sites are handled with fallback UI.
