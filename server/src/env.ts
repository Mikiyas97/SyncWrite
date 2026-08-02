import dotenv from 'dotenv';
import path from 'path';

// Always load server/.env regardless of the process working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
