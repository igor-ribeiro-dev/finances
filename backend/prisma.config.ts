import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { join } from 'path';

// Load .env from backend/ directory regardless of CWD
config({ path: join(__dirname, '.env') });

export default defineConfig({
  schema: join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
