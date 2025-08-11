const axios = require('axios');
const { CONFIG } = require('./config');
const PhoneExtractor = require('./phone-extractor');
const DataExporter = require('./exporter');
const { leadManager } = require('./lead-manager');
const { dataMapper } = require('./data-mapper');
const ParallelExecutor = require('./parallel-executor');

class AssistanteScraper {
  constructor(options = {}) {
    this.config = CONFIG;
    this.phoneExtractor = new PhoneExtractor();
    this.dataExporter = new DataExporter();
    this.leadManager = leadManager;
    this.dataMapper = dataMapper;
    
    // Options personnalisables
    this.sources = options.sources || Object.values(CONFIG.SOURCES);
    this.terms = options.terms || Object.values(CONFIG.SEARCH_TERMS);
    this.cities = options.cities || Object.values(CONFIG.CITIES);
    this.maxPages = options.maxPages || CONFIG.API.MAX_PAGES;
    this.verbose = options.verbose || false;
    this.saveToSupabase = options.saveToSupabase !== false; // Activé par défaut
    
    // Stratégies de scraping disponibles
    this.strategy = options.strategy || 'terms_cities'; // 'terms_cities', 'sources_terms', 'sources_terms_cities', 'terms_only'
    
    // Données de session
    this.results = [];
    this.processedUrls = new Set();
    this.stats = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      pagesScraped: 0,
      citiesUsed: [],
      termsUsed: [],
      topCities: {},
      topTerms: {},
      
      // Nouvelles stats Supabase
      supabaseStats: {
        created: 0,
        updated: 0,
        duplicates: 0,
        errors: 0
      }
    };
  }

  // Faire une requête Serper
  async makeSerperRequest(query, page = 1) {
    const data = JSON.stringify({
      q: query,
      gl: "fr",
      hl: "fr",
      num: CONFIG.API.RESULTS_PER_PAGE,
      page: page
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: CONFIG.API.URL,
      headers: { 
        'X-API-KEY': CONFIG.API.KEY,
        'Content-Type': 'application/json'
      },
      data: data
    };

    try {
      this.stats.totalRequests++;
      const response = await axios.request(config);
      this.stats.successfulRequests++;
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur API Serper: ${error.message}`);
      return null;
    }
  }

  // Scraper une combinaison flexible (terme + ville + source optionnelle)
  async scrapCombination(term, city = null, source = null, taskId = null) {
    const tid = taskId || `${term}-${city || 'all'}-${source || 'all'}`;
    // ID plus lisible : prendre le terme complet
    const shortId = term.length > 12 ? term.substring(0, 12) : term;
    
    // Compteur de progression local
    let localPhoneCount = 0;
    let localPageCount = 0;
    
    let foundPhones = 0;
    let savedToSupabase = 0;
    let newLeadsCount = 0;
    let newPhoneNumbers = []; // Stocker les nouveaux numéros trouvés
    
    // Log de démarrage plus clair selon les paramètres
    let displayText = `"${term}"`;
    if (city) displayText += ` à ${city}`;
    if (source) displayText += ` sur ${source}`;
    
    console.log(`\n🔍 [${shortId}] ${displayText}`);
    
    for (let page = 1; page <= this.maxPages; page++) {

      // Construire la query avec term, city et source en premier
      let query = `"${term}"`;
      
      // Ajouter la ville si spécifiée
      if (city) {
        query += ` "${city}"`;
      }
      
      // Ajouter la restriction de source au début
      if (source) {
        query = `site:${source} ${query}`;
      }
      
      // Ajouter les mots-clés de contexte après
      query += ` ("freelance" OR "indépendante" OR "entrepreneuse" OR "auto-entrepreneuse" OR "à son compte" OR "auto-indépendante") ("+33" OR "06" OR "07")`; 
  
      const data = await this.makeSerperRequestSafe(query, page);
      
      if (!data || !data.organic || data.organic.length === 0) {
        break;
      }
      
      // Protection pour l'accès concurrent aux stats
      this.updateStatAtomic('pagesScraped', 1);
      localPageCount++;
      
      // Afficher la page en cours de traitement
      console.log(`   Page ${page}/${this.maxPages} - ${data.organic.length} résultats`);
      
      let pageNewPhones = 0;
      
      // Traiter chaque résultat
      for (const result of data.organic) {
        if (this.processedUrls.has(result.link)) continue;
        this.processedUrls.add(result.link);
        
        // Extraire phones du titre + snippet
        const text = `${result.title} ${result.snippet}`;
        const extractedPhones = this.phoneExtractor.extractAndNormalize(text);
        
        // Traiter chaque téléphone trouvé
        for (const phoneData of extractedPhones) {
          // Ajouter aux résultats (format ancien pour compatibilité)
          this.results.push({
            phone: phoneData.normalized,
            source: source ? source : null,
            term: term,
            city: city ? city : null,
            title: result.title,
            url: result.link,
            snippet: result.snippet,
            extractedFrom: phoneData.raw
          });
          foundPhones++;
          
          let leadResult = null;
          
          // Sauvegarder dans Supabase si activé
          if (this.saveToSupabase) {
            // MODIFICATION : Passer la query complète
            leadResult = await this.saveLeadToSupabase(result, phoneData, { 
              source: source ? source : 'google_search',
              term, 
              city,
              query // AJOUT : passer la query complète
            }, false); // Désactiver les logs verbeux
            if (leadResult && leadResult.success) {
              savedToSupabase++;
              // Mettre à jour les stats Supabase
              this.stats.supabaseStats[leadResult.action]++;
              
              // Compter les nouveaux leads localement
              if (leadResult.action === 'created') {
                newLeadsCount++;
                pageNewPhones++;
                newPhoneNumbers.push(phoneData.normalized);
                // Afficher le nouveau numéro trouvé
                //console.log(`   ✅ NOUVEAU: ${phoneData.normalized}`);
              }
            }
          }
          
          localPhoneCount++;
        }
      }
      
      // Récap de fin de page
      if (pageNewPhones > 0) {
        console.log(`   📊 Page ${page}: ${pageNewPhones} nouveaux numéros trouvés`);
      } else {
        console.log(`   📊 Page ${page}: aucun nouveau numéro`);
      }
      
      // Pause entre les pages
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAYS.BETWEEN_PAGES));
    }
    
    // Mettre à jour les stats avec protection
    this.updateStats(city || 'all', term, foundPhones);
    
    // Log final de la tâche avec résumé
    console.log(`\n✅ [${shortId}] Terminé: ${foundPhones} numéros total (${newLeadsCount} nouveaux)`);
    
    // Afficher les nouveaux numéros trouvés si il y en a
    if (newPhoneNumbers.length > 0) {
      console.log(`   📱 Nouveaux numéros: ${newPhoneNumbers.join(', ')}`);
    }
    
    return foundPhones;
  }

  // Créer les tâches selon la stratégie choisie
  createTasks() {
    const tasks = [];
    
    switch (this.strategy) {
      case 'terms_only':
        // Seulement les termes, sans ville ni source
        for (const term of this.terms) {
          const taskId = `${term}`;
          const taskFunction = async () => {
            const foundPhones = await this.scrapCombination(term, null, null, taskId);
            return { term, foundPhones };
          };
          tasks.push({ id: taskId, task: taskFunction });
        }
        break;
        
      case 'sources_terms':
        // Combinaisons source × terme (sans ville)
        for (const source of this.sources) {
          for (const term of this.terms) {
            const taskId = `${source}-${term}`;
            const taskFunction = async () => {
              const foundPhones = await this.scrapCombination(term, null, source, taskId);
              return { source, term, foundPhones };
            };
            tasks.push({ id: taskId, task: taskFunction });
          }
        }
        break;
        
      case 'sources_terms_cities':
        // Combinaisons source × terme × ville (toutes les combinaisons)
        for (const source of this.sources) {
          for (const term of this.terms) {
            for (const city of this.cities) {
              const taskId = `${source}-${term}-${city}`;
              const taskFunction = async () => {
                const foundPhones = await this.scrapCombination(term, city, source, taskId);
                return { source, term, city, foundPhones };
              };
              tasks.push({ id: taskId, task: taskFunction });
            }
          }
        }
        break;
        
      case 'terms_cities':
      default:
        // Combinaisons terme × ville (sans source spécifique)
        for (const term of this.terms) {
          for (const city of this.cities) {
            const taskId = `${term}-${city}`;
            const taskFunction = async () => {
              const foundPhones = await this.scrapCombination(term, city, null, taskId);
              return { term, city, foundPhones };
            };
            tasks.push({ id: taskId, task: taskFunction });
          }
        }
        break;
    }
    
    return tasks;
  }

  // Sauvegarder un lead dans Supabase
  async saveLeadToSupabase(googleResult, phoneData, sourceInfo, verbose = true) {
    try {
      // Transformer les données Google en format Lead
      const leadData = this.dataMapper.transformGoogleResult(googleResult, sourceInfo);
      
      if (!leadData) {
        console.warn('⚠️  Erreur transformation données Google');
        return null;
      }
      
      // Ajouter le numéro de téléphone normalisé
      leadData.phone = phoneData.normalized;
      
      // Ajouter des données supplémentaires
      leadData.additional_data = {
        ...leadData.additional_data,
        raw_phone: phoneData.raw,
        extraction_pattern: phoneData.pattern || 'unknown',
        scraped_at: new Date().toISOString()
      };
      
      // Sauvegarder avec déduplication automatique
      const result = await this.leadManager.createLead(leadData, verbose);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur sauvegarde Supabase: ${error.message}`);
      this.stats.supabaseStats.errors++;
      return null;
    }
  }

  // Mettre à jour les statistiques
  updateStats(city, term, phonesFound) {
    // Initialiser les tableaux si ils n'existent pas
    if (!this.stats.citiesUsed) this.stats.citiesUsed = [];
    if (!this.stats.termsUsed) this.stats.termsUsed = [];
    if (!this.stats.topCities) this.stats.topCities = {};
    if (!this.stats.topTerms) this.stats.topTerms = {};
    
    if (!this.stats.citiesUsed.includes(city)) {
      this.stats.citiesUsed.push(city);
    }
    if (!this.stats.termsUsed.includes(term)) {
      this.stats.termsUsed.push(term);
    }
    
    this.stats.topCities[city] = (this.stats.topCities[city] || 0) + phonesFound;
    this.stats.topTerms[term] = (this.stats.topTerms[term] || 0) + phonesFound;
  }

  // Lancer le scraping complet (mode parallèle ou séquentiel)
  async run() {
    // Affichage selon la stratégie
    let strategyDisplay = '';
    switch (this.strategy) {
      case 'terms_only':
        strategyDisplay = `${this.terms.length} termes`;
        break;
      case 'sources_terms':
        strategyDisplay = `${this.sources.length} sources × ${this.terms.length} termes`;
        break;
      case 'sources_terms_cities':
        strategyDisplay = `${this.sources.length} sources × ${this.terms.length} termes × ${this.cities.length} villes`;
        break;
      case 'terms_cities':
      default:
        strategyDisplay = `${this.terms.length} termes × ${this.cities.length} villes`;
        break;
    }
    
    console.log(`\n🔍 Scraping (${this.strategy}): ${strategyDisplay}`);
    
    if (this.saveToSupabase) {
      // Réinitialiser les stats du Lead Manager
      this.leadManager.resetStats();
    }
    
    // Utiliser le mode parallèle si activé
    if (CONFIG.CONCURRENCY.ENABLE_PARALLEL) {
      return await this.runParallel();
    } else {
      return await this.runSequential();
    }
  }

  // Exécution parallèle avec ParallelExecutor
  async runParallel() {
    // Initialiser les stats si pas déjà fait
    if (!this.stats.startTime) {
      this.stats.startTime = Date.now();
    }
    
    const executor = new ParallelExecutor({
      maxConcurrency: CONFIG.CONCURRENCY.MAX_CONCURRENT_REQUESTS,
      verbose: this.verbose,
      retryAttempts: CONFIG.CONCURRENCY.RETRY_ATTEMPTS,
      retryDelay: CONFIG.CONCURRENCY.RETRY_DELAY
    });

    // Créer les tâches selon la stratégie choisie
    const tasks = this.createTasks();

    // Affichage selon la stratégie
    let strategyDisplay = '';
    switch (this.strategy) {
      case 'terms_only':
        strategyDisplay = `${this.terms.length} termes`;
        break;
      case 'sources_terms':
        strategyDisplay = `${this.sources.length} sources × ${this.terms.length} termes`;
        break;
      case 'sources_terms_cities':
        strategyDisplay = `${this.sources.length} sources × ${this.terms.length} termes × ${this.cities.length} villes`;
        break;
      case 'terms_cities':
      default:
        strategyDisplay = `${this.terms.length} termes × ${this.cities.length} villes`;
        break;
    }
    
    console.log(`\n🚀 Démarrage: ${strategyDisplay} = ${tasks.length} tâches en parallèle (max ${CONFIG.CONCURRENCY.MAX_CONCURRENT_REQUESTS})`);
    
    // Ajouter un listener pour afficher la progression en temps réel
    let lastProgressUpdate = Date.now();
    const progressInterval = setInterval(() => {
      const stats = executor.getStats();
      if (stats.totalTasks > 0 && stats.inProgress > 0) {
        this.displayProgress(stats);
      }
    }, 5000); // Mise à jour toutes les 5 secondes seulement
    
    // Exécuter toutes les tâches en parallèle
    const results = await executor.execute(tasks);
    
    // Arrêter l'affichage de progression
    clearInterval(progressInterval);
    
    // Finaliser les stats
    this.stats.endTime = Date.now();
    this.stats.processingTime = this.stats.endTime - this.stats.startTime;
    this.stats.totalPhones = this.results.length;
    this.stats.uniquePhones = this.phoneExtractor.getStats().totalExtracted;
    this.stats.successRate = (this.stats.successfulRequests / this.stats.totalRequests) * 100;
    
    // Ajouter les stats Supabase
    if (this.saveToSupabase) {
      const leadManagerStats = this.leadManager.getSessionStats();
      this.stats.supabaseStats = leadManagerStats;
    }
    
    // Afficher le résumé final
    this.displayFinalSummary();
    
    return this.results;
  }

  // Exécution séquentielle (ancienne méthode)
  async runSequential() {
    // Initialiser les stats si pas déjà fait
    if (!this.stats.startTime) {
      this.stats.startTime = Date.now();
    }
    
    let totalCombinations = this.sources.length * this.terms.length;
    let currentCombination = 0;
    
    for (const source of this.sources) {
      for (const term of this.terms) {
        currentCombination++;
        
        if (this.verbose) {
          console.log(`\n[${currentCombination}/${totalCombinations}] Processing...`);
        }
        
        const foundPhones = await this.scrapSourceTerm(source, term);
        
        console.log(`📱 ${foundPhones} nouveaux numéros | Total: ${this.results.length}`);
        
        // Pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, CONFIG.DELAYS.BETWEEN_REQUESTS));
      }
      
      // Pause plus longue entre les sources
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAYS.BETWEEN_SOURCES));
    }
    
    // Finaliser les stats
    this.stats.endTime = Date.now();
    this.stats.processingTime = this.stats.endTime - this.stats.startTime;
    this.stats.totalPhones = this.results.length;
    this.stats.uniquePhones = this.phoneExtractor.getStats().totalExtracted;
    this.stats.successRate = (this.stats.successfulRequests / this.stats.totalRequests) * 100;
    
    // Ajouter les stats Supabase
    if (this.saveToSupabase) {
      const leadManagerStats = this.leadManager.getSessionStats();
      this.stats.supabaseStats = leadManagerStats;
    }
    
    // Afficher le résumé final
    this.displayFinalSummary();
    
    return this.results;
  }

  // Exporter les résultats (format legacy)
  async exportResults(formats = ['json', 'csv']) {
    console.log('\n📁 Export des résultats...');
    
    if (formats.includes('all')) {
      return this.dataExporter.exportAll(this.results, this.stats);
    }
    
    const results = {};
    
    if (formats.includes('json')) {
      results.json = this.dataExporter.exportJSON(this.results);
    }
    
    if (formats.includes('csv')) {
      results.csv = this.dataExporter.exportCSV(this.results);
    }
    
    if (formats.includes('stats')) {
      results.stats = this.dataExporter.exportStats(this.stats);
    }
    
    return results;
  }

  // Obtenir les stats complètes (avec Supabase)
  async getCompleteStats() {
    const basicStats = { ...this.stats };
    
    if (this.saveToSupabase) {
      try {
        const supabaseStats = await this.leadManager.getLeadStats();
        basicStats.supabaseGlobalStats = supabaseStats;
      } catch (error) {
        console.error('❌ Erreur récupération stats Supabase:', error.message);
      }
    }
    
    return basicStats;
  }

  // Méthode atomique pour mettre à jour les stats (protection accès concurrent)
  updateStatAtomic(statName, increment = 1) {
    // Dans un environnement Node.js single-thread, cette méthode est suffisante
    // Pour un vrai multi-threading, il faudrait utiliser des mutex ou atomic operations
    if (typeof this.stats[statName] === 'number') {
      this.stats[statName] += increment;
    }
  }

  // Version thread-safe de makeSerperRequest
  async makeSerperRequestSafe(query, page = 1) {
    const data = JSON.stringify({
      q: query,
      gl: "fr",
      hl: "fr",
      num: CONFIG.API.RESULTS_PER_PAGE,
      page: page
    });

    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: CONFIG.API.URL,
      headers: { 
        'X-API-KEY': CONFIG.API.KEY,
        'Content-Type': 'application/json'
      },
      data: data
    };

    try {
      this.updateStatAtomic('totalRequests');
      const response = await axios.request(config);
      this.updateStatAtomic('successfulRequests');
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur API Serper: ${error.message}`);
      return null;
    }
  }

  // Méthode pour afficher la progression en temps réel
  displayProgress(executorStats, isFinal = false) {
    const completed = executorStats.completedTasks + executorStats.failedTasks;
    const progress = executorStats.totalTasks > 0 ? ((completed / executorStats.totalTasks) * 100).toFixed(0) : 0;
    const elapsed = Math.round((Date.now() - this.stats.startTime) / 1000);
    
    // Affichage simple et clair
    if (isFinal) {
      console.log(`\n🎯 Résultats: ${this.results.length} numéros | ${this.stats.supabaseStats.created} nouveaux`);
    } else if (executorStats.inProgress > 0) {
      // Affichage périodique simple avec les stats Supabase
      console.log(`\n📊 En cours: ${progress}% | ${this.stats.supabaseStats.created} nouveaux | ${executorStats.inProgress} tâches actives`);
    }
  }

  // Afficher le résumé final
  displayFinalSummary() {
    const duration = Math.round(this.stats.processingTime / 1000);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎯 RÉSUMÉ DU SCRAPING`);
    console.log(`${'='.repeat(50)}`);
    console.log(`⏱️  Durée: ${duration}s`);
    console.log(`📊 Total numéros: ${this.results.length}`);
    console.log(`🆕 Nouveaux: ${this.stats.supabaseStats.created}`);
    console.log(`♻️  Existants: ${this.stats.supabaseStats.updated + this.stats.supabaseStats.duplicates}`);
    console.log(`📈 Taux de succès: ${this.stats.successRate?.toFixed(1) || 0}%`);
    console.log(`🏙️  Villes testées: ${this.stats.citiesUsed?.length || 0}`);
    console.log(`🔤 Termes testés: ${this.stats.termsUsed?.length || 0}`);
    console.log(`${'='.repeat(50)}`);
  }
}

module.exports = AssistanteScraper; 