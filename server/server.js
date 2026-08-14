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

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
app.use('/api/incidents', incidentRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
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

// ─── MongoDB + Server start ───────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/service-desk';

// Mongoose connection options - tuned for Atlas Free Tier stability
const mongoOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 1,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4, // Force IPv4 to bypass Render's DNS IPv6 resolution/Atlas TLS handshake issue
  tls: true,
  tlsAllowInvalidCertificates: true, // Bypass cert validation if Render container lacks Atlas root CAs
};

async function connectMongo() {
  while (true) {
    try {
      const sanitizedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
      console.log(`📡 Attempting MongoDB connection to: ${sanitizedUri}`);
      await mongoose.connect(MONGODB_URI, mongoOptions);
      console.log(`✅ MongoDB connected!`);
      break; // Exit loop on success
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      console.log('🔄 Retrying in 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected - attempting to reconnect...');
  connectMongo(); // Re-trigger connection loop on disconnect
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// ─── Start HTTP server FIRST so Render's port scan succeeds ──────────────────
// MongoDB connects in the background. API calls will gracefully handle
// the case when DB is not yet connected.
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 API available at http://localhost:${PORT}/api`);
  // Connect to MongoDB in background after server is up
  connectMongo();
});

export default app;
