import { sql } from 'drizzle-orm';
import { db } from '../db';

export async function ensureUserSchema() {
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_id" uuid`);
  await db.execute(sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "branch_id" uuid`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "companies" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "document" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_by" uuid,
      "updated_by" uuid
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "branches" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "name" text NOT NULL,
      "document" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_by" uuid,
      "updated_by" uuid
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "terms" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" text NOT NULL,
      "version" text NOT NULL,
      "content" text NOT NULL,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_by" uuid,
      "updated_by" uuid
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "term_acceptances" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "term_id" uuid NOT NULL REFERENCES "terms"("id"),
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "accepted_at" timestamp NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "term_acceptances_user_term_unique" ON "term_acceptances" ("user_id", "term_id")`);
}
