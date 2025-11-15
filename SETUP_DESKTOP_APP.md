# Desktop App Setup Guide

## Prerequisites

- Node.js v18+
- PostgreSQL running
- macOS, Windows, or Linux

## Quick Start

### 1. Install Desktop App Dependencies

```bash
cd desktop-app
npm install
```

### 2. Configure Backend

```bash
cd ../server

# Copy environment template
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL="postgresql://user:password@localhost:5432/cognitive_tracker"

# Install dependencies
npm install

# Set up database
npm run db:push
npm run db:generate
```

### 3. Start Backend

```bash
# In server/ directory
npm run dev
```

Server starts at `http://localhost:3000`

### 4. Start Desktop App

```bash
# In desktop-app/ directory
npm start
```

The app will:
1. ✅ Start tracking keyboard/mouse system-wide
2. ✅ Open dashboard window
3. ✅ Minimize to system tray
4. ✅ Send batches every 10 seconds

## Features

### System Tray Icon

Right-click the tray icon for options:
- **Start/Pause Tracking**
- **Open Dashboard** - View real-time metrics
- **Settings** - Configure API endpoint, batch interval
- **Quit** - Stop tracking and exit

### Dashboard

Open from system tray to see:
- Real-time keyboard/mouse metrics
- 7-day trend charts
- Baseline comparison
- Deviation alerts

### What Gets Tracked

**Keyboard:**
- Typing speed (keys/second)
- Error rate (backspace frequency)
- Rhythm consistency (timing variability)
- Hold times, inter-key intervals

**Mouse:**
- Movement speed
- Precision
- Click patterns
- Total distance traveled

**All from ANY application:**
- Microsoft Word
- Outlook
- Excel
- Chrome/Firefox
- Games
- Everything!

## Configuration

### Change API Endpoint

The app stores config in electron-store:

```javascript
// Default: http://localhost:3000
// Change in Settings or manually:

const Store = require('electron-store');
const store = new Store();

store.set('apiBaseUrl', 'https://your-api.com');
store.set('batchIntervalMs', 10000); // 10 seconds
```

### Change Batch Interval

Default: 10 seconds (10000ms)

Shorter = more frequent updates, more network traffic
Longer = fewer updates, less overhead

Recommended: 10-30 seconds

## Building Distributions

### macOS

```bash
npm run build:mac
```

Creates:
- `dist/Cognitive Tracker.app`
- `dist/Cognitive Tracker.dmg`

### Windows

```bash
npm run build:win
```

Creates:
- `dist/Cognitive Tracker Setup.exe`
- `dist/Cognitive Tracker.exe`

### Linux

```bash
npm run build:linux
```

Creates:
- `dist/Cognitive Tracker.AppImage`

## Permissions

### macOS

The app requires:

1. **Accessibility Permission**
   - System Preferences → Security & Privacy → Accessibility
   - Add "Cognitive Tracker" to allowed apps

2. **Input Monitoring** (macOS 10.15+)
   - System Preferences → Security & Privacy → Input Monitoring
   - Add "Cognitive Tracker"

3. **Camera** (optional, for hand tracking)
   - Grant when prompted

### Windows

- No special permissions needed
- Windows Defender may ask on first run

### Linux

- Requires X11 or Wayland
- May need to run with sudo for system hooks

## Adding MediaPipe Hand Tracking

See [MEDIAPIPE_INTEGRATION.md](./MEDIAPIPE_INTEGRATION.md) for full guide.

Quick setup:

```bash
npm install @mediapipe/hands
npm install @mediapipe/camera_utils
npm install @mediapipe/drawing_utils
```

Then follow the integration guide to add hand tremor detection.

## Troubleshooting

### "App can't be opened" (macOS)

```bash
# Remove quarantine
xattr -cr "Cognitive Tracker.app"
```

### ioHook not working

```bash
# Rebuild native module
cd desktop-app
npm rebuild iohook --runtime=electron --target=28.0.0
```

### No events being captured

Check that accessibility permissions are granted.

### Database connection error

Verify PostgreSQL is running:
```bash
psql $DATABASE_URL
```

## Auto-Start on Boot

### macOS

```bash
# Add to Login Items
System Preferences → Users & Groups → Login Items
Click + and add Cognitive Tracker.app
```

### Windows

```bash
# Add shortcut to Startup folder
Win+R → shell:startup
Copy app shortcut there
```

### Linux

Create `~/.config/autostart/cognitive-tracker.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Cognitive Tracker
Exec=/path/to/cognitive-tracker
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
```

## Testing End-to-End

1. Start backend: `cd server && npm run dev`
2. Start desktop app: `cd desktop-app && npm start`
3. Type in ANY application
4. Move mouse around
5. Wait 10 seconds
6. Check server logs - should see "Metrics sent successfully"
7. Open dashboard from tray icon
8. View real-time metrics updating

## Next Steps

1. Run for 2-4 weeks to establish baseline
2. Compute baselines: `cd server && npm run computeBaselines --all`
3. Set up daily cron jobs:
   - `npm run computeDailySummaries` (1 AM daily)
   - `npm run detectDeviations` (3 AM daily)
4. Monitor alerts via API or build notification system

## Production Deployment

For production:

1. **Deploy backend** to cloud server (Heroku, AWS, DigitalOcean)
2. **Set up managed Postgres** (Heroku Postgres, AWS RDS)
3. **Build signed apps** with code signing certificates
4. **Distribute** to users via download link or app store
5. **Configure auto-update** using electron-updater

## Support

Issues? Check:
- [README.md](../README.md) - Main documentation
- [BROWSER_VS_DESKTOP.md](../BROWSER_VS_DESKTOP.md) - Architecture explanation
- [HOW_DETECTION_WORKS.md](../HOW_DETECTION_WORKS.md) - Detection logic
- GitHub Issues

Happy tracking!
