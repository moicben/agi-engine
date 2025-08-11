const AssistanteScraper = require('./scraper');
const { CONFIG, getSelectedSources, getSelectedTerms, getSelectedCities } = require('./config');

// Aide pour les paramètres
function showHelp() {
  console.log(`
🔍 SCRAPER ASSISTANTES INDÉPENDANTES

Usage: node index.js [options]

Options:
  --sources=linkedin,malt,upwork    Sources à utiliser (défaut: toutes)
  --terms=assistante,secretaire     Termes à rechercher (défaut: tous)
  --pages=3                         Nombre de pages max par requête (défaut: 5)
  --export=json,csv,phones          Formats d'export (défaut: json,csv)
  --strategy=terms_cities           Stratégie de scraping (défaut: terms_cities)
  --verbose                         Mode verbeux
  --merge                           Fusionner avec données existantes
  --stats                           Afficher les stats détaillées
  --parallel                        Activer le mode parallèle (défaut: activé)
  --no-parallel                     Désactiver le mode parallèle
  --concurrency=5                   Nombre de requêtes simultanées (défaut: 5)
  --help                            Afficher cette aide

Stratégies disponibles:
  terms_only          Seulement les termes (ex: "assistante")
  sources_terms       Source + terme (ex: site:linkedin.com "assistante")
  terms_cities        Terme + ville (ex: "assistante" "Paris")
  sources_terms_cities Tout combiné (ex: site:linkedin.com "assistante" "Paris")

Sources disponibles:
  linkedin, malt, upwork, fiverr, hopwork, pagesjaunes, kompass, freelance, indeed

Termes disponibles:
  assistante_virtuelle, secretaire_independante, assistante_administrative,
  telesecretaire, assistante_direction, virtual_assistant, secretaire_freelance,
  assistante_commerciale, assistante_juridique, assistante_comptable

Exemples:
  node index.js --sources=linkedin,malt --terms=assistante_virtuelle,secretaire_independante
  node index.js --pages=3 --export=phones --verbose
  node index.js --merge --stats
  `);
}

// Parser les arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sources: null,
    terms: null,
    maxPages: CONFIG.API.MAX_PAGES,
    export: ['json', 'csv'],
    strategy: 'terms_cities',
    verbose: false,
    merge: false,
    showStats: false,
    help: false,
    parallel: CONFIG.CONCURRENCY.ENABLE_PARALLEL,
    concurrency: CONFIG.CONCURRENCY.MAX_CONCURRENT_REQUESTS
  };

  args.forEach(arg => {
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--merge') {
      options.merge = true;
    } else if (arg === '--stats') {
      options.showStats = true;
    } else if (arg === '--parallel') {
      options.parallel = true;
    } else if (arg === '--no-parallel') {
      options.parallel = false;
    } else if (arg.startsWith('--concurrency=')) {
      options.concurrency = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--sources=')) {
      const sourceKeys = arg.split('=')[1].split(',').map(s => s.trim().toUpperCase());
      options.sources = getSelectedSources(sourceKeys);
    } else if (arg.startsWith('--terms=')) {
      const termKeys = arg.split('=')[1].split(',').map(s => s.trim().toUpperCase());
      options.terms = getSelectedTerms(termKeys);
    } else if (arg.startsWith('--pages=')) {
      options.maxPages = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--export=')) {
      options.export = arg.split('=')[1].split(',').map(s => s.trim());
    } else if (arg.startsWith('--strategy=')) {
      options.strategy = arg.split('=')[1];
    }
  });

  return options;
}

// Fonction principale
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Démarrage du scraper

  // Configurer le mode parallèle
  CONFIG.CONCURRENCY.ENABLE_PARALLEL = options.parallel;
  CONFIG.CONCURRENCY.MAX_CONCURRENT_REQUESTS = options.concurrency;

  // Créer le scraper avec les options
  const scraper = new AssistanteScraper({
    sources: options.sources,
    terms: options.terms,
    cities: Object.values(CONFIG.CITIES), // Utiliser toutes les villes par défaut
    maxPages: options.maxPages,
    verbose: options.verbose,
    strategy: options.strategy
  });

  try {
    // Lancer le scraping
    const results = await scraper.run();

    // Fusionner avec les données existantes si demandé
    if (options.merge) {
      console.log('\n🔄 Fusion avec les données existantes...');
      await scraper.mergeWithExisting();
    }

    // Exporter les résultats
    await scraper.exportResults(options.export);

    // Afficher les stats si demandé
    if (options.showStats) {
      scraper.showStats();
    }

    // Fin du scraping
    
  } catch (error) {
    console.error('❌ Erreur durant le scraping:', error.message);
    process.exit(1);
  }
}

// Lancer le programme
if (require.main === module) {
  main();
} 