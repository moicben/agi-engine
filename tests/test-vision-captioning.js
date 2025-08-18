// Image captioning test with Transformers.js (ViT-GPT2)
// Default image: `public/vision-img.png`
// Usage: node tests/test-vision-captioning.js <image_path_or_url>

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

// no-op

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

function buildAnnotatedPath(imageInput, suffix = 'caption') {
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
  const output = outPath || buildAnnotatedPath(imagePath, 'caption');
  await img.composite([{ input: svg, top: 0, left: 0 }]).png().toFile(output);
  return { output, x: clampedX, y: clampedY, radius };
}

async function loadImageBufferAndSize(imageInput) {
  if (isLikelyUrl(imageInput)) {
    const res = await fetch(imageInput);
    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    return { buffer, width: meta.width || null, height: meta.height || null };
  }
  const buffer = fs.readFileSync(imageInput);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width || null, height: meta.height || null };
}

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

  const [, , inputArg] = process.argv;
  const imageInput = inputArg || getDefaultImagePath();

  let imageWidth = null;
  let imageHeight = null;
  if (!isLikelyUrl(imageInput) && fs.existsSync(imageInput)) {
    const dims = readPngDimensionsSync(imageInput);
    imageWidth = dims.width;
    imageHeight = dims.height;
  }

  const captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning');
  const outputs = await captioner(imageInput, { max_new_tokens: 40 });

  const captions = (Array.isArray(outputs) ? outputs : [])
    .map(o => ({ text: o.generated_text }))
    .filter(o => typeof o.text === 'string' && o.text.length > 0);

  // For annotation: detect the logo and mark its center
  let annotated = null;
  if (!isLikelyUrl(imageInput) && fs.existsSync(imageInput)) {
    try {
      const { buffer: imageBuffer, width: metaW, height: metaH } = await loadImageBufferAndSize(imageInput);
      const imageWidthBuf = metaW;
      const imageHeightBuf = metaH;
      const detectorLogo = await pipeline('zero-shot-object-detection', 'Xenova/owlv2-base-patch16');
      const out = await detectorLogo(imageInput, ['Qonto logo', 'Qonto', 'logo'], { threshold: 0.06 });
      let matches = (Array.isArray(out) ? out : [])
        .filter(r => typeof r?.score === 'number')
        .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }));

      let topLogo = pickBestLogo(matches, imageWidthBuf, imageHeightBuf);

      if (!topLogo && imageWidthBuf && imageHeightBuf) {
        const cropX = Math.round(imageWidthBuf * 0.60);
        const cropY = 0;
        const cropW = Math.round(imageWidthBuf * 0.40);
        const cropH = Math.round(imageHeightBuf * 0.40);
        const cropped = await sharp(imageBuffer).extract({ left: cropX, top: cropY, width: cropW, height: cropH }).png().toBuffer();
        const tmpPath = path.join(path.dirname(imageInput), 'vision-img.topright.png');
        await sharp(cropped).toFile(tmpPath);
        const local = await detectorLogo(tmpPath, ['Qonto logo', 'Qonto', 'logo'], { threshold: 0.04 });
        const locals = (Array.isArray(local) ? local : [])
          .filter(r => typeof r?.score === 'number')
          .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }));
        const picked = pickBestLogo(locals, cropW, cropH);
        if (picked?.box) {
          picked.box.x += cropX;
          picked.box.y += cropY;
          topLogo = picked;
        }
      }

      if (topLogo?.box) {
        const cx = (topLogo.box.x || 0) + (topLogo.box.width || 0) / 2;
        const cy = (topLogo.box.y || 0) + (topLogo.box.height || 0) / 2;
        annotated = await drawRedDot(imageInput, cx, cy, 30);
      } else {
        // Fallback: generic DETR
        const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50');
        const detResults = await detector(imageInput, { threshold: 0.1 });
        const dets = (Array.isArray(detResults) ? detResults : [])
          .filter(r => typeof r?.score === 'number')
          .sort((a, b) => b.score - a.score);
        const top = dets[0] || null;
        if (top?.box) {
          const box = normalizeBox(top.box);
          const cx = (box.x || 0) + (box.width || 0) / 2;
          const cy = (box.y || 0) + (box.height || 0) / 2;
          annotated = await drawRedDot(imageInput, cx, cy, 30);
        }
      }
    } catch {}
  }

  const result = {
    task: 'image-to-text',
    model: 'Xenova/vit-gpt2-image-captioning',
    image: imageInput,
    imageWidth,
    imageHeight,
    captions,
    caption: captions[0]?.text || null,
    annotatedImagePath: annotated?.output || null,
    redDot: annotated ? { x: annotated.x, y: annotated.y, radius: annotated.radius } : null
  };

  console.log(JSON.stringify(result, null, 2));
})().catch(error => {
  console.error('Captioning test failed:', error?.message || error);
  process.exit(2);
});


