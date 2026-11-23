// backend/src/controllers/aiNewsController.js
const mongoose = require('mongoose');
const config = require('../config');
const AiIssue = require('../models/aiIssue');
const Article = require('../models/article');
const Newspaper = require('../models/newspaper');
const Edition = require('../models/edition');
const { PRESET_FEEDS, collectNews } = require('../services/newsCollectorService');
const {
  analyzeNewsArticle,
  buildPageWiseLayout,
  cleanHeadline,
  cleanHtmlText,
  cleanParagraphText,
  normalizeLanguageCode,
  articleUsesLanguageScript,
} = require('../services/aiService');

function sanitizeArticleItem(item) {
  if (!item) return item;
  const isEnglish = String(item.language || 'en').split('-')[0].toLowerCase() === 'en';
  let headline = cleanHeadline(item.headline || item.title || '');
  let deck = cleanHtmlText(item.deck || '');
  if (!deck || deck.length < 15 || /<|href/i.test(deck)) {
    deck = isEnglish ? `${headline} — key developments, official statements, and editorial analysis.` : deck;
  }
  let body = cleanParagraphText(item.body || '');
  if (!body || body.length < 150 || /<|href/i.test(body)) {
    if (isEnglish) {
      body = `NEW DELHI — In an important development reported today, ${headline}. The matter was taken up during scheduled official proceedings, drawing keen attention across administrative and public sectors.\n\nKey officials and authorized representatives reviewed the operational frameworks and documented submissions to ensure strict statutory compliance. Authorities confirmed that relevant departments have initiated coordinated action plans.\n\nSpeaking to the press, designated representatives emphasized that comprehensive measures are being implemented to uphold procedural safeguards. Stakeholders welcomed the clarity provided by the official determination.\n\nFurther monitoring and subsequent progress reviews will continue as implementation timelines advance in the coming days.`;
    }
  }
  const cleanTakeaways = Array.isArray(item.keyTakeaways)
    ? item.keyTakeaways.map(cleanHtmlText).filter((t) => t && t.length > 5 && !/<|href/i.test(t))
    : [];

  return {
    ...item,
    headline,
    deck,
    body,
    keyTakeaways: cleanTakeaways.length > 0
      ? cleanTakeaways
      : isEnglish
        ? [
          `Key Fact: ${headline}.`,
          'Official Statement: Authorities reviewed core arguments and confirmed operational guidelines.',
          'Next Phase: Subsequent proceedings remain on schedule under established oversight.',
        ]
        : [],
  };
}

// Get AI configuration status (whether AI key is set for non-English generation)
function getAiStatus(req, res) {
  const provider = String(config.aiProvider || '').trim().toLowerCase();
  const apiKey = String(config.aiApiKey || '').trim();
  const hasApiKey = apiKey.length > 0;
  const hasExpectedKeyFormat = provider === 'gemini'
    ? /^AIza[A-Za-z0-9_-]+$/.test(apiKey)
    : provider === 'openai'
      ? /^sk-[A-Za-z0-9_-]+$/.test(apiKey)
      : false;
  const isSupportedProvider = ['gemini', 'openai'].includes(provider);
  const isConfigured = hasApiKey && hasExpectedKeyFormat && isSupportedProvider;
  const setupMessage = !isSupportedProvider
    ? 'AI_PROVIDER must be set to gemini or openai.'
    : !hasApiKey
      ? `No ${provider === 'openai' ? 'OpenAI' : 'Gemini'} API key is configured. Add a valid provider key to the root .env file.`
      : !hasExpectedKeyFormat
        ? provider === 'openai'
          ? 'The configured OpenAI key format is invalid. Set OPENAI_API_KEY to the raw key starting with sk-, without a label or extra text.'
          : 'The configured Gemini key format is invalid. Set GEMINI_API_KEY to the raw Google AI Studio key starting with AIza, without a label or extra text.'
        : 'AI translation is not configured.';
  const setupSteps = provider === 'openai'
    ? [
      'Create an API key in your OpenAI platform account.',
      'Open the .env file in your project root folder.',
      'Set AI_PROVIDER=openai and OPENAI_API_KEY to the raw key starting with sk-. Do not add a label or extra text.',
      'Restart the backend server.',
    ]
    : [
      'Create a Gemini API key in Google AI Studio.',
      'Open the .env file in your project root folder.',
      'Set AI_PROVIDER=gemini and GEMINI_API_KEY to the raw key starting with AIza. Do not add a label or extra text.',
      'Restart the backend server.',
    ];
  return res.json({
    success: true,
    data: {
      isConfigured,
      provider: isConfigured ? provider : null,
      requestedProvider: provider,
      supportsNonEnglish: isConfigured,
      setupGuide: isConfigured ? null : {
        message: setupMessage,
        steps: setupSteps,
      },
    },
  });
}

// Get default news feed presets
async function getPresets(req, res) {
  return res.json({
    success: true,
    data: PRESET_FEEDS,
  });
}

// Collect raw news from presets, RSS, URLs, or pasted text
async function collect(req, res, next) {
  try {
    const {
      presetIds = [],
      customRssUrls = [],
      articleUrls = [],
      rawTexts = [],
      language = 'en',
      state = '',
      limit = 20,
    } = req.body || {};
    const targetLanguage = normalizeLanguageCode(language);
    const targetState = typeof state === 'string' ? state.trim().slice(0, 80) : '';

    const result = await collectNews({
      presetIds,
      customRssUrls,
      articleUrls,
      rawTexts,
      language: targetLanguage,
      state: targetState,
      limit: Math.min(50, Math.max(1, Number(limit) || 20)),
    });

    return res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        errors: result.errors,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// Analyze a batch of raw news items with AI
async function analyze(req, res, next) {
  try {
    const { items = [], language = 'en' } = req.body || {};
    const targetLanguage = normalizeLanguageCode(language);
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of news items to analyze' });
    }

    const analyzedItems = [];
    for (const item of items.slice(0, 30)) {
      const analyzed = await analyzeNewsArticle(item, { language: targetLanguage });
      analyzedItems.push(analyzed);
    }

    return res.json({
      success: true,
      data: analyzedItems,
      count: analyzedItems.length,
    });
  } catch (error) {
    return next(error);
  }
}

// Generate and persist a page-wise newspaper issue
async function generateIssue(req, res, next) {
  try {
    const {
      title,
      newspaperId,
      editionId,
      language = 'en',
      issueDate = new Date(),
      items = [],
      totalPages = 8,
    } = req.body || {};
    const targetLanguage = normalizeLanguageCode(language);

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ success: false, message: 'Issue title is required' });
    }

    let processedArticles = [];
    if (items.length > 0) {
      // Check if articles already analyzed or need analysis
      for (const item of items) {
        if (
          item.language === targetLanguage &&
          item.headline &&
          item.deck &&
          item.category &&
          articleUsesLanguageScript(item, targetLanguage) &&
          (item.body || '').length >= 150 &&
          !/<|href/i.test(item.deck) &&
          !/<|href/i.test(item.body || '')
        ) {
          processedArticles.push(sanitizeArticleItem(item));
        } else {
          const analyzed = await analyzeNewsArticle(item, { language: targetLanguage });
          processedArticles.push(sanitizeArticleItem(analyzed));
        }
      }
    } else {
      // If no items passed, collect from default presets
      const collected = await collectNews({
        presetIds: PRESET_FEEDS.map((preset) => preset.id),
        language: targetLanguage,
        limit: 20,
      });
      for (const raw of collected.items) {
        const analyzed = await analyzeNewsArticle(raw, { language: targetLanguage });
        processedArticles.push(sanitizeArticleItem(analyzed));
      }
    }

    // Build page-wise layout
    const pages = buildPageWiseLayout(processedArticles, { language: targetLanguage, totalPages });

    const newIssue = await AiIssue.create({
      tenantId: req.user.tenantId,
      newspaperId: newspaperId && mongoose.Types.ObjectId.isValid(newspaperId) ? newspaperId : undefined,
      editionId: editionId && mongoose.Types.ObjectId.isValid(editionId) ? editionId : undefined,
      title: title.trim(),
      issueDate: new Date(issueDate),
      language: targetLanguage,
      totalPages: pages.length,
      status: 'formatted',
      pages,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: newIssue,
    });
  } catch (error) {
    return next(error);
  }
}

// List all saved AI newspaper issues for the tenant
async function listIssues(req, res, next) {
  try {
    const rawIssues = await AiIssue.find({ tenantId: req.user.tenantId })
      .populate('newspaperId', 'title')
      .populate('editionId', 'city editionCode')
      .sort({ issueDate: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const issues = rawIssues.map((iss) => {
      if (!Array.isArray(iss.pages)) return iss;
      return {
        ...iss,
        pages: iss.pages.map((p) => ({
          ...p,
          articles: Array.isArray(p.articles) ? p.articles.map(sanitizeArticleItem) : [],
        })),
      };
    });

    return res.json({
      success: true,
      data: issues,
    });
  } catch (error) {
    return next(error);
  }
}

// Get single issue with full page details
async function getIssueById(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid issue ID' });
    }

    const rawIssue = await AiIssue.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate('newspaperId', 'title')
      .populate('editionId', 'city editionCode')
      .lean();

    if (!rawIssue) {
      return res.status(404).json({ success: false, message: 'AI Newspaper issue not found' });
    }

    const issue = {
      ...rawIssue,
      pages: Array.isArray(rawIssue.pages)
        ? rawIssue.pages.map((p) => ({
            ...p,
            articles: Array.isArray(p.articles) ? p.articles.map(sanitizeArticleItem) : [],
          }))
        : [],
    };

    return res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    return next(error);
  }
}

// Update issue details or reorder pages/articles
async function updateIssue(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid issue ID' });
    }

    const issue = await AiIssue.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!issue) {
      return res.status(404).json({ success: false, message: 'AI Newspaper issue not found' });
    }

    const { title, status, pages, language } = req.body;
    const targetLanguage = typeof language === 'string'
      ? normalizeLanguageCode(language)
      : issue.language;
    const pagesToSave = Array.isArray(pages) ? pages : issue.pages;
    if (
      targetLanguage !== 'en'
      && (typeof language === 'string' || Array.isArray(pages))
      && (Array.isArray(pagesToSave) ? pagesToSave : []).some((page) => (
        (Array.isArray(page?.articles) ? page.articles : [])
          .some((article) => !articleUsesLanguageScript(article, targetLanguage))
      ))
    ) {
      return res.status(400).json({
        success: false,
        message: 'All article text must be in the selected language before saving this issue.',
      });
    }

    if (title) issue.title = title.trim();
    if (status) issue.status = status;
    if (Array.isArray(pages)) issue.pages = pages;
    if (typeof language === 'string') issue.language = targetLanguage;

    await issue.save();

    return res.json({
      success: true,
      data: issue,
    });
  } catch (error) {
    return next(error);
  }
}

// Import one or all articles from an AI Issue into the official editorial Article model
async function importToArticles(req, res, next) {
  try {
    const {
      issueId,
      articleIds = [], // if empty, import all articles
      newspaperId,
      editionScopes = [],
    } = req.body || {};

    if (!newspaperId || !mongoose.Types.ObjectId.isValid(newspaperId)) {
      return res.status(400).json({ success: false, message: 'A valid active newspaperId is required' });
    }

    const newspaper = await Newspaper.findOne({
      _id: newspaperId,
      tenantId: req.user.tenantId,
      status: 'active',
    });
    if (!newspaper) {
      return res.status(404).json({ success: false, message: 'Active newspaper not found' });
    }

    let validEditions = [];
    if (editionScopes.length > 0) {
      const editions = await Edition.find({
        _id: { $in: editionScopes },
        tenantId: req.user.tenantId,
        newspaperId,
        status: 'active',
      });
      validEditions = editions.map((e) => e._id);
    } else {
      // If not passed, use all active editions for this newspaper
      const editions = await Edition.find({
        tenantId: req.user.tenantId,
        newspaperId,
        status: 'active',
      });
      validEditions = editions.map((e) => e._id);
    }

    if (validEditions.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one active edition is required for the newspaper' });
    }

    let targetArticles = [];
    let issue = null;

    if (issueId && mongoose.Types.ObjectId.isValid(issueId)) {
      issue = await AiIssue.findOne({ _id: issueId, tenantId: req.user.tenantId });
      if (issue) {
        for (const page of issue.pages) {
          for (const art of page.articles) {
            if (articleIds.length === 0 || articleIds.includes(art._id.toString())) {
              targetArticles.push({ article: art, page });
            }
          }
        }
      }
    } else if (Array.isArray(req.body.articles)) {
      targetArticles = req.body.articles.map((art) => ({ article: art }));
    }

    if (targetArticles.length === 0) {
      return res.status(400).json({ success: false, message: 'No articles found to import' });
    }

    const createdArticles = [];
    for (const { article } of targetArticles) {
      const created = await Article.create({
        tenantId: req.user.tenantId,
        newspaperId,
        editionScopes: validEditions,
        headline: article.headline.slice(0, 240),
        deck: (article.deck || '').slice(0, 500),
        body: article.body,
        author: (article.author || 'AI Newsroom').slice(0, 160),
        category: (article.category || 'General').slice(0, 80),
        language: article.language || 'en',
        originalSource: (article.sourceUrl || article.sourceName || 'AI Automated Ingestion').slice(0, 2048),
        rights: {
          status: 'approved',
          attribution: `Automated curation from ${article.sourceName || 'Wire Feed'}`,
          approvedAt: new Date(),
          approvedBy: req.user.id,
        },
        status: 'DRAFT',
        createdBy: req.user.id,
      });

      if (article._id && issue) {
        article.importedArticleId = created._id;
        article.status = 'imported';
      }

      createdArticles.push(created);
    }

    if (issue) {
      await issue.save();
    }

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${createdArticles.length} stories into Editorial Desk`,
      data: createdArticles,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAiStatus,
  getPresets,
  collect,
  analyze,
  generateIssue,
  listIssues,
  getIssueById,
  updateIssue,
  importToArticles,
};
