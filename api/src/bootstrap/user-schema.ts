import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function ensureUserSchema() {
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username")`);
}
