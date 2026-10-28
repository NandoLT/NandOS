import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type { PortfolioContent } from '@nandoos/contracts'

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    singleton: boolean('singleton').notNull().default(true),
    username: varchar('username', { length: 48 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('admin_users_singleton_unique').on(table.singleton),
    check('admin_users_singleton_is_true', sql`${table.singleton} = true`),
  ]
)

export const adminSessions = pgTable('admin_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminUserId: uuid('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const portfolioDocuments = pgTable('portfolio_documents', {
  id: integer('id').primaryKey(),
  draftContent: jsonb('draft_content').$type<PortfolioContent>().notNull(),
  publishedContent: jsonb('published_content').$type<PortfolioContent>().notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
})

export const portfolioRevisions = pgTable('portfolio_revisions', {
  id: serial('id').primaryKey(),
  revision: integer('revision').notNull().unique(),
  content: jsonb('content').$type<PortfolioContent>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const cvUploads = pgTable(
  'cv_uploads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    language: varchar('language', { length: 2 }).notNull(),
    filename: varchar('filename', { length: 180 }).notNull(),
    url: text('url').notNull(),
    pathname: text('pathname').notNull(),
    fileSize: integer('file_size').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('cv_uploads_language_valid', sql`${table.language} in ('es', 'en')`),
  ]
)
