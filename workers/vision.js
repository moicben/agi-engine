// Vision worker: thin wrapper around tools/vision.js
// Provides a minimal API to run a zero-shot detection and optionally annotate

import {
  runVisionQuery,
  annotateImage,
} from '../tools/vision.js';

export async function detect({ image, query, threshold, annotate = true, outPath } = {}) {
  if (!image || !query) {
    return { success: false, error: 'missing_parameters', details: { image: !!image, query: !!query } };
  }

  const result = await runVisionQuery({ imageInput: image, queryText: query, threshold });

  let annotatedPath = null;
  if (annotate && result?.topMatch?.box && result?.imageBuffer && result?.imageWidth && result?.imageHeight) {
    annotatedPath = await annotateImage(
      result.imageBuffer,
      result.imageWidth,
      result.imageHeight,
      result.topMatch.box,
      outPath,
      image
    );
  }

  const coords = result?.topMatch?.box
    ? { x: result.topMatch.box.x, y: result.topMatch.box.y, width: result.topMatch.box.width, height: result.topMatch.box.height }
    : null;

  return {
    success: !!coords,
    query,
    image,
    coords,
    annotated: annotatedPath,
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

export default { detect };


