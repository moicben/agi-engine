#!/usr/bin/env node

// Script simple pour scraper Google Maps et enregistrer dans la table contacts
// Usage:
//   node scripts/maps-scraper.js --lat=45.9660612 --lng=-74.4691661 --q="adjointe virtuelle"

import { launchBrowser } from '../tools/puppeteer/client.js';
import { upsertLeadContact } from '../tools/supabase/contacts.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { lat: null, lng: null, q: null, zoom: '7z' };
  for (const arg of args) {
    if (arg.startsWith('--lat=')) options.lat = arg.split('=')[1];
    else if (arg.startsWith('--lng=')) options.lng = arg.split('=')[1];
    else if (arg.startsWith('--q=')) options.q = arg.split('=')[1];
    else if (arg.startsWith('--zoom=')) options.zoom = arg.split('=')[1];
  }
  if (!options.lat || !options.lng || !options.q) {
    console.log('Usage: node scripts/maps-scraper.js --lat=<lat> --lng=<lng> --q="mot clé" [--zoom=7z]');
    process.exit(1);
  }
  return options;
}

function buildMapsUrl({ lat, lng, q, zoom }) {
  const encoded = encodeURIComponent(q);
  // https://www.google.com/maps/search/Adjointe+virtuelle/@45.6323999,-74.3066948,9z?hl=fr
  return `https://www.google.com/maps/search/${encoded}/@${lat},${lng},${zoom}`;
}

async function autoScrollListings(page, maxRounds = 24) {
  // Scroller le panneau des résultats jusqu'à stabilisation
  for (let round = 0; round < maxRounds; round++) {
    const prevCount = await page.$$eval('div#QA0Szd div.Nv2PK', nodes => nodes.length).catch(() => 0);
    await page.evaluate(() => {
      const feed = document.querySelector('div#QA0Szd div[role="feed"]') || document.querySelector('div#QA0Szd .m6QErb.DxyBCb.kA9KIf.dS8AEf');
      if (feed) feed.scrollBy({ top: feed.scrollHeight, behavior: 'auto' });
      else window.scrollBy({ top: document.body.scrollHeight, behavior: 'auto' });
    });
    await sleep(4000);
    const nextCount = await page.$$eval('div#QA0Szd div.Nv2PK', nodes => nodes.length).catch(() => prevCount);
    if (nextCount <= prevCount) break;
  }
}

async function extractResults(page) {
  return await page.$$eval('div#QA0Szd div.Nv2PK', (cards) => {
    return cards.map(card => {
      const nameEl = card.querySelector('.qBF1Pd.fontHeadlineSmall');
      const phoneEl = card.querySelector('span.UsdlK');
      const websiteEl = card.querySelector('a.lcr4fd.S9kvJb');
      const name = nameEl ? nameEl.textContent.trim() : null;
      const phone = phoneEl ? phoneEl.textContent.trim() : null;
      const website = websiteEl ? websiteEl.href : null;
      return { name, phone, website };
    }).filter(item => item.name || item.phone || item.website);
  });
}

async function main() {
  const opts = parseArgs();
  const url = buildMapsUrl(opts);
  console.log(`🔍 URL: ${url}`);
  const { browser, page } = await launchBrowser(false, false, false);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('div#QA0Szd', { timeout: 60000 });
  await sleep(2000);

  // S’assurer que la liste charge assez d’éléments
  await autoScrollListings(page, 24);

  // Extraire
  const items = await extractResults(page);
  //console.log(`📦 ${items.length} résultats extraits`);

  // Enregistrer
  let created = 0, updated = 0, duplicates = 0, errors = 0;
  for (const it of items) {
    try {
      const result = await upsertLeadContact({
        phone: it.phone || null,
        title: it.name || null,
        source_type: 'google_maps',
        source_platform: 'google',
        source_title: it.name || null,
        source_description: null,
        source_url: it.website || null,
        source_query: opts.q,
        status: 'new',
        additional_data: {
          website: it.website || null,
          maps_lat: opts.lat,
          maps_lng: opts.lng,
          maps_query_url: url
        }
      }, false);
      if (result?.action === 'created') created++;
      else if (result?.action === 'updated') updated++;
      else if (result?.action === 'duplicate') duplicates++;
      else if (!result?.success) errors++; console.log(result);
    } catch (e) {
      console.error('❌ Sauvegarde erreur:', e.message);
      errors++;
    }
  }

  console.log(`✅ Fini. Créés: ${created} | Mis à jour: ${updated} | Doublons: ${duplicates} | Erreurs: ${errors}`);
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
}
