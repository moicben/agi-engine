// Vision utilities extracted from tests/test-llmvision.js and modularized


import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { clickAt } from './interact.js';

let detectorSingleton = null;

function isLikelyUrl(s) {
  return typeof s === 'string' && /^(https?:)?\/\//i.test(s);
}

export async function getDetector() {
  if (detectorSingleton) return detectorSingleton;
  const { pipeline } = await import('@xenova/transformers');
  detectorSingleton = await pipeline('zero-shot-object-detection', 'Xenova/owlv2-base-patch16');
  return detectorSingleton;
}

export async function loadImageBufferAndSize(imageInput) {
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

export function normalizeBox(box) {
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

export async function detectZeroShot(imageInput, labels, threshold = 0.12) {
  const detector = await getDetector();
  const out = await detector(imageInput, labels, { threshold });
  const arr = Array.isArray(out) ? out : [];
  return arr
    .filter(r => typeof r?.score === 'number')
    .map(r => ({ label: r.label, score: r.score, box: normalizeBox(r.box) }));
}

export function scoreCandidate(m, imageWidth, imageHeight, queryText) {
  if (!m?.box || !imageWidth || !imageHeight) return m?.score || 0;
  const cx = m.box.x + m.box.width / 2;
  const cy = m.box.y + m.box.height / 2;
  const centerX = cx / imageWidth;
  const centerY = cy / imageHeight;
  const ar = m.box.width / Math.max(1, m.box.height);
  const area = m.box.width * m.box.height;
  const areaNorm = area / (imageWidth * imageHeight);
  const wantX = 0.30;
  const wantY = 0.22;
  const dist = Math.hypot(centerX - wantX, centerY - wantY);
  const inDocBand = (centerY > 0.10 && centerY < 0.40);
  const inLeftHalf = (centerX > 0.10 && centerX < 0.60);
  const regionBonus = (inDocBand && inLeftHalf) ? 0.30 : 0;
  const labelBonus = (m.label || '').toLowerCase().includes(String(queryText || '').toLowerCase()) ? 0.25 : 0.02;
  const aspectBonus = (ar >= 3 && ar <= 14) ? 0.15 : (ar > 16 ? -0.06 : -0.04);
  const areaPenalty = Math.max(0, (areaNorm - 0.020)) * 1.8;
  const smallPenalty = areaNorm < 0.00008 ? 0.12 : 0;
  const topPenalty = (centerY < 0.05) ? 0.4 : 0;
  const rightPenalty = 0;
  const distPenalty = dist * 0.5;
  return (m.score || 0) + regionBonus + labelBonus + aspectBonus - areaPenalty - distPenalty - smallPenalty - topPenalty - rightPenalty;
}

export function filterAndPickBest(cands, imageWidth, imageHeight, queryText) {
  const filtered = (cands || []).filter(m => m.box && m.box.width >= 18 && m.box.height >= 10);
  filtered.sort((a, b) => scoreCandidate(b, imageWidth, imageHeight, queryText) - scoreCandidate(a, imageWidth, imageHeight, queryText));
  return filtered[0] || null;
}

export function isAcceptable(m, imageWidth, imageHeight) {
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

export async function refineWithCrop(imageBuffer, imageWidth, imageHeight, detectFn, queryText) {
  if (!imageWidth || !imageHeight) return null;
  const crops = [
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
    const localMatches = await detectFn(tmpPath, 0.14);
    const picked = filterAndPickBest(localMatches, imageWidth, imageHeight, queryText);
    if (picked?.box) {
      picked.box.x += c.left;
      picked.box.y += c.top;
    }
    const currentScore = scoreCandidate(picked || { score: 0, box: null }, imageWidth, imageHeight, queryText);
    const bestScore = scoreCandidate(best || { score: 0, box: null }, imageWidth, imageHeight, queryText);
    if (!best || currentScore > bestScore) best = picked;
  }
  return best;
}

export function buildCircleSvgBuffer(cx, cy, radius, imageWidth, imageHeight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><circle cx="${cx}" cy="${cy}" r="${radius}" fill="red" stroke="white" stroke-width="4"/></svg>`;
  return Buffer.from(svg);
}

export function buildBoxSvgBuffer(x, y, w, h, imageWidth, imageHeight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="red" stroke-width="6"/></svg>`;
  return Buffer.from(svg);
}

export async function annotateImage(imageBuffer, imageWidth, imageHeight, box, outPath, fallbackInputPath) {
  if (!box || !imageWidth || !imageHeight) return null;
  const x = Math.round(box.x);
  const y = Math.round(box.y);
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  const cx = Math.round(x + w / 2);
  const cy = Math.round(y + h / 2);
  const radius = Math.max(12, Math.min(60, Math.round(Math.min(imageWidth, imageHeight) * 0.015)));
  const overlayDot = buildCircleSvgBuffer(cx, cy, radius, imageWidth, imageHeight);
  const overlayBox = buildBoxSvgBuffer(x, y, w, h, imageWidth, imageHeight);
  const outputPath = outPath || (fallbackInputPath
    ? path.join(path.dirname(fallbackInputPath), `${path.basename(fallbackInputPath, path.extname(fallbackInputPath))}.annotated.png`)
    : `/Users/ben/Documents/agi-engine/public/vision-img.annotated.png`);
  await sharp(imageBuffer)
    .composite([{ input: overlayBox, top: 0, left: 0 }, { input: overlayDot, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
  return outputPath;
}

export async function runVisionQuery({ imageInput, queryText, threshold = 0.12 }) {
  const { buffer: imageBuffer, width: imageWidth, height: imageHeight } = await loadImageBufferAndSize(imageInput);
  const labels = [
    queryText,
    String(queryText).toLowerCase(),
    String(queryText).toUpperCase(),
    String(queryText).charAt(0).toUpperCase() + String(queryText).slice(1),
    String(queryText).slice(0, -1),
    String(queryText).slice(1)
  ];
  const matches = await detectZeroShot(imageInput, labels, threshold);
  let topMatch = filterAndPickBest(matches, imageWidth, imageHeight, queryText);

  if (!isAcceptable(topMatch, imageWidth, imageHeight)) {
    const refined = await refineWithCrop(
      imageBuffer,
      imageWidth,
      imageHeight,
      async (inp, thr) => detectZeroShot(inp, labels, thr ?? Math.max(0.10, threshold)),
      queryText
    );
    const better = scoreCandidate(refined || { score: 0, box: null }, imageWidth, imageHeight, queryText) > scoreCandidate(topMatch || { score: 0, box: null }, imageWidth, imageHeight, queryText);
    if (refined && better) topMatch = refined;
  }

  if (!topMatch) topMatch = filterAndPickBest(matches, imageWidth, imageHeight, queryText);

  return {
    query: queryText,
    image: imageInput,
    imageWidth,
    imageHeight,
    numDetections: matches.length,
    topMatch,
    detections: matches,
    imageBuffer,
  };
}

export async function findText({ image, text, threshold } = {}) {
  if (!image || !text) {
    return { success: false, error: 'missing_parameters', details: { image: !!image, text: !!text } };
  }
  const result = await runVisionQuery({ imageInput: image, queryText: text, threshold });
  const box = result?.topMatch?.box || null;
  const coords = box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null;
  return {
    success: !!coords,
    text,
    image,
    coords,
    meta: {
      imageWidth: result?.imageWidth ?? null,
      imageHeight: result?.imageHeight ?? null,
      numDetections: result?.numDetections ?? 0,
    },
    raw: {
      topMatch: result?.topMatch ?? null,
      detections: result?.detections ?? [],
    },
  };
}

export async function findAndClick({ image, text, threshold, button = 'left' } = {}) {
  const found = await findText({ image, text, threshold });
  if (!found?.success || !found?.coords) {
    return { success: false, error: 'not_found', details: { text } };
  }
  try {
    if (process.platform !== 'linux') {
      return { success: true, data: { clicked: false, reason: 'non_linux' }, coords: found.coords };
    }
    const cx = Math.floor(found.coords.x + found.coords.width / 2);
    const cy = Math.floor(found.coords.y + found.coords.height / 2);
    await clickAt(cx, cy, button);
    return { success: true, data: { clicked: true }, coords: found.coords };
  } catch (e) {
    return { success: false, error: e.message, coords: found.coords };
  }
}



