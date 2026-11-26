const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = path.join(dir, 'logo.png');

(async () => {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const navy = Buffer.alloc(W * H * 4, 0);
  const ring = Buffer.alloc(W * H * 4, 0);
  const gpart = Buffer.alloc(W * H * 4, 0);
  const cx = 343;
  const cy = 489;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 200 || (r > 245 && g > 245 && b > 245)) continue;
      const dx = x - cx;
      const dy = y - cy;
      const rad = Math.sqrt(dx * dx + dy * dy);
      const isN = r < 40 && g < 90 && b > 80 && g < 100;
      const isB = r < 40 && g > 90 && b > 180;
      if (isN) {
        navy[i] = r; navy[i + 1] = g; navy[i + 2] = b; navy[i + 3] = 255;
      } else if (isB && rad < 110) {
        ring[i] = r; ring[i + 1] = g; ring[i + 2] = b; ring[i + 3] = 255;
      } else if (isB) {
        gpart[i] = r; gpart[i + 1] = g; gpart[i + 2] = b; gpart[i + 3] = 255;
      }
    }
  }

  async function writePng(buf, name) {
    const out = path.join(dir, name);
    await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
    return out;
  }

  async function toB64(buf) {
    const png = await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
    return png.toString('base64');
  }

  await Promise.all([
    writePng(navy, 'icon-og-layer-navy.png'),
    writePng(ring, 'icon-og-layer-ring.png'),
    writePng(gpart, 'icon-og-layer-g.png'),
  ]);

  const [nB64, rB64, gB64] = await Promise.all([toB64(navy), toB64(ring), toB64(gpart)]);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="192" height="192" viewBox="140 200 760 580" role="img" aria-label="OrmocGo">
  <title>OrmocGo</title>
  <desc>Animated OrmocGo mark — same og design with motion</desc>
  <defs>
    <style>
      <![CDATA[
        .radar {
          transform-origin: 343px 489px;
          animation: radar 2.4s ease-out infinite;
        }
        .navy {
          transform-origin: 343px 489px;
          animation: navy-in 0.9s cubic-bezier(.2,.8,.2,1) both, navy-idle 3.2s ease-in-out 0.9s infinite;
        }
        .inner {
          transform-origin: 343px 489px;
          animation: inner-in 0.7s cubic-bezier(.2,.8,.2,1) 0.15s both, inner-idle 2.4s ease-in-out 0.85s infinite;
        }
        .gee {
          transform-origin: 690px 545px;
          animation: g-in 0.85s cubic-bezier(.2,.8,.2,1) 0.28s both, g-idle 3.2s ease-in-out 1.1s infinite;
        }
        @keyframes radar {
          0%   { transform: scale(0.45); opacity: 0.5; }
          70%  { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes navy-in {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes navy-idle {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes inner-in {
          from { transform: scale(0.2); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes inner-idle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(0.86); opacity: 0.9; }
        }
        @keyframes g-in {
          from { transform: translateX(36px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes g-idle {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar, .navy, .inner, .gee { animation: none !important; opacity: 1; transform: none; }
        }
      ]]>
    </style>
  </defs>

  <!-- Location-style radar pulse from the O -->
  <circle class="radar" cx="343" cy="489" r="230" fill="none" stroke="#0079FC" stroke-width="18"/>

  <!-- Pixel-perfect layers split from logo.png -->
  <image class="navy" width="1024" height="1024" href="data:image/png;base64,${nB64}"/>
  <image class="inner" width="1024" height="1024" href="data:image/png;base64,${rB64}"/>
  <image class="gee" width="1024" height="1024" href="data:image/png;base64,${gB64}"/>
</svg>`;

  // Lightweight version that references external layer PNGs (better for caching / editing)
  const svgLinked = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="192" height="192" viewBox="140 200 760 580" role="img" aria-label="OrmocGo">
  <title>OrmocGo</title>
  <desc>Animated OrmocGo mark — same og design with motion</desc>
  <defs>
    <style>
      <![CDATA[
        .radar {
          transform-origin: 343px 489px;
          animation: radar 2.4s ease-out infinite;
        }
        .navy {
          transform-origin: 343px 489px;
          animation: navy-in 0.9s cubic-bezier(.2,.8,.2,1) both, navy-idle 3.2s ease-in-out 0.9s infinite;
        }
        .inner {
          transform-origin: 343px 489px;
          animation: inner-in 0.7s cubic-bezier(.2,.8,.2,1) 0.15s both, inner-idle 2.4s ease-in-out 0.85s infinite;
        }
        .gee {
          transform-origin: 690px 545px;
          animation: g-in 0.85s cubic-bezier(.2,.8,.2,1) 0.28s both, g-idle 3.2s ease-in-out 1.1s infinite;
        }
        @keyframes radar {
          0%   { transform: scale(0.45); opacity: 0.5; }
          70%  { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes navy-in {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes navy-idle {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes inner-in {
          from { transform: scale(0.2); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes inner-idle {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(0.86); opacity: 0.9; }
        }
        @keyframes g-in {
          from { transform: translateX(36px); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes g-idle {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar, .navy, .inner, .gee { animation: none !important; opacity: 1; transform: none; }
        }
      ]]>
    </style>
  </defs>
  <circle class="radar" cx="343" cy="489" r="230" fill="none" stroke="#0079FC" stroke-width="18"/>
  <image class="navy" width="1024" height="1024" href="icon-og-layer-navy.png"/>
  <image class="inner" width="1024" height="1024" href="icon-og-layer-ring.png"/>
  <image class="gee" width="1024" height="1024" href="icon-og-layer-g.png"/>
</svg>`;

  fs.writeFileSync(path.join(dir, 'icon-og-animated.svg'), svg);
  fs.writeFileSync(path.join(dir, 'icon-og-animated-linked.svg'), svgLinked);

  // Cleanup old debug / unused vector attempt
  for (const f of ['_paths_debug.json', '_g_paths.json', '_layer_navy.png', '_layer_ring.png', '_layer_g.png', 'icon-og-animated-vector.svg']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  console.log('Done');
  console.log(' - icon-og-animated.svg (self-contained)');
  console.log(' - icon-og-animated-linked.svg + layer PNGs');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
