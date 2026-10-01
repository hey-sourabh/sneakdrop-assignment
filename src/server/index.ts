import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import RedisClient from './infrastructure/RedisClient';
import StockRepository from './repositories/StockRepository';
import HoldService from './services/HoldService';
import ExpiryWatcher from './services/ExpiryWatcher';
import apiRoutes from './routes/api.routes';
import paymentRoutes from './routes/payment.routes';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost')) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api/payment', paymentRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

async function bootstrap(): Promise<void> {
  await RedisClient.connect();

  const stockExists = await StockRepository.getInstance().exists();
  if (!stockExists) await HoldService.getInstance().initStock();

  await ExpiryWatcher.getInstance().start();

  app.listen(PORT, () => {
    console.log(`\n🚀 SneakDrop server running on http://localhost:${PORT}`);
    console.log(`   API:     http://localhost:${PORT}/api`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
