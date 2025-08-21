const { supabaseClient } = require('./supabase-client');

class LeadManager {
  constructor() {
    this.tableName = 'contacts';
    this.stats = {
      created: 0,
      updated: 0,
      duplicates: 0,
      errors: 0
    };
    
    // File d'attente pour les opérations concurrentes
    this.operationQueue = [];
    this.isProcessing = false;
    this.maxConcurrentOps = 3; // Limite les opérations DB simultanées
    this.activeOperations = 0;
  }

  // Créer un lead avec file d'attente pour gestion concurrente
  async createLead(leadData, verbose = true) {
    // Ajouter à la file d'attente pour éviter les race conditions
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'create',
        data: leadData,
        verbose,
        resolve,
        reject
      });
      
      // Démarrer le traitement si pas déjà en cours
      this.processQueue();
    });
  }

  // Traiter la file d'attente des opérations
  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.operationQueue.length > 0 && this.activeOperations < this.maxConcurrentOps) {
      const operation = this.operationQueue.shift();
      this.activeOperations++;
      
      // Exécuter l'opération sans attendre (parallèle)
      this.executeOperation(operation).finally(() => {
        this.activeOperations--;
        // Continuer à traiter la queue
        if (this.operationQueue.length > 0) {
          this.processQueue();
        }
      });
    }
    
    this.isProcessing = false;
  }

  // Exécuter une opération de la file
  async executeOperation(operation) {
    try {
      let result;
      
      switch (operation.type) {
        case 'create':
          result = await this._createLeadInternal(operation.data, operation.verbose);
          break;
        case 'update':
          result = await this._updateLeadInternal(operation.phone, operation.data, operation.verbose);
          break;
        default:
          throw new Error(`Type d'opération inconnu: ${operation.type}`);
      }
      
      operation.resolve(result);
    } catch (error) {
      operation.reject(error);
    }
  }

  // Méthode interne pour créer un lead (ancienne méthode createLead)
  async _createLeadInternal(leadData, verbose = true) {
    try {
      // Normaliser le numéro de téléphone
      const normalizedPhone = this.normalizePhone(leadData.phone);
      
      // Vérifier si le lead existe déjà
      const existingLead = await this.findLead(normalizedPhone);
      
      if (existingLead) {
        // Pas de log pour les leads existants, trop verbeux
        
        // Merger les données si le lead existant a moins d'informations
        const mergedData = this.mergeLeadData(existingLead, leadData);
        
        if (this.shouldUpdate(existingLead, mergedData)) {
          const updatedLead = await this._updateLeadInternal(normalizedPhone, mergedData);
          this.stats.updated++;
          return {
            success: true,
            action: 'updated',
            lead: updatedLead,
            message: `Lead mis à jour: ${normalizedPhone}`
          };
        } else {
          this.stats.duplicates++;
          return {
            success: true,
            action: 'duplicate',
            lead: existingLead,
            message: `Lead déjà existant: ${normalizedPhone}`
          };
        }
      }
      
      // Créer le nouveau lead
      const newLeadData = {
        ...leadData,
        phone: normalizedPhone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const result = await supabaseClient.insert(this.tableName, newLeadData);
      
      if (result.error) {
        throw new Error(`Erreur création lead: ${result.error.message}`);
      }
      
            this.stats.created++;
      
      // Log uniquement pour les nouveaux leads
      if (verbose) {
        console.log(`🆕 Nouveau: ${normalizedPhone}`);
      }
      
      return {
        success: true,
        action: 'created',
        lead: result.data[0],
        message: `Lead créé: ${normalizedPhone}`
      };
          
        } catch (error) {
      this.stats.errors++;
      console.error('❌ Erreur createLead:', error.message);
      return {
        success: false,
        action: 'error',
        error: error.message,
        message: `Erreur: ${error.message}`
      };
    }
  }

  // Mettre à jour un lead avec file d'attente
  async updateLead(phone, updates) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'update',
        phone,
        data: updates,
        resolve,
        reject
      });
      
      this.processQueue();
    });
  }

  // Méthode interne pour mettre à jour un lead
  async _updateLeadInternal(phone, updates, verbose = true) {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      const result = await supabaseClient.update(
        this.tableName,
        updateData,
        { phone: normalizedPhone }
      );
      
      if (result.error) {
        throw new Error(`Erreur mise à jour lead: ${result.error.message}`);
      }
      
      return result.data[0];
      
    } catch (error) {
      console.error('❌ Erreur updateLead:', error.message);
      throw error;
    }
  }

  // Trouver un lead par numéro de téléphone
  async findLead(phone) {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const result = await supabaseClient.select(
        this.tableName,
        '*',
        { phone: normalizedPhone }
      );
      
      if (result.error) {
        throw new Error(`Erreur recherche lead: ${result.error.message}`);
      }
      
      return result.data && result.data.length > 0 ? result.data[0] : null;
      
    } catch (error) {
      console.error('❌ Erreur findLead:', error.message);
      return null;
    }
  }

  // Obtenir les statistiques des contacts
  async getLeadStats() {
    try {
      // Stats globales
      const countResult = await supabaseClient.select(
        this.tableName,
        'count',
        {}
      );
      
      // Stats par source
      const sourceStats = await supabaseClient.executeQuery(async (client) => {
        return await client
          .from(this.tableName)
          .select('source_type, source_platform, count(*)')
          .group('source_type, source_platform');
      });
      
      // Stats par status
      const statusStats = await supabaseClient.executeQuery(async (client) => {
        return await client
          .from(this.tableName)
          .select('status, count(*)')
          .group('status');
      });
      
      // Stats de qualité
      const qualityStats = await supabaseClient.executeQuery(async (client) => {
        return await client
          .from(this.tableName)
          .select('quality_score')
          .not('quality_score', 'is', null);
      });
      
      return {
        total: countResult.data ? countResult.data.length : 0,
        sessionStats: this.stats,
        sourceStats: sourceStats.data || [],
        statusStats: statusStats.data || [],
        avgQuality: qualityStats.data ? 
          qualityStats.data.reduce((sum, lead) => sum + lead.quality_score, 0) / qualityStats.data.length : 0,
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Erreur getLeadStats:', error.message);
      return {
        total: 0,
        sessionStats: this.stats,
        error: error.message
      };
    }
  }

  // Obtenir tous les contacts avec filtres
  async getLeads(filters = {}, limit = 100) {
    try {
      const result = await supabaseClient.executeQuery(async (client) => {
        let query = client.from(this.tableName).select('*');
        
        // Appliquer les filtres
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        return await query.limit(limit).order('created_at', { ascending: false });
      });
      
      if (result.error) {
        throw new Error(`Erreur récupération contacts: ${result.error.message}`);
      }
      
      return result.data || [];
      
    } catch (error) {
      console.error('❌ Erreur getLeads:', error.message);
      return [];
    }
  }

  // Supprimer un lead
  async deleteLead(phone) {
    try {
      const normalizedPhone = this.normalizePhone(phone);
      
      const result = await supabaseClient.delete(
        this.tableName,
        { phone: normalizedPhone }
      );
      
      if (result.error) {
        throw new Error(`Erreur suppression lead: ${result.error.message}`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur deleteLead:', error.message);
      return false;
    }
  }

  // Normaliser le numéro de téléphone
  normalizePhone(phone) {
    if (!phone) return phone;
    
    // Supprimer tous les espaces, points, tirets
    let normalized = phone.replace(/[\s.\-()]/g, '');
    
    // Convertir +33 en 0
    if (normalized.startsWith('+33')) {
      normalized = '0' + normalized.substring(3);
    }
    
    // Convertir 33 en 0 (sans +)
    if (normalized.startsWith('33') && normalized.length === 11) {
      normalized = '0' + normalized.substring(2);
    }
    
    return normalized;
  }

  // Merger les données de deux contacts
  mergeLeadData(existing, newData) {
    const merged = { ...existing };
    
    // Merger les champs simples (remplacer si plus d'infos)
    ['first_name', 'last_name', 'company', 'title', 'email'].forEach(field => {
      if (newData[field] && (!existing[field] || newData[field].length > existing[field].length)) {
        merged[field] = newData[field];
      }
    });
    
    // Merger les données additionnelles
    if (newData.additional_data) {
      merged.additional_data = {
        ...existing.additional_data,
        ...newData.additional_data
      };
    }
    
    // Augmenter le score de qualité si plus d'infos
    const newQualityScore = this.calculateQualityScore(merged);
    if (newQualityScore > existing.quality_score) {
      merged.quality_score = newQualityScore;
    }
    
    return merged;
  }

  // Déterminer si un lead doit être mis à jour
  shouldUpdate(existing, merged) {
    // Comparer les champs principaux
    const fieldsToCompare = ['first_name', 'last_name', 'company', 'title', 'email'];
    
    for (const field of fieldsToCompare) {
      if (merged[field] !== existing[field]) {
        return true;
      }
    }
    
    // Comparer les données additionnelles
    if (JSON.stringify(merged.additional_data) !== JSON.stringify(existing.additional_data)) {
      return true;
    }
    
    return false;
  }

  // Calculer le score de qualité d'un lead
  calculateQualityScore(lead) {
    let score = 0;
    
    // Champs de base
    if (lead.phone) score += 20;
    if (lead.first_name) score += 15;
    if (lead.last_name) score += 15;
    if (lead.company) score += 20;
    if (lead.title) score += 15;
    if (lead.email) score += 15;
    
    return Math.min(score, 100);
  }

  // Réinitialiser les stats de session
  resetStats() {
    this.stats = {
      created: 0,
      updated: 0,
      duplicates: 0,
      errors: 0
    };
  }

  // Obtenir les stats de session
  getSessionStats() {
    return { ...this.stats };
  }
}

// Instance singleton
const leadManager = new LeadManager();

module.exports = {
  LeadManager,
  leadManager
}; 