import { moveMouse, click, clickAt, keyPress, typeText } from '../tools/interact.js';

// Orchestrator takes a decision JSON and executes the corresponding action
// Expected decision format: { action: "move|click|key|type", params: { ... } }
export async function orchestrate(decision, context = {}) {
  const safe = typeof decision === 'string' ? parseSafe(decision) : decision;
  if (!safe || !safe.action) {
    return { success: false, error: 'invalid_decision' };
  }

  try {
    switch (safe.action) {
      case 'move': {
        const { x, y } = safe.params || {};
        await moveMouse(Number(x), Number(y));
        return { success: true, action: 'move', data: { x, y } };
      }
      case 'click': {
        const { x, y, button = 'left', times = 1 } = safe.params || {};
        if (x != null && y != null) {
          await clickAt(Number(x), Number(y), button);
        } else {
          await click(button, Number(times));
        }
        return { success: true, action: 'click', data: { x, y, button, times } };
      }
      case 'key': {
        const { key = 'Return' } = safe.params || {};
        await keyPress(String(key));
        return { success: true, action: 'key', data: { key } };
      }
      case 'type': {
        const { text = '', delay = 10 } = safe.params || {};
        await typeText(String(text), Number(delay));
        return { success: true, action: 'type', data: { text, delay } };
      }
      default:
        return { success: false, error: 'unsupported_action', action: safe.action };
    }
  } catch (e) {
    return { success: false, error: 'execution_failed', details: e.message };
  }
}

function parseSafe(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
