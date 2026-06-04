import { boolean, integer, pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'cashier'] }).default('cashier').notNull(),
  companyId: uuid('company_id'),
  branchId: uuid('branch_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  document: text('document'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const branches = pgTable('branches', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  document: text('document'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const terms = pgTable('terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  version: text('version').notNull(),
  content: text('content').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const termAcceptances = pgTable('term_acceptances', {
  id: uuid('id').defaultRandom().primaryKey(),
  termId: uuid('term_id').notNull().references(() => terms.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  acceptedAt: timestamp('accepted_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  name: text('name').notNull(),
  barcode: text('barcode'),
  sku: text('sku'),
  category: text('category'),
  unit: text('unit').default('un').notNull(),
  salePriceCents: integer('sale_price_cents').default(0).notNull(),
  costPriceCents: integer('cost_price_cents').default(0).notNull(),
  minStock: integer('min_stock').default(0).notNull(),
  currentStock: integer('current_stock').default(0).notNull(),
  ncm: text('ncm'),
  cest: text('cest'),
  cfop: text('cfop'),
  taxOrigin: text('tax_origin'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  name: text('name').notNull(),
  document: text('document'),
  phone: text('phone'),
  email: text('email'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
});

export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  customerId: uuid('customer_id').references(() => customers.id),
  operatorId: uuid('operator_id').notNull().references(() => users.id),
  status: text('status', { enum: ['completed', 'cancelled'] }).default('completed').notNull(),
  paymentMethod: text('payment_method', { enum: ['pix', 'debit', 'credit', 'cash', 'voucher', 'mixed'] }).default('cash').notNull(),
  totalCents: integer('total_cents').default(0).notNull(),
  discountCents: integer('discount_cents').default(0).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const saleItems = pgTable('sale_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  saleId: uuid('sale_id').notNull().references(() => sales.id),
  productId: uuid('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPriceCents: integer('unit_price_cents').default(0).notNull(),
  totalCents: integer('total_cents').default(0).notNull(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['entry', 'sale', 'loss', 'adjustment'] }).notNull(),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const fiscalDocuments = pgTable('fiscal_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  saleId: uuid('sale_id').references(() => sales.id),
  type: text('type', { enum: ['nfce', 'nfe'] }).default('nfce').notNull(),
  status: text('status', { enum: ['draft', 'pending', 'authorized', 'rejected', 'cancelled'] }).default('pending').notNull(),
  number: text('number'),
  series: text('series'),
  accessKey: text('access_key'),
  protocol: text('protocol'),
  errorMessage: text('error_message'),
  totalCents: integer('total_cents').default(0).notNull(),
  issuedAt: timestamp('issued_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
});

export const fiscalSettings = pgTable('fiscal_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  provider: text('provider').default('manual').notNull(),
  environment: text('environment', { enum: ['homologation', 'production'] }).default('homologation').notNull(),
  uf: text('uf'),
  stateRegistration: text('state_registration'),
  legalName: text('legal_name'),
  cscId: text('csc_id'),
  cscSecretRef: text('csc_secret_ref'),
  certificateRef: text('certificate_ref'),
  nfceSeries: text('nfce_series').default('1').notNull(),
  nextNfceNumber: integer('next_nfce_number').default(1).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: uuid('updated_by'),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id),
  branchId: uuid('branch_id').references(() => branches.id),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: uuid('entity_id'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
