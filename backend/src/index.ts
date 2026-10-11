import express from 'express';
import cors from 'cors';
import { ENV } from './config/env';
import authRoutes from './routes/authRoutes';
import beneficiaryRoutes from './routes/beneficiaryRoutes';
import distributionRoutes from './routes/distributionRoutes';
import shopkeeperRoutes from './routes/shopkeeperRoutes';
import adminRoutes from './routes/adminRoutes';
import queueRoutes from './routes/queueRoutes';
import complaintRoutes from './routes/complaintRoutes';
import notificationRoutes from './routes/notificationRoutes';
import stockRoutes from './routes/stockRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'Smart Ration Distribution System API',
    environment: ENV.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/beneficiary', beneficiaryRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/shopkeeper', shopkeeperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stock', stockRoutes);

// Error Handler Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(ENV.PORT, () => {
    console.log(`[Server] Smart Ration Distribution System API running on port ${ENV.PORT}`);
  });
}

export default app;
