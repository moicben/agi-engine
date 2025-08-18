import { execSync } from 'child_process';

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}

export function gitStatus() {
  try { return sh('git status --porcelain'); } catch (e) { throw new Error('git_status_failed: ' + e.message); }
}

export function ensureUser(name = process.env.GIT_USER_NAME, email = process.env.GIT_USER_EMAIL) {
  if (!name || !email) return false;
  try {
    sh(`git config user.name "${name}"`);
    sh(`git config user.email "${email}"`);
    return true;
  } catch (e) { throw new Error('git_config_failed: ' + e.message); }
}

export function currentBranch() {
  try { return sh('git rev-parse --abbrev-ref HEAD'); } catch (e) { throw new Error('git_branch_failed: ' + e.message); }
}

export function createBranch(name) {
  try { sh(`git checkout -b ${name}`); return name; } catch (e) { throw new Error('git_create_branch_failed: ' + e.message); }
}

export function commitAll(message) {
  try {
    sh('git add -A');
    // Only commit if there are staged changes
    const diff = sh('git diff --cached --name-only');
    if (!diff) return null;
    sh(`git commit -m "${message.replace(/"/g, '\"')}"`);
    return message;
  } catch (e) { throw new Error('git_commit_failed: ' + e.message); }
}

export function push(branch = currentBranch(), remote = 'origin') {
  try { sh(`git push ${remote} ${branch}`); return true; } catch (e) { throw new Error('git_push_failed: ' + e.message); }
}

export default { gitStatus, ensureUser, currentBranch, createBranch, commitAll, push };


