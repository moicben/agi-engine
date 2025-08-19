// Memory relevance and diversity scoring utilities

import { config } from '../config.js';

export function tokenize(text) {
  try {
    return String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9àâäçéèêëîïôöùûüÿœ]+/i)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function jaccardSimilarity(tokensA, tokensB) {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function exponentialDecay(daysElapsed, halfLifeDays) {
  if (!isFinite(daysElapsed) || daysElapsed < 0) return 1;
  const hl = Math.max(0.1, Number(halfLifeDays || 3));
  return Math.pow(0.5, daysElapsed / hl);
}

export function scoreMemo({ goal, memo, now = new Date() }) {
  const gTok = tokenize(goal);
  const mTok = tokenize(memo?.content || '');
  const sim = jaccardSimilarity(gTok, mTok);
  const createdAt = new Date(memo?.created_at || now);
  const days = (now - createdAt) / 86400000;
  const rec = exponentialDecay(days, config?.engine?.memory?.decayHalfLifeDays || config?.memory?.decayHalfLifeDays || 3);
  const domainWeights = (config?.engine?.memory?.domainWeights) || (config?.memory?.domainWeights) || {};
  const dom = domainWeights[memo?.domain || 'general'] || 1.0;
  const imp = Math.max(0, Math.min(1, Number(memo?.importance_score ?? 0.5)));

  // Weighted sum (defaults chosen to prioritize relevance)
  const wRel = (config?.engine?.memory?.weights?.relevance) ?? 0.55;
  const wRec = (config?.engine?.memory?.weights?.recency) ?? 0.15;
  const wDom = (config?.engine?.memory?.weights?.domain) ?? 0.2;
  const wImp = (config?.engine?.memory?.weights?.importance) ?? 0.1;

  return wRel * sim + wRec * rec + wDom * dom + wImp * imp;
}

export function mmrSelect(goal, candidates, k, lambda = 0.7) {
  const selected = [];
  const remaining = [...candidates];
  while (selected.length < k && remaining.length) {
    let best = null;
    let bestVal = -Infinity;
    for (const c of remaining) {
      const rel = Number(c._score || 0);
      let div = 0;
      for (const s of selected) {
        const d = jaccardSimilarity(tokenize(c.content), tokenize(s.content));
        if (d > div) div = d;
      }
      const val = lambda * rel - (1 - lambda) * div;
      if (val > bestVal) {
        bestVal = val;
        best = c;
      }
    }
    if (!best) break;
    selected.push(best);
    remaining.splice(remaining.indexOf(best), 1);
  }
  return selected;
}

export default { scoreMemo, mmrSelect, tokenize };


