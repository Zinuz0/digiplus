// server/server.js
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import incidentRoutes from './routes/incidentRoutes.js';
import knowledgeRoutes from './routes/knowledgeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
// ─── Redirect root hits (e.g. from Render URL) to the Vercel frontend ─────────
const FRONTEND_URL = process.env.CLIENT_URL || 'https://digiplus-lime.vercel.app';
app.get('/', (req, res) => res.redirect(301, FRONTEND_URL));

// NOTE: No requireDB guard — Mongoose buffers queries automatically until
// connected (bufferTimeoutMS gives 90 seconds for the DB to come up).
app.use('/api/incidents', incidentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/admin', adminRoutes);



// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
    readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString()
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ─── MongoDB connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/service-desk';

const mongoOptions = {
  serverSelectionTimeoutMS: 8000,   // how long to wait per attempt
  socketTimeoutMS: 60000,
  bufferCommands: true,             // Mongoose buffers ops until connected
  maxPoolSize: 3
};

let isConnecting = false;

async function connectMongo() {
  if (isConnecting) return;
  isConnecting = true;
  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const sanitizedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
      console.log(`📡 [Attempt ${attempt}] Connecting to: ${sanitizedUri}`);
      await mongoose.connect(MONGODB_URI, mongoOptions);
      console.log(`✅ MongoDB connected on attempt ${attempt}`);
      isConnecting = false;
      break;
    } catch (err) {
      console.error(`❌ [Attempt ${attempt}] MongoDB failed: ${err.message}`);
      // Shorter delay on first few retries, then back off
      const delay = attempt <= 3 ? 3000 : attempt <= 6 ? 5000 : 10000;
      console.log(`🔄 Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
  // Mongoose will auto-reconnect; only manually trigger if completely dropped
  if (!isConnecting) connectMongo();
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
  isConnecting = false;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// Connect to MongoDB
connectMongo();

// Always start the HTTP server
// On Vercel serverless, this is a no-op since Vercel calls the exported handler directly.
// On Railway/Render/local, this opens the port.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;


