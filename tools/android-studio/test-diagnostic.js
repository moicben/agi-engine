#!/usr/bin/env node

/**
 * Diagnostic complet Android Studio
 * Vérification de l'environnement et des prérequis
 */

import { AndroidStudioService } from './index.js';
import { sleep } from '../../whatsapp/helpers.js';

async function fullDiagnostic() {
  console.log('🔍 DIAGNOSTIC COMPLET ANDROID STUDIO');
  console.log('=====================================\n');

  const results = {
    system: {},
    androidStudio: {},
    androidSdk: {},
    adb: {},
    emulator: {},
    nordvpn: {},
    recommendations: []
  };

  try {
    // 1. Diagnostic système
    console.log('1️⃣ 📊 Analyse du système...\n');
    const service = new AndroidStudioService();

    // Initialiser juste le gestionnaire de plateforme
    const platform = service.platform;
    const platformInfo = await platform.detectPlatform();

    results.system = {
      platform: platformInfo.name,
      os: platformInfo.os,
      arch: platformInfo.arch,
      release: platformInfo.release,
      distro: platformInfo.distro,
      memory: platformInfo.memory,
      cpu: platformInfo.cpu
    };

    console.log(`   🖥️ Plateforme: ${platformInfo.name} (${platformInfo.os})`);
    console.log(`   🏗️ Architecture: ${platformInfo.arch}`);
    if (platformInfo.distro) console.log(`   🐧 Distribution: ${platformInfo.distro}`);
    console.log(`   💾 Mémoire: ${platformInfo.memory.total}MB total, ${platformInfo.memory.free}MB libre`);
    console.log(`   ⚡ CPU: ${platformInfo.cpu.cores} cœurs, ${platformInfo.cpu.model}`);
    console.log('   ✅ Analyse système terminée\n');

    // 2. Vérifier les prérequis système
    console.log('2️⃣ 🔧 Vérification des prérequis...\n');
    const systemCheck = await platform.checkSystemRequirements();
    results.system.compatible = systemCheck.compatible;
    results.system.issues = systemCheck.issues;

    if (systemCheck.compatible) {
      console.log('   ✅ Prérequis système OK');
    } else {
      console.log('   ⚠️ Problèmes détectés:');
      systemCheck.issues.forEach((issue, i) => {
        console.log(`      ${i + 1}. ${issue}`);
      });
    }
    console.log('   ✅ Vérification prérequis terminée\n');

    // 3. Rechercher Android Studio
    console.log('3️⃣ 📝 Recherche Android Studio...\n');
    const studioPath = await platform.findAndroidStudio();
    results.androidStudio.found = !!studioPath;
    results.androidStudio.path = studioPath;

    if (studioPath) {
      console.log('   ✅ Android Studio trouvé');
      console.log(`   📍 Chemin: ${studioPath}`);
    } else {
      console.log('   ❌ Android Studio non trouvé');
      results.recommendations.push('Installer Android Studio depuis https://developer.android.com/studio');
    }
    console.log('   ✅ Recherche Android Studio terminée\n');

    // 4. Vérifier Android SDK
    console.log('4️⃣ 🔧 Vérification Android SDK...\n');
    try {
      await service.initialize();
      results.androidSdk.found = true;
      results.androidSdk.path = service.sdk.sdkPath;
      results.androidSdk.version = service.sdk.sdkVersion;

      console.log('   ✅ Android SDK trouvé');
      console.log(`   📍 Chemin: ${service.sdk.sdkPath}`);
      if (service.sdk.sdkVersion) {
        console.log(`   📦 Version: ${service.sdk.sdkVersion}`);
      }

      // Vérifier les outils
      const health = await service.sdk.checkHealth();
      console.log(`   🔧 Outils SDK: ${health.healthy ? 'OK' : 'ISSUES'}`);

      if (health.issues.length > 0) {
        console.log('   ⚠️ Problèmes outils:');
        health.issues.forEach(issue => console.log(`      • ${issue}`));
      }

    } catch (error) {
      results.androidSdk.found = false;
      results.androidSdk.error = error.message;
      console.log('   ❌ Android SDK non trouvé');
      console.log(`   🔴 Erreur: ${error.message}`);
      results.recommendations.push('Installer Android SDK ou définir ANDROID_HOME');
    }
    console.log('   ✅ Vérification SDK terminée\n');

    // 5. Vérifier ADB
    console.log('5️⃣ 📱 Test ADB...\n');
    try {
      const { stdout } = await service.executeCommand('adb version');
      const versionMatch = stdout.match(/version ([\d\.]+)/);
      const version = versionMatch ? versionMatch[1] : 'inconnue';

      results.adb.found = true;
      results.adb.version = version;
      console.log('   ✅ ADB trouvé');
      console.log(`   📦 Version: ${version}`);

      // Lister les devices
      const { stdout: devicesOutput } = await service.executeCommand('adb devices');
      const deviceLines = devicesOutput.split('\n').filter(line => line.includes('device') && !line.includes('List'));
      console.log(`   📱 Devices connectés: ${deviceLines.length}`);

    } catch (error) {
      results.adb.found = false;
      results.adb.error = error.message;
      console.log('   ❌ ADB non trouvé');
      console.log(`   🔴 Erreur: ${error.message}`);
      results.recommendations.push('Installer Android SDK Platform Tools');
    }
    console.log('   ✅ Test ADB terminé\n');

    // 6. Vérifier les émulateurs
    console.log('6️⃣ 🎮 Test des émulateurs...\n');
    try {
      const { stdout } = await service.executeCommand('emulator -list-avds');
      const avds = stdout.trim().split('\n').filter(name => name.trim());

      results.emulator.found = avds.length > 0;
      results.emulator.count = avds.length;
      results.emulator.list = avds;

      if (avds.length > 0) {
        console.log(`   ✅ Émulateurs trouvés: ${avds.length}`);
        avds.forEach((avd, i) => {
          console.log(`      ${i + 1}. ${avd}`);
        });
      } else {
        console.log('   ⚠️ Aucun émulateur trouvé');
        results.recommendations.push('Créer un émulateur via Android Studio ou avdmanager');
      }

    } catch (error) {
      results.emulator.found = false;
      results.emulator.error = error.message;
      console.log('   ❌ Émulateurs non accessibles');
      console.log(`   🔴 Erreur: ${error.message}`);
    }
    console.log('   ✅ Test émulateurs terminé\n');

    // 7. Vérifier NordVPN (optionnel)
    console.log('7️⃣ 🌍 Test NordVPN...\n');
    try {
      const { nordVPNService } = await import('../nordvpn/index.js');
      results.nordvpn.found = true;
      console.log('   ✅ NordVPN disponible');

      // Vérifier si installé
      try {
        await nordVPNService.checkInstallation();
        console.log('   ✅ NordVPN installé');
      } catch (error) {
        console.log('   ⚠️ NordVPN installé mais non accessible');
        console.log(`   💡 Erreur: ${error.message}`);
      }

    } catch (error) {
      results.nordvpn.found = false;
      console.log('   ⚠️ NordVPN non disponible (normal)');
      console.log(`   💡 Pour l'utiliser: ${error.message}`);
    }
    console.log('   ✅ Test NordVPN terminé\n');

    // 8. Nettoyer
    await service.cleanup();

  } catch (error) {
    console.error('\n❌ ERREUR FATALE LORS DU DIAGNOSTIC:');
    console.error(error.message);
    return;
  }

  // Rapport final
  console.log('📋 RAPPORT DE DIAGNOSTIC');
  console.log('========================\n');

  // État général
  const allGood = results.androidStudio.found && results.androidSdk.found && results.adb.found;
  console.log(`🎯 État général: ${allGood ? '✅ PRÊT' : '⚠️ CONFIGURATION REQUISE'}\n`);

  // Détails par composant
  console.log('📊 Détails par composant:');
  console.log(`   • Système: ${results.system.compatible ? '✅' : '❌'} (${results.system.platform})`);
  console.log(`   • Android Studio: ${results.androidStudio.found ? '✅' : '❌'} ${results.androidStudio.found ? 'Trouvé' : 'Non trouvé'}`);
  console.log(`   • Android SDK: ${results.androidSdk.found ? '✅' : '❌'} ${results.androidSdk.found ? 'Trouvé' : 'Non trouvé'}`);
  console.log(`   • ADB: ${results.adb.found ? '✅' : '❌'} ${results.adb.found ? `v${results.adb.version}` : 'Non trouvé'}`);
  console.log(`   • Émulateurs: ${results.emulator.found ? '✅' : '❌'} ${results.emulator.count || 0} trouvé(s)`);
  console.log(`   • NordVPN: ${results.nordvpn.found ? '✅' : '⚠️'} ${results.nordvpn.found ? 'Disponible' : 'Non disponible'}`);
  console.log('');

  // Recommandations
  if (results.recommendations.length > 0) {
    console.log('💡 Recommandations:');
    results.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    console.log('');
  }

  // Instructions d'installation
  if (!results.androidStudio.found) {
    console.log('🛠️ Instructions d\'installation Android Studio:');
    console.log('   1. Télécharger: https://developer.android.com/studio');
    console.log('   2. Installer Android SDK lors de la première ouverture');
    console.log('   3. Créer un émulateur via AVD Manager');
    console.log('');
  }

  // Variables d'environnement
  console.log('🔧 Variables d\'environnement recommandées:');
  if (results.androidSdk.path) {
    console.log(`   export ANDROID_HOME="${results.androidSdk.path}"`);
    console.log(`   export PATH="$PATH:${results.androidSdk.path}/platform-tools:${results.androidSdk.path}/tools"`);
  }
  console.log('   export ANDROID_AVD_HOME="$HOME/.android/avd"');
  console.log('');

  // Test rapide
  console.log('🚀 Commandes de test:');
  console.log('   node tools/android-studio/test-quick.js');
  console.log('   node tools/android-studio/example-whatsapp-nordvpn.js');
  console.log('');

  console.log('🎉 Diagnostic terminé !');

  return results;
}

// Lancer le diagnostic si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  fullDiagnostic().catch(console.error);
}

export { fullDiagnostic };
