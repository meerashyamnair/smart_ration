import dotenv from 'dotenv';
import path from 'path';

// Load workspace root .env and backend .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const defaultDbPath = path.resolve(__dirname, '../../prisma/dev.db');

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || `file:${defaultDbPath}`,
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_smart_ration_pds_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
};
