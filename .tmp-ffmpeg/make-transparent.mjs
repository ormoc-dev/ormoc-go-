import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const framesDir = path.resolve('frames');
const outWebp = path.resolve('../public/assets/icons/welcome-chibi.webp');
const previewPng = path.resolve('../public/assets/icons/welcome-chibi-keyed.png');

const files = fs.readdirSync(framesDir)
  .filter((f) => f.endsWith('.png'))
  .sort();

function isBg(r, g, b) {
  // Near-black backdrop only (keeps dark brown hair)
  return r <= 28 && g <= 28 && b <= 28;
}

function keyFrame(rgba, width, height) {
  const data = Buffer.from(rgba);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qh = 0;
  let qt = 0;

  const push = (x, y) => {
    const i = y * width + x;
    if (visited[i]) return;
    const o = i * 4;
    if (!isBg(data[o], data[o + 1], data[o + 2])) return;
    visited[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const y = (i / width) | 0;
    const o = i * 4;
    data[o + 3] = 0;
    if (x > 0) push(x - 1, y);
    if (x + 1 < width) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y + 1 < height) push(x, y + 1);
  }

  // Soft fringe around keyed pixels
  const soft = Buffer.from(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (data[o + 3] === 0) continue;
      let near = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const n = ((y + dy) * width + (x + dx)) * 4;
          if (data[n + 3] === 0) near++;
        }
      }
      if (near > 0 && isBg(data[o] + 40, data[o + 1] + 40, data[o + 2] + 40)) {
        soft[o + 3] = Math.max(0, 255 - near * 40);
      }
    }
  }
  return soft;
}

const keyed = [];
for (const file of files) {
  const input = path.join(framesDir, file);
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = keyFrame(data, info.width, info.height);
  const png = await sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  keyed.push(png);
  process.stdout.write(`keyed ${file}\n`);
}

await sharp(keyed[0]).png().toFile(previewPng);

// Animated WebP via sharp join — use first as base, rest as pages
let pipeline = sharp(keyed[0], { animated: false });
const { width, height } = await sharp(keyed[0]).metadata();

// sharp animated webp: create from frames using joinChannel isn't right.
// Use gif-style: sharp supports animated input; for output use force animation via
// constructing with pages. Better approach: write temp pngs and use ffmpeg webp.

const keyedDir = path.resolve('keyed');
fs.mkdirSync(keyedDir, { recursive: true });
for (let i = 0; i < keyed.length; i++) {
  const name = `k_${String(i + 1).padStart(3, '0')}.png`;
  fs.writeFileSync(path.join(keyedDir, name), keyed[i]);
}

console.log(`wrote ${keyed.length} keyed frames, preview=${previewPng}`);
console.log(`size=${width}x${height}`);
