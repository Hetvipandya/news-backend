const mongoose = require('mongoose');
const config = require('../config');

async function connectDB() {
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb });
  console.log('MongoDB connected');
}

module.exports = { connectDB };
