// backend/src/services/newsCollectorService.js

const PRESET_FEEDS = [
  {
    id: 'top-national',
    title: 'Top National & Breaking News',
    category: 'Front Page',
    language: 'en',
    url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Latest breaking and national headlines from across the country',
  },
  {
    id: 'regional-affairs',
    title: 'State & Regional Governance',
    category: 'State & Regional',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=State+Cabinet+Governance+Infrastructure&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Regional policies, cabinet decisions, and state legislative developments',
  },
  {
    id: 'city-local',
    title: 'City & Metro Administration',
    category: 'City & Local',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=Municipal+Corporation+Civic+Transit&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Civic updates, urban transport, policing, and municipal infrastructure',
  },
  {
    id: 'business-markets',
    title: 'Business, Markets & Economy',
    category: 'Business & Economy',
    language: 'en',
    url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
    description: 'Financial markets, corporate earnings, trade, and economic policies',
  },
  {
    id: 'sports-cricket',
    title: 'Sports & Athletics Arena',
    category: 'Sports',
    language: 'en',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms',
    description: 'Cricket tournaments, championships, athletics, and sporting scores',
  },
  {
    id: 'editorial-opinion',
    title: 'Editorial & Strategic Perspectives',
    category: 'Editorial & Opinion',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=Editorial+Opinion+Economy+Policy&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'In-depth perspectives, analytical columns, and public policy reviews',
  },
  {
    id: 'world-global',
    title: 'World & International Affairs',
    category: 'World',
    language: 'en',
    url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    description: 'Geopolitics, global summits, diplomacy, and international developments',
  },
  {
    id: 'tech-innovation',
    title: 'Science, AI & Technology',
    category: 'Tech & Science',
    language: 'en',
    url: 'https://gadgets360.com/rss/news',
    description: 'Artificial Intelligence, space exploration, gadgets, and scientific research',
  },
  {
    id: 'space-astronomy',
    title: 'Space & Astronomy',
    category: 'Space & Astronomy',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=ISRO+NASA+space+exploration+astronomy&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Space missions, astronomy, satellites, launch vehicles, and discoveries beyond Earth',
  },
  {
    id: 'health-medicine',
    title: 'Health & Medicine',
    category: 'Health & Medicine',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=health+medicine+public+health+research&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Public health, medical research, hospitals, and health policy',
  },
  {
    id: 'education',
    title: 'Education',
    category: 'Education',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=education+schools+universities+examinations&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Schools, universities, examinations, education policy, and learning',
  },
  {
    id: 'environment-climate',
    title: 'Environment & Climate',
    category: 'Environment & Climate',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=environment+climate+change+conservation&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Climate change, conservation, pollution, and environmental policy',
  },
  {
    id: 'agriculture-food',
    title: 'Agriculture & Food',
    category: 'Agriculture & Food',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=agriculture+farmers+crops+food+policy&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Farming, crops, food supply, rural livelihoods, and agricultural policy',
  },
  {
    id: 'crime-justice',
    title: 'Crime & Justice',
    category: 'Crime & Justice',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+crime+law+courts+justice&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Courts, law enforcement, legal decisions, and public safety',
  },
  {
    id: 'entertainment-culture',
    title: 'Entertainment & Culture',
    category: 'Entertainment & Culture',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=entertainment+film+music+arts+culture&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Film, television, music, arts, books, and cultural events',
  },
  {
    id: 'lifestyle-wellness',
    title: 'Lifestyle & Wellness',
    category: 'Lifestyle & Wellness',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=lifestyle+wellness+food+fashion&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Wellness, food, fashion, family, and everyday living',
  },
  {
    id: 'travel-tourism',
    title: 'Travel & Tourism',
    category: 'Travel & Tourism',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+travel+tourism+destinations&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Tourism, destinations, travel services, and hospitality',
  },
  {
    id: 'religion-spirituality',
    title: 'Religion & Spirituality',
    category: 'Religion & Spirituality',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+religion+faith+spirituality&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Faith communities, religious events, and spiritual traditions',
  },
  {
    id: 'automotive-transport',
    title: 'Automotive & Transport',
    category: 'Automotive & Transport',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+automotive+transport+rail+aviation&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Automobiles, railways, aviation, roads, and mobility',
  },
  {
    id: 'real-estate-housing',
    title: 'Real Estate & Housing',
    category: 'Real Estate & Housing',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+real+estate+housing+property&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Housing, property markets, construction, and urban development',
  },
  {
    id: 'jobs-careers',
    title: 'Jobs & Careers',
    category: 'Jobs & Careers',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+jobs+careers+employment+workforce&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Employment, careers, workforce trends, and labor policy',
  },
  {
    id: 'consumer-affairs',
    title: 'Consumer Affairs',
    category: 'Consumer Affairs',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+consumer+rights+product+prices&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Consumer rights, product safety, retail, and household costs',
  },
  {
    id: 'energy-utilities',
    title: 'Energy & Utilities',
    category: 'Energy & Utilities',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+energy+power+electricity+utilities&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Power, renewable energy, fuel, and essential utilities',
  },
  {
    id: 'politics-elections',
    title: 'Politics & Elections',
    category: 'Politics & Elections',
    language: 'en',
    url: 'https://news.google.com/rss/search?q=India+politics+elections+parliament+parties&hl=en-IN&gl=IN&ceid=IN:en',
    description: 'Parliament, political parties, elections, and public representation',
  },
];

const LANGUAGE_ALIASES = {
  english: 'en',
  hindi: 'hi',
  gujarati: 'gu',
  marathi: 'mr',
  bengali: 'bn',
  tamil: 'ta',
  telugu: 'te',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  urdu: 'ur',
  odia: 'or',
  oriya: 'or',
  assamese: 'as',
  bodo: 'brx',
  dogri: 'doi',
  kashmiri: 'ks',
  konkani: 'kok',
  maithili: 'mai',
  manipuri: 'mni',
  meitei: 'mni',
  nepali: 'ne',
  sanskrit: 'sa',
  santali: 'sat',
  sindhi: 'sd',
};

function normalizeCollectorLanguage(language) {
  const code = String(language || 'en').trim().toLowerCase();
  const baseCode = code.split('-')[0];
  return LANGUAGE_ALIASES[code] || LANGUAGE_ALIASES[baseCode] || baseCode;
}

function buildLanguageAwarePresetUrl(preset, language, state = '') {
  const code = normalizeCollectorLanguage(language);
  const queryByCategory = {
    'Front Page': 'India national breaking news',
    'State & Regional': 'state government governance infrastructure',
    'City & Local': 'municipal corporation civic transit',
    'Business & Economy': 'business markets economy',
    Sports: 'sports cricket',
    'Editorial & Opinion': 'editorial opinion policy',
    World: 'world international affairs',
    'Tech & Science': 'artificial intelligence science technology',
    'Space & Astronomy': 'ISRO NASA space exploration astronomy satellites',
    'Health & Medicine': 'health medicine public health medical research',
    Education: 'education schools universities examinations',
    'Environment & Climate': 'environment climate change conservation',
    'Agriculture & Food': 'agriculture farmers crops food policy',
    'Crime & Justice': 'India crime law courts justice public safety',
    'Entertainment & Culture': 'entertainment film music arts culture',
    'Lifestyle & Wellness': 'lifestyle wellness food fashion',
    'Travel & Tourism': 'India travel tourism destinations hospitality',
    'Religion & Spirituality': 'India religion faith spirituality',
    'Automotive & Transport': 'India automotive transport rail aviation',
    'Real Estate & Housing': 'India real estate housing property construction',
    'Jobs & Careers': 'India jobs careers employment workforce',
    'Consumer Affairs': 'India consumer rights product safety prices',
    'Energy & Utilities': 'India energy power electricity utilities',
    'Politics & Elections': 'India politics elections parliament parties',
  };

  // Google News RSS can serve India-specific feeds in supported Indian languages.
  // This is used for every preset instead of the fixed English feed.
  const stateName = String(state || '').trim().slice(0, 80);
  const localizedQuery = queryByCategory[preset.category] || preset.title;
  const query = encodeURIComponent(stateName ? `${stateName} ${localizedQuery}` : localizedQuery);
  return `https://news.google.com/rss/search?q=${query}&hl=${code}-IN&gl=IN&ceid=IN:${code}`;
}

const SAMPLE_FALLBACK_NEWS = [
  {
    title: 'ISRO Announces Next Generation Launch Vehicle for Deep Space Missions',
    link: 'https://example.com/isro-next-gen-launcher',
    description: 'The Indian Space Research Organisation has unveiled architectural blueprints for its Next Generation Launch Vehicle (NGLV), aimed at low-cost satellite deployment and future manned space stations.',
    source: 'National Space Agency Wire',
    category: 'Front Page',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'State Government Inaugurates New Semiconductor Hub with $3 Billion Investment',
    link: 'https://example.com/state-semiconductor-hub',
    description: 'A cutting-edge semiconductor fabrication and packaging facility commenced operations today, expected to generate thousands of high-tech manufacturing and engineering careers.',
    source: 'State Bureau of Information',
    category: 'State & Regional',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'Municipal Corporation Deploys 150 Zero-Emission Electric Buses Across Metro Routes',
    link: 'https://example.com/metro-electric-buses',
    description: 'To curb urban air pollution and modernise public transit, the metropolitan transport wing introduced high-capacity air-conditioned electric buses across all major arterial corridors.',
    source: 'Civic News Service',
    category: 'City & Local',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'Editorial: The Crucial Balance Between High Economic Growth and Green Transition',
    link: 'https://example.com/editorial-growth-green-transition',
    description: 'As industrial output surges, policy makers must reinforce sustainability guidelines to ensure ecological equilibrium alongside urban and industrial expansion.',
    source: 'Chief Editorial Desk',
    category: 'Editorial & Opinion',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'Stock Markets Surge to Historic All-Time High Led by Banking and Technology Equities',
    link: 'https://example.com/markets-sensex-record-high',
    description: 'Buoyed by robust institutional foreign inflows and strong corporate quarterly earnings, benchmark indices rallied strongly to close at unprecedented highs.',
    source: 'Financial Market Wire',
    category: 'Business & Economy',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'India Wins Border-Gavaskar Trophy Series With Stunning Victory in Final Test',
    link: 'https://example.com/cricket-india-series-win',
    description: 'A stellar bowling spell in the final session secured an emphatic series win, consolidating top spot on the World Test Championship leaderboard.',
    source: 'Sports Wire International',
    category: 'Sports',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'Global Climate Summit Concludes With Landmark Renewable Energy Accord',
    link: 'https://example.com/global-climate-accord',
    description: 'Delegates from 140 nations agreed to triple global renewable energy generation capacity by 2030, establishing a dedicated climate adaptation fund.',
    source: 'World News Network',
    category: 'World',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
  {
    title: 'AI Revolution in Healthcare: New Diagnostic Model Detects Early-Stage Anomalies',
    link: 'https://example.com/ai-healthcare-diagnostic',
    description: 'Researchers have published clinical trial results of a multimodal AI system capable of spotting complex physiological anomalies with 98.4% diagnostic accuracy.',
    source: 'Tech & Health Journal',
    category: 'Tech & Science',
    language: 'en',
    pubDate: new Date().toISOString(),
  },
];

function cleanHtml(text) {
  if (!text) return '';
  let str = String(text);

  // 1. Unwrap CDATA
  str = str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');

  // 2. Decode entities (multiple passes in case of &amp;lt;)
  for (let i = 0; i < 2; i += 1) {
    str = str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#8212;/g, ' — ')
      .replace(/&#8211;/g, ' – ');
  }

  // 3. Special handling for Google News RSS <ol><li> snippets
  if (/<li[\s>]/i.test(str)) {
    const listItems = str.match(/<li[^>]*>(.*?)<\/li>/gis) || [];
    if (listItems.length > 0) {
      const parsedItems = [];
      for (const item of listItems) {
        let cleanItem = item
          .replace(/<[^>]+>/g, ' ')
          .replace(/https?:\/\/[^\s"'<>]+/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanItem.length > 10) {
          parsedItems.push(cleanItem);
        }
      }
      if (parsedItems.length > 0) {
        str = parsedItems.join('. ');
      }
    }
  }

  // 4. Strip any remaining HTML tags
  str = str.replace(/<[^>]+>/g, ' ');

  // 5. Strip any raw URLs embedded in text
  str = str.replace(/https?:\/\/[^\s"'<>]+/gi, '');

  // 6. Strip stray entity markers
  str = str.replace(/&[a-z0-9#]+;/gi, ' ');

  // 7. Normalize spaces and trim
  str = str.replace(/\s+/g, ' ').trim();

  return str;
}

function parseXmlFeed(xmlString, sourceUrl) {
  const items = [];
  const itemMatches = xmlString.match(/<item[\s>].*?<\/item>/gs)
    || xmlString.match(/<entry[\s>].*?<\/entry>/gs)
    || [];

  for (const block of itemMatches) {
    const titleMatch = block.match(/<title[^>]*>(.*?)<\/title>/s);
    const linkMatch = block.match(/<link[^>]*>(.*?)<\/link>/s)
      || block.match(/<link[^>]*href=["'](.*?)["']/s);
    const descMatch = block.match(/<description[^>]*>(.*?)<\/description>/s)
      || block.match(/<summary[^>]*>(.*?)<\/summary>/s)
      || block.match(/<content[^>]*>(.*?)<\/content>/s);
    const dateMatch = block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/s)
      || block.match(/<published[^>]*>(.*?)<\/published>/s)
      || block.match(/<updated[^>]*>(.*?)<\/updated>/s);
    const categoryMatch = block.match(/<category[^>]*>(.*?)<\/category>/s);
    const authorMatch = block.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/s)
      || block.match(/<author[^>]*>(?:<name>)?(.*?)(?:<\/name>)?<\/author>/s);

    const title = cleanHtml(titleMatch ? titleMatch[1] : '');
    const link = (linkMatch ? (linkMatch[1] || '').trim() : '') || sourceUrl;
    const description = cleanHtml(descMatch ? descMatch[1] : '');
    const pubDate = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();
    const category = cleanHtml(categoryMatch ? categoryMatch[1] : '');
    const author = cleanHtml(authorMatch ? authorMatch[1] : 'News Agency');

    if (title && title.length > 5) {
      items.push({
        title,
        link,
        description: description || title,
        pubDate,
        category: category || 'General',
        author,
        source: new URL(sourceUrl).hostname.replace(/^www\./, ''),
      });
    }
  }

  return items;
}

async function fetchFromRssUrl(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NewspaperPlatform/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    const xml = await response.text();
    return parseXmlFeed(xml, url);
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeArticleUrl(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NewspaperPlatform/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`);
    }
    const html = await response.text();

    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i)
      || html.match(/<title[^>]*>(.*?)<\/title>/i);
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)
      || html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);

    const paragraphs = [];
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gis) || [];
    for (const p of pMatches) {
      const cleaned = cleanHtml(p);
      if (cleaned.length > 50 && !cleaned.includes('cookie') && !cleaned.includes('rights reserved')) {
        paragraphs.push(cleaned);
      }
    }

    const title = cleanHtml(titleMatch ? titleMatch[1] : 'News Article');
    const description = cleanHtml(descMatch ? descMatch[1] : paragraphs.slice(0, 2).join(' '));
    const fullBody = paragraphs.join('\n\n') || description;

    return {
      title,
      link: url,
      description,
      body: fullBody,
      pubDate: new Date().toISOString(),
      source: new URL(url).hostname.replace(/^www\./, ''),
      category: 'General',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function collectNews({
  presetIds = [],
  customRssUrls = [],
  articleUrls = [],
  rawTexts = [],
  language = 'gu',
  state = '',
  limit = 20,
}) {
  const collected = [];
  const errors = [];
  const targetLanguage = normalizeCollectorLanguage(language);

  // 1. Process presets concurrently and interleave results so each selected topic is represented.
  const activePresets = PRESET_FEEDS.filter((p) => presetIds.includes(p.id));
  const presetResults = await Promise.all(activePresets.map(async (preset) => {
    try {
      const feedUrl = buildLanguageAwarePresetUrl(preset, targetLanguage, state);
      const items = await fetchFromRssUrl(feedUrl);
      return items.map((item) => ({
        ...item,
        presetId: preset.id,
        category: preset.category || item.category,
      }));
    } catch (err) {
      errors.push(`Preset "${preset.title}": ${err.message}`);
      return [];
    }
  }));
  for (let itemIndex = 0; itemIndex < limit; itemIndex += 1) {
    for (const presetItems of presetResults) {
      if (presetItems[itemIndex]) collected.push(presetItems[itemIndex]);
    }
    if (collected.length >= limit) break;
  }

  // 2. Custom RSS URLs
  for (const url of customRssUrls) {
    if (!url || typeof url !== 'string') continue;
    try {
      const items = await fetchFromRssUrl(url.trim());
      collected.push(...items);
    } catch (err) {
      errors.push(`RSS URL "${url}": ${err.message}`);
    }
  }

  // 3. Single Article URLs
  for (const url of articleUrls) {
    if (!url || typeof url !== 'string') continue;
    try {
      const article = await scrapeArticleUrl(url.trim());
      collected.push(article);
    } catch (err) {
      errors.push(`Article URL "${url}": ${err.message}`);
    }
  }

  // 4. Raw Text entries (pasted stories or wire copy)
  for (const raw of rawTexts) {
    if (!raw || !raw.text) continue;
    collected.push({
      title: raw.title || raw.text.slice(0, 80).split('\n')[0] || 'Draft Wire Copy',
      description: raw.text.slice(0, 300),
      body: raw.text,
      link: raw.sourceUrl || 'manual://wire-input',
      source: raw.source || 'Local Reporter / Desk',
      category: raw.category || 'General',
      language: raw.language || language,
      pubDate: new Date().toISOString(),
    });
  }

  // If external network is blocked or no feeds were reachable, use curated rich samples
  if (collected.length === 0) {
    collected.push(...SAMPLE_FALLBACK_NEWS);
  }

  // Deduplicate by title similarity
  const seenTitles = new Set();
  const uniqueItems = [];
  for (const item of collected) {
    const norm = item.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      uniqueItems.push(item);
    }
    if (uniqueItems.length >= limit) break;
  }

  return {
    items: uniqueItems,
    errors,
    total: uniqueItems.length,
  };
}

module.exports = {
  PRESET_FEEDS,
  SAMPLE_FALLBACK_NEWS,
  buildLanguageAwarePresetUrl,
  collectNews,
  fetchFromRssUrl,
  scrapeArticleUrl,
};
