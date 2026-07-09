/**
 * fix-paths.js
 * Run after `npx expo export -p web` to patch all absolute asset paths
 * in the generated index.html to relative paths.
 *
 * Electron loads the file via file:// protocol, so absolute paths like
 *   src="/_expo/static/js/entry.js"   → must become → src="./_expo/static/js/entry.js"
 *   href="/assets/..."                 → must become → href="./assets/..."
 *
 * Without this, every JS/CSS/asset load silently fails and the app shows a blank screen.
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

let content = fs.readFileSync(indexPath, 'utf8');
const original = content;

// Fix script src attributes: src="/ → src="./
content = content.replace(/(<script[^>]*\ssrc=")\/(?!\/)/g, '$1./');

// Fix link href attributes: href="/ → href="./
content = content.replace(/(<link[^>]*\shref=")\/(?!\/)/g, '$1./');

// Fix meta/image/other src attributes: src="/ → src="./
content = content.replace(/(\ssrc=")\/(?!\/)/g, '$1./');

// Fix any remaining absolute URL references inside JS inline blocks or style tags
// that look like url(/) or url(/assets)
content = content.replace(/(url\(")\/(?!\/)/g, '$1./');

if (content === original) {
  console.log('[fix-paths] No absolute paths found — index.html already uses relative paths.');
} else {
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('[fix-paths] ✅ Patched absolute paths to relative in:', indexPath);
}
