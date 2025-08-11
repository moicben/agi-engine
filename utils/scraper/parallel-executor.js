const { CONFIG } = require('./config');

class ParallelExecutor {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || CONFIG.CONCURRENCY.MAX_CONCURRENT_REQUESTS;
    this.batchSize = options.batchSize || CONFIG.CONCURRENCY.BATCH_SIZE;
    this.retryAttempts = options.retryAttempts || CONFIG.CONCURRENCY.RETRY_ATTEMPTS;
    this.retryDelay = options.retryDelay || CONFIG.CONCURRENCY.RETRY_DELAY;
    this.verbose = options.verbose || false;
    
    // Statistiques d'exécution
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      inProgress: 0,
      startTime: null,
      endTime: null
    };
    
    // File d'attente et workers actifs
    this.queue = [];
    this.activeWorkers = new Set();
    this.results = [];
  }

  // Ajouter une tâche à la file d'attente
  addTask(task, taskId) {
    const taskWrapper = {
      id: taskId || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      task,
      attempts: 0,
      status: 'pending',
      addedAt: Date.now()
    };
    
    this.queue.push(taskWrapper);
    this.stats.totalTasks++;
    
    return taskWrapper.id;
  }

  // Ajouter plusieurs tâches
  addTasks(tasks) {
    return tasks.map((taskObj, index) => {
      // Si c'est un objet avec id et task, extraire correctement
      if (taskObj && typeof taskObj === 'object' && taskObj.task) {
        return this.addTask(taskObj.task, taskObj.id || `batch-${Date.now()}-${index}`);
      }
      // Sinon, considérer que c'est directement une fonction
      return this.addTask(taskObj, `batch-${Date.now()}-${index}`);
    });
  }

  // Exécuter toutes les tâches en parallèle avec limitation
  async execute(tasks = null) {
    if (tasks) {
      this.addTasks(tasks);
    }
    
    if (this.queue.length === 0) {
      console.log('⚠️  Aucune tâche à exécuter');
      return [];
    }
    
    this.stats.startTime = Date.now();
    
    // Lancer les workers jusqu'à la limite de concurrence
    const workers = [];
    for (let i = 0; i < Math.min(this.maxConcurrency, this.queue.length); i++) {
      workers.push(this.processQueue());
    }
    
    // Attendre que tous les workers terminent
    await Promise.all(workers);
    
    this.stats.endTime = Date.now();
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    
    // Log de fin simplifié
    console.log(`\n✅ Exécution parallèle terminée en ${duration.toFixed(2)}s`);
    
    return this.results;
  }

  // Traiter la file d'attente
  async processQueue() {
    while (this.queue.length > 0) {
      const taskWrapper = this.queue.shift();
      if (!taskWrapper) break;
      
      const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      this.activeWorkers.add(workerId);
      this.stats.inProgress++;
      
      try {
        await this.executeTask(taskWrapper);
      } catch (error) {
        // L'erreur est déjà gérée dans executeTask
      }
      
      this.stats.inProgress--;
      this.activeWorkers.delete(workerId);
      
      // Pas de log de progression ici, géré par le scraper
    }
  }

  // Exécuter une tâche avec retry
  async executeTask(taskWrapper) {
    const { id, task } = taskWrapper;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        taskWrapper.status = 'running';
        taskWrapper.startTime = Date.now();
        
        // Log de démarrage seulement pour les retries
        if (attempt > 1 && this.verbose) {
          console.log(`🔄 [${id.split('-').pop().substring(0, 8)}] Retry ${attempt}/${this.retryAttempts}`);
        }
        
        // Exécuter la tâche
        const result = await task();
        
        taskWrapper.status = 'completed';
        taskWrapper.endTime = Date.now();
        taskWrapper.result = result;
        taskWrapper.duration = taskWrapper.endTime - taskWrapper.startTime;
        
        this.stats.completedTasks++;
        this.results.push({
          id,
          success: true,
          result,
          duration: taskWrapper.duration,
          attempts: attempt
        });
        
        // Pas de log individuel de succès, sera affiché dans le résumé
        
        return result;
        
      } catch (error) {
        taskWrapper.lastError = error.message;
        
        if (attempt < this.retryAttempts) {
          if (this.verbose) {
            console.warn(`⚠️  [${id.split('-').pop().substring(0, 8)}] Échec, retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        } else {
          taskWrapper.status = 'failed';
          taskWrapper.endTime = Date.now();
          
          this.stats.failedTasks++;
          this.results.push({
            id,
            success: false,
            error: error.message,
            attempts: attempt
          });
          
          console.error(`❌ [${id.split('-').pop().substring(0, 8)}] Échec définitif: ${error.message}`);
        }
      }
    }
  }

  // Afficher la progression
  logProgress() {
    const progress = ((this.stats.completedTasks + this.stats.failedTasks) / this.stats.totalTasks * 100).toFixed(1);
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(1);
    
    // Log plus simple, seulement le pourcentage et les tâches actives
    console.log(`📊 ${progress}% | Actives: ${this.stats.inProgress} | Temps: ${elapsed}s`);
  }

  // Obtenir les statistiques
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalTasks > 0 
        ? (this.stats.completedTasks / this.stats.totalTasks * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  // Réinitialiser l'exécuteur
  reset() {
    this.queue = [];
    this.activeWorkers.clear();
    this.results = [];
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      inProgress: 0,
      startTime: null,
      endTime: null
    };
  }

  // Diviser les tâches en lots
  static createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

module.exports = ParallelExecutor; 