const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');

class DataExporter {
  constructor() {
    this.exports = CONFIG.EXPORTS;
    this.ensureExportDir();
  }

  // Créer le répertoire d'export s'il n'existe pas
  ensureExportDir() {
    if (!fs.existsSync(this.exports.EXPORT_DIR)) {
      fs.mkdirSync(this.exports.EXPORT_DIR, { recursive: true });
      console.log(`📁 Répertoire créé: ${this.exports.EXPORT_DIR}`);
    }
  }

  // Exporter les données complètes en JSON
  exportJSON(data, filename = null) {
    const file = filename || this.exports.JSON_FILE;
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      // Export JSON réussi
      return true;
    } catch (error) {
      console.error(`❌ Erreur export JSON: ${error.message}`);
      return false;
    }
  }

  // Exporter les numéros en CSV
  exportCSV(data, filename = null) {
    const file = filename || this.exports.CSV_FILE;
    try {
      const csvHeader = 'Phone,Title,Source,Term,URL,Snippet\n';
      const csvContent = data.map(item => 
        `${item.phone},"${this.escapeCSV(item.title)}","${item.source}","${item.term}","${item.url}","${this.escapeCSV(item.snippet)}"`
      ).join('\n');
      
      fs.writeFileSync(file, csvHeader + csvContent);
      // Export CSV réussi
      return true;
    } catch (error) {
      console.error(`❌ Erreur export CSV: ${error.message}`);
      return false;
    }
  }

  // Exporter uniquement les numéros (format simple)
  exportPhonesList(data, filename = null) {
    const file = filename || path.join(this.exports.EXPORT_DIR, 'phones_only.txt');
    try {
      const phones = data.map(item => item.phone).join('\n');
      fs.writeFileSync(file, phones);
      console.log(`✅ Liste téléphones exportée: ${file}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur export phones: ${error.message}`);
      return false;
    }
  }

  // Exporter les statistiques de scraping
  exportStats(stats, filename = null) {
    const file = filename || this.exports.STATS_FILE;
    try {
      const statsData = {
        timestamp: new Date().toISOString(),
        total_phones: stats.totalPhones,
        unique_phones: stats.uniquePhones,
        sources_used: stats.sourcesUsed,
        terms_used: stats.termsUsed,
        pages_scraped: stats.pagesScraped,
        processing_time: stats.processingTime,
        success_rate: stats.successRate,
        top_sources: stats.topSources,
        top_terms: stats.topTerms
      };
      
      fs.writeFileSync(file, JSON.stringify(statsData, null, 2));
      console.log(`✅ Stats exportées: ${file}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur export stats: ${error.message}`);
      return false;
    }
  }

  // Exporter par source (dossiers séparés)
  exportBySources(data) {
    const sourceGroups = this.groupBySource(data);
    
    Object.keys(sourceGroups).forEach(source => {
      const safeSource = source.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = path.join(this.exports.EXPORT_DIR, `export_${safeSource}.json`);
      this.exportJSON(sourceGroups[source], filename);
    });
  }

  // Exporter format Excel-compatible
  exportExcel(data, filename = null) {
    const file = filename || path.join(this.exports.EXPORT_DIR, 'assistantes_excel.csv');
    try {
      const csvHeader = 'Téléphone;Nom/Titre;Source;Terme de recherche;URL;Description\n';
      const csvContent = data.map(item => 
        `${item.phone};${this.escapeCSV(item.title, ';')};${item.source};${item.term};${item.url};${this.escapeCSV(item.snippet, ';')}`
      ).join('\n');
      
      fs.writeFileSync(file, csvHeader + csvContent);
      console.log(`✅ Excel CSV exporté: ${file}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur export Excel: ${error.message}`);
      return false;
    }
  }

  // Exporter tous les formats
  exportAll(data, stats) {
    console.log('📁 Export de tous les formats...');
    
    const results = {
      json: this.exportJSON(data),
      csv: this.exportCSV(data),
      phonesList: this.exportPhonesList(data),
      stats: this.exportStats(stats),
      excel: this.exportExcel(data)
    };
    
    const successCount = Object.values(results).filter(r => r).length;
    console.log(`✅ ${successCount}/5 formats exportés avec succès`);
    
    return results;
  }

  // Utilitaires
  escapeCSV(text, separator = ',') {
    if (!text) return '';
    return text.replace(/"/g, '""').replace(new RegExp(separator, 'g'), ' ');
  }

  groupBySource(data) {
    return data.reduce((groups, item) => {
      const source = item.source;
      if (!groups[source]) {
        groups[source] = [];
      }
      groups[source].push(item);
      return groups;
    }, {});
  }

  // Lire les données existantes
  readExistingData(filename) {
    try {
      if (fs.existsSync(filename)) {
        const content = fs.readFileSync(filename, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`❌ Erreur lecture fichier: ${error.message}`);
    }
    return [];
  }

  // Fusionner avec les données existantes
  mergeWithExisting(newData, filename = null) {
    const file = filename || this.exports.JSON_FILE;
    const existingData = this.readExistingData(file);
    
    const existingPhones = new Set(existingData.map(item => item.phone));
    const uniqueNewData = newData.filter(item => !existingPhones.has(item.phone));
    
    const mergedData = [...existingData, ...uniqueNewData];
    
    console.log(`📊 Fusion: ${existingData.length} existants + ${uniqueNewData.length} nouveaux = ${mergedData.length} total`);
    
    return mergedData;
  }
}

module.exports = DataExporter; 