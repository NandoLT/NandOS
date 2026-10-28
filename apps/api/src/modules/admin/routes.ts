import { put } from '@vercel/blob'
import type { CvLanguage, PortfolioContent } from '@nandoos/contracts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  constantTimeSecretMatches,
  createSessionToken,
  digestSessionToken,
  hashPassword,
  normalizeUsername,
  validPassword,
  validUsername,
  verifyPassword,
} from './domain/credentials.js'
import {
  changeAdminCredentials,
  createAdminAccount,
  deleteAdminSession,
  findAdminByUsername,
  findAdminSession,
  hasAdminAccount,
  storeAdminSession,
} from './infrastructure/admin-repository.js'
import {
  createCvUpload,
  getPortfolioForAdmin,
  listCvUploads,
  publishPortfolioDraft,
  savePortfolioDraft,
  selectCvUploadForDraft,
} from '../portfolio/infrastructure/portfolio-repository.js'
import { parsePortfolioContent } from '../portfolio/domain/portfolio-content.js'

export const ADMIN_SESSION_COOKIE = 'nandos_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7
const MAX_CV_SIZE_BYTES = 4 * 1024 * 1024

type CredentialsBody = { username: string; password: string }
type ChangeCredentialsBody = {
  currentPassword: string
  username: string
  newPassword?: string
}

function trustedOrigin(request: FastifyRequest) {
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  return request.headers.origin === allowedOrigin
}

function rejectUntrustedOrigin(request: FastifyRequest, reply: FastifyReply) {
  if (trustedOrigin(request)) return false
  reply.code(403).send({ error: 'Origen no permitido.' })
  return true
}

function setSessionCookie(reply: FastifyReply, token: string) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  reply.setCookie(ADMIN_SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: SESSION_TTL_SECONDS,
  })
}

async function startSession(reply: FastifyReply, adminUserId: string) {
  const token = createSessionToken()
  await storeAdminSession(adminUserId, digestSessionToken(token), new Date(Date.now() + SESSION_TTL_SECONDS * 1000))
  setSessionCookie(reply, token)
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[ADMIN_SESSION_COOKIE]
  if (!token) {
    reply.code(401).send({ error: 'Inicia sesión para continuar.' })
    return null
  }
  const admin = await findAdminSession(digestSessionToken(token))
  if (!admin) {
    reply.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' })
    reply.code(401).send({ error: 'La sesión ha caducado. Inicia sesión de nuevo.' })
    return null
  }
  return admin
}

function isValidCredentialsBody(value: unknown): value is CredentialsBody {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return typeof body.username === 'string' && typeof body.password === 'string'
}

function isValidChangeBody(value: unknown): value is ChangeCredentialsBody {
  if (typeof value !== 'object' || value === null) return false
  const body = value as Record<string, unknown>
  return typeof body.currentPassword === 'string' && typeof body.username === 'string' &&
    (body.newPassword === undefined || typeof body.newPassword === 'string')
}

function pdfFilename(language: CvLanguage) {
  return language === 'es' ? 'CV_Fernando_Lopez_Trejo_ES.pdf' : 'CV_Fernando_Lopez_Trejo_EN.pdf'
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/api/auth/bootstrap-status', async () => ({
    configured: await hasAdminAccount(),
    canSetup: Boolean(process.env.ADMIN_BOOTSTRAP_KEY && process.env.ADMIN_BOOTSTRAP_KEY.length >= 32),
  }))

  app.get('/api/auth/session', async (request) => {
    const token = request.cookies[ADMIN_SESSION_COOKIE]
    if (!token) return { authenticated: false }
    const admin = await findAdminSession(digestSessionToken(token))
    return admin ? { authenticated: true, username: admin.username } : { authenticated: false }
  })

  app.post<{ Body: CredentialsBody }>('/api/auth/setup', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!isValidCredentialsBody(request.body)) return reply.code(400).send({ error: 'Revisa los campos del formulario.' })
    if (await hasAdminAccount()) return reply.code(409).send({ error: 'La cuenta inicial ya está configurada.' })
    const bootstrapKey = process.env.ADMIN_BOOTSTRAP_KEY
    if (!bootstrapKey || bootstrapKey.length < 32) {
      return reply.code(503).send({ error: 'Falta configurar la clave inicial en el servidor.' })
    }
    const providedBootstrapKey = request.headers['x-admin-bootstrap-key']
    if (typeof providedBootstrapKey !== 'string' || !constantTimeSecretMatches(providedBootstrapKey, bootstrapKey)) {
      return reply.code(403).send({ error: 'La clave inicial no es correcta.' })
    }
    const username = normalizeUsername(request.body.username)
    if (!validUsername(username)) {
      return reply.code(400).send({ error: 'El usuario debe tener entre 3 y 48 caracteres: letras, números, punto, guion o guion bajo.' })
    }
    if (!validPassword(request.body.password)) {
      return reply.code(400).send({ error: 'La contraseña debe tener entre 12 y 256 caracteres.' })
    }

    try {
      const admin = await createAdminAccount(username, await hashPassword(request.body.password))
      await startSession(reply, admin.id)
      return reply.code(201).send({ authenticated: true, username: admin.username })
    } catch (error) {
      request.log.warn({ err: error }, 'Initial administrator setup was not completed')
      return reply.code(409).send({ error: 'La cuenta inicial ya se creó. Inicia sesión.' })
    }
  })

  app.post<{ Body: CredentialsBody }>('/api/auth/login', {
    config: { rateLimit: { max: 8, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!isValidCredentialsBody(request.body)) return reply.code(400).send({ error: 'Revisa los campos del formulario.' })
    const username = normalizeUsername(request.body.username)
    const admin = await findAdminByUsername(username)
    const passwordMatches = admin
      ? await verifyPassword(request.body.password, admin.passwordHash)
      : false
    if (!admin || !passwordMatches) return reply.code(401).send({ error: 'Usuario o contraseña incorrectos.' })
    await startSession(reply, admin.id)
    return { authenticated: true, username: admin.username }
  })

  app.post('/api/auth/logout', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    const token = request.cookies[ADMIN_SESSION_COOKIE]
    if (token) await deleteAdminSession(digestSessionToken(token))
    reply.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' })
    return { authenticated: false }
  })

  app.put<{ Body: ChangeCredentialsBody }>('/api/admin/credentials', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    const admin = await requireAdmin(request, reply)
    if (!admin) return
    if (!isValidChangeBody(request.body)) return reply.code(400).send({ error: 'Revisa los campos del formulario.' })

    const currentUsername = normalizeUsername(request.body.username)
    if (!validUsername(currentUsername)) {
      return reply.code(400).send({ error: 'El usuario debe tener entre 3 y 48 caracteres: letras, números, punto, guion o guion bajo.' })
    }
    const account = await findAdminByUsername(admin.username)
    if (!account || !(await verifyPassword(request.body.currentPassword, account.passwordHash))) {
      return reply.code(401).send({ error: 'La contraseña actual no es correcta.' })
    }
    const newPassword = request.body.newPassword?.trim() ?? ''
    if (newPassword && !validPassword(newPassword)) {
      return reply.code(400).send({ error: 'La nueva contraseña debe tener entre 12 y 256 caracteres.' })
    }

    try {
      const updated = await changeAdminCredentials(
        admin.id,
        currentUsername,
        await hashPassword(newPassword || request.body.currentPassword)
      )
      await startSession(reply, updated.id)
      return { authenticated: true, username: updated.username }
    } catch (error) {
      request.log.warn({ err: error }, 'Administrator credentials could not be changed')
      return reply.code(409).send({ error: 'Ese nombre de usuario ya está en uso.' })
    }
  })

  app.get('/api/admin/content', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    const document = await getPortfolioForAdmin()
    return {
      draft: document.draftContent,
      published: document.publishedContent,
      revision: document.revision,
      updatedAt: document.updatedAt,
      publishedAt: document.publishedAt,
    }
  })

  app.put<{ Body: PortfolioContent }>('/api/admin/content/draft', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!(await requireAdmin(request, reply))) return
    const content = parsePortfolioContent(request.body)
    if (!content) return reply.code(400).send({ error: 'El contenido tiene campos incorrectos o enlaces no permitidos.' })
    await savePortfolioDraft(content)
    return { saved: true, draft: content }
  })

  app.post('/api/admin/content/publish', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!(await requireAdmin(request, reply))) return
    const document = await publishPortfolioDraft()
    return { published: true, content: document.publishedContent, revision: document.revision, publishedAt: document.publishedAt }
  })

  app.get('/api/admin/cv', async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return
    return { uploads: await listCvUploads() }
  })

  app.post<{ Params: { language: string } }>('/api/admin/cv/:language', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!(await requireAdmin(request, reply))) return
    const language = request.params.language
    if (language !== 'es' && language !== 'en') return reply.code(400).send({ error: 'Idioma de CV no reconocido.' })
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return reply.code(503).send({ error: 'La subida necesita un almacén Blob conectado al proyecto.' })
    }

    const file = await request.file({ limits: { fileSize: MAX_CV_SIZE_BYTES, files: 1 } })
    if (!file) return reply.code(400).send({ error: 'Selecciona un archivo PDF.' })
    if (file.mimetype !== 'application/pdf' || !file.filename.toLowerCase().endsWith('.pdf')) {
      return reply.code(415).send({ error: 'Solo se aceptan archivos PDF.' })
    }
    const buffer = await file.toBuffer()
    if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      return reply.code(415).send({ error: 'El archivo no parece ser un PDF válido.' })
    }

    const filename = pdfFilename(language)
    const blob = await put(`cv/${language}/${filename}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'application/pdf',
    })
    const upload = await createCvUpload({
      language,
      filename,
      url: blob.url,
      pathname: blob.pathname,
      fileSize: buffer.byteLength,
    })
    const draft = await selectCvUploadForDraft(upload.id)
    return reply.code(201).send({ upload, draft })
  })

  app.post<{ Params: { id: string } }>('/api/admin/cv/:id/use-in-draft', async (request, reply) => {
    if (rejectUntrustedOrigin(request, reply)) return
    if (!(await requireAdmin(request, reply))) return
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(request.params.id)) {
      return reply.code(400).send({ error: 'Identificador de versión no válido.' })
    }
    const draft = await selectCvUploadForDraft(request.params.id)
    if (!draft) return reply.code(404).send({ error: 'No se encontró esa versión del CV.' })
    return { draft }
  })
}
