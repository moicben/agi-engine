#!/usr/bin/env node

// Script: Déployer un pod CPU (4GB) sur RunPod via l'API REST
// Prérequis: export RUNPOD_API_KEY="..."

import axios from 'axios';

function getArg(flag, fallback = undefined) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function toInt(value, fallback) {
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

async function deployCpuPod() {
  const apiKey = process.env.RUNPOD_API_KEY;
  if (!apiKey) {
    console.error('❌ RUNPOD_API_KEY manquant. Exportez la variable d\'environnement et réessayez.');
    process.exit(1);
  }

  const name = getArg('--name', `agi-cpu-4g-${Date.now()}`);
  const imageName = getArg('--image', 'moicben/agi-engine:beta');
  // REST enum: SECURE | COMMUNITY
  const cloudTypeArg = getArg('--cloud', 'SECURE');
  const minVcpuCount = toInt(getArg('--vcpu', 2), 2);
  const volumeInGb = toInt(getArg('--volume', 0), 0);
  const containerDiskInGb = toInt(getArg('--disk', 5), 5);
  // Ports CSV unique, défaut: 6901,3000,5173 (noVNC + app)
  const tcpPorts = getArg('--tcp-ports', '6901');
  const httpPorts = getArg('--http-ports', '3000,5173');

  // REST expects env as an object map (pas d'environnement externe utilisé)
  const envVars = { TZ: 'Europe/Paris', VNC_PW: 'secret' };

  // REST expects ports as ["<port>/<protocol>"]
  function normalizePortSpec(portCsv) {
    const guessProtocol = (p) => {
      if (String(p) === '22') return 'tcp';
      return 'http';
    };
    return String(portCsv)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => (s.includes('/') ? s : `${s}/${guessProtocol(s)}`));
  }
  const portsArray = normalizePortSpec(tcpPorts);

  console.log('🚀 Déploiement d\'un pod CPU RunPod...');
  console.log(`   Nom:           ${name}`);
  console.log(`   Image:         ${imageName}`);
  console.log(`   Cloud:         ${cloudTypeArg}`);
  console.log(`   Compute:       CPU`);
  console.log(`   vCPU:          ${minVcpuCount}`);
  console.log(`   Volume (GB):   ${volumeInGb}`);
  console.log(`   Disque (GB):   ${containerDiskInGb}`);
  console.log(`   Ports:         ${tcpPorts},${httpPorts}`);

  async function attemptDeployREST(body) {
    const res = await axios.post(
      'https://rest.runpod.io/v1/pods',
      body,
      { headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` } }
    );
    return res.data; // Pod
  }

  try {
    const body = {
      computeType: 'CPU',
      cloudType: cloudTypeArg,
      vcpuCount: minVcpuCount,
      name,
      imageName,
      containerDiskInGb,
      volumeInGb,
      env: envVars,
      ports: [
        "3000/http",
        "5173/http",
        "6901/tcp"
      ],
    };
    const pod = await attemptDeployREST(body);
    if (!pod?.id) {
      console.error('❌ Impossible de créer le pod: réponse inattendue.');
      process.exit(1);
    }

    console.log('\n✅ Pod créé avec succès:');
    console.log(`   ID:          ${pod.id}`);
    console.log(`   Image:       ${pod.imageName}`);
    console.log('   Rappel: les ports exposés s\'activent si le service écoute dans le conteneur.');

    // Afficher les endpoints utilisables (proxy + host direct)
    try {
      const portsList = portsArray.map(s => String(s).split('/')[0]);

      if (portsList.length > 0) {
        console.log('\n🔗 Endpoints suggérés:');
        for (const p of portsList) {
          // Proxy RunPod (HTTPS)
          console.log(`   • Proxy: https://${pod.id}-${p}.proxy.runpod.net`);
          // Accès direct via host si disponible
          // Host direct non documenté via REST; utilisez le Proxy
        }
        console.log('\n   Pour noVNC utilisez le port 6901. Mot de passe: VNC_PW (par défaut: secret).');
        console.log('   Si un port apparaît "Disabled" dans l\'UI, vérifiez que le service écoute sur 0.0.0.0:<port> dans le conteneur.');
      }
    } catch (_) {
      // no-op affichage endpoints
    }
    console.log('\nℹ️ Astuce: utilisez --help pour voir les options.');
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error('❌ Échec du déploiement:', typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2));
    process.exit(1);
  }
}

function maybeShowHelp() {

  if (process.argv.includes('-h') || process.argv.includes('--help')) {
    console.log(`
Usage: node scripts/deploy-runpod.js [options]

Options:
  --name <str>          Nom du pod (par défaut: agi-cpu-4g-<timestamp>)
  --image <str>         Image Docker (par défaut: moicben/agi-engine:beta)
  --cloud <str>         Cloud RunPod (SECURE | COMMUNITY) (par défaut: SECURE)
  --vcpu <int>          vCPU minimum (par défaut: 2)
  --volume <int>        Volume persistant en Go (par défaut: 0)
  --disk <int>          Disque conteneur en Go (par défaut: 5)
  --ports <csv>         Ports exposés, ex: 6901,3000,5173

Env:
  RUNPOD_API_KEY        Clé API RunPod (requis)
`);
    process.exit(0);
  }
}

maybeShowHelp();
deployCpuPod();
