#!/usr/bin/env node

// Script: Déployer un pod CPU (4GB) sur RunPod via l'API (GraphQL)
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

  const name = getArg('--name', process.env.RUNPOD_NAME || `agi-cpu-4g-${Date.now()}`);
  const imageName = getArg('--image', process.env.RUNPOD_IMAGE || 'moicben/kasm-jammy:1.14.0');
  const cloudType = getArg('--cloud', process.env.RUNPOD_CLOUD || 'ALL');
  const minVcpuCount = toInt(getArg('--vcpu', process.env.RUNPOD_VCPU || 2), 2);
  const minMemoryInGb = toInt(getArg('--mem', process.env.RUNPOD_MEM || 4), 4);
  const volumeInGb = toInt(getArg('--volume', process.env.RUNPOD_VOLUME || 20), 20);
  const containerDiskInGb = toInt(getArg('--disk', process.env.RUNPOD_DISK || 20), 20);
  const ports = getArg('--ports', process.env.RUNPOD_PORTS || '6901,3000,5173');
  const dockerArgs = getArg('--docker-args', process.env.RUNPOD_DOCKER_ARGS || '--shm-size=2g');

  // Correction: RunPod GraphQL API expects env as [String], not [{key, value}]
  // So we must send env as ["KEY=VALUE", ...]
  const envVars = [
    `TZ=${process.env.TZ || 'Europe/Paris'}`,
    `VNC_PW=${process.env.VNC_PW || 'secret'}`
  ];

  console.log('🚀 Déploiement d\'un pod CPU RunPod...');
  console.log(`   Nom:           ${name}`);
  console.log(`   Image:         ${imageName}`);
  console.log(`   Cloud:         ${cloudType}`);
  console.log(`   vCPU:          ${minVcpuCount}`);
  console.log(`   Mémoire (GB):  ${minMemoryInGb}`);
  console.log(`   Volume (GB):   ${volumeInGb}`);
  console.log(`   Disque (GB):   ${containerDiskInGb}`);
  console.log(`   Ports:         ${ports}`);
  console.log(`   Docker args:   ${dockerArgs}`);

  const query = `
    mutation Deploy($input: PodFindAndDeployOnDemandInput!) {
      podFindAndDeployOnDemand(input: $input) {
        id
        imageName
        machineId
        machine { podHostId }
        env
      }
    }
  `;

  const variables = {
    input: {
      cloudType,
      gpuCount: 0,
      minVcpuCount,
      minMemoryInGb,
      volumeInGb,
      containerDiskInGb,
      name,
      imageName,
      dockerArgs,
      ports,
      env: envVars,
    },
  };

  try {
    const res = await axios.post(
      'https://api.runpod.io/graphql',
      { query, variables },
      { headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` } }
    );

    if (res.data?.errors?.length) {
      console.error('❌ Erreur RunPod:', JSON.stringify(res.data.errors, null, 2));
      process.exit(1);
    }

    const pod = res.data?.data?.podFindAndDeployOnDemand;
    if (!pod?.id) {
      console.error('❌ Réponse inattendue de l\'API RunPod:', JSON.stringify(res.data, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Pod créé avec succès:');
    console.log(`   ID:          ${pod.id}`);
    console.log(`   Image:       ${pod.imageName}`);
    if (pod.machine?.podHostId) {
      console.log(`   Host:        ${pod.machine.podHostId}.runpod.io`);
    }
    console.log('   Rappel: les ports exposés s\'activent si le service écoute dans le conteneur.');

    // Afficher les endpoints utilisables (proxy + host direct)
    try {
      const portsList = String(ports)
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (portsList.length > 0) {
        console.log('\n🔗 Endpoints suggérés:');
        for (const p of portsList) {
          // Proxy RunPod (HTTPS)
          console.log(`   • Proxy: https://${pod.id}-${p}.proxy.runpod.net`);
          // Accès direct via host si disponible
          if (pod.machine?.podHostId) {
            console.log(`   • Host : http://${pod.machine.podHostId}.runpod.io:${p}`);
          }
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
  --image <str>         Image Docker (par défaut: moicben/kasm-jammy:1.14.0)
  --cloud <str>         Cloud RunPod (ALL | COMMUNITY | SECURE) (par défaut: ALL)
  --vcpu <int>          vCPU minimum (par défaut: 2)
  --mem <int>           Mémoire en Go (par défaut: 4)
  --volume <int>        Volume persistant en Go (par défaut: 20)
  --disk <int>          Disque conteneur en Go (par défaut: 20)
  --ports <csv>         Ports exposés, ex: 6901,3000,5173
  --docker-args <str>   Arguments Docker (par défaut: --shm-size=2g)

Env:
  RUNPOD_API_KEY        Clé API RunPod (requis)
  RUNPOD_NAME           Nom par défaut du pod
  RUNPOD_IMAGE          Image Docker par défaut
  RUNPOD_CLOUD          Cloud par défaut (ALL | COMMUNITY | SECURE)
  RUNPOD_VCPU           vCPU par défaut
  RUNPOD_MEM            Mémoire par défaut
  RUNPOD_VOLUME         Volume persistant par défaut
  RUNPOD_DISK           Disque conteneur par défaut
  RUNPOD_PORTS          Ports par défaut
  RUNPOD_DOCKER_ARGS    Docker args par défaut
  TZ                    Fuseau horaire (par défaut: Europe/Paris)
  VNC_PW                Mot de passe VNC (par défaut: secret)
`);
    process.exit(0);
  }
}

maybeShowHelp();
deployCpuPod();
