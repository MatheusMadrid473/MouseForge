import { boolean, pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  password: text('password').notNull(),
  role: text('role', { enum: ['admin', 'manager', 'cashier'] }).default('cashier').notNull(),
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
