import { exec } from 'child_process';

function buildArgs(body) {
  const parts = [`--workflow=${body.workflow}`];
  if (body.device) parts.push(`--device=${body.device}`);
  if (body.country) parts.push(`--country=${body.country}`);
  if (body.target) parts.push(`--target=${body.target}`);
  if (body.masterDevice) parts.push(`--masterDevice=${body.masterDevice}`);
  if (body.brand !== undefined && body.brand !== null && body.brand !== '') parts.push(`--brand=${body.brand}`);
  if (body.campaign !== undefined && body.campaign !== null && body.campaign !== '') parts.push(`--campaign=${body.campaign}`);
  if (body.count !== undefined && body.count !== null && body.count !== '') parts.push(`--count=${body.count}`);
  if (body.session) parts.push(`--session=${body.session}`);
  if (body.style) parts.push(`--style=${body.style}`);
  return parts;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = req.body || {};
    if (!body.workflow) {
      res.status(400).json({ error: 'workflow is required' });
      return;
    }

    const args = buildArgs(body);
    const cmd = `node tools/whatsapp/runner.js ${args.join(' ')}`;

    exec(cmd, { cwd: process.cwd(), env: process.env, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        res.status(200).json({ success: false, command: cmd, stdout: String(stdout || ''), stderr: String(stderr || ''), error: error.message });
        return;
      }
      res.status(200).json({ success: true, command: cmd, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


