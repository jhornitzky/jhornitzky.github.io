# Timental 🧠

> Your private, daily mental health pulse

A privacy-first Progressive Web App (PWA) for tracking your daily mental health. All data stays in your browser - no servers, no tracking, completely private.

## Features

- 📊 **90-Day Heatmap Dashboard** - Visual overview of your mental health journey
- ✅ **Daily Check-ins** - Simple 1-10 score + 11 health criteria checklist
- 📈 **Insights & Trends** - Charts showing your progress over the last 30 days
- 💾 **Data Export/Import** - Full control over your data with JSON backup
- 🔔 **Daily Reminders** - Optional notifications to help build the habit
- 📱 **Mobile-First PWA** - Works offline, installable as an app
- 🔒 **100% Private** - All data stored locally in IndexedDB

## The 11 Mental Health Criteria

1. Enjoyed work, or not work?
2. Feel financially ok?
3. Did something with a community?
4. Exercised?
5. Ate healthy food?
6. Slept well?
7. Fun with family or friends?
8. I was treated with respect
9. I smiled and laughed a lot
10. I felt well-rested
11. I learned something new

## Tech Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS (mobile-first)
- **Storage**: Dexie.js (IndexedDB wrapper)
- **PWA**: vite-plugin-pwa with Workbox
- **Charts**: Recharts
- **Icons**: Lucide React
- **Router**: React Router v7

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## PWA Setup

### Icons

Replace the placeholder icons in `/public` with your own:
- `pwa-192x192.png` (192x192px)
- `pwa-512x512.png` (512x512px)
- `apple-touch-icon.png` (180x180px)
- `favicon.ico`

You can use tools like [PWA Asset Generator](https://www.npmjs.com/package/pwa-asset-generator) to generate all required icons.

### Install as App

On mobile browsers (Chrome/Safari), you'll see an "Add to Home Screen" prompt. On desktop Chrome, look for the install icon in the address bar.

## Data Management

### Export Your Data

Navigate to the Reports screen and click "Download Backup (.json)". This exports all your entries and settings.

### Import Data

Use "Restore from File" to import a previously exported JSON file.

### Clear All Data

If needed, you can clear all data from the Reports screen (this action cannot be undone).

## Privacy

- All data is stored locally in your browser's IndexedDB
- No data is ever sent to any server
- No analytics, no tracking, no cookies
- You own your data completely
- Export/import to back up or transfer between devices

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+

## Notifications

To enable daily reminders:

1. Click the settings gear icon on the Dashboard
2. Toggle "Enable reminders"
3. Choose your preferred reminder time
4. Allow notifications when prompted by your browser

**Note**: Notification behavior varies by browser and OS. On mobile, keep the PWA installed for best results.

## License

ISC

## Contributing

This is a personal mental health tracking tool. Feel free to fork and customize for your own needs.

---

Built with ❤️ for better mental health awareness
