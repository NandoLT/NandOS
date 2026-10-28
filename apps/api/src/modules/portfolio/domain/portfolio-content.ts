import type { PortfolioContent } from '@nandoos/contracts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function stringList(value: unknown, maxItems = 80): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => boundedString(item, 1200))
}

function safeHref(value: unknown): value is string {
  if (!boundedString(value, 600)) return false
  return /^(https?:\/\/|mailto:|tel:)/i.test(value) && !/^\s*javascript:/i.test(value)
}

export function parsePortfolioContent(value: unknown): PortfolioContent | null {
  if (!isRecord(value) || !isRecord(value.profile) || !isRecord(value.sectionIntros)) return null
  const profile = value.profile
  const contact = value.contact
  const intros = value.sectionIntros

  if (
    !boundedString(profile.fullName, 120) ||
    !boundedString(profile.headline, 180) ||
    !boundedString(profile.summary, 1800) ||
    !boundedString(profile.status, 180) ||
    !boundedString(profile.interface, 240) ||
    !boundedString(profile.specialty, 240)
  ) return null

  if (!isRecord(contact) || !boundedString(contact.location, 180) || !boundedString(contact.availability, 180)) return null
  if (!Array.isArray(contact.channels) || contact.channels.length > 24) return null
  for (const channel of contact.channels) {
    if (
      !isRecord(channel) ||
      !boundedString(channel.id, 80) ||
      !boundedString(channel.label, 80) ||
      !boundedString(channel.icon, 32) ||
      !safeHref(channel.href) ||
      !boundedString(channel.value, 240)
    ) return null
  }

  for (const section of ['experience', 'projects', 'skills', 'contact']) {
    const intro = intros[section]
    if (!isRecord(intro) || !boundedString(intro.eyebrow, 100) || !boundedString(intro.description, 600)) return null
  }

  if (!Array.isArray(value.experienceEntries) || value.experienceEntries.length > 40) return null
  for (const entry of value.experienceEntries) {
    if (
      !isRecord(entry) || !boundedString(entry.id, 80) || !boundedString(entry.title, 180) ||
      !boundedString(entry.context, 180) || !boundedString(entry.summary, 1200) ||
      !stringList(entry.contributions, 40)
    ) return null
  }

  if (!Array.isArray(value.featuredProjects) || value.featuredProjects.length > 40) return null
  for (const project of value.featuredProjects) {
    if (
      !isRecord(project) || !boundedString(project.id, 80) || !boundedString(project.title, 180) ||
      !boundedString(project.description, 1400) || !stringList(project.technologies, 40) ||
      !boundedString(project.details, 240)
    ) return null
  }

  if (!Array.isArray(value.skillGroups) || value.skillGroups.length > 40) return null
  for (const group of value.skillGroups) {
    if (!isRecord(group) || !boundedString(group.id, 80) || !boundedString(group.title, 120) || !stringList(group.skills, 80)) return null
  }

  if (!isRecord(value.cvDocuments)) return null
  for (const language of ['es', 'en']) {
    const document = value.cvDocuments[language]
    if (document === undefined) continue
    if (
      !isRecord(document) || document.language !== language ||
      !boundedString(document.filename, 180) || !boundedString(document.url, 1000) ||
      !((document.url.startsWith('/') && !document.url.startsWith('//')) || document.url.startsWith('https://')) ||
      !(document.uploadedAt === null || boundedString(document.uploadedAt, 80))
    ) return null
  }

  return value as unknown as PortfolioContent
}
