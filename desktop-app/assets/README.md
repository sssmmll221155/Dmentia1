# Desktop App Assets

## Required Icons

Place the following icon files in this directory:

### 1. App Icon
- **File:** `icon.png`
- **Size:** 512x512 or 1024x1024
- **Format:** PNG with transparency
- **Purpose:** Application icon shown in dock/taskbar

### 2. Tray Icon
- **File:** `tray-icon.png`
- **Sizes needed:**
  - **macOS:** 16x16, 32x32 (Template images preferred)
  - **Windows:** 16x16, 32x32
  - **Linux:** 16x16, 22x22, 24x24, 32x32
- **Format:** PNG with transparency
- **Purpose:** System tray icon

### Creating Icons

You can create simple placeholder icons or use professional tools:

#### Quick Placeholder (macOS/Linux)
```bash
# Create 512x512 purple circle
convert -size 512x512 xc:transparent -fill '#667eea' -draw 'circle 256,256 256,50' icon.png

# Create 32x32 tray icon
convert -size 32x32 xc:transparent -fill '#667eea' -draw 'circle 16,16 16,4' tray-icon.png
```

#### Professional Tools
- **Figma** - Design custom icons
- **Sketch** - macOS icon design
- **Inkscape** - Free vector graphics
- **Icon generators**:
  - https://www.appicon.co/
  - https://easyappicon.com/

### Icon Design Tips

**App Icon:**
- Use brain imagery (brain outline, neurons)
- Purple/blue gradient (#667eea to #764ba2)
- Simple, recognizable at small sizes
- Represents "cognitive" theme

**Tray Icon:**
- Very simple (16x16 is tiny!)
- Monochrome or minimal color
- Template style for macOS (single color + transparency)
- Clear shape even at small size

### Temporary Placeholder

If you don't have icons yet, the app will work but show default Electron icon.

To add later:
1. Create/download icons
2. Place in this directory
3. Rebuild app: `npm run build`

### Icon Formats by Platform

**macOS:**
- .icns file (can convert from PNG)
- Template icon for tray (monochrome PNG)

**Windows:**
- .ico file (can convert from PNG)
- Color icon for tray

**Linux:**
- PNG files (multiple sizes)

### Converting Icons

```bash
# PNG to .icns (macOS)
png2icns icon.icns icon.png

# PNG to .ico (Windows)
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### Electron-Builder Integration

Icons are automatically handled by electron-builder if placed correctly:

```
desktop-app/
├── assets/
│   ├── icon.png        → App icon (all platforms)
│   ├── icon.icns       → macOS (optional, auto-generated)
│   ├── icon.ico        → Windows (optional, auto-generated)
│   └── tray-icon.png   → System tray
```

The build process will generate platform-specific formats automatically.
