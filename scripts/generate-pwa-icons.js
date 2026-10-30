import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard App Icon SVG (for any purpose, 512x512 canvas, 10% outer margin)
const standardIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#242424"/>
      <stop offset="100%" stop-color="#141414"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6F00"/>
      <stop offset="100%" stop-color="#E65100"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F9D423"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Background with smooth rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Outer Gold & Orange Ring Accent -->
  <circle cx="256" cy="240" r="172" fill="none" stroke="url(#accentGrad)" stroke-width="8" opacity="0.9" filter="url(#shadow)"/>
  <circle cx="256" cy="240" r="160" fill="#1C1C1C" stroke="url(#goldGrad)" stroke-width="3" opacity="0.8"/>

  <!-- Tony's Kitchen Culinary Emblem: Fork & Spoon crossed with Flame -->
  <g filter="url(#shadow)">
    <!-- Central warm flame/glow -->
    <path d="M256 128 C272 168 288 184 288 208 C288 226 274 240 256 240 C238 240 224 226 224 208 C224 188 240 168 256 128 Z" fill="url(#accentGrad)"/>
    <path d="M256 156 C264 180 272 192 272 208 C272 217 265 224 256 224 C247 224 240 217 240 208 C240 196 248 180 256 156 Z" fill="url(#goldGrad)"/>

    <!-- Fork (left tilted) -->
    <g transform="translate(256, 240) rotate(-35) translate(-256, -240)">
      <!-- Fork head -->
      <path d="M246 168 L246 200 C246 208 250 214 256 216 L256 288 C256 292 253 296 249 296 L249 304 C257 304 263 298 263 290 L263 216 C269 214 273 208 273 200 L273 168 C273 166 270 166 270 168 L270 196 C270 198 268 200 266 200 C264 200 262 198 262 196 L262 168 C262 166 259 166 259 168 L259 196 C259 198 257 200 255 200 C253 200 251 198 251 196 L251 168 C251 166 246 166 246 168 Z" fill="#FFFFFF"/>
    </g>

    <!-- Spoon (right tilted) -->
    <g transform="translate(256, 240) rotate(35) translate(-256, -240)">
      <path d="M256 164 C244 164 238 178 238 196 C238 210 248 218 253 220 L253 288 C253 292 250 296 246 296 L246 304 C254 304 260 298 260 290 L260 220 C265 218 274 210 274 196 C274 178 268 164 256 164 Z" fill="#FFFFFF"/>
    </g>

    <!-- TK Monogram Banner in Center -->
    <rect x="180" y="244" width="152" height="48" rx="24" fill="#1A1A1A" stroke="url(#goldGrad)" stroke-width="2.5"/>
    <text x="256" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="30" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">TK</text>
  </g>

  <!-- Brand Typography below -->
  <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">TONY'S KITCHEN</text>
  <text x="256" y="446" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="600" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="4">BANGKOK</text>
</svg>
`;

// 2. Maskable Icon SVG (with safe 20% margin all around for Android adaptive squircle/circle clipping)
const maskableIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#242424"/>
      <stop offset="100%" stop-color="#141414"/>
    </linearGradient>
    <linearGradient id="accentGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6F00"/>
      <stop offset="100%" stop-color="#E65100"/>
    </linearGradient>
    <linearGradient id="goldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F9D423"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
  </defs>

  <!-- Full bleed background (no border-radius) -->
  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <!-- Scaled inside 80% safe zone (center at 256, 256) -->
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <circle cx="256" cy="240" r="172" fill="none" stroke="url(#accentGradM)" stroke-width="10" opacity="0.9"/>
    <circle cx="256" cy="240" r="160" fill="#1C1C1C" stroke="url(#goldGradM)" stroke-width="4" opacity="0.8"/>

    <!-- Central warm flame -->
    <path d="M256 128 C272 168 288 184 288 208 C288 226 274 240 256 240 C238 240 224 226 224 208 C224 188 240 168 256 128 Z" fill="url(#accentGradM)"/>
    <path d="M256 156 C264 180 272 192 272 208 C272 217 265 224 256 224 C247 224 240 217 240 208 C240 196 248 180 256 156 Z" fill="url(#goldGradM)"/>

    <!-- Fork (left tilted) -->
    <g transform="translate(256, 240) rotate(-35) translate(-256, -240)">
      <path d="M246 168 L246 200 C246 208 250 214 256 216 L256 288 C256 292 253 296 249 296 L249 304 C257 304 263 298 263 290 L263 216 C269 214 273 208 273 200 L273 168 C273 166 270 166 270 168 L270 196 C270 198 268 200 266 200 C264 200 262 198 262 196 L262 168 C262 166 259 166 259 168 L259 196 C259 198 257 200 255 200 C253 200 251 198 251 196 L251 168 C251 166 246 166 246 168 Z" fill="#FFFFFF"/>
    </g>

    <!-- Spoon (right tilted) -->
    <g transform="translate(256, 240) rotate(35) translate(-256, -240)">
      <path d="M256 164 C244 164 238 178 238 196 C238 210 248 218 253 220 L253 288 C253 292 250 296 246 296 L246 304 C254 304 260 298 260 290 L260 220 C265 218 274 210 274 196 C274 178 268 164 256 164 Z" fill="#FFFFFF"/>
    </g>

    <!-- TK Monogram Banner -->
    <rect x="180" y="244" width="152" height="48" rx="24" fill="#1A1A1A" stroke="url(#goldGradM)" stroke-width="3"/>
    <text x="256" y="278" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="30" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="3">TK</text>

    <!-- Brand Typography below -->
    <text x="256" y="420" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="30" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">TONY'S KITCHEN</text>
    <text x="256" y="446" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="15" font-weight="600" fill="url(#goldGradM)" text-anchor="middle" letter-spacing="4">BANGKOK</text>
  </g>
</svg>
`;

async function generateIcons() {
  console.log('Rendering PWA icons...');
  
  // Save icon.svg in public
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardIconSvg.trim());

  // 1. pwa-512x512.png
  await sharp(Buffer.from(standardIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 2. pwa-192x192.png
  await sharp(Buffer.from(standardIconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 3. apple-touch-icon.png (180x180 for iOS Safari)
  await sharp(Buffer.from(standardIconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 4. pwa-maskable-512x512.png (512x512 full bleed with safe zone)
  await sharp(Buffer.from(maskableIconSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('Created pwa-maskable-512x512.png');

  // 5. favicon-32x32.png
  await sharp(Buffer.from(standardIconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('Created favicon-32x32.png');

  console.log('All PWA icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
