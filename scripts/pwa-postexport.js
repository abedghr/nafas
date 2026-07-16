// Post-process the Expo web export (dist/) into an installable PWA:
// inject iOS "Add to Home Screen" meta + a web manifest + icon. Expo's `single`
// web output does not emit these, and iOS relies on the apple-* tags (not the
// manifest) for standalone home-screen behavior.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(dist, 'index.html');
if (!fs.existsSync(indexPath)) { console.error('dist/index.html not found — run `expo export -p web` first'); process.exit(1); }

// icon → dist/icon.png (used by apple-touch-icon + manifest)
const iconSrc = path.resolve(process.cwd(), 'assets/images/icon.png');
if (fs.existsSync(iconSrc)) fs.copyFileSync(iconSrc, path.join(dist, 'icon.png'));

const manifest = {
  name: 'Nafas', short_name: 'Nafas', start_url: '/', scope: '/',
  display: 'standalone', orientation: 'portrait',
  background_color: '#0A0A0F', theme_color: '#0A0A0F',
  icons: [
    { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// theme-color = the app's dark background so the iOS status-bar / safe-area zone
// matches the app (green here paints the notch area white/odd). The <style> forces
// a dark page background so no white shows behind the status bar or on overscroll.
const head = `
    <meta name="theme-color" content="#0A0A0F" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Nafas" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <style>
      html, body, #root { background-color: #0A0A0F; }
      html, body { margin: 0; min-height: 100%; }
      #root { min-height: 100vh; }
    </style>`;

let html = fs.readFileSync(indexPath, 'utf-8');
if (!html.includes('apple-mobile-web-app-capable')) {
  html = html.replace('</head>', `${head}\n  </head>`);
  fs.writeFileSync(indexPath, html);
}
console.log('✓ PWA: manifest + apple meta injected, icon copied');
