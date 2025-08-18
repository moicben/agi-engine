// Quick phrase-grounded detection test with Transformers.js (OWLv2)
// Defaults: uses local image `public/vision-img.png` and queries the "Qonto" logo.
// Override via CLI: node tests/test-llmvision.js <image_path_or_url> <query text>

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function getDefaultImagePath() {
  return '/Users/ben/Documents/agi-engine/public/vision-img.png';
}

function isLikelyUrl(s) {
  return typeof s === 'string' && /^(https?:)?\/\//i.test(s);
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

function buildCircleSvgBuffer(cx, cy, radius, imageWidth, imageHeight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="red" stroke="white" stroke-width="4"/></svg>`;
  return Buffer.from(svg);
}

function buildBoxSvgBuffer(x, y, w, h, imageWidth, imageHeight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="red" stroke-width="6"/></svg>`;
  return Buffer.from(svg);
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

(async () => {
  const { pipeline } = await import('@xenova/transformers');

  const [, , inputArg, ...queryParts] = process.argv;
  const imageInput = inputArg || getDefaultImagePath();
  const queryText = (queryParts.length ? queryParts.join(' ') : 'SWIFT').trim();

  const { buffer: imageBuffer, width: metaW, height: metaH } = await loadImageBufferAndSize(imageInput);
  let imageWidth = metaW;
  let imageHeight = metaH;

  // On garde le meilleur modèle pour la détection d'objets zero-shot
  const detector = await pipeline('zero-shot-object-detection', 'Xenova/owlv2-base-patch16');

  async function detect(input, threshold = 0.08) {
    const labels = [
      queryText,
      queryText.toLowerCase(),
      queryText.toUpperCase(),
      queryText.charAt(0).toUpperCase() + queryText.slice(1),
      queryText.slice(0, -1),
      queryText.slice(1)
    ];
    const out = await detector(input, labels, { threshold });
    return (Array.isArray(out) ? out : [])
      .filter(r => typeof r?.score === 'number')
      .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }));
  }

  let matches = await detect(imageInput, 0.12);

  function scoreCandidate(m) {
    if (!m?.box || !imageWidth || !imageHeight) return m.score || 0;
    const cx = m.box.x + m.box.width / 2;
    const cy = m.box.y + m.box.height / 2;
    const centerX = cx / imageWidth;
    const centerY = cy / imageHeight;
    const ar = m.box.width / Math.max(1, m.box.height);
    const area = m.box.width * m.box.height;
    const areaNorm = area / (imageWidth * imageHeight);
    const wantX = 0.30; // title area tends to be left-mid
    const wantY = 0.22;
    const dist = Math.hypot(centerX - wantX, centerY - wantY);
    const inDocBand = (centerY > 0.10 && centerY < 0.40);
    const inLeftHalf = (centerX > 0.10 && centerX < 0.60);
    const regionBonus = (inDocBand && inLeftHalf) ? 0.30 : 0;
    const labelBonus = m.label.toLowerCase().includes(queryText.toLowerCase()) ? 0.25 : 0.02;
    const aspectBonus = (ar >= 3 && ar <= 14) ? 0.15 : (ar > 16 ? -0.06 : -0.04);
    const areaPenalty = Math.max(0, (areaNorm - 0.020)) * 1.8;
    const smallPenalty = areaNorm < 0.00008 ? 0.12 : 0;
    const topPenalty = (centerY < 0.05) ? 0.4 : 0;
    const rightPenalty = 0; // no harsh penalty; already using left-half bonus
    const distPenalty = dist * 0.5;
    return (m.score || 0) + regionBonus + labelBonus + aspectBonus - areaPenalty - distPenalty - smallPenalty - topPenalty - rightPenalty;
  }

  function pickBest(cands) {
    const filtered = cands.filter(m => m.box && m.box.width >= 18 && m.box.height >= 10);
    filtered.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    return filtered[0] || null;
  }

  let topMatch = pickBest(matches);

  function isAcceptable(m) {
    if (!m?.box || !imageWidth || !imageHeight) return false;
    const { x, y, width, height } = m.box;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const centerX = cx / imageWidth;
    const centerY = cy / imageHeight;
    const areaNorm = (width * height) / (imageWidth * imageHeight);
    const ar = width / Math.max(1, height);
    return (centerX > 0.10 && centerX < 0.65) && (centerY > 0.10 && centerY < 0.40) && areaNorm < 0.06 && areaNorm > 0.00008 && ar > 2.0 && width > 80 && height > 14;
  }

  async function refineWithCrop() {
    if (!imageWidth || !imageHeight) return null;
    const crops = [
      // broader left/top bands to find the title
      { left: Math.round(imageWidth * 0.05), top: Math.round(imageHeight * 0.10), width: Math.round(imageWidth * 0.55), height: Math.round(imageHeight * 0.32) },
      { left: Math.round(imageWidth * 0.08), top: Math.round(imageHeight * 0.14), width: Math.round(imageWidth * 0.52), height: Math.round(imageHeight * 0.28) },
      { left: Math.round(imageWidth * 0.12), top: Math.round(imageHeight * 0.18), width: Math.round(imageWidth * 0.46), height: Math.round(imageHeight * 0.24) },
    ];
    let best = null;
    for (let i = 0; i < crops.length; i++) {
      const c = crops[i];
      const cropped = await sharp(imageBuffer).extract({ left: c.left, top: c.top, width: c.width, height: c.height }).png().toBuffer();
      const tmpPath = `/Users/ben/Documents/agi-engine/public/vision-img.crop.${i}.png`;
      await sharp(cropped).toFile(tmpPath);
      const localMatches = await detect(tmpPath, 0.14);
      const picked = pickBest(localMatches);
      if (picked?.box) {
        picked.box.x += c.left;
        picked.box.y += c.top;
      }
      if (!best || scoreCandidate(picked || { score:0, box:null }) > scoreCandidate(best)) best = picked;
    }
    return best;
  }

  if (!isAcceptable(topMatch)) {
    const refined = await refineWithCrop();
    if (refined) {
      const better = scoreCandidate(refined) > scoreCandidate(topMatch || { score: 0, box: null });
      if (better) topMatch = refined;
    }
  }

  if (!topMatch) topMatch = pickBest(matches);

  const output = {
    query: queryText,
    image: imageInput,
    imageWidth,
    imageHeight,
    numDetections: matches.length,
    topMatch,
    detections: matches,
  };

  // Always print concise coordinates line first (stdout)
  if (topMatch?.box) {
    const { x, y, width, height } = topMatch.box;
    console.log(`[coords] x=${x}, y=${y}, width=${width}, height=${height}`);
    // Draw a big red point and a red rectangle at the detected box
    if (imageWidth && imageHeight) {
      const cx = Math.round(x + width / 2);
      const cy = Math.round(y + height / 2);
      const radius = Math.max(12, Math.min(60, Math.round(Math.min(imageWidth, imageHeight) * 0.015)));
      const overlayDot = buildCircleSvgBuffer(cx, cy, radius, imageWidth, imageHeight);
      const overlayBox = buildBoxSvgBuffer(Math.round(x), Math.round(y), Math.round(width), Math.round(height), imageWidth, imageHeight);
      const outPath = isLikelyUrl(imageInput)
        ? '/Users/ben/Documents/agi-engine/public/vision-img.annotated.png'
        : path.join(path.dirname(imageInput), `${path.basename(imageInput, path.extname(imageInput))}.annotated.png`);
      await sharp(imageBuffer)
        .composite([{ input: overlayBox, top: 0, left: 0 }, { input: overlayDot, top: 0, left: 0 }])
        .png()
        .toFile(outPath);
      console.log(`[annotated] saved: ${outPath}`);
    }
  }

  console.log(JSON.stringify(output, null, 2));
})().catch(error => {
  console.error('Failed to run detection test:', error?.message || error);
  process.exit(2);
});
