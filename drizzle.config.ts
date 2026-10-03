import { defineConfig } from 'drizzle-kit';

// Does NOT load .env.local on purpose: generate/check never need a connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
