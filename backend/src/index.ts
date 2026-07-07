import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import repairRoutes from './routes/repairRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import ocrRoutes from './routes/ocrRoutes';
import { processWarrantyReminders, refreshWarrantyStatuses } from './services/emailService';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'PurchaseHub API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products/:productId/repairs', repairRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ocr', ocrRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

async function start() {
  await connectDB();

  // Run warranty status refresh daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Refreshing warranty statuses...');
    await refreshWarrantyStatuses();
  });

  // Check and send warranty reminders daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Processing warranty reminders...');
    await processWarrantyReminders();
  });

  app.listen(PORT, () => {
    console.log(`PurchaseHub API running on port ${PORT}`);
    const hasVision = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`OCR: Google Vision ${hasVision ? 'enabled' : 'not configured — set GOOGLE_APPLICATION_CREDENTIALS'}`);
  });
}

start();

export default app;
