import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

async function ensureXdotool() {
  if (process.platform !== 'linux') {
    throw new Error('interact.js helpers require Linux (xdotool)');
  }
  try {
    await exec('command -v xdotool >/dev/null 2>&1');
  } catch {
    throw new Error('xdotool not found. Install it with: sudo apt-get install xdotool');
  }
}

export async function moveMouse(x, y) {
  await ensureXdotool();
  await exec(`xdotool mousemove ${Math.floor(x)} ${Math.floor(y)}`);
}

function mapButton(button) {
  if (typeof button === 'number') return button;
  const map = { left: 1, middle: 2, right: 3 };
  return map[String(button).toLowerCase()] || 1;
}

export async function click(button = 'left', times = 1) {
  await ensureXdotool();
  const btn = mapButton(button);
  await exec(`xdotool click --repeat ${Math.max(1, Math.floor(times))} ${btn}`);
}

export async function clickAt(x, y, button = 'left') {
  await ensureXdotool();
  await moveMouse(x, y);
  await click(button, 1);
}

export async function keyPress(key) {
  await ensureXdotool();
  // Examples: Return, Tab, Escape, Alt, Control, Shift, Super, a, b, c
  await exec(`xdotool key ${key}`);
}

export async function typeText(text, delayMs = 10) {
  await ensureXdotool();
  const safe = text.replace(/"/g, '\\"');
  await exec(`xdotool type --delay ${Math.max(0, Math.floor(delayMs))} "${safe}"`);
}

export default { moveMouse, click, clickAt, keyPress, typeText };

