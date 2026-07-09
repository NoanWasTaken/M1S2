import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: process.env.PORT ?? '4000',
  mongoUri: required('MONGODB_URI'),
  corsOrigin: process.env.CORS_DASHBOARD_ORIGIN ?? 'http://localhost:3000',
  corsExtraOrigins: process.env.CORS_EXTRA_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [],
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
};