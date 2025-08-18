// Object detection with DETR (Transformers.js)
// Default image: `public/vision-img.png`
// Usage: node tests/test-vision-detr.js <image_path_or_url> [threshold]

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function getDefaultImagePath() {
  return '/Users/ben/Documents/agi-engine/public/vision-img.png';
}

function isLikelyUrl(s) {
  return typeof s === 'string' && /^(https?:)?\/\//i.test(s);
}

function readPngDimensionsSync(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    return { width, height };
  } catch {
    return { width: null, height: null };
  }
}

function normalizeBox(box) {
  if (box == null || typeof box !== 'object') return box;
  if ('xmin' in box && 'ymin' in box && 'xmax' in box && 'ymax' in box) {
    const { xmin, ymin, xmax, ymax } = box;
    return {
      x: xmin,
      y: ymin,
      width: xmax - xmin,
      height: ymax - ymin,
      xmin,
      ymin,
      xmax,
      ymax,
    };
  }
  if ('x' in box && 'y' in box && 'width' in box && 'height' in box) {
    return { ...box };
  }
  return box;
}

(async function ensureDirExists(filePath) {
  try {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
  } catch {}
});

function buildAnnotatedPath(imageInput, suffix = 'detr') {
  try {
    const dir = path.dirname(imageInput);
    const base = path.basename(imageInput);
    const extIdx = base.lastIndexOf('.');
    const name = extIdx > 0 ? base.slice(0, extIdx) : base;
    return path.join(dir, `${name}-annotated-${suffix}.png`);
  } catch {
    return `${imageInput}-annotated-${suffix}.png`;
  }
}

async function drawRedDot(imagePath, cx, cy, radius = 30, outPath) {
  const img = sharp(imagePath);
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const clampedX = Math.max(0, Math.min(width - 1, Math.round(cx)));
  const clampedY = Math.max(0, Math.min(height - 1, Math.round(cy)));
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${clampedX}" cy="${clampedY}" r="${radius}" fill="red" fill-opacity="0.7" />
    </svg>`
  );
  const output = outPath || buildAnnotatedPath(imagePath, 'detr');
  await img.composite([{ input: svg, top: 0, left: 0 }]).png().toFile(output);
  return { output, x: clampedX, y: clampedY, radius };
}

(async function noop() {})();

function scoreCandidateLogo(m, imageWidth, imageHeight) {
  if (!m?.box || !imageWidth || !imageHeight) return m.score || 0;
  const cx = m.box.x + m.box.width / 2;
  const cy = m.box.y + m.box.height / 2;
  const centerX = cx / imageWidth;
  const centerY = cy / imageHeight;
  const ar = m.box.width / Math.max(1, m.box.height);
  const area = m.box.width * m.box.height;
  const areaNorm = area / (imageWidth * imageHeight);
  const wantX = 0.85;
  const wantY = 0.12;
  const dist = Math.hypot(centerX - wantX, centerY - wantY);
  const regionBonus = (centerX > 0.6 && centerY < 0.35) ? 0.2 : (centerX > 0.55 && centerY < 0.45 ? 0.1 : 0);
  const labelBonus = m.label === 'Qonto' ? 0.15 : (m.label === 'Qonto logo' ? 0.1 : 0.02);
  const aspectBonus = (ar >= 2 && ar <= 10) ? 0.08 : (ar > 10 ? -0.05 : -0.03);
  const areaPenalty = Math.max(0, (areaNorm - 0.002)) * 2.0;
  const distPenalty = dist * 0.5;
  return (m.score || 0) + regionBonus + labelBonus + aspectBonus - areaPenalty - distPenalty;
}

function pickBestLogo(cands, imageWidth, imageHeight) {
  const filtered = cands.filter(m => m.box && m.box.width >= 18 && m.box.height >= 10);
  filtered.sort((a, b) => scoreCandidateLogo(b, imageWidth, imageHeight) - scoreCandidateLogo(a, imageWidth, imageHeight));
  return filtered[0] || null;
}

(async () => {
  const { pipeline } = await import('@xenova/transformers');

  const [, , inputArg, threshArg] = process.argv;
  const imageInput = inputArg || getDefaultImagePath();
  const threshold = Math.max(0, Math.min(1, Number.isFinite(Number(threshArg)) ? Number(threshArg) : 0.1));

  let imageWidth = null;
  let imageHeight = null;
  if (!isLikelyUrl(imageInput) && fs.existsSync(imageInput)) {
    const dims = readPngDimensionsSync(imageInput);
    imageWidth = dims.width;
    imageHeight = dims.height;
  }

  const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
  const results = await detector(imageInput, { threshold });

  const detections = (Array.isArray(results) ? results : [])
    .filter(r => typeof r?.score === 'number')
    .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }))
    .sort((a, b) => b.score - a.score);

  const top = detections[0] || null;

  // Try phrase-grounded detection for logos via OWLv2 first
  let annotated = null;
  if (!isLikelyUrl(imageInput) && fs.existsSync(imageInput)) {
    try {
      const logoLabels = ['Qonto logo', 'Qonto', 'logo'];
      const owlv2 = await pipeline('zero-shot-object-detection', 'Xenova/owlv2-base-patch16');
      const out = await owlv2(imageInput, logoLabels, { threshold: 0.06 });
      const logos = (Array.isArray(out) ? out : [])
        .filter(r => typeof r?.score === 'number')
        .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }));
      const topLogo = pickBestLogo(logos, imageWidth, imageHeight);
      if (topLogo?.box) {
        const cx = (topLogo.box.x || 0) + (topLogo.box.width || 0) / 2;
        const cy = (topLogo.box.y || 0) + (topLogo.box.height || 0) / 2;
        annotated = await drawRedDot(imageInput, cx, cy, 30);
      }
    } catch {}
  }
  // Fallback to DETR center if no phrase-grounded logo was found
  if (!annotated && top?.box && !isLikelyUrl(imageInput) && fs.existsSync(imageInput)) {
    const cx = (top.box.x || 0) + (top.box.width || 0) / 2;
    const cy = (top.box.y || 0) + (top.box.height || 0) / 2;
    annotated = await drawRedDot(imageInput, cx, cy, 30);
  }

  const output = {
    task: 'object-detection',
    model: 'Xenova/detr-resnet-50',
    image: imageInput,
    imageWidth,
    imageHeight,
    threshold,
    numDetections: detections.length,
    top,
    detections,
    annotatedImagePath: annotated?.output || null,
    redDot: annotated ? { x: annotated.x, y: annotated.y, radius: annotated.radius } : null,
  };

  console.log(JSON.stringify(output, null, 2));
})().catch(error => {
  console.error('DETR detection test failed:', error?.message || error);
  process.exit(2);
});


