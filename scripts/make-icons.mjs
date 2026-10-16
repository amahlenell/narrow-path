// Generates the PWA icons from a simple SVG. Needs `sharp` (npm i -D sharp).
//   node scripts/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#344B3F"/>
  <g transform="translate(256 256) scale(${1 - pad}) translate(-256 -256)">
    <path d="M0 400 Q 130 300 256 360 T 512 330 V512 H0Z" fill="#879B83"/>
    <path d="M256 512 C 200 440, 330 400, 256 330 S 230 260, 256 220" fill="none" stroke="#F1EADD" stroke-width="34" stroke-linecap="round"/>
    <rect x="245" y="90" width="22" height="140" rx="6" fill="#D8B56B"/>
    <rect x="205" y="130" width="102" height="22" rx="6" fill="#D8B56B"/>
  </g>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const out = async (name, size, pad) =>
  sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);

await out('icon-192.png', 192, 0);
await out('icon-512.png', 512, 0);
await out('icon-maskable-512.png', 512, 0.2); // extra safe-zone padding
await out('apple-touch-icon.png', 180, 0);
console.log('icons written');
