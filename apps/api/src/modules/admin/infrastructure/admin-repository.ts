import { and, eq, sql } from 'drizzle-orm'
import { getDatabase } from '../../../infrastructure/db/client.js'
import { adminSessions, adminUsers } from '../../../infrastructure/db/schema.js'

export type AdminIdentity = { id: string; username: string }

export async function hasAdminAccount() {
  const [admin] = await getDatabase().select({ id: adminUsers.id }).from(adminUsers).limit(1)
  return Boolean(admin)
}

export async function findAdminByUsername(username: string) {
  const [admin] = await getDatabase()
    .select({ id: adminUsers.id, username: adminUsers.username, passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1)
  return admin ?? null
}

export async function createAdminAccount(username: string, passwordHash: string): Promise<AdminIdentity> {
  const [admin] = await getDatabase()
    .insert(adminUsers)
    .values({ username, passwordHash })
    .returning({ id: adminUsers.id, username: adminUsers.username })
  if (!admin) throw new Error('Administrator account could not be created.')
  return admin
}

export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60
const SESSION_IDLE_SECONDS = 30 * 60

export async function storeAdminSession(admin: { id: string; passwordHash: string }, tokenHash: string, upgradedHash: string) {
  // Lock the credential row and create the session atomically with any hash upgrade.
  const result = await getDatabase().execute(sql`
    WITH verified AS (
      UPDATE admin_users SET password_hash = ${upgradedHash}
      WHERE id = ${admin.id} AND password_hash = ${admin.passwordHash}
      RETURNING id
    ), expired AS (
      DELETE FROM admin_sessions WHERE expires_at <= statement_timestamp()
    )
    INSERT INTO admin_sessions (admin_user_id, token_hash, expires_at)
    SELECT id, ${tokenHash}, statement_timestamp() + ${SESSION_MAX_AGE_SECONDS} * interval '1 second'
    FROM verified
    RETURNING id
  `)
  return result.rows.length === 1
}

export async function findAdminSession(tokenHash: string, refreshActivity: boolean): Promise<AdminIdentity | null> {
  const valid = sql`s.token_hash = ${tokenHash} AND s.admin_user_id = u.id
    AND s.expires_at > statement_timestamp()
    AND s.created_at > statement_timestamp() - ${SESSION_MAX_AGE_SECONDS} * interval '1 second'
    AND s.created_at >= u.password_changed_at
    AND s.last_seen_at > statement_timestamp() - ${SESSION_IDLE_SECONDS} * interval '1 second'`
  const { rows } = await getDatabase().execute<AdminIdentity>(refreshActivity ? sql`
    UPDATE admin_sessions AS s SET last_seen_at = greatest(s.last_seen_at, statement_timestamp())
    FROM admin_users AS u WHERE ${valid} RETURNING u.id, u.username
  ` : sql`
    SELECT u.id, u.username FROM admin_sessions AS s JOIN admin_users AS u ON s.admin_user_id = u.id
    WHERE ${valid}
  `)
  return rows[0] ?? null
}

const authLimits = { setup: 5, login: 24, credentials: 8 }
const ATTEMPT_WINDOW_SECONDS = 15 * 60

export async function reserveAuthAttempt(scope: keyof typeof authLimits) {
  const { rows } = await getDatabase().execute<{ allowed: boolean; retry_after: number }>(sql`
    INSERT INTO admin_auth_limits (scope, attempts, reset_at)
    VALUES (${scope}, 1, statement_timestamp() + ${ATTEMPT_WINDOW_SECONDS} * interval '1 second')
    ON CONFLICT (scope) DO UPDATE SET
      attempts = CASE WHEN admin_auth_limits.reset_at <= statement_timestamp() THEN 1
        ELSE least(admin_auth_limits.attempts + 1, ${authLimits[scope] + 1}) END,
      reset_at = CASE WHEN admin_auth_limits.reset_at <= statement_timestamp() THEN excluded.reset_at
        ELSE admin_auth_limits.reset_at END
    RETURNING attempts <= ${authLimits[scope]} AS allowed,
      greatest(1, ceil(extract(epoch FROM reset_at - statement_timestamp())))::integer AS retry_after
  `)
  return rows[0].allowed ? 0 : rows[0].retry_after
}

export async function deleteAdminSession(tokenHash: string) {
  await getDatabase().delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash))
}

export async function changeAdminCredentials(
  adminUserId: string,
  previousHash: string,
  username: string,
  passwordHash: string
): Promise<AdminIdentity | null> {
  const [admin] = await getDatabase()
    .update(adminUsers)
    .set({ username, passwordHash, passwordChangedAt: sql`clock_timestamp()` })
    .where(and(eq(adminUsers.id, adminUserId), eq(adminUsers.passwordHash, previousHash)))
    .returning({ id: adminUsers.id, username: adminUsers.username })
  // Sessions issued before passwordChangedAt become invalid in the same update.
  return admin ?? null
}
