/**
 * fix-paths.js
 * Run after `npx expo export -p web` to:
 *   1. Patch all absolute asset paths in index.html to relative paths.
 *   2. Copy desktop.css into the web build directory.
 *   3. Inject the desktop.css <link> into index.html <head>.
 *
 * Electron loads the file via app:// protocol, so absolute paths like
 *   src="/_expo/static/js/entry.js"   → must become → src="./_expo/static/js/entry.js"
 *   href="/assets/..."                 → must become → href="./assets/..."
 *
 * Without this, every JS/CSS/asset load silently fails and the app shows
 * a blank screen.
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, 'web');
const indexPath = path.join(webDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[fix-paths] ERROR: index.html not found at', indexPath);
  console.error('[fix-paths] Make sure expo export ran before this script.');
  process.exit(1);
}

// ── 1. Patch absolute paths to relative ──────────────────────────────────────

let content = fs.readFileSync(indexPath, 'utf8');
const original = content;

// Fix script src attributes: src="/ → src="./
content = content.replace(/(<script[^>]*\ssrc=")\/(?!\/)/g, '$1./');

// Fix link href attributes: href="/ → href="./
content = content.replace(/(<link[^>]*\shref=")\/(?!\/)/g, '$1./');

// Fix meta/image/other src attributes: src="/ → src="./
content = content.replace(/(\ssrc=")\/(?!\/)/g, '$1./');

// Fix CSS url() references: url("/ → url("./
content = content.replace(/(url\(")\/(?!\/)/g, '$1./');

if (content === original) {
  console.log('[fix-paths] No absolute paths found — already using relative paths.');
} else {
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('[fix-paths] ✅ Patched absolute paths to relative in:', indexPath);
}

// ── 2. Copy desktop.css into the web build ───────────────────────────────────

const cssSource = path.join(__dirname, 'desktop.css');
const cssDest = path.join(webDir, 'desktop.css');
let cssInjected = false;

if (fs.existsSync(cssSource)) {
  fs.copyFileSync(cssSource, cssDest);
  console.log('[fix-paths] ✅ Copied desktop.css to web/');

  // ── 3. Inject <link> for desktop.css into index.html ────────────────────────

  // Re-read because the file may have been modified by step 1
  content = fs.readFileSync(indexPath, 'utf8');

  // Avoid duplicate injection if this script runs multiple times
  if (content.includes('desktop.css')) {
    console.log('[fix-paths] desktop.css <link> already present — skipping injection.');
  } else {
    // Inject before </head>
    const linkTag =
      '  <link rel="stylesheet" href="./desktop.css" />\n</head>';
    content = content.replace('</head>', linkTag);
    fs.writeFileSync(indexPath, content, 'utf8');
    cssInjected = true;
    console.log('[fix-paths] ✅ Injected desktop.css <link> into index.html');
  }
} else {
  console.warn('[fix-paths] ⚠️ desktop.css not found at', cssSource, '— skipping CSS injection');
}

if (!cssInjected) {
  console.log('[fix-paths] ✅ Done (no CSS changes needed).');
} else {
  console.log('[fix-paths] ✅ All done.');
}
