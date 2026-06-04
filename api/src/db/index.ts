import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL nao foi informada nas variaveis de ambiente.');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect().catch((err) => {
  console.error('Erro ao conectar no PostgreSQL:', err);
});

export const db = drizzle(client, { schema });
