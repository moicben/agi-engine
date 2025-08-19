import { executeCommand, executeBackground, getSystemInfo, listDirectory, parseJSONSafe } from '../tools/terminal.js';

// Terminal worker: executes commands on Linux or macOS.
// Flexible input accepted:
// - String: treated as the full command to execute
// - Object: { action?: 'exec'|'ls'|'sysinfo'|'bg', command|cmd|sh, cwd, timeout_ms, env, shell, background }

export async function run(decision, context = {}) {
  // Allow raw string command
  if (typeof decision === 'string') {
    // Try to parse JSON first; if it fails, treat as raw command
    const maybe = parseJSONSafe(decision);
    if (!maybe) {
      const interpreted = interpretNaturalCommand(decision);
      if (interpreted && interpreted.background) {
        const bg = await executeBackground(interpreted.command, { cwd: interpreted.cwd, env: interpreted.env, shell: interpreted.shell, detached: true });
        return { success: !!bg.success, action: 'bg', data: bg, meta: { interpreted: true } };
      }
      const res = await executeCommand(interpreted?.command || decision, { cwd: interpreted?.cwd, env: interpreted?.env, shell: interpreted?.shell, timeout_ms: interpreted?.timeout_ms });
      return { success: !!res.success, action: 'exec', data: res };
    }
    decision = maybe;
  }

  const input = decision || {};
  const action = input.action || (input.background ? 'bg' : (input.command || input.cmd || input.sh ? 'exec' : 'sysinfo'));

  try {
    switch (action) {
      case 'exec': {
        const params = input.params || input;
        const raw = params.command || params.cmd || params.sh || '';
        const { cwd, timeout_ms, env, shell } = params;
        const res = await executeCommand(String(raw), { cwd, timeout_ms, env, shell });
        return { success: !!res.success, action: 'exec', data: res };
      }
      case 'bg': {
        const params = input.params || input;
        const raw = params.command || params.cmd || params.sh || '';
        const { cwd, env, shell } = params;
        const res = await executeBackground(String(raw), { cwd, env, shell, detached: true });
        return { success: !!res.success, action: 'bg', data: res };
      }
      case 'ls': {
        const { path = '.' } = (input.params || input);
        const res = await listDirectory(String(path));
        return { success: !res?.error, action: 'ls', data: res };
      }
      case 'sysinfo': {
        const info = await getSystemInfo();
        return { success: true, action: 'sysinfo', data: info };
      }
      default:
        return { success: false, error: 'unsupported_action', action };
    }
  } catch (e) {
    return { success: false, error: 'execution_failed', details: e?.message || String(e) };
  }
}

// --- Natural-language interpretation (basic heuristics, French/English) ---
function interpretNaturalCommand(text) {
  try {
    const s = String(text || '').toLowerCase().trim();
    if (!s) return null;

    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    // open app mapping
    const openVerbs = ['open', 'launch', 'start', 'ouvre', 'lance'];
    const containsAny = (arr) => arr.some(v => s.includes(v));

    // Known apps
    const appMap = [
      { keys: ['chrome', 'google chrome'], mac: 'Google Chrome', linuxCmd: 'google-chrome' },
      { keys: ['firefox'], mac: 'Firefox', linuxCmd: 'firefox' },
      { keys: ['safari'], mac: 'Safari', linuxCmd: 'safari' },
      { keys: ['vscode', 'visual studio code', 'code'], mac: 'Visual Studio Code', linuxCmd: 'code' }
    ];

    if (containsAny(openVerbs)) {
      for (const app of appMap) {
        if (containsAny(app.keys)) {
          if (isMac) {
            return { command: `open -a "${app.mac}"`, shell: '/bin/zsh' };
          }
          if (isLinux) {
            return { command: `${app.linuxCmd} >/dev/null 2>&1 &`, background: true };
          }
        }
      }
    }

    // open a folder or url
    if (s.startsWith('ouvre ') || s.startsWith('open ')) {
      const target = s.replace(/^ouvre\s+|^open\s+/, '').trim();
      if (target) {
        if (isMac) return { command: `open ${shellQuote(target)}`, shell: '/bin/zsh' };
        if (isLinux) return { command: `xdg-open ${shellQuote(target)}`, background: true };
      }
    }

    // list directory
    if (s.includes('liste') || s.includes('list') || s.includes('ls')) {
      const match = s.match(/(liste|list|ls)\s+(dossier|dir|directory)\s+(.+)/);
      const path = match?.[3] || '.';
      return { command: `ls -la ${shellQuote(path)}` };
    }

    // node version
    if (s.includes('node') && (s.includes('version') || s.includes('-v'))) {
      return { command: 'node -v' };
    }

    // system info
    if (s.includes('system') || s.includes('système') || s.includes('uname')) {
      return { command: 'uname -a' };
    }

    return null;
  } catch {
    return null;
  }
}

function shellQuote(str) {
  const s = String(str || '');
  if (!s) return "''";
  return `'${s.replace(/'/g, `'\''`)}'`;
}

export default { run };


