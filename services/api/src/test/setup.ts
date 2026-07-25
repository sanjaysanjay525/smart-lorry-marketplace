import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://slm:slm_dev_password@localhost:5432/smart_lorry_test';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_minimum_16';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_minimum_16';
process.env.ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
