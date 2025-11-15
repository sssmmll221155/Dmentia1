/**
 * Cognitive Tracker Backend API
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import metricsRouter from './routes/metrics';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for gaze points

// Routes
app.use('/api/auth', authRouter);
app.use('/api/metrics', metricsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Server] Cognitive Tracker API running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Server] Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };
