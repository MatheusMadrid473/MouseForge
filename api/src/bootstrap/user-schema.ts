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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "products" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "name" text NOT NULL,
      "barcode" text,
      "sku" text,
      "category" text,
      "unit" text NOT NULL DEFAULT 'un',
      "sale_price_cents" integer NOT NULL DEFAULT 0,
      "cost_price_cents" integer NOT NULL DEFAULT 0,
      "min_stock" integer NOT NULL DEFAULT 0,
      "current_stock" integer NOT NULL DEFAULT 0,
      "ncm" text,
      "cest" text,
      "cfop" text,
      "tax_origin" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_by" uuid,
      "updated_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "products_scope_idx" ON "products" ("company_id", "branch_id")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products" ("barcode")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "name" text NOT NULL,
      "document" text,
      "phone" text,
      "email" text,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_by" uuid,
      "updated_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "customers_scope_idx" ON "customers" ("company_id", "branch_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "customer_id" uuid REFERENCES "customers"("id"),
      "operator_id" uuid NOT NULL REFERENCES "users"("id"),
      "status" text NOT NULL DEFAULT 'completed',
      "payment_method" text NOT NULL DEFAULT 'cash',
      "total_cents" integer NOT NULL DEFAULT 0,
      "discount_cents" integer NOT NULL DEFAULT 0,
      "notes" text,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sales_scope_created_idx" ON "sales" ("company_id", "branch_id", "created_at")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sale_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "sale_id" uuid NOT NULL REFERENCES "sales"("id"),
      "product_id" uuid REFERENCES "products"("id"),
      "product_name" text NOT NULL,
      "quantity" integer NOT NULL DEFAULT 1,
      "unit_price_cents" integer NOT NULL DEFAULT 0,
      "total_cents" integer NOT NULL DEFAULT 0
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "sale_items_sale_idx" ON "sale_items" ("sale_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "inventory_movements" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "product_id" uuid NOT NULL REFERENCES "products"("id"),
      "user_id" uuid NOT NULL REFERENCES "users"("id"),
      "type" text NOT NULL,
      "quantity" integer NOT NULL,
      "reason" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "inventory_movements_scope_created_idx" ON "inventory_movements" ("company_id", "branch_id", "created_at")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "inventory_movements_product_idx" ON "inventory_movements" ("product_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fiscal_documents" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "sale_id" uuid REFERENCES "sales"("id"),
      "type" text NOT NULL DEFAULT 'nfce',
      "status" text NOT NULL DEFAULT 'pending',
      "number" text,
      "series" text,
      "access_key" text,
      "protocol" text,
      "error_message" text,
      "total_cents" integer NOT NULL DEFAULT 0,
      "issued_at" timestamp,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "updated_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "fiscal_documents_scope_created_idx" ON "fiscal_documents" ("company_id", "branch_id", "created_at")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fiscal_settings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid NOT NULL REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "provider" text NOT NULL DEFAULT 'manual',
      "environment" text NOT NULL DEFAULT 'homologation',
      "uf" text,
      "state_registration" text,
      "legal_name" text,
      "csc_id" text,
      "csc_secret_ref" text,
      "certificate_ref" text,
      "nfce_series" text NOT NULL DEFAULT '1',
      "next_nfce_number" integer NOT NULL DEFAULT 1,
      "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "updated_by" uuid
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "fiscal_settings_scope_idx" ON "fiscal_settings" ("company_id", "branch_id")`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "company_id" uuid REFERENCES "companies"("id"),
      "branch_id" uuid REFERENCES "branches"("id"),
      "user_id" uuid REFERENCES "users"("id"),
      "action" text NOT NULL,
      "entity" text NOT NULL,
      "entity_id" uuid,
      "summary" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "audit_logs_scope_created_idx" ON "audit_logs" ("company_id", "branch_id", "created_at")`);
}
