const {
  classifyCategory,
  detectSentiment,
  computeImportanceScore,
  analyzeNewsArticle,
  buildPageWiseLayout,
  PAGE_DEFINITIONS,
  cleanHtmlText,
  cleanParagraphText,
  getLanguageName,
  normalizeLanguageCode,
  articleUsesLanguageScript,
} = require('../services/aiService');
const {
  buildLanguageAwarePresetUrl,
  collectNews,
  PRESET_FEEDS,
} = require('../services/newsCollectorService');
const config = require('../config');
const AiIssue = require('../models/aiIssue');
const { getAiStatus, updateIssue } = require('./aiNewsController');

function geminiResponse(article) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{ text: JSON.stringify(article) }],
        },
      }],
    }),
  };
}

describe('AI News Service', () => {
  test('classifies news categories accurately based on keywords', () => {
    expect(classifyCategory('India wins final cricket test against Australia', 'Wickets taken in final session')).toBe('Sports');
    expect(classifyCategory('Sensex reaches new record high as IT stocks surge', 'Market rallied 800 points')).toBe('Business & Economy');
    expect(classifyCategory('ISRO launches next-gen communication satellite', 'Deep space AI satellite')).toBe('Tech & Science');
    expect(classifyCategory('Global summit in Europe addresses international ceasefire', 'United Nations diplomacy')).toBe('World');
    expect(classifyCategory('AMC announces new municipal electric bus routes in city', 'Water supply and drainage upgrade')).toBe('City & Local');
    expect(classifyCategory('Gujarat Chief Minister inaugurates new regional corridor', 'State cabinet approved plan')).toBe('State & Regional');
  });

  test('detects sentiment accurately', () => {
    expect(detectSentiment('Historic win and tremendous growth boost')).toBe('positive');
    expect(detectSentiment('Severe crisis and fatal drop in revenue')).toBe('negative');
    expect(detectSentiment('Committee met to discuss the standard guidelines')).toBe('neutral');
  });

  test('computes importance score accurately', () => {
    const breakingScore = computeImportanceScore('Breaking: Prime Minister addresses historic summit', 'urgent announcement');
    expect(breakingScore).toBeGreaterThanOrEqual(8);

    const normalScore = computeImportanceScore('Local gardening workshop planned for Saturday', 'informational session');
    expect(normalScore).toBeLessThan(8);
  });

  test('analyzes news article and produces structured newspaper story', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const raw = {
      title: 'Gujarat Semiconductor Facility Inaugurated',
      description: 'A major electronics and chip manufacturing hub started operations near Gandhinagar.',
      source: 'Regional Bureau',
      link: 'https://example.com/gujarat-semiconductor',
    };

    config.aiApiKey = '';
    config.aiProvider = '';
    try {
      const analyzed = await analyzeNewsArticle(raw, { language: 'en' });
      expect(analyzed).toHaveProperty('headline');
      expect(analyzed).toHaveProperty('deck');
      expect(analyzed).toHaveProperty('body');
      expect(analyzed).toHaveProperty('category');
      expect(analyzed).toHaveProperty('suggestedPage');
      expect(analyzed).toHaveProperty('importanceScore');
      expect(analyzed).toHaveProperty('isLeadStory');
      expect(analyzed).toHaveProperty('sentiment');
      expect(analyzed.language).toBe('en');
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
    }
  });

  test('preserves non-Latin text and resolves supported language names', () => {
    expect(cleanHtmlText('ગુજરાત સમાચાર')).toBe('ગુજરાત સમાચાર');
    expect(cleanParagraphText('પ્રથમ પરિચ્છેદ.\n\nબીજો પરિચ્છેદ.')).toBe('પ્રથમ પરિચ્છેદ.\n\nબીજો પરિચ્છેદ.');
    expect(getLanguageName('gu')).toBe('Gujarati');
    expect(getLanguageName('Maithili')).toBe('Maithili');
    expect(getLanguageName('Konkani')).toBe('Konkani');
    expect(getLanguageName('Santali')).toBe('Santali');
    expect(normalizeLanguageCode('Hindi')).toBe('hi');
    expect(normalizeLanguageCode('Manipuri')).toBe('mni');
    expect(getLanguageName('Hindi')).toBe('Hindi');
    expect(articleUsesLanguageScript({
      headline: 'A story headline',
      deck: 'A story deck',
      body: 'A story body',
      summary: 'A story summary',
      keyTakeaways: ['One', 'Two', 'Three'],
    }, 'hi')).toBe(false);
    expect(articleUsesLanguageScript({
      headline: 'हिंदी समाचार',
      deck: 'आज की प्रमुख खबर।',
      body: 'यह समाचार हिंदी भाषा में लिखा गया है।'.repeat(10),
      summary: 'आज की खबर।',
      keyTakeaways: ['मुख्य जानकारी एक।', 'मुख्य जानकारी दो।', 'मुख्य जानकारी तीन।'],
    }, 'hi')).toBe(true);
    expect(articleUsesLanguageScript({
      headline: 'नई योजना announced today',
      deck: 'सरकार ने खबर की घोषणा की।',
      body: 'यह समाचार हिंदी भाषा में लिखा गया है।'.repeat(10),
      summary: 'आज की खबर।',
      keyTakeaways: ['मुख्य जानकारी एक।', 'मुख्य जानकारी दो।', 'मुख्य जानकारी तीन।'],
    }, 'hi')).toBe(false);
    expect(articleUsesLanguageScript({
      headline: 'हिंदी समाचार',
      deck: 'आज की प्रमुख खबर।',
      body: `${'यह समाचार हिंदी भाषा में लिखा गया है।'.repeat(10)}${'This phrase remains in English. '.repeat(2)}`,
      summary: 'आज की खबर।',
      keyTakeaways: ['मुख्य जानकारी एक।', 'मुख्य जानकारी दो।', 'मुख्य जानकारी तीन।'],
    }, 'hi')).toBe(false);
  });

  test('validates native scripts for the remaining scheduled Indian languages', () => {
    const sampleByLanguage = {
      brx: 'भाषा',
      doi: 'भाषा',
      ks: 'خبر',
      kok: 'भाषा',
      mai: 'भाषा',
      mni: 'ꯃꯤꯇꯩ',
      ne: 'भाषा',
      sa: 'भाषा',
      sat: 'ᱥᱟᱱᱛᱟᱲᱤ',
      sd: 'خبر',
    };

    for (const [language, text] of Object.entries(sampleByLanguage)) {
      expect(articleUsesLanguageScript({
        headline: text,
        deck: text,
        body: text.repeat(50),
        summary: text,
        keyTakeaways: [text, text, text],
      }, language)).toBe(true);
    }
  });

  test('does not silently generate English fallback stories for non-English issues', () => {
    const pages = buildPageWiseLayout([], { language: 'gu', totalPages: 8 });
    expect(pages).toHaveLength(8);
    expect(pages.every((page) => page.articles.length === 0)).toBe(true);
  });

  test('builds Hindi issue page titles and subtitles in Hindi', () => {
    const pages = buildPageWiseLayout([], { language: 'hi', totalPages: 8 });
    expect(pages[0].pageTitle).toBe('मुखपृष्ठ / राष्ट्रीय समाचार');
    expect(pages[0].pageSubtitle).toBe('प्रमुख ताज़ा खबरें और राष्ट्रीय घटनाक्रम');
    expect(pages.every((page) => /[\u0900-\u097f]/u.test(page.pageTitle))).toBe(true);
  });

  test('requires a configured AI provider for non-English article generation', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    config.aiApiKey = '';
    config.aiProvider = '';
    try {
      await expect(analyzeNewsArticle({ title: 'Local development update' }, { language: 'gu' }))
        .rejects.toThrow('AI translation to Gujarati requires a configured AI provider and API key.');
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
    }
  });

  test('rejects malformed Gemini keys before making a provider request', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    config.aiApiKey = 'malformed-key';
    config.aiProvider = 'gemini';
    global.fetch = jest.fn();
    try {
      await expect(analyzeNewsArticle({ title: 'Local development update' }, { language: 'hi' }))
        .rejects.toThrow('The configured Gemini API key does not look valid.');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('rejects malformed OpenAI keys before making a provider request', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    config.aiApiKey = 'invalid-openai-key';
    config.aiProvider = 'openai';
    global.fetch = jest.fn();
    try {
      await expect(analyzeNewsArticle({ title: 'Local development update' }, { language: 'mr' }))
        .rejects.toThrow('The configured OpenAI API key does not look valid.');
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('retries temporary Gemini 503 and network failures before analyzing', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    config.aiApiKey = 'AIzaUnitTestKey';
    config.aiProvider = 'gemini';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => '{"error":{"status":"UNAVAILABLE"}}',
      })
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(geminiResponse({
        headline: 'Gujarati programme update',
        deck: 'A new programme was announced.',
        body: 'Officials announced a new programme for local residents.',
        category: 'State & Regional',
      }));

    try {
      const article = await analyzeNewsArticle({ title: 'Gujarati programme update' }, { language: 'en' });
      expect(article.headline).toBe('Gujarati programme update');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('does not retry OpenAI quota exhaustion and returns billing guidance', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    config.aiApiKey = 'sk-unit-test-key';
    config.aiProvider = 'openai';
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({
        error: {
          message: 'You have no credits remaining.',
          type: 'insufficient_quota',
          code: 'credit_balance_exhausted',
        },
      }),
    });

    try {
      const request = analyzeNewsArticle({ title: 'Local development update' }, { language: 'gu' });
      await expect(request).rejects.toThrow('AI translation to Gujarati failed: OpenAI API credits are exhausted.');
      await expect(request).rejects.toHaveProperty('status', 402);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('asks the configured AI provider to write all article text in the selected language', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    const translatedText = Array.from(
      { length: 4 },
      () => 'गुजरात में नई योजना शुरू की गई है। '.repeat(2)
    ).join('\n\n');
    const englishArticle = {
      headline: 'New programme launched in Gujarat',
      deck: 'The state government launched a new public programme.',
      body: 'The state government launched a new public programme today. '.repeat(8),
      summary: 'A new public programme was launched in Gujarat.',
      keyTakeaways: ['The programme was launched today.', 'The state government announced the plan.', 'Officials will oversee implementation.'],
      category: 'State & Regional',
      suggestedPage: 2,
      importanceScore: 7,
      isLeadStory: false,
      sentiment: 'positive',
    };
    const hindiArticle = {
      headline: 'गुजरात में नई योजना शुरू',
      deck: 'राज्य सरकार ने नई सार्वजनिक योजना शुरू की।',
      body: translatedText,
      summary: 'गुजरात में नई योजना शुरू की गई है।',
      keyTakeaways: ['मुख्य जानकारी एक।', 'मुख्य जानकारी दो।', 'मुख्य जानकारी तीन।'],
      category: 'State & Regional',
      suggestedPage: 2,
      importanceScore: 7,
      isLeadStory: false,
      sentiment: 'positive',
    };
    config.aiApiKey = 'AIzaUnitTestKey';
    config.aiProvider = 'gemini';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(geminiResponse(englishArticle))
      .mockResolvedValueOnce(geminiResponse(hindiArticle));

    try {
      const article = await analyzeNewsArticle({ title: 'New state programme announced' }, { language: 'hi' });
      const prompt = JSON.parse(global.fetch.mock.calls[0][1].body).contents[0].parts[0].text;
      const translationPrompt = JSON.parse(global.fetch.mock.calls[1][1].body).contents[0].parts[0].text;
      expect(prompt).toContain('Write every reader-facing text field in Hindi');
      expect(translationPrompt).toContain('Translate the following newspaper article into Hindi');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(article.language).toBe('hi');
      expect(article.headline).toBe('गुजरात में नई योजना शुरू');
      expect(article.body.split('\n\n')).toHaveLength(4);
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('translates generated stories into Gujarati before returning them', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    const englishArticle = {
      headline: 'New public programme launched',
      deck: 'The state government announced a new programme.',
      body: 'The state government announced a new public programme today. '.repeat(8),
      summary: 'A new public programme was announced.',
      keyTakeaways: ['The programme was announced today.', 'The state government approved the plan.', 'Officials will oversee the work.'],
      category: 'State & Regional',
      suggestedPage: 2,
      importanceScore: 7,
      isLeadStory: false,
      sentiment: 'positive',
    };
    const gujaratiArticle = {
      headline: 'નવી જાહેર યોજના શરૂ',
      deck: 'રાજ્ય સરકારે નવી જાહેર યોજના શરૂ કરવાની જાહેરાત કરી.',
      body: 'રાજ્ય સરકારે આજે નવી જાહેર યોજના શરૂ કરવાની જાહેરાત કરી. આ યોજનાથી સ્થાનિક નાગરિકોને લાભ મળશે. અધિકારીઓએ અમલીકરણની વિગતો રજૂ કરી. આગામી દિવસોમાં વિભાગો કામગીરીની સમીક્ષા કરશે. '.repeat(4),
      summary: 'રાજ્યમાં નવી જાહેર યોજના શરૂ કરવામાં આવી છે.',
      keyTakeaways: ['યોજનાની જાહેરાત આજે કરવામાં આવી.', 'રાજ્ય સરકારે યોજનાને મંજૂરી આપી.', 'અધિકારીઓ અમલીકરણ પર દેખરેખ રાખશે.'],
      category: 'State & Regional',
      suggestedPage: 2,
      importanceScore: 7,
      isLeadStory: false,
      sentiment: 'positive',
    };
    config.aiApiKey = 'AIzaUnitTestKey';
    config.aiProvider = 'gemini';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(geminiResponse(englishArticle))
      .mockResolvedValueOnce(geminiResponse(gujaratiArticle));

    try {
      const article = await analyzeNewsArticle({ title: 'New public programme launched' }, { language: 'gu' });
      const translationPrompt = JSON.parse(global.fetch.mock.calls[1][1].body).contents[0].parts[0].text;
      expect(translationPrompt).toContain('Translate the following newspaper article into Gujarati');
      expect(article.language).toBe('gu');
      expect(article.headline).toBe('નવી જાહેર યોજના શરૂ');
      expect(articleUsesLanguageScript(article, 'gu')).toBe(true);
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('repairs localized articles that have the right script but incomplete fields', async () => {
    const previousKey = config.aiApiKey;
    const previousProvider = config.aiProvider;
    const previousFetch = global.fetch;
    const validBody = 'ગુજરાત સરકારે આજે નવી યોજના જાહેર કરી. અધિકારીઓએ અમલીકરણની વિગતો આપી. નાગરિકોને આગામી અઠવાડિયાથી લાભ મળશે. વિભાગો પ્રગતિની સમીક્ષા કરશે. '.repeat(2);
    const validGujaratiArticle = {
      headline: 'ગુજરાતમાં નવી યોજના જાહેર',
      deck: 'રાજ્ય સરકારે નવી યોજનાની જાહેરાત કરી.',
      body: validBody,
      summary: 'રાજ્યમાં નવી યોજના જાહેર કરવામાં આવી છે.',
      keyTakeaways: ['યોજનાની જાહેરાત થઈ.', 'અમલીકરણ શરૂ થશે.', 'વિભાગો પ્રગતિની સમીક્ષા કરશે.'],
      category: 'State & Regional',
      suggestedPage: 2,
    };
    const incompleteGujaratiArticle = {
      ...validGujaratiArticle,
      keyTakeaways: [...validGujaratiArticle.keyTakeaways, 'વધારાની માહિતી.'],
    };
    config.aiApiKey = 'AIzaUnitTestKey';
    config.aiProvider = 'gemini';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(geminiResponse(incompleteGujaratiArticle))
      .mockResolvedValueOnce(geminiResponse(validGujaratiArticle));

    try {
      const article = await analyzeNewsArticle({ title: 'Gujarat announces new programme' }, { language: 'gu' });
      const repairPrompt = JSON.parse(global.fetch.mock.calls[1][1].body).contents[0].parts[0].text;

      expect(repairPrompt).toContain('keyTakeaways must contain exactly 3');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(article.keyTakeaways).toHaveLength(3);
      expect(articleUsesLanguageScript(article, 'gu')).toBe(true);
    } finally {
      config.aiApiKey = previousKey;
      config.aiProvider = previousProvider;
      global.fetch = previousFetch;
    }
  });

  test('builds 8-page complete newspaper layout with designated lead stories', () => {
    const mockArticles = [
      {
        headline: 'Historic Space Mission Unveiled',
        deck: 'Key milestones announced',
        body: 'Details here...',
        category: 'Front Page',
        suggestedPage: 1,
        importanceScore: 9,
      },
      {
        headline: 'Secondary Front Page Development',
        deck: 'Brief updates',
        body: 'Details...',
        category: 'Front Page',
        suggestedPage: 1,
        importanceScore: 7,
      },
      {
        headline: 'State Legislative Assembly Reforms Passed',
        deck: 'Cabinet approval',
        body: 'Details...',
        category: 'State & Regional',
        suggestedPage: 2,
        importanceScore: 8,
      },
      {
        headline: 'Markets Rally to Historic Peak',
        deck: 'Bull run continues',
        body: 'Details...',
        category: 'Business & Economy',
        suggestedPage: 5,
        importanceScore: 8,
      },
      {
        headline: 'Championship Victory in Cricket Series',
        deck: 'Team lifts trophy',
        body: 'Details...',
        category: 'Sports',
        suggestedPage: 6,
        importanceScore: 9,
      },
    ];

    const pages = buildPageWiseLayout(mockArticles, { language: 'en', totalPages: 8 });
    expect(pages).toHaveLength(8);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].articles.length).toBeGreaterThan(0);
    expect(pages[0].articles[0].isLeadStory).toBe(true);
    expect(pages[4].pageNumber).toBe(5);
    expect(pages[4].articles[0].headline).toBe('Markets Rally to Historic Peak');
  });

  test('places an editor-assigned story on its selected page', () => {
    const pages = buildPageWiseLayout([{
      headline: 'Regional education programme announced',
      deck: 'Officials outlined a new education initiative.',
      body: 'The state education department announced a programme for schools. '.repeat(5),
      category: 'State & Regional',
      suggestedPage: 6,
      importanceScore: 6,
    }], { language: 'hi', totalPages: 8 });

    expect(pages[1].articles).toHaveLength(0);
    expect(pages[5].articles.map((article) => article.headline)).toEqual([
      'Regional education programme announced',
    ]);
  });

  test('collectNews falls back to rich sample feeds if external network is unavailable', async () => {
    const result = await collectNews({
      presetIds: ['top-national'],
      language: 'en',
      limit: 5,
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toHaveProperty('title');
    expect(result.items[0]).toHaveProperty('description');
  });

  test('builds regional feed URLs in the selected local language', () => {
    const preset = PRESET_FEEDS.find((item) => item.id === 'regional-affairs');
    const feedUrl = new URL(buildLanguageAwarePresetUrl(preset, 'Gujarati', 'Gujarat'));

    expect(feedUrl.searchParams.get('q')).toContain('Gujarat');
    expect(feedUrl.searchParams.get('hl')).toBe('gu-IN');
    expect(feedUrl.searchParams.get('ceid')).toBe('IN:gu');
  });

  test('exposes specialist news topics and balances results across selected feeds', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const query = new URL(url).searchParams.get('q') || '';
      const topic = query.toLowerCase().includes('space') ? 'Space' : 'National';
      const items = [1, 2].map((number) => (
        `<item><title>${topic} story ${number}</title><link>https://example.com/${topic}-${number}</link><description>${topic} report ${number}</description></item>`
      )).join('');
      return {
        ok: true,
        text: async () => `<rss><channel>${items}</channel></rss>`,
      };
    });

    try {
      const presetIds = PRESET_FEEDS.map((preset) => preset.id);
      expect(presetIds).toEqual(expect.arrayContaining([
        'space-astronomy',
        'health-medicine',
        'education',
        'environment-climate',
        'politics-elections',
      ]));

      const result = await collectNews({
        presetIds: ['top-national', 'space-astronomy'],
        language: 'en',
        limit: 3,
      });

      expect(result.items.map((item) => item.presetId)).toEqual([
        'top-national',
        'space-astronomy',
        'top-national',
      ]);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  test('collectNews keeps source-language metadata instead of labeling English samples as Gujarati', async () => {
    const rawResult = await collectNews({
      presetIds: [],
      rawTexts: [{ title: 'રાજ્ય સમાચાર', text: 'રાજ્ય સરકારે નવો વિકાસ કાર્યક્રમ જાહેર કર્યો.', language: 'gu' }],
      language: 'gu',
      limit: 5,
    });
    expect(rawResult.items[0].language).toBe('gu');

    const fallbackResult = await collectNews({
      presetIds: [],
      language: 'Gujarati',
      limit: 5,
    });
    expect(fallbackResult.items[0].language).toBe('en');
  });

  test('collectNews keeps distinct non-Latin headlines when deduplicating stories', async () => {
    const result = await collectNews({
      presetIds: [],
      rawTexts: [
        { title: 'हिंदी समाचार एक', text: 'पहली स्थानीय खबर।', language: 'hi' },
        { title: 'हिंदी समाचार दो', text: 'दूसरी स्थानीय खबर।', language: 'hi' },
        { title: 'हिंदी समाचार एक', text: 'पहली स्थानीय खबर का पुनर्प्रकाशन।', language: 'hi' },
      ],
      language: 'hi',
      limit: 5,
    });

    expect(result.items.map((item) => item.title)).toEqual([
      'हिंदी समाचार एक',
      'हिंदी समाचार दो',
    ]);
  });
});

describe('AI News issue controller', () => {
  test('does not report a malformed Gemini key as configured', () => {
    const previousProvider = config.aiProvider;
    const previousKey = config.aiApiKey;
    config.aiProvider = 'gemini';
    config.aiApiKey = 'not-a-gemini-api-key-value';
    const response = { json: jest.fn() };

    try {
      getAiStatus({}, response);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          isConfigured: false,
          setupGuide: expect.objectContaining({
            message: expect.stringContaining('Gemini key format is invalid'),
          }),
        }),
      }));
    } finally {
      config.aiProvider = previousProvider;
      config.aiApiKey = previousKey;
    }
  });

  test('validates OpenAI key format and returns OpenAI setup instructions', () => {
    const previousProvider = config.aiProvider;
    const previousKey = config.aiApiKey;
    config.aiProvider = 'openai';
    config.aiApiKey = 'invalid-openai-key';
    const response = { json: jest.fn() };

    try {
      getAiStatus({}, response);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          isConfigured: false,
          requestedProvider: 'openai',
          setupGuide: expect.objectContaining({
            message: expect.stringContaining('OPENAI_API_KEY'),
            steps: expect.arrayContaining([
              expect.stringContaining('AI_PROVIDER=openai'),
            ]),
          }),
        }),
      }));

      config.aiApiKey = 'sk-project-test123';
      getAiStatus({}, response);
      expect(response.json).toHaveBeenLastCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          isConfigured: true,
          provider: 'openai',
          requestedProvider: 'openai',
        }),
      }));
    } finally {
      config.aiProvider = previousProvider;
      config.aiApiKey = previousKey;
    }
  });

  test('persists the selected language when an issue is translated', async () => {
    const issue = {
      language: 'en',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const findIssue = jest.spyOn(AiIssue, 'findOne').mockResolvedValue(issue);
    const response = { json: jest.fn() };
    const next = jest.fn();

    await updateIssue({
      params: { id: '507f1f77bcf86cd799439011' },
      user: { tenantId: '507f1f77bcf86cd799439012' },
      body: { language: 'Gujarati' },
    }, response, next);

    expect(issue.language).toBe('gu');
    expect(issue.save).toHaveBeenCalledTimes(1);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ data: issue }));
    expect(next).not.toHaveBeenCalled();
    findIssue.mockRestore();
  });

  test('does not save English stories in a Hindi issue', async () => {
    const issue = {
      language: 'hi',
      pages: [],
      save: jest.fn().mockResolvedValue(undefined),
    };
    const findIssue = jest.spyOn(AiIssue, 'findOne').mockResolvedValue(issue);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    try {
      await updateIssue({
        params: { id: '507f1f77bcf86cd799439011' },
        user: { tenantId: '507f1f77bcf86cd799439012' },
        body: {
          pages: [{
            pageNumber: 1,
            pageTitle: 'मुखपृष्ठ / राष्ट्रीय समाचार',
            articles: [{
              headline: 'English headline',
              deck: 'English deck',
              body: 'An English story body with more than enough text.',
              summary: 'English summary',
              keyTakeaways: ['English point one', 'English point two', 'English point three'],
            }],
          }],
        },
      }, response, next);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'All article text must be in the selected language before saving this issue.',
      }));
      expect(issue.save).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      findIssue.mockRestore();
    }
  });
});
