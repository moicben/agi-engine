import fetch from 'node-fetch';

export async function search({ query = '', maxResults = 5 } = {}) {
  const started = Date.now();
  const provider = process.env.WEB_SEARCH_PROVIDER || 'duckduckgo';
  try {
    let results = [];
    if (provider === 'serpapi') {
      const apiKey = process.env.SERPAPI_KEY;
      if (!apiKey) throw new Error('SERPAPI_KEY required for serpapi provider');
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}`;
      const resp = await fetch(url);
      const json = await resp.json();
      results = (json.organic_results || []).slice(0, maxResults).map(r => ({ title: r.title, link: r.link, snippet: r.snippet }));
    } else {
      // DuckDuckGo Instant Answer API (no key, limited)
      const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`;
      const resp = await fetch(url, { headers: { 'User-Agent': 'agi-engine' } });
      const json = await resp.json();
      if (Array.isArray(json.RelatedTopics)) {
        results = json.RelatedTopics.map(t => ({ title: t.Text, link: t.FirstURL, snippet: t.Text })).filter(Boolean).slice(0, maxResults);
      }
      if (!results.length && json.AbstractText) {
        results.push({ title: json.Heading, link: json.AbstractURL, snippet: json.AbstractText });
      }
    }
    return { success: true, data: { results }, artifacts: [], logs: ['web.search completed'], meta: { duration_ms: Date.now() - started } };
  } catch (e) {
    return { success: false, error: e.message, data: { results: [] }, artifacts: [], logs: ['web.search failed'], meta: { duration_ms: Date.now() - started } };
  }
}

export default { search };


