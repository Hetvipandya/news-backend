// backend/src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const config = require('./config');
const authRoutes = require('./routes/auth');
const publishingRoutes = require('./routes/publishing');
const articleRoutes = require('./routes/articles');
const dashboardRoutes = require('./routes/dashboard');
const workflowRoutes = require('./routes/workflows');
const teamRoutes = require('./routes/team');
const platformRoutes = require('./routes/platform');
const aiNewsRoutes = require('./routes/aiNews');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

function isAllowedOrigin(origin) {
  if (config.corsOrigins.includes(origin)) {
    return true;
  }
  if (config.nodeEnv === 'production') {
    return false;
  }
  try {
    const { protocol, hostname } = new URL(origin);
    return ['http:', 'https:'].includes(protocol)
      && ['localhost', '127.0.0.1'].includes(hostname);
  } catch (error) {
    return false;
  }
}

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api/v1/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({
    success: ready,
    status: ready ? 'ok' : 'database_unavailable',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', publishingRoutes);
app.use('/api/v1/articles', articleRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1', workflowRoutes);
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/platform', platformRoutes);
app.use('/api/v1/ai', aiNewsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);

module.exports = app;
