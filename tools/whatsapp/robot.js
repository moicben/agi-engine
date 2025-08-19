// Fonction utilitaire robotjs
let robot = null;
try {
  const mod = await import('robotjs');
  robot = mod.default || mod;
} catch (e) {
  robot = null;
}
import { sleep } from './helpers.js';

// Fonction pour cliquer sur l'écran
async function clickScreen(x, y, delay) {
    robot.moveMouse(x, y);
    robot.mouseClick();
    await sleep(delay);
}

// Fonction pour raccourci clavier (ex: Option + Tab)
async function pressKey(key, delay) {
    // Map macOS key names to robotjs key names
    const keyMap = {
        'Option': 'alt',
        'Tab': 'tab',
        'Command': 'command',
        'Shift': 'shift',
        'Control': 'control',
        'Enter': 'enter',
        'Space': 'space',
        'Escape': 'escape'
    };
    
    const robotKey = keyMap[key] || key.toLowerCase();
    robot.keyTap(robotKey);
    await sleep(delay);
}

// Fonction pour écrire dans le champ de texte
async function writeText(text, delay) {
    robot.typeString(text);
    await sleep(delay);
}

export { clickScreen, writeText, pressKey, sleep };
