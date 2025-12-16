# Chrome Extension Template - MV3 + React + TypeScript

A modern Chrome extension template built with Manifest V3, React, TypeScript, and Vite. This template provides a solid foundation for building Chrome extensions with a React-based popup UI, content scripts, and background service workers.

## Features

- ✅ **Manifest V3** - Latest Chrome extension manifest version
- ✅ **React 19** - Modern React with hooks
- ✅ **TypeScript** - Full type safety
- ✅ **Vite** - Fast build tool with HMR
- ✅ **Tailwind CSS** - Utility-first CSS framework
- ✅ **Background Service Worker** - Handles Chrome storage operations
- ✅ **Content Script** - DOM access and manipulation
- ✅ **Popup UI** - React-based extension popup
- ✅ **Chrome Storage API** - Data persistence example
- ✅ **ESLint** - Code linting and formatting

## Project Structure

``` 
├── src/
│   ├── background/          # Background service worker
│   │   └── background.ts    # Handles storage operations
│   ├── content/              # Content scripts
│   │   └── content.ts       # DOM access and manipulation
│   ├── popup/                # Popup UI
│   │   ├── index.html       # Popup HTML entry
│   │   └── popup.tsx        # React popup component
│   ├── App.tsx              # Main app component (if needed)
│   └── index.css            # Global styles
├── public/                   # Static assets
│   └── icons/               # Extension icons
├── dist/                     # Build output (generated)
├── manifest.json            # Chrome extension manifest
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone or use this template:
```bash
git clone <your-repo-url>
cd chrome-extension-template
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the extension:
```bash
pnpm build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development

Run the development server with hot module replacement:

```bash
pnpm dev
```

The extension will be built to the `dist` folder. After making changes, reload the extension in Chrome to see updates.

## Available Scripts

- `pnpm dev` - Start development server with HMR
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

## Architecture

### Background Service Worker

The background service worker (`src/background/background.ts`) handles:
- Chrome storage operations (save, get, clear)
- Message passing between components
- Extension lifecycle events

### Content Script

The content script (`src/content/content.ts`) provides:
- DOM access and manipulation
- Page information extraction
- Element querying capabilities

### Popup UI

The popup (`src/popup/popup.tsx`) is a React component that:
- Displays current page information
- Interacts with content scripts
- Manages Chrome storage
- Provides a user-friendly interface

## Message Passing

The extension uses Chrome's message passing API for communication:

- **Popup → Content Script**: Get DOM information
- **Popup → Background**: Storage operations
- **Content Script → Background**: Data persistence

Example message format:
```typescript
{
  action: 'saveData' | 'getData' | 'getDOM' | 'getElementInfo',
  key?: string,
  value?: any,
  selector?: string
}
```

## Building

The build process:
1. Compiles TypeScript to JavaScript
2. Bundles React components with Vite
3. Copies manifest.json and icons to dist/
4. Generates optimized production build

Output files:
- `dist/background.js` - Background service worker
- `dist/content.js` - Content script
- `dist/popup.html` - Popup entry point
- `dist/assets/*` - Bundled React app and styles

## Customization

### Icons

Replace the icon files in `public/`:
- `icon-16.png` (16x16)
- `icon-48.png` (48x48)
- `icon-128.png` (128x128)

### Manifest

Edit `manifest.json` to customize:
- Extension name and description
- Permissions
- Content script matches
- Host permissions

### Styling

The project uses Tailwind CSS. Customize styles in:
- `src/index.css` - Global styles
- Component files - Inline Tailwind classes

## Permissions

This template uses the following Chrome permissions:
- `storage` - For data persistence
- `activeTab` - For accessing current tab
- `scripting` - For dynamic script injection
- `<all_urls>` - For content script injection (modify as needed)

## TypeScript

The project includes TypeScript types for Chrome APIs via `@types/chrome`. All components are fully typed for better development experience.

## Browser Support

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
