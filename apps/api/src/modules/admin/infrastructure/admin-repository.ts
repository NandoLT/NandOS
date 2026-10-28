import { and, eq, gt, lt } from 'drizzle-orm'
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

export async function storeAdminSession(adminUserId: string, tokenHash: string, expiresAt: Date) {
  await getDatabase().delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()))
  await getDatabase().insert(adminSessions).values({ adminUserId, tokenHash, expiresAt })
}

export async function findAdminSession(tokenHash: string): Promise<AdminIdentity | null> {
  const [session] = await getDatabase()
    .select({ id: adminUsers.id, username: adminUsers.username })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())))
    .limit(1)
  return session ?? null
}

export async function deleteAdminSession(tokenHash: string) {
  await getDatabase().delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash))
}

export async function changeAdminCredentials(
  adminUserId: string,
  username: string,
  passwordHash: string
): Promise<AdminIdentity> {
  const [admin] = await getDatabase()
    .update(adminUsers)
    .set({ username, passwordHash, passwordChangedAt: new Date() })
    .where(eq(adminUsers.id, adminUserId))
    .returning({ id: adminUsers.id, username: adminUsers.username })
  if (!admin) throw new Error('Administrator account no longer exists.')
  await getDatabase().delete(adminSessions).where(eq(adminSessions.adminUserId, adminUserId))
  return admin
}
