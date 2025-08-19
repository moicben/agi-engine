// Terminal utilities for the brain module

import { exec as execCb, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const exec = promisify(execCb);

// Execute a shell command with stdout/stderr capture and timeout
export async function executeCommand(command, options = {}) {
  const {
    cwd = process.cwd(),
    timeout_ms = 120000,
    env = {},
    shell = process.env.SHELL || (process.platform === 'win32' ? undefined : '/bin/bash')
  } = options;

  if (!command || typeof command !== 'string') {
    return { success: false, error: 'invalid_command' };
  }

  try {
    const { stdout, stderr } = await exec(command, {
      cwd,
      timeout: Math.max(0, Number(timeout_ms) || 0),
      env: { ...process.env, ...env },
      shell
    });
    return { success: true, stdout, stderr: stderr || '' };
  } catch (e) {
    return {
      success: false,
      code: e?.code ?? null,
      signal: e?.signal ?? null,
      stdout: e?.stdout ?? '',
      stderr: e?.stderr ?? String(e?.message || e)
    };
  }
}

// Execute a background command and immediately return a PID
export async function executeBackground(command, options = {}) {
  const { cwd = process.cwd(), env = {}, shell = process.env.SHELL || (process.platform === 'win32' ? undefined : '/bin/bash'), detached = true } = options;
  if (!command || typeof command !== 'string') {
    return { success: false, error: 'invalid_command' };
  }
  try {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell,
      detached,
      stdio: 'ignore'
    });
    if (detached) child.unref();
    return { success: true, pid: child.pid };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export async function getSystemInfo() {
  return {
    platform: process.platform,
    release: os.release(),
    arch: process.arch,
    shell: process.env.SHELL || null,
    nodeVersion: process.version,
    cpus: os.cpus()?.length || 0,
    memory: {
      total: os.totalmem(),
      free: os.freemem()
    }
  };
}

export async function listDirectory(path = '.') {
  const fs = await import('fs/promises');
  try {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }));
  } catch (error) {
    return { error: error.message };
  }
}

// Parse JSON safely from object or string; return null on failure
export function parseJSONSafe(input) {
  if (input == null) return null;
  if (typeof input === 'object') return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
