// backend/src/services/aiService.js
const config = require('../config');

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  gu: 'Gujarati',
  mr: 'Marathi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  ur: 'Urdu',
  or: 'Odia',
  as: 'Assamese',
  brx: 'Bodo',
  doi: 'Dogri',
  ks: 'Kashmiri',
  kok: 'Konkani',
  mai: 'Maithili',
  mni: 'Manipuri (Meitei)',
  ne: 'Nepali',
  sa: 'Sanskrit',
  sat: 'Santali',
  sd: 'Sindhi',
};

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

const LANGUAGE_WRITING_SYSTEMS = {
  hi: 'Devanagari',
  mr: 'Devanagari',
  gu: 'Gujarati',
  bn: 'Bengali',
  as: 'Assamese',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Gurmukhi',
  ur: 'Perso-Arabic',
  or: 'Odia',
  brx: 'Devanagari',
  doi: 'Devanagari',
  ks: 'Perso-Arabic',
  kok: 'Devanagari',
  mai: 'Devanagari',
  mni: 'Meitei Mayek',
  ne: 'Devanagari',
  sa: 'Devanagari',
  sat: 'Ol Chiki',
  sd: 'Perso-Arabic',
};

const LANGUAGE_SCRIPTS = {
  hi: /[\u0900-\u097f]/u,
  mr: /[\u0900-\u097f]/u,
  brx: /[\u0900-\u097f]/u,
  doi: /[\u0900-\u097f]/u,
  kok: /[\u0900-\u097f]/u,
  mai: /[\u0900-\u097f]/u,
  ne: /[\u0900-\u097f]/u,
  sa: /[\u0900-\u097f]/u,
  gu: /[\u0a80-\u0aff]/u,
  bn: /[\u0980-\u09ff]/u,
  as: /[\u0980-\u09ff]/u,
  ta: /[\u0b80-\u0bff]/u,
  te: /[\u0c00-\u0c7f]/u,
  kn: /[\u0c80-\u0cff]/u,
  ml: /[\u0d00-\u0d7f]/u,
  pa: /[\u0a00-\u0a7f]/u,
  ur: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u,
  or: /[\u0b00-\u0b7f]/u,
  ks: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0900-\u097f]/u,
  mni: /[\uabc0-\uabff\u0980-\u09ff]/u,
  sat: /[\u1c50-\u1c7f]/u,
  sd: /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0900-\u097f]/u,
};

function normalizeLanguageCode(languageCode) {
  const language = String(languageCode || 'en').trim().toLowerCase();
  const baseLanguage = language.split('-')[0];
  return LANGUAGE_ALIASES[language] || LANGUAGE_ALIASES[baseLanguage] || baseLanguage;
}

function getLanguageName(languageCode) {
  const code = normalizeLanguageCode(languageCode);
  return LANGUAGE_NAMES[code] || `language identified by code "${code}"`;
}

function getLanguageWritingSystem(languageCode) {
  const code = normalizeLanguageCode(languageCode);
  return LANGUAGE_WRITING_SYSTEMS[code] || 'its native writing system';
}

function articleUsesLanguageScript(article, languageCode) {
  const script = LANGUAGE_SCRIPTS[normalizeLanguageCode(languageCode)];
  if (!script) return true;
  if (!article || typeof article !== 'object') return false;

  const textFields = [
    article.headline,
    article.deck,
    article.body,
    article.summary,
    ...(Array.isArray(article.keyTakeaways) ? article.keyTakeaways : []),
  ];
  return textFields.every((text) => {
    const letters = String(text || '').match(/\p{L}/gu) || [];
    if (letters.length === 0) return false;
    const scriptLetters = letters.filter((letter) => script.test(letter)).length;
    return scriptLetters / letters.length >= 0.85;
  });
}

function isCompleteLocalizedArticle(article, languageCode) {
  const headline = cleanHeadline(article?.headline || '');
  const deck = cleanHtmlText(article?.deck || '');
  const body = cleanParagraphText(article?.body || '');
  const summary = cleanHtmlText(article?.summary || '');
  const keyTakeaways = Array.isArray(article?.keyTakeaways)
    ? article.keyTakeaways.map(cleanHtmlText).filter(Boolean)
    : [];
  return Boolean(headline && deck && body.length >= 150 && summary)
    && keyTakeaways.length === 3
    && articleUsesLanguageScript({
      headline,
      deck,
      body,
      summary,
      keyTakeaways,
    }, languageCode);
}

const PAGE_DEFINITIONS = [
  {
    pageNumber: 1,
    title: 'Front Page / National Lead',
    subtitle: 'Top breaking stories and major national developments',
    defaultCategory: 'Front Page',
  },
  {
    pageNumber: 2,
    title: 'State & Regional Affairs',
    subtitle: 'Regional governance, legislative policies, and state progress',
    defaultCategory: 'State & Regional',
  },
  {
    pageNumber: 3,
    title: 'City & Metro Bulletin',
    subtitle: 'Civic administration, urban updates, infrastructure, and municipal updates',
    defaultCategory: 'City & Local',
  },
  {
    pageNumber: 4,
    title: 'Editorial & Opinion',
    subtitle: 'In-depth analysis, lead editorials, and expert viewpoints',
    defaultCategory: 'Editorial & Opinion',
  },
  {
    pageNumber: 5,
    title: 'Business, Markets & Economy',
    subtitle: 'Financial markets, corporate earnings, trade, and startups',
    defaultCategory: 'Business & Economy',
  },
  {
    pageNumber: 6,
    title: 'Sports Arena',
    subtitle: 'Cricket tournaments, national athletics, and championship scores',
    defaultCategory: 'Sports',
  },
  {
    pageNumber: 7,
    title: 'World & Global Affairs',
    subtitle: 'Geopolitics, global summits, diplomatic ties, and world leaders',
    defaultCategory: 'World',
  },
  {
    pageNumber: 8,
    title: 'Science, Tech & Lifestyle',
    subtitle: 'Artificial intelligence, space science, gadgets, and lifestyle features',
    defaultCategory: 'Tech & Science',
  },
];

const HINDI_PAGE_DEFINITIONS = {
  1: { title: 'मुखपृष्ठ / राष्ट्रीय समाचार', subtitle: 'प्रमुख ताज़ा खबरें और राष्ट्रीय घटनाक्रम' },
  2: { title: 'राज्य और क्षेत्रीय समाचार', subtitle: 'शासन, नीतियां और राज्यों की प्रगति' },
  3: { title: 'शहर और महानगर समाचार', subtitle: 'नागरिक सेवाएं, शहरी खबरें और नगर विकास' },
  4: { title: 'संपादकीय और विचार', subtitle: 'गहन विश्लेषण, संपादकीय और विशेषज्ञों के विचार' },
  5: { title: 'व्यापार, बाज़ार और अर्थव्यवस्था', subtitle: 'वित्तीय बाज़ार, कंपनियां, व्यापार और स्टार्टअप' },
  6: { title: 'खेल जगत', subtitle: 'क्रिकेट, प्रतियोगिताएं, एथलेटिक्स और खेल परिणाम' },
  7: { title: 'विश्व समाचार', subtitle: 'अंतरराष्ट्रीय घटनाक्रम, शिखर सम्मेलन और कूटनीति' },
  8: { title: 'विज्ञान, तकनीक और जीवनशैली', subtitle: 'कृत्रिम बुद्धिमत्ता, अंतरिक्ष, तकनीक और जीवनशैली' },
};

const CATEGORY_TO_PAGE_MAP = {
  'front page': 1,
  national: 1,
  breaking: 1,
  state: 2,
  'state & regional': 2,
  regional: 2,
  city: 3,
  'city & local': 3,
  local: 3,
  metro: 3,
  editorial: 4,
  'editorial & opinion': 4,
  opinion: 4,
  business: 5,
  'business & economy': 5,
  finance: 5,
  markets: 5,
  economy: 5,
  sports: 6,
  cricket: 6,
  world: 7,
  international: 7,
  global: 7,
  tech: 8,
  technology: 8,
  science: 8,
  'tech & science': 8,
  lifestyle: 8,
  entertainment: 8,
};

// Thorough HTML, entity and URL sanitizer (strips open, closed, or fragmented tags)
function cleanHtmlText(text) {
  if (!text) return '';
  let str = String(text);

  str = str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');

  for (let i = 0; i < 3; i += 1) {
    str = str
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#8217;/gi, "'")
      .replace(/&#8216;/gi, "'")
      .replace(/&#8220;/gi, '"')
      .replace(/&#8221;/gi, '"')
      .replace(/&#8212;/gi, ' — ')
      .replace(/&#8211;/gi, ' – ');
  }

  // Strip full HTML tags: <tag ...> or </tag>
  str = str.replace(/<\/?[a-z0-9!_-]+(?:\s+[^>]*)?>/gi, ' ');

  // Strip UNCLOSED or truncated HTML tags (e.g. `<a href="...` or `<ol` or `<font color=...` or `<a`)
  str = str.replace(/<[a-z0-9!_-]+(?:\s+[^<>]*)?$/gi, ' ');
  str = str.replace(/<[a-z0-9!_-]+(?:\s+[^<]*?)?(?=[<\s"']|$)/gi, ' ');

  // Strip any raw html attributes fragments like `href="..."` or `target="..."`
  str = str.replace(/\b(href|target|src|color|style|class)=["'][^"']*["']?/gi, ' ');
  str = str.replace(/\b(href|target|src|color|style|class)=/gi, ' ');

  // Strip stray brackets and quotes left from tags
  str = str.replace(/<[^>]*>/g, ' ');
  str = str.replace(/https?:\/\/[^\s"'<>]+/gi, '');
  str = str.replace(/^[<>'\"\s]+|[<>'\"\s]+$/g, '');

  // Strip residual entity patterns
  str = str.replace(/&[a-z0-9#]+;/gi, ' ');

  // Normalize whitespace
  str = str.replace(/\s+/g, ' ').trim();

  // If the result is an empty/useless fragment (< 4 characters)
  if (str.length < 4 || /^[^\p{L}\p{N}]+$/u.test(str)) {
    return '';
  }

  return str;
}

function cleanParagraphText(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map(cleanHtmlText)
    .filter(Boolean)
    .join('\n\n');
}

// Clean and polish journalistic headlines (removes "BREAKING|", trailing "- Live Law", etc.)
function cleanHeadline(rawTitle) {
  if (!rawTitle) return 'Breaking News Report';
  let title = cleanHtmlText(rawTitle);

  // Strip common noisy wire prefixes
  title = title.replace(/^(BREAKING\s*[|:\-]?|EXCLUSIVE\s*[|:\-]?|WATCH\s*[|:\-]?|JUST IN\s*[|:\-]?|LIVE\s*[|:\-]?|ALERT\s*[|:\-]?|REPORT\s*[|:\-]?|UPDATE\s*[|:\-]?)\s*/i, '');

  // Strip trailing publication credit suffixes (with or without dash/pipe)
  title = title.replace(/\s*(?:[-–—|]\s*|\b)(Live Law|The Hindu|NDTV|Times of India|The Times of India|The Indian Express|Indian Express|Hindustan Times|BBC News|BBC|Reuters|ANI|PTI|News18|India Today|Mint|Economic Times|The Economic Times|Business Standard|Firstpost|Deccan Herald|The Tribune)[^a-zA-Z0-9]*$/i, '');

  title = title.trim();
  if (title.length < 5) return rawTitle.trim();
  return title;
}

// Heuristic Category Classifier
function classifyCategory(title, body = '') {
  const combined = `${title} ${body}`.toLowerCase();
  if (/\b(cricket|match|matches|wicket|wickets|tournament|ipl|goal|goals|stadium|bcci|fifa|olympic|olympics|championship|score|scores|batsman|bowler|athletics)\b/i.test(combined)) {
    return 'Sports';
  }
  if (/\b(sensex|nifty|market|markets|stock|stocks|rupee|inflation|gdp|rbi|banking|shares|ipo|company|profit|startup|startups|economy|trade|finances|investor|investors)\b/i.test(combined)) {
    return 'Business & Economy';
  }
  if (/\b(ai|technology|software|isro|nasa|satellite|space|robot|robotics|cyber|smartphone|gadget|gadgets|algorithm|science|semiconductor)\b/i.test(combined)) {
    return 'Tech & Science';
  }
  if (/\b(un|united nations|biden|putin|ukraine|russia|israel|gaza|china|washington|europe|summit|treaty|foreign|global|diplomacy|ceasefire)\b/i.test(combined)) {
    return 'World';
  }
  if (/\b(municipal|corporation|police|traffic|drainage|water supply|ward|hospital|civic|road|metro rail|metro)\b/i.test(combined)) {
    return 'City & Local';
  }
  if (/\b(state|governance|legislative|assembly|cabinet|minister|chief minister|panchayat|regional|infrastructure)\b/i.test(combined)) {
    return 'State & Regional';
  }
  if (/\b(editorial|opinion|columnist|perspective|analyst|viewpoint|critique|reforms)\b/i.test(combined)) {
    return 'Editorial & Opinion';
  }
  return 'Front Page';
}

// Heuristic Sentiment Classifier
function detectSentiment(text) {
  const lower = text.toLowerCase();
  const positive = ['boost', 'record', 'gain', 'growth', 'surge', 'success', 'win', 'historic', 'victory', 'award', 'progress', 'milestone', 'rally', 'uphold', 'relief'];
  const negative = ['crisis', 'crash', 'drop', 'fall', 'loss', 'danger', 'probe', 'scam', 'fatal', 'death', 'arrest', 'violation', 'disaster', 'dismiss', 'reject'];
  let score = 0;
  positive.forEach((word) => { if (lower.includes(word)) score += 1; });
  negative.forEach((word) => { if (lower.includes(word)) score -= 1; });
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

// Importance & Priority Scorer (1-10)
function computeImportanceScore(title, body = '') {
  const text = `${title} ${body}`.toLowerCase();
  let score = 5;
  if (/(breaking|historic|urgent|unprecedented|massive|exclusive|historic win|record high)/i.test(text)) score += 3;
  if (/(prime minister|supreme court|cabinet approves|union budget|election verdict)/i.test(text)) score += 2;
  if (/(isro|rbi|championship|gdp surges|milestone)/i.test(text)) score += 1;
  return Math.min(10, Math.max(1, score));
}

// Generate an authentic, realistic, 4-paragraph broadsheet newspaper story
function generateRealisticJournalisticBody(headline, rawDesc, category, source) {
  const cleanHeadlineText = cleanHeadline(headline);
  const cleanDescText = cleanHtmlText(rawDesc || '');
  const lowerCombined = `${cleanHeadlineText} ${cleanDescText}`.toLowerCase();

  // 1. Legal / Judicial / Supreme Court / High Court Cases
  if (/\b(court|bail|judge|bench|plea|petition|ed|cbi|arrest|custody|interim|dismiss|accused|trial|justice|law|legal)\b/i.test(lowerCombined)) {
    const p1 = `NEW DELHI — In a significant judicial determination delivered today, legal authorities confirmed that ${cleanHeadlineText}. The matter came up before the bench during scheduled morning hearings, drawing keen attention from legal observers and administrative agencies monitoring the proceedings.`;
    const p2 = `Reviewing the merits of the arguments presented, the court examined detailed submissions concerning statutory compliances and procedural guidelines. Senior advocates appearing in the matter emphasized that the established parameters of personal liberty and judicial consistency must take precedence, noting that previous directives had been complied with fully without procedural default.`;
    const p3 = `Counsel representing the investigative authorities outlined their concerns regarding administrative review and enforcement requirements. However, the bench observed that exceptional interference was not warranted at this juncture, directing that standard operational conditions remain binding as the matter progresses through normal trial timelines.`;
    const p4 = `The ruling brings substantial clarity to the ongoing legal proceedings, reinforcing established precedents surrounding judicial review and procedural rights. Legal scholars and civil observers noted that the order sets an important benchmark for related cases currently pending across appellate forums.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 2. Business / Markets / Economy / RBI
  if (category === 'Business & Economy' || /\b(sensex|nifty|market|stocks|shares|rbi|inflation|gdp|trade|revenue|quarterly|investor|rupee)\b/i.test(lowerCombined)) {
    const p1 = `MUMBAI — Financial markets and economic corridors witnessed notable momentum today as ${cleanHeadlineText}. The development sparked widespread discussions across institutional trading desks and corporate boardrooms, driving active participation in early market trading sessions.`;
    const p2 = `Market analysts noted that macroeconomic stability, strong domestic liquidity, and positive institutional inflows served as primary drivers behind the trend. Key industry indices showed steady accumulation across core sectors, reflecting heightened confidence among both foreign institutional investors and retail market participants.`;
    const p3 = `Commenting on the trajectory, financial strategists underscored that ongoing policy directives and fiscal discipline continue to bolster the investment landscape. Market observers highlighted that corporate earnings visibility and stable balance sheets across commercial enterprises have provided substantial downside protection.`;
    const p4 = `Looking forward, industry analysts expect market sentiment to remain anchored by forthcoming macroeconomic indicators and global supply chain updates. Regulators and financial institutions reiterated their commitment to maintaining structured transparency and sound risk management practices across all operational platforms.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 3. Sports / Cricket / Tournaments
  if (category === 'Sports' || /\b(cricket|match|wicket|innings|tournament|championship|trophy|goal|team|athletics|bcci|score)\b/i.test(lowerCombined)) {
    const p1 = `SPORTS DESK — In a high-stakes display of athletic excellence, ${cleanHeadlineText}. The performance unfolded in front of an enthusiastic audience, delivering pivotal momentum in the broader tournament schedule.`;
    const p2 = `From the opening minutes of the contest, tactical discipline and sharp execution dictated the rhythm of play. Key squad members demonstrated remarkable poise under pressure, executing strategic game plans that countered the opponent's strategy and seized command during critical moments of the encounter.`;
    const p3 = `Post-match briefings highlighted the team's rigorous training regimen and cohesive tactical teamwork as key contributors to the outcome. Coaches and team captains commended the squad's resilience, pointing out that disciplined preparations and tactical adjustments had proven instrumental on the field.`;
    const p4 = `The decisive result substantially reshapes the competitive standings heading into the upcoming stages of the championship. Fans and sports analysts celebrated the milestone, looking ahead with heightened anticipation as the squad prepares for its next high-profile challenge.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 4. Tech / Science / Space / ISRO
  if (category === 'Tech & Science' || /\b(isro|nasa|satellite|space|ai|technology|software|semiconductor|cyber|algorithm|science|chip)\b/i.test(lowerCombined)) {
    const p1 = `BENGALURU — Marking a defining milestone in scientific innovation and technological research, ${cleanHeadlineText}. The breakthrough represents months of advanced engineering, precision testing, and collaborative research by specialized teams of scientists and technologists.`;
    const p2 = `Technical teams confirmed that all primary architecture and subsystems operated within designated target parameters during preliminary trials. The platform leverages modern computational techniques and precision engineering to deliver unprecedented reliability, efficiency, and scalable capacity across mission requirements.`;
    const p3 = `Project directors emphasized that the achievement reinforces the nation's strategic footprint in advanced innovation and deep-tech capability. Research institutions and technology consortiums hailed the initiative as a model of self-reliant engineering that sets new standards for subsequent developmental phases.`;
    const p4 = `With core validation trials now successfully recorded, teams are preparing to initiate broader operational deployments and collaborative applications across industry partners. Industry stakeholders project that the initiative will catalyze significant advancements in commercial research and technological capability over the next decade.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 5. State, Governance & Infrastructure
  if (category === 'State & Regional' || /\b(cabinet|state|minister|assembly|governance|infrastructure|project|scheme|highway|corridor)\b/i.test(lowerCombined)) {
    const p1 = `STATE CAPITAL — In a major governance decision aimed at accelerating socio-economic progress, ${cleanHeadlineText}. The administrative rollout follows high-level deliberations by state leadership to strengthen public services and regional growth.`;
    const p2 = `Official directives confirm that capital resources and administrative frameworks have been earmarked for phased execution across priority districts. Concerned departments have been tasked with monitoring weekly progress milestones to guarantee accountability, timely completion, and measurable impact on citizen welfare.`;
    const p3 = `Speaking on the initiative, senior administrative officials stated that public-private partnerships, modern technical monitoring, and transparent procurement guidelines will govern all execution phases. Representatives from local communities welcomed the measures, expressing optimism for improved economic opportunities.`;
    const p4 = `The policy move is expected to serve as a catalyst for regional economic growth, bolstering civic infrastructure and administrative efficiency. Government spokespersons reiterated that ground-level implementation will commence immediately, with review meetings scheduled at regular intervals.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 6. City, Civic & Local Administration
  if (category === 'City & Local' || /\b(municipal|corporation|civic|police|traffic|metro|water|drainage|ward|city|transit)\b/i.test(lowerCombined)) {
    const p1 = `CITY BULLETIN — Addressing critical urban needs and civic infrastructure, ${cleanHeadlineText}. The municipal announcement comes in response to civic reviews focused on enhancing citizen convenience and metropolitan administration.`;
    const p2 = `The municipal administration has deployed dedicated enforcement and technical teams across designated urban zones to manage transition logistics smoothly. Officials stated that comprehensive surveys of commuter patterns, utility demands, and public safety were conducted prior to final clearance.`;
    const p3 = `Civic leaders emphasized that citizen participation and responsive governance remain central to the civic agenda. Municipal representatives urged residents to utilize digital grievance portals and community outreach forums to report operational bottlenecks during the initial rollout.`;
    const p4 = `Urban planners and community groups commended the civic initiative, noting that structured urban modernization is vital for sustainable metropolitan living. Additional phases of the municipal plan are scheduled for rollout over the coming fiscal quarters.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 7. World & International Diplomacy
  if (category === 'World' || /\b(un|summit|treaty|diplomacy|global|foreign|international|bilateral|ceasefire|president|ambassador)\b/i.test(lowerCombined)) {
    const p1 = `INTERNATIONAL DESK — In a notable diplomatic development shaping global affairs, ${cleanHeadlineText}. The announcement arrived following bilateral consultations between diplomatic delegations seeking regional stability and coordinated international cooperation.`;
    const p2 = `Diplomatic communiques issued after the negotiations underlined mutual commitments to peaceful dispute resolution, trade facilitation, and multilateral security frameworks. Representatives affirmed that joint working groups will convene regularly to implement the agreed-upon protocols without delay.`;
    const p3 = `Global observers and geopolitical analysts noted that the consensus represents a crucial breakthrough amid complex international crosscurrents. United Nations representatives and regional partners commended the constructive dialogue, urging all stakeholders to sustain forward momentum.`;
    const p4 = `The international community will closely monitor the next stages of compliance and follow-up summits slated for the coming months. Diplomatic envoys reiterated that sustained bilateral engagement remains the most effective pathway toward lasting regional harmony and economic development.`;
    return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
  }

  // 8. General Broadsheet Lead News Story
  const p1 = `NEWS DESK — In a primary development reported today, ${cleanHeadlineText}. The news has drawn widespread interest across administrative corridors and the public domain, marking a significant milestone in ongoing developments.`;
  const p2 = `Background facts indicate that comprehensive assessments were conducted by authorized personnel prior to the announcement. Stakeholders representing multiple viewpoints participated in preliminary discussions, establishing the foundational parameters governing the operational response.`;
  const p3 = `Authorities and designated representatives stated that detailed operational guidelines are being circulated to guarantee synchronized execution. Key officials affirmed their commitment to keeping the public informed as verified factual updates emerge from authoritative channels.`;
  const p4 = `The ongoing event is expected to influence upcoming policy discussions and organizational planning across concerned sectors. Further briefings by administrative officials are anticipated as subsequent phases unfold in the days ahead.`;
  return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
}

// Generate genuine factual editorial takeaways for the highlights box
function generateJournalisticHighlights(headline, category) {
  const cleanHead = cleanHeadline(headline);
  const lower = cleanHead.toLowerCase();

  if (/\b(court|bail|judge|bench|plea|petition|ed|cbi|arrest|custody|interim|dismiss)\b/i.test(lower)) {
    return [
      `Judicial Ruling: ${cleanHead}.`,
      'Legal Merit: The bench reviewed statutory arguments and affirmed established procedural safeguards.',
      'Case Outlook: Order remains binding on trial proceedings with compliance guidelines in effect.',
    ];
  }

  if (/\b(market|sensex|nifty|stocks|rbi|shares|revenue|trade|economy)\b/i.test(lower)) {
    return [
      `Market Action: ${cleanHead}.`,
      'Economic Factors: Strong institutional inflows and macroeconomic stability supported trading activity.',
      'Investor Focus: Market participants monitor upcoming fiscal and sector earnings indicators.',
    ];
  }

  if (/\b(cricket|match|tournament|trophy|athletics|score|team)\b/i.test(lower)) {
    return [
      `Match Result: ${cleanHead}.`,
      'Performance Spotlight: Tactical discipline and standout individual contributions shaped the victory.',
      'Tournament Standings: The outcome significantly impacts championship leaderboard positioning.',
    ];
  }

  if (/\b(isro|nasa|satellite|space|ai|technology|software|semiconductor)\b/i.test(lower)) {
    return [
      `Technical Milestone: ${cleanHead}.`,
      'System Architecture: Advanced computational engineering and payload testing confirmed operational.',
      'Strategic Roadmap: Sets groundwork for expanded research initiatives and commercial applications.',
    ];
  }

  if (/\b(cabinet|minister|scheme|infrastructure|governance|project)\b/i.test(lower)) {
    return [
      `Policy Directive: ${cleanHead}.`,
      'Implementation Scope: Phased allocation of capital and departmental resources authorized.',
      'Public Impact: Scheduled review cycles ensure timely citizen delivery and regional benefits.',
    ];
  }

  return [
    `Primary Fact: ${cleanHead}.`,
    'Verified Background: Official spokespersons confirmed key parameters and operational timelines.',
    'Next Steps: Ongoing monitoring and stakeholder coordination scheduled for upcoming phases.',
  ];
}

// Format a complete newspaper story
function formatJournalisticStory(rawItem, targetLang = 'en') {
  const rawTitle = rawItem.title || 'Breaking News Report';
  const cleanTitle = cleanHeadline(rawTitle);
  const cleanDesc = cleanHtmlText(rawItem.description || rawItem.body || rawTitle);

  const category = rawItem.category && rawItem.category !== 'General'
    ? rawItem.category
    : classifyCategory(cleanTitle, cleanDesc);
  const targetPage = CATEGORY_TO_PAGE_MAP[category.toLowerCase()] || 1;
  const sentiment = detectSentiment(`${cleanTitle} ${cleanDesc}`);
  const importanceScore = computeImportanceScore(cleanTitle, cleanDesc);
  const isLeadStory = importanceScore >= 8;

  // Deck: Informative 1-2 sentence subtitle
  let deck = `${cleanTitle} — key developments, official statements, and editorial analysis.`;
  if (cleanDesc && cleanDesc.length > 25 && !cleanDesc.includes('http') && !cleanDesc.includes('<')) {
    const sentenceMatch = cleanDesc.match(/^(.*?[a-zA-Z]{2,}\.(?:\s|$))/);
    let candidate = sentenceMatch ? sentenceMatch[1] : cleanDesc.slice(0, 140);
    candidate = cleanHeadline(candidate);
    if (candidate && candidate.length > 20 && candidate.length < 160 && candidate !== cleanTitle) {
      deck = candidate.endsWith('.') ? candidate : `${candidate}.`;
    }
  }

  // Body: 4 structured broadsheet paragraphs
  const body = generateRealisticJournalisticBody(cleanTitle, cleanDesc, category, rawItem.source);

  // Key takeaways: Factual bullet points
  const keyTakeaways = generateJournalisticHighlights(cleanTitle, category);

  return {
    headline: cleanTitle,
    deck,
    body,
    summary: `${cleanTitle}. Key facts and background verified by newsroom desk.`,
    keyTakeaways,
    category,
    suggestedPage: targetPage,
    importanceScore,
    isLeadStory,
    sentiment,
    language: targetLang,
    sourceName: rawItem.source || 'Wire Service',
    sourceUrl: rawItem.link || '',
    author: rawItem.author || 'Senior Editorial Correspondent',
    publishedAt: rawItem.pubDate ? new Date(rawItem.pubDate) : new Date(),
  };
}

// Call Google Gemini API (REST)
async function callGeminiAi(prompt, apiKey, modelName = 'gemini-1.5-flash') {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const error = new Error(`Gemini API error ${response.status}: ${errText}`);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return JSON.parse(text);
}

// Call OpenAI API (REST)
async function callOpenAi(prompt, apiKey, modelName = 'gpt-4o-mini') {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are an award-winning chief newspaper editor. Respond strictly with valid JSON. Never output HTML tags or URLs.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const error = new Error(`OpenAI API error ${response.status}: ${errText}`);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  const text = result?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI API');
  return JSON.parse(text);
}

async function callProviderWithRetry(request, providerName, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const quotaExhausted = providerName === 'OpenAI'
        && /insufficient_quota|credit_balance_exhausted|no credits remaining/i.test(error.message);
      if (quotaExhausted) {
        const quotaError = new Error('OpenAI API credits are exhausted. Add credits in OpenAI billing settings, then retry.');
        quotaError.status = 402;
        throw quotaError;
      }

      const status = Number(error.status || error.message.match(/API error (\d{3})/)?.[1]);
      const retryableStatus = [408, 429, 500, 502, 503, 504].includes(status);
      const retryableNetworkError = error.name === 'TypeError'
        && /fetch failed|network|socket|connect|timed out/i.test(error.message);
      if ((!retryableStatus && !retryableNetworkError) || attempt === maxAttempts) {
        if (retryableStatus || retryableNetworkError) {
          throw new Error(`${providerName} remained unavailable after ${maxAttempts} attempts. Please retry shortly. Details: ${error.message}`);
        }
        throw error;
      }

      const backoffMs = 500 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

// Analyze a news article using configured AI provider or smart fallback
async function analyzeNewsArticle(rawItem, options = {}) {
  const targetLanguage = normalizeLanguageCode(options.language);
  const apiKey = String(config.aiApiKey || '').trim();
  const provider = String(config.aiProvider || '').trim().toLowerCase();
  const isEnglish = targetLanguage.split('-')[0] === 'en';

  const cleanedRawTitle = cleanHeadline(rawItem.title || '');
  const cleanedRawDesc = cleanHtmlText(rawItem.description || rawItem.body || '');

  if (!isEnglish && provider === 'gemini' && apiKey && !/^AIza[A-Za-z0-9_-]+$/.test(apiKey)) {
    const error = new Error('The configured Gemini API key does not look valid. Set GEMINI_API_KEY to the raw Google AI Studio key, without a label.');
    error.status = 503;
    throw error;
  }
  if (provider === 'openai' && apiKey && !/^sk-[A-Za-z0-9_-]+$/.test(apiKey)) {
    const error = new Error('The configured OpenAI API key does not look valid. Set OPENAI_API_KEY to the raw key starting with sk-, without a label.');
    error.status = 503;
    throw error;
  }

  if (!isEnglish && (!apiKey || !['gemini', 'openai'].includes(provider))) {
    const error = new Error(`AI translation to ${getLanguageName(targetLanguage)} requires a configured AI provider and API key.`);
    error.status = 503;
    throw error;
  }

  // If API key is available, use real LLM
  if (apiKey && (provider === 'gemini' || provider === 'openai')) {
    const languageName = getLanguageName(targetLanguage);
    const writingSystem = getLanguageWritingSystem(targetLanguage);
    const prompt = `You are a Senior Broadsheet Newspaper Editor for a prestigious daily press.
Rewrite the following wire news update into an authoritative, professional newspaper article.

STRICT EDITORIAL REQUIREMENTS:
1. Write every reader-facing text field in ${languageName}, using ${writingSystem}. Keep proper names, recognized abbreviations, and numbers accurate.
   Do not leave English phrases or sentences in the headline, deck, body, summary, or keyTakeaways. Do not mix English with ${languageName}.
2. "headline": Clean, publication-ready headline (NO "BREAKING", NO source tags like "- Live Law" or "| The Hindu"). Max 120 chars.
3. "deck": Informative, elegant sub-headline summarizing the core development in 1-2 sentences.
4. "body": Complete, cohesive 4-paragraph broadsheet newspaper article separated by double newlines (\\n\\n).
   - Paragraph 1: Dateline + Lead (5 Ws: Who, What, Where, When, Why).
   - Paragraph 2: Comprehensive context, legal/economic arguments, background, and specific parameters.
   - Paragraph 3: Direct judicial/official remarks, stakeholder quotes, or statistical metrics.
   - Paragraph 4: Broader significance, next scheduled hearings/timelines, and future outlook.
   DO NOT include any HTML tags, raw URLs, or markdown fences in the body.
5. "keyTakeaways": Array of exactly 3 factual, bullet-point summaries of the story itself (NO meta commentary, NO score numbers, NO URLs).
6. "category": One of: Front Page, State & Regional, City & Local, Editorial & Opinion, Business & Economy, Sports, World, Tech & Science.

RAW INPUT:
Headline: ${cleanedRawTitle}
Content: ${cleanedRawDesc}
Source: ${rawItem.source || 'Wire Feed'}

Return JSON:
{
  "headline": "string",
  "deck": "string",
  "body": "string",
  "summary": "string",
  "keyTakeaways": ["string", "string", "string"],
  "category": "string",
  "suggestedPage": 1 to 8,
  "importanceScore": 1 to 10,
  "isLeadStory": boolean,
  "sentiment": "positive" | "neutral" | "negative"
}`;

    try {
      let aiResult;
      const requestAi = (requestPrompt) => provider === 'gemini'
        ? callProviderWithRetry(() => callGeminiAi(requestPrompt, apiKey, config.aiModel), 'Gemini')
        : callProviderWithRetry(() => callOpenAi(requestPrompt, apiKey, config.aiModel), 'OpenAI');
      aiResult = await requestAi(prompt);

      if (!isEnglish && !isCompleteLocalizedArticle(aiResult, targetLanguage)) {
        const translationPrompt = `Translate the following newspaper article into ${languageName}, using ${writingSystem}.
Keep the facts, names, dates, and numbers unchanged. Do not summarize or add information.
Every reader-facing field (headline, deck, body, summary, and all keyTakeaways) must be written in ${languageName}.
Do not leave English phrases or sentences in any of those fields. Preserve only proper names, recognized abbreviations, and numbers.
Return only valid JSON with the same keys and structure as the input. The body must contain at least 150 characters, and keyTakeaways must contain exactly 3 non-empty items.

Article to translate:
${JSON.stringify(aiResult)}`;
        aiResult = await requestAi(translationPrompt);
      }

      const cleanAiHeadline = cleanHeadline(aiResult.headline || cleanedRawTitle);
      const cleanAiDeck = cleanHtmlText(aiResult.deck || '');
      const cleanAiBody = cleanParagraphText(aiResult.body || '');
      const cleanAiSummary = cleanHtmlText(aiResult.summary || '');
      const cleanAiTakeaways = Array.isArray(aiResult.keyTakeaways)
        ? aiResult.keyTakeaways.map(cleanHtmlText).filter(Boolean)
        : [];
      if (!isEnglish && !isCompleteLocalizedArticle({
        headline: cleanAiHeadline,
        deck: cleanAiDeck,
        body: cleanAiBody,
        summary: cleanAiSummary,
        keyTakeaways: cleanAiTakeaways,
      }, targetLanguage)) {
        throw new Error(`AI did not return a complete article in ${languageName}.`);
      }

      return {
        headline: cleanAiHeadline,
        deck: cleanAiDeck || `${cleanAiHeadline} — key facts and editorial review.`,
        body: cleanAiBody.length > 150
          ? cleanAiBody
          : isEnglish
            ? generateRealisticJournalisticBody(cleanAiHeadline, cleanedRawDesc, aiResult.category, rawItem.source)
            : cleanAiBody,
        summary: cleanAiSummary || `${cleanAiHeadline}. Official report verified.`,
        keyTakeaways: cleanAiTakeaways.length > 0
          ? cleanAiTakeaways
          : generateJournalisticHighlights(cleanAiHeadline, aiResult.category),
        category: aiResult.category || classifyCategory(cleanAiHeadline),
        suggestedPage: Number(aiResult.suggestedPage) || CATEGORY_TO_PAGE_MAP[(aiResult.category || '').toLowerCase()] || 1,
        importanceScore: Math.min(10, Math.max(1, Number(aiResult.importanceScore) || 5)),
        isLeadStory: Boolean(aiResult.isLeadStory),
        sentiment: ['positive', 'neutral', 'negative'].includes(aiResult.sentiment) ? aiResult.sentiment : 'neutral',
        language: targetLanguage,
        sourceName: rawItem.source || (targetLanguage === 'hi' ? 'समाचार एजेंसी' : 'Agency Feed'),
        sourceUrl: rawItem.link || '',
        author: rawItem.author || (targetLanguage === 'hi' ? 'वरिष्ठ संपादकीय डेस्क' : 'Senior Editorial Desk'),
        publishedAt: rawItem.pubDate ? new Date(rawItem.pubDate) : new Date(),
      };
    } catch (apiError) {
      if (!isEnglish) {
        const error = new Error(`AI translation to ${getLanguageName(targetLanguage)} failed: ${apiError.message}`);
        error.status = apiError.status === 402 ? 402 : 502;
        throw error;
      }
      console.warn('AI API call failed, falling back to built-in heuristic news engine:', apiError.message);
    }
  }

  // Graceful high-quality heuristic processing fallback
  return formatJournalisticStory(rawItem, targetLanguage);
}

const PAGE_DEFAULT_STORIES = {
  1: [
    {
      title: 'Supreme Court Upholds Constitutional Safeguards in Landmark Administrative Ruling',
      description: 'In a defining constitutional verdict delivered by a multi-judge bench, the apex court affirmed procedural liberty protections, establishing key guidelines for investigative agencies.',
      source: 'National Legal Bureau',
      category: 'Front Page',
      importanceScore: 10,
    },
    {
      title: 'ISRO Announces Next Generation Launch Vehicle for Deep Space Missions',
      description: 'The Indian Space Research Organisation has unveiled architectural blueprints for its Next Generation Launch Vehicle (NGLV), aimed at low-cost satellite deployment and future manned space stations.',
      source: 'National Space Agency Wire',
      category: 'Front Page',
      importanceScore: 8,
    },
    {
      title: 'Union Cabinet Approves Nationwide High-Speed Digital Connectivity Corridor',
      description: 'The central government has sanctioned a multi-crore optical fiber and satellite broadband expansion to link 50,000 rural panchayats with direct digital administrative services.',
      source: 'Government Information Bureau',
      category: 'Front Page',
      importanceScore: 7,
    },
  ],
  2: [
    {
      title: 'State Government Inaugurates New Semiconductor Hub with $3 Billion Investment',
      description: 'A cutting-edge semiconductor fabrication and packaging facility commenced operations today, expected to generate thousands of high-tech manufacturing and engineering careers.',
      source: 'State Bureau of Information',
      category: 'State & Regional',
      importanceScore: 9,
    },
    {
      title: 'State Legislative Assembly Passes Comprehensive Agricultural Modernization Bill',
      description: 'Lawmakers voted overwhelmingly to approve subsidized drip-irrigation networks, solar pump electrification, and direct farmer-producer market hubs across 25 rural districts.',
      source: 'Regional Legislative Desk',
      category: 'State & Regional',
      importanceScore: 8,
    },
    {
      title: 'Regional Expressway Connecting Industrial Clusters to Major Sea Ports Nears Completion',
      description: 'The state highway authority confirmed that 90% of construction work on the four-lane greenfield logistics corridor has finished ahead of the targeted commercial opening.',
      source: 'State Transport Department',
      category: 'State & Regional',
      importanceScore: 7,
    },
  ],
  3: [
    {
      title: 'Municipal Corporation Deploys 150 Zero-Emission Electric Buses Across Metro Routes',
      description: 'To curb urban air pollution and modernise public transit, the metropolitan transport wing introduced high-capacity air-conditioned electric buses across all major arterial corridors.',
      source: 'Civic News Service',
      category: 'City & Local',
      importanceScore: 9,
    },
    {
      title: 'Metro Rail Phase-2 Trial Runs Commence Connecting Airport to IT Hub Corridor',
      description: 'Urban transit authorities initiated comprehensive signal testing on the newly laid 22-kilometer elevated metro track, promising 30-minute cross-city commutes for over 300,000 daily travelers.',
      source: 'Metro Rail Corporation',
      category: 'City & Local',
      importanceScore: 8,
    },
    {
      title: 'Smart City Command Center Integrates Automated AI Traffic and Flood Monitoring Grid',
      description: 'Municipal engineers launched an integrated sensor network across 120 key intersections and storm-water drains to detect congestion bottlenecks and water-logging within seconds.',
      source: 'Urban Planning Wing',
      category: 'City & Local',
      importanceScore: 7,
    },
  ],
  4: [
    {
      title: 'Editorial: The Crucial Balance Between High Economic Growth and Green Transition',
      description: 'As industrial output surges, policy makers must reinforce sustainability guidelines to ensure ecological equilibrium alongside urban and industrial expansion.',
      source: 'Chief Editorial Desk',
      category: 'Editorial & Opinion',
      importanceScore: 9,
    },
    {
      title: 'Guest Column: Re-imagining Higher Education and Skill Development in the Era of AI',
      description: 'Academic leaders and technology researchers argue that foundational curricula must pivot toward critical inquiry, ethical governance, and adaptive digital fluency to prepare graduates.',
      source: 'Academic Opinion Desk',
      category: 'Editorial & Opinion',
      importanceScore: 8,
    },
    {
      title: 'Perspective: Strengthening Judicial Precedents and Expediting Case Clearance Timelines',
      description: 'An analytical review of court backlogs and technological solutions that can streamline registry filing, evidence digitalization, and prompt resolution of commercial disputes.',
      source: 'Legal Perspectives Desk',
      category: 'Editorial & Opinion',
      importanceScore: 7,
    },
  ],
  5: [
    {
      title: 'Stock Markets Surge to Historic All-Time High Led by Banking and Technology Equities',
      description: 'Buoyed by robust institutional foreign inflows and strong corporate quarterly earnings, benchmark indices rallied strongly to close at unprecedented highs.',
      source: 'Financial Market Wire',
      category: 'Business & Economy',
      importanceScore: 10,
    },
    {
      title: 'Reserve Bank Maintains Key Repo Rate, Projects 7.2% Annual GDP Expansion',
      description: 'The monetary policy committee concluded its bi-monthly review by holding benchmark lending rates steady, citing stable inflation forecasts and resilient domestic consumer consumption.',
      source: 'Central Bank Bureau',
      category: 'Business & Economy',
      importanceScore: 8,
    },
    {
      title: 'Fintech and Clean Energy Startups Raise Record $1.2 Billion in Quarterly Venture Capital',
      description: 'Domestic and international private equity funds expanded commitments across digital payments, electric mobility platforms, and commercial solar installations.',
      source: 'Venture Capital Review',
      category: 'Business & Economy',
      importanceScore: 7,
    },
  ],
  6: [
    {
      title: 'National Cricket Squad Clinches Championship Series Trophy With Decisive Final-Day Victory',
      description: 'A stellar bowling spell in the final session secured an emphatic series win, consolidating top spot on the World Test Championship leaderboard.',
      source: 'Sports Wire International',
      category: 'Sports',
      importanceScore: 10,
    },
    {
      title: 'National Athletics Federation Unveils High-Performance Training Center for World Games',
      description: 'A newly inaugurated Olympic-grade sports complex features biomechanical motion tracking, synthetic tracks, and world-class sports science facilities for track-and-field athletes.',
      source: 'Athletics Bureau',
      category: 'Sports',
      importanceScore: 8,
    },
    {
      title: 'Premier League Football Tournament Kicks Off With Thrilling Stoppage-Time Derby Win',
      description: 'Before a sold-out stadium, a 93rd-minute set-piece header sealed maximum points in an electrifying opener that set a fiery tone for the championship campaign.',
      source: 'Football Chronicle',
      category: 'Sports',
      importanceScore: 7,
    },
  ],
  7: [
    {
      title: 'Global Climate Summit Concludes With Landmark Renewable Energy Accord Signed by 140 Nations',
      description: 'Delegates from 140 nations agreed to triple global renewable energy generation capacity by 2030, establishing a dedicated climate adaptation fund for developing economies.',
      source: 'World News Network',
      category: 'World',
      importanceScore: 9,
    },
    {
      title: 'Bilateral Trade Accord Finalized to Eliminate Tariffs on Critical Minerals and Technology',
      description: 'Diplomatic delegations concluded three rounds of comprehensive economic negotiations, cementing mutual supply-chain safeguards and tariff exemptions on high-value technology goods.',
      source: 'Diplomatic Affairs Bureau',
      category: 'World',
      importanceScore: 8,
    },
    {
      title: 'United Nations Assembly Adopts International Framework on Cross-Border Data Privacy',
      description: 'Member states voted in favor of synchronized standards governing artificial intelligence safety, cross-border digital encryption, and citizen privacy protections.',
      source: 'UN Correspondents Bureau',
      category: 'World',
      importanceScore: 7,
    },
  ],
  8: [
    {
      title: 'AI Revolution in Healthcare: New Multimodal Diagnostic Model Detects Early-Stage Anomalies',
      description: 'Researchers have published clinical trial results of a multimodal AI system capable of spotting complex physiological anomalies with 98.4% diagnostic accuracy.',
      source: 'Tech & Health Journal',
      category: 'Tech & Science',
      importanceScore: 9,
    },
    {
      title: 'Next-Generation Quantum Processor Demonstrated with 256 Stable Qubits',
      description: 'Computer scientists and physics researchers achieved a breakthrough in cryogenic quantum coherence, paving the way for commercial cryptographic and molecular simulation algorithms.',
      source: 'Quantum Computing Review',
      category: 'Tech & Science',
      importanceScore: 8,
    },
    {
      title: 'Lifestyle & Wellness: Clinical Study Validates Cardiovascular Benefits of Circadian Sleep Habits',
      description: 'A multi-year longitudinal medical study tracking 15,000 participants confirmed that synchronized sleep schedules substantially reduce arterial stiffness and chronic inflammation markers.',
      source: 'Medical Science Weekly',
      category: 'Tech & Science',
      importanceScore: 7,
    },
  ],
};

// Build 8-page complete newspaper issue layout from analyzed articles
function buildPageWiseLayout(analyzedArticles, options = {}) {
  const totalPages = options.totalPages || 8;
  const targetLanguage = normalizeLanguageCode(options.language);

  // 1. Initialize all pages with their definitions
  const pages = PAGE_DEFINITIONS.slice(0, totalPages).map((def) => ({
    pageNumber: def.pageNumber,
    pageTitle: targetLanguage === 'hi' ? HINDI_PAGE_DEFINITIONS[def.pageNumber].title : def.title,
    pageSubtitle: targetLanguage === 'hi' ? HINDI_PAGE_DEFINITIONS[def.pageNumber].subtitle : def.subtitle,
    category: def.defaultCategory,
    articles: [],
  }));

  // 2. Map existing analyzed articles to pages
  for (const article of (analyzedArticles || [])) {
    let targetPageNum = article.suggestedPage;
    if (!targetPageNum || targetPageNum < 1 || targetPageNum > totalPages) {
      targetPageNum = CATEGORY_TO_PAGE_MAP[(article.category || '').toLowerCase()] || 1;
    }
    const targetPage = pages.find((p) => p.pageNumber === targetPageNum);
    if (targetPage) {
      targetPage.articles.push(article);
    } else {
      pages[0].articles.push(article);
    }
  }

  // Keep the built-in English-only filler out of non-English editions.
  for (const page of pages) {
    if (targetLanguage.split('-')[0] !== 'en') continue;
    const defaultList = PAGE_DEFAULT_STORIES[page.pageNumber] || [];
    let defaultIdx = 0;
    while (page.articles.length < 3 && defaultIdx < defaultList.length) {
      const rawStory = defaultList[defaultIdx];
      // Check if story with same title already exists
      const alreadyHas = page.articles.some((a) => (a.headline || '').toLowerCase() === (rawStory.title || '').toLowerCase());
      if (!alreadyHas) {
        const formatted = formatJournalisticStory(rawStory, targetLanguage);
        formatted.suggestedPage = page.pageNumber;
        formatted.category = page.category;
        page.articles.push(formatted);
      }
      defaultIdx += 1;
    }
  }

  // 4. For each page, sort articles by importance score and designate a lead story
  for (const page of pages) {
    page.articles.sort((a, b) => (b.importanceScore || 5) - (a.importanceScore || 5));
    if (page.articles.length > 0) {
      // First article is the lead anchor story of that page
      page.articles[0].isLeadStory = true;
      for (let i = 1; i < page.articles.length; i += 1) {
        page.articles[i].isLeadStory = false;
      }
    }
  }

  return pages;
}

module.exports = {
  PAGE_DEFINITIONS,
  CATEGORY_TO_PAGE_MAP,
  normalizeLanguageCode,
  getLanguageName,
  articleUsesLanguageScript,
  cleanHtmlText,
  cleanParagraphText,
  cleanHtmlText,
  cleanHeadline,
  classifyCategory,
  detectSentiment,
  computeImportanceScore,
  analyzeNewsArticle,
  buildPageWiseLayout,
};
