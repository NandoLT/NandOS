import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import styled from '@emotion/styled'
import type {
  CvLanguage,
  PortfolioContent,
} from '@nandoos/contracts'
import { portfolioQueryKey } from '../../portfolio/application/usePortfolioContent'
import { ApiError, apiRequest } from '../../portfolio/infrastructure/http-client'
import {
  getAdminContent,
  getCvUploads,
  publishAdminDraft,
  saveAdminDraft,
  uploadCv,
  useCvUploadInDraft,
} from '../application/admin-api'

type AdminTab = 'profile' | 'experience' | 'projects' | 'skills' | 'contact' | 'cv' | 'account'

const tabItems: Array<{ id: AdminTab; icon: string; label: string }> = [
  { id: 'profile', icon: '👤', label: 'Perfil' },
  { id: 'experience', icon: '💼', label: 'Experiencia' },
  { id: 'projects', icon: '🗂️', label: 'Proyectos' },
  { id: 'skills', icon: '🧠', label: 'Habilidades' },
  { id: 'contact', icon: '✉️', label: 'Contacto' },
  { id: 'cv', icon: '📄', label: 'Currículum' },
  { id: 'account', icon: '🔐', label: 'Cuenta' },
]

const Screen = styled.main`
  display: grid;
  place-items: center;
  min-height: 100dvh;
  padding: clamp(8px, 2vw, 22px);
  color: var(--os-window-text);
  background-color: var(--os-desktop);
  background-image: var(--os-desktop-pattern);
  background-size: var(--os-desktop-pattern-size);
  font-family: var(--os-font-family);
`

const Window = styled.section`
  display: grid;
  grid-template-rows: 34px minmax(0, 1fr);
  width: min(1320px, 100%);
  height: min(900px, calc(100dvh - 24px));
  min-height: 560px;
  overflow: hidden;
  border: var(--os-window-border);
  border-radius: var(--os-window-radius);
  background: var(--os-window);
  box-shadow: var(--os-window-shadow);

  @media (max-width: 680px) {
    height: calc(100dvh - 16px);
    min-height: 0;
  }
`

const TitleBar = styled.header`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  color: var(--os-titlebar-text);
  background: var(--os-titlebar);
  font-size: 13px;
  font-weight: 700;
  user-select: none;
`

const Layout = styled.div`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--os-border);
  background: var(--os-toolbar);

  h1 { margin: 0; font-size: 18px; }
  p { margin: 3px 0 0; color: var(--os-muted); font-size: 12px; }

  @media (max-width: 520px) {
    align-items: flex-start;
    padding: 10px;
    h1 { font-size: 16px; }
  }
`

const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--os-muted);
  font-size: 12px;
`

const Body = styled.div`
  display: grid;
  grid-template-columns: 205px minmax(0, 1fr);
  min-height: 0;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }
`

const Sidebar = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  border-right: 1px solid var(--os-border);
  background: var(--os-surface-alt);

  @media (max-width: 680px) {
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--os-border);
    padding: 7px;
  }
`

const NavButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 7px 9px;
  border: 1px solid ${({ $active }) => $active ? 'var(--os-accent)' : 'transparent'};
  border-radius: var(--os-control-radius);
  color: ${({ $active }) => $active ? 'var(--os-selected-text)' : 'var(--os-window-text)'};
  background: ${({ $active }) => $active ? 'var(--os-selected)' : 'transparent'};
  font: 600 12px var(--os-font-family);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;

  &:hover, &:focus-visible { border-color: var(--os-accent); outline: none; }
`

const Workspace = styled.div`
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
`

const Editor = styled.div`
  display: grid;
  align-content: start;
  gap: 16px;
  min-height: 0;
  overflow: auto;
  padding: clamp(12px, 2.2vw, 24px);
`

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 { margin: 0; font-size: 17px; }
  p { margin: 4px 0 0; color: var(--os-muted); font-size: 12px; line-height: 1.4; }
`

const Card = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface);

  @media (max-width: 520px) { padding: 11px; }
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  h3 { margin: 0; font-size: 13px; }
`

const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) { grid-template-columns: 1fr; }
`

const FieldWrap = styled.label`
  display: grid;
  align-content: start;
  gap: 5px;
  min-width: 0;
  color: var(--os-window-text);
  font-size: 12px;
  font-weight: 700;

  span { color: var(--os-muted); font-size: 11px; font-weight: 400; }
`

const Input = styled.input`
  width: 100%;
  min-width: 0;
  min-height: 35px;
  padding: 7px 8px;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  color: var(--os-input-text);
  background: var(--os-input);
  font: 13px var(--os-font-family);

  &:focus { outline: 2px dotted var(--os-accent); outline-offset: 1px; }
`

const Textarea = styled.textarea`
  width: 100%;
  min-width: 0;
  min-height: 76px;
  padding: 8px;
  resize: vertical;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  color: var(--os-input-text);
  background: var(--os-input);
  font: 13px/1.45 var(--os-font-family);

  &:focus { outline: 2px dotted var(--os-accent); outline-offset: 1px; }
`

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  min-height: 34px;
  padding: 6px 11px;
  border: var(--os-raised-border);
  border-radius: var(--os-control-radius);
  color: ${({ $primary, $danger }) => $primary ? 'var(--os-accent-text)' : $danger ? 'var(--os-danger)' : 'var(--os-window-text)'};
  background: ${({ $primary }) => $primary ? 'var(--os-accent)' : 'var(--os-window)'};
  font: 700 12px var(--os-font-family);
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) { filter: brightness(1.04); }
  &:active:not(:disabled) { border-style: inset; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`

const ActionBar = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 56px;
  padding: 9px 14px;
  border-top: 1px solid var(--os-border);
  background: var(--os-toolbar);

  @media (max-width: 520px) { align-items: flex-start; flex-direction: column; }
`

const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-left: auto;
`

const Status = styled.p<{ $error?: boolean }>`
  margin: 0;
  color: ${({ $error }) => $error ? 'var(--os-danger)' : 'var(--os-muted)'};
  font-size: 12px;
  line-height: 1.4;
`

const InlineError = styled.div`
  padding: 12px;
  border: 1px solid var(--os-danger);
  color: var(--os-danger);
  background: var(--os-surface);
  font-size: 13px;
  line-height: 1.45;
`

const CvHistory = styled.div`
  display: grid;
  gap: 8px;
`

const CvVersion = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 9px;
  border: 1px solid var(--os-border);
  background: var(--os-surface-alt);

  strong { display: block; font-size: 12px; }
  small { display: block; margin-top: 3px; color: var(--os-muted); font-size: 11px; }
`

const Hint = styled.p`
  margin: 0;
  color: var(--os-muted);
  font-size: 12px;
  line-height: 1.45;
`

function Field({
  label,
  value,
  onChange,
  multiline = false,
  hint,
  type = 'text',
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  hint?: string
  type?: string
  required?: boolean
}) {
  return (
    <FieldWrap>
      {label}
      {multiline ? (
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      ) : (
        <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      )}
      {hint && <span>{hint}</span>}
    </FieldWrap>
  )
}

function SectionIntroEditor({
  value,
  onChange,
}: {
  value: PortfolioContent['sectionIntros'][keyof PortfolioContent['sectionIntros']]
  onChange: (patch: Partial<typeof value>) => void
}) {
  return (
    <Card>
      <CardHead><h3>Introducción de la sección pública</h3></CardHead>
      <Fields>
        <Field label="Texto superior" value={value.eyebrow} onChange={(eyebrow) => onChange({ eyebrow })} />
        <Field label="Descripción" value={value.description} onChange={(description) => onChange({ description })} multiline />
      </Fields>
    </Card>
  )
}

function splitLines(value: string) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function splitCommaList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function AdminDashboard({
  username,
  onUsernameChange,
  onLogout,
}: {
  username: string
  onUsernameChange: (username: string) => void
  onLogout: () => void
}) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<AdminTab>('profile')
  const [draft, setDraft] = useState<PortfolioContent | null>(null)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const contentQuery = useQuery({ queryKey: ['admin', 'content'], queryFn: getAdminContent, retry: false })
  const uploadsQuery = useQuery({
    queryKey: ['admin', 'cv-uploads'],
    queryFn: getCvUploads,
    enabled: activeTab === 'cv',
    retry: false,
  })

  const saveMutation = useMutation({
    mutationFn: saveAdminDraft,
    onSuccess: (result) => {
      setDraft(result.draft)
      setNotice('Borrador guardado. Aún no es visible para los visitantes.')
      setNoticeIsError(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
    onError: (error: Error) => { setNotice(error.message); setNoticeIsError(true) },
  })

  const publishMutation = useMutation({
    mutationFn: publishAdminDraft,
    onSuccess: (result) => {
      setDraft(result.content)
      setNotice(`Cambios publicados · revisión ${result.revision}.`)
      setNoticeIsError(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
      void queryClient.invalidateQueries({ queryKey: portfolioQueryKey })
    },
    onError: (error: Error) => { setNotice(error.message); setNoticeIsError(true) },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ language, file }: { language: CvLanguage; file: File }) => uploadCv(language, file),
    onSuccess: (result) => {
      setDraft((current) => current ? { ...current, cvDocuments: result.draft.cvDocuments } : result.draft)
      setNotice('CV subido y añadido al borrador. Pulsa «Publicar» cuando quieras activarlo.')
      setNoticeIsError(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'cv-uploads'] })
    },
    onError: (error: Error) => { setNotice(error.message); setNoticeIsError(true) },
  })

  const activateCvMutation = useMutation({
    mutationFn: useCvUploadInDraft,
    onSuccess: (result) => {
      setDraft((current) => current ? { ...current, cvDocuments: result.draft.cvDocuments } : result.draft)
      setNotice('Versión seleccionada para el borrador. Publícala para mostrarla a los visitantes.')
      setNoticeIsError(false)
    },
    onError: (error: Error) => { setNotice(error.message); setNoticeIsError(true) },
  })

  const currentDraft = draft ?? contentQuery.data?.draft ?? null
  const isBusy = saveMutation.isPending || publishMutation.isPending || uploadMutation.isPending
  const isDirty = Boolean(currentDraft && contentQuery.data && JSON.stringify(currentDraft) !== JSON.stringify(contentQuery.data.draft))

  const updateContent = (transform: (current: PortfolioContent) => PortfolioContent) => {
    setDraft((current) => {
      const source = current ?? contentQuery.data?.draft
      return source ? transform(source) : null
    })
    setNotice('')
  }

  const updateIntro = (section: keyof PortfolioContent['sectionIntros'], patch: Partial<PortfolioContent['sectionIntros'][keyof PortfolioContent['sectionIntros']]>) => {
    updateContent((current) => ({
      ...current,
      sectionIntros: { ...current.sectionIntros, [section]: { ...current.sectionIntros[section], ...patch } },
    }))
  }

  const saveDraft = async () => {
    if (!currentDraft) return
    await saveMutation.mutateAsync(currentDraft)
  }

  const publish = async () => {
    if (!currentDraft) return
    try {
      await saveMutation.mutateAsync(currentDraft)
      await publishMutation.mutateAsync()
    } catch {
      // Mutations report their own error in the status area.
    }
  }

  const logout = async () => {
    try { await apiRequest('auth/logout', { method: 'POST' }) } catch { /* The server session may already have expired. */ }
    onLogout()
  }

  const renderProfile = (content: PortfolioContent) => (
    <>
      <SectionHeader>
        <div><h2>Perfil</h2><p>Los datos principales que aparecen en «About Me» y en la presentación pública.</p></div>
      </SectionHeader>
      <Card>
        <CardHead><h3>Presentación personal</h3></CardHead>
        <Fields>
          <Field label="Nombre completo" value={content.profile.fullName} onChange={(fullName) => updateContent((c) => ({ ...c, profile: { ...c.profile, fullName } }))} />
          <Field label="Titular profesional" value={content.profile.headline} onChange={(headline) => updateContent((c) => ({ ...c, profile: { ...c.profile, headline } }))} />
          <Field label="Estado profesional" value={content.profile.status} onChange={(status) => updateContent((c) => ({ ...c, profile: { ...c.profile, status } }))} />
          <Field label="Especialidad" value={content.profile.specialty} onChange={(specialty) => updateContent((c) => ({ ...c, profile: { ...c.profile, specialty } }))} />
          <Field label="Tecnologías / enfoque" value={content.profile.interface} onChange={(value) => updateContent((c) => ({ ...c, profile: { ...c.profile, interface: value } }))} />
          <Field label="Texto de bienvenida" value={content.profile.summary} onChange={(summary) => updateContent((c) => ({ ...c, profile: { ...c.profile, summary } }))} multiline />
        </Fields>
      </Card>
    </>
  )

  const renderExperience = (content: PortfolioContent) => (
    <>
      <SectionHeader>
        <div><h2>Experiencia</h2><p>Administra puestos, contexto y contribuciones que se muestran en el escritorio.</p></div>
        <Button type="button" onClick={() => updateContent((c) => ({ ...c, experienceEntries: [...c.experienceEntries, { id: createId(), title: 'Nuevo puesto', context: 'Empresa y fechas', summary: 'Añade una breve descripción.', contributions: [] }] }))}>＋ Añadir</Button>
      </SectionHeader>
      <SectionIntroEditor value={content.sectionIntros.experience} onChange={(patch) => updateIntro('experience', patch)} />
      {content.experienceEntries.map((entry, index) => (
        <Card key={entry.id}>
          <CardHead>
            <h3>Experiencia {index + 1}</h3>
            <Button type="button" $danger onClick={() => updateContent((c) => ({ ...c, experienceEntries: c.experienceEntries.filter((item) => item.id !== entry.id) }))}>Eliminar</Button>
          </CardHead>
          <Fields>
            <Field label="Puesto / proyecto" value={entry.title} onChange={(title) => updateContent((c) => ({ ...c, experienceEntries: c.experienceEntries.map((item) => item.id === entry.id ? { ...item, title } : item) }))} />
            <Field label="Empresa, fechas o contexto" value={entry.context} onChange={(context) => updateContent((c) => ({ ...c, experienceEntries: c.experienceEntries.map((item) => item.id === entry.id ? { ...item, context } : item) }))} />
            <Field label="Resumen" value={entry.summary} onChange={(summary) => updateContent((c) => ({ ...c, experienceEntries: c.experienceEntries.map((item) => item.id === entry.id ? { ...item, summary } : item) }))} multiline />
            <Field label="Contribuciones · una por línea" value={entry.contributions.join('\n')} onChange={(value) => updateContent((c) => ({ ...c, experienceEntries: c.experienceEntries.map((item) => item.id === entry.id ? { ...item, contributions: splitLines(value) } : item) }))} multiline />
          </Fields>
        </Card>
      ))}
    </>
  )

  const renderProjects = (content: PortfolioContent) => (
    <>
      <SectionHeader>
        <div><h2>Proyectos</h2><p>Proyectos destacados, descripción, tecnologías y estado.</p></div>
        <Button type="button" onClick={() => updateContent((c) => ({ ...c, featuredProjects: [...c.featuredProjects, { id: createId(), title: 'Nuevo proyecto', description: 'Añade una descripción.', technologies: [], details: 'Estado o contexto' }] }))}>＋ Añadir</Button>
      </SectionHeader>
      <SectionIntroEditor value={content.sectionIntros.projects} onChange={(patch) => updateIntro('projects', patch)} />
      {content.featuredProjects.map((project, index) => (
        <Card key={project.id}>
          <CardHead>
            <h3>Proyecto {index + 1}</h3>
            <Button type="button" $danger onClick={() => updateContent((c) => ({ ...c, featuredProjects: c.featuredProjects.filter((item) => item.id !== project.id) }))}>Eliminar</Button>
          </CardHead>
          <Fields>
            <Field label="Nombre" value={project.title} onChange={(title) => updateContent((c) => ({ ...c, featuredProjects: c.featuredProjects.map((item) => item.id === project.id ? { ...item, title } : item) }))} />
            <Field label="Estado / contexto" value={project.details} onChange={(details) => updateContent((c) => ({ ...c, featuredProjects: c.featuredProjects.map((item) => item.id === project.id ? { ...item, details } : item) }))} />
            <Field label="Descripción" value={project.description} onChange={(description) => updateContent((c) => ({ ...c, featuredProjects: c.featuredProjects.map((item) => item.id === project.id ? { ...item, description } : item) }))} multiline />
            <Field label="Tecnologías · separadas por comas" value={project.technologies.join(', ')} onChange={(value) => updateContent((c) => ({ ...c, featuredProjects: c.featuredProjects.map((item) => item.id === project.id ? { ...item, technologies: splitCommaList(value) } : item) }))} />
          </Fields>
        </Card>
      ))}
    </>
  )

  const renderSkills = (content: PortfolioContent) => (
    <>
      <SectionHeader>
        <div><h2>Habilidades</h2><p>Agrupa las tecnologías y prácticas que aparecen en la sección pública.</p></div>
        <Button type="button" onClick={() => updateContent((c) => ({ ...c, skillGroups: [...c.skillGroups, { id: createId(), title: 'Nuevo grupo', skills: [] }] }))}>＋ Añadir grupo</Button>
      </SectionHeader>
      <SectionIntroEditor value={content.sectionIntros.skills} onChange={(patch) => updateIntro('skills', patch)} />
      {content.skillGroups.map((group, index) => (
        <Card key={group.id}>
          <CardHead>
            <h3>Grupo {index + 1}</h3>
            <Button type="button" $danger onClick={() => updateContent((c) => ({ ...c, skillGroups: c.skillGroups.filter((item) => item.id !== group.id) }))}>Eliminar</Button>
          </CardHead>
          <Fields>
            <Field label="Nombre del grupo" value={group.title} onChange={(title) => updateContent((c) => ({ ...c, skillGroups: c.skillGroups.map((item) => item.id === group.id ? { ...item, title } : item) }))} />
            <Field label="Habilidades · separadas por comas" value={group.skills.join(', ')} onChange={(value) => updateContent((c) => ({ ...c, skillGroups: c.skillGroups.map((item) => item.id === group.id ? { ...item, skills: splitCommaList(value) } : item) }))} />
          </Fields>
        </Card>
      ))}
    </>
  )

  const renderContact = (content: PortfolioContent) => (
    <>
      <SectionHeader><div><h2>Contacto</h2><p>Edita la disponibilidad y los enlaces que verá un reclutador.</p></div></SectionHeader>
      <SectionIntroEditor value={content.sectionIntros.contact} onChange={(patch) => updateIntro('contact', patch)} />
      <Card>
        <CardHead><h3>Ubicación y disponibilidad</h3></CardHead>
        <Fields>
          <Field label="Ubicación" value={content.contact.location} onChange={(location) => updateContent((c) => ({ ...c, contact: { ...c.contact, location } }))} />
          <Field label="Disponibilidad" value={content.contact.availability} onChange={(availability) => updateContent((c) => ({ ...c, contact: { ...c.contact, availability } }))} />
        </Fields>
      </Card>
      <SectionHeader>
        <div><h3>Canales de contacto</h3><p>Usa https://, mailto: o tel: en el destino.</p></div>
        <Button type="button" onClick={() => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: [...c.contact.channels, { id: createId(), label: 'Nuevo enlace', icon: '🔗', href: 'https://', value: 'Editar destino' }] } }))}>＋ Añadir canal</Button>
      </SectionHeader>
      {content.contact.channels.map((channel, index) => (
        <Card key={channel.id}>
          <CardHead>
            <h3>Canal {index + 1}</h3>
            <Button type="button" $danger onClick={() => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: c.contact.channels.filter((item) => item.id !== channel.id) } }))}>Eliminar</Button>
          </CardHead>
          <Fields>
            <Field label="Nombre" value={channel.label} onChange={(label) => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: c.contact.channels.map((item) => item.id === channel.id ? { ...item, label } : item) } }))} />
            <Field label="Icono / iniciales" value={channel.icon} onChange={(icon) => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: c.contact.channels.map((item) => item.id === channel.id ? { ...item, icon } : item) } }))} />
            <Field label="Texto visible" value={channel.value} onChange={(value) => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: c.contact.channels.map((item) => item.id === channel.id ? { ...item, value } : item) } }))} />
            <Field label="Enlace" value={channel.href} onChange={(href) => updateContent((c) => ({ ...c, contact: { ...c.contact, channels: c.contact.channels.map((item) => item.id === channel.id ? { ...item, href } : item) } }))} />
          </Fields>
        </Card>
      ))}
    </>
  )

  const renderCv = (content: PortfolioContent) => {
    const docs = content.cvDocuments
    const history = uploadsQuery.data?.uploads ?? []
    return (
      <>
        <SectionHeader><div><h2>Currículum</h2><p>Los CV nuevos quedan en el borrador hasta que publiques los cambios.</p></div></SectionHeader>
        <Card>
          <CardHead><h3>Versiones seleccionadas en el borrador</h3></CardHead>
          <Fields>
            {(['es', 'en'] as const).map((language) => {
              const doc = docs[language]
              return (
                <div key={language}>
                  <strong>{language === 'es' ? 'Español' : 'English'}</strong>
                  <p>{doc?.filename ?? 'No hay un archivo seleccionado.'}</p>
                  {doc && <a href={doc.url} target="_blank" rel="noreferrer">Abrir versión seleccionada ↗</a>}
                </div>
              )
            })}
          </Fields>
        </Card>
        <Card>
          <CardHead><h3>Subir un CV</h3></CardHead>
          <Fields>
            {(['es', 'en'] as const).map((language) => (
              <label key={language}>
                <strong>{language === 'es' ? 'CV en español · máximo 4 MB' : 'CV en inglés · máximo 4 MB'}</strong>
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  aria-label={language === 'es' ? 'Subir CV en español' : 'Subir CV en inglés'}
                  disabled={uploadMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadMutation.mutate({ language, file })
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            ))}
          </Fields>
          <Hint>Solo se admiten PDF. El archivo se guarda en Vercel Blob; la base de datos conserva metadatos y versiones anteriores.</Hint>
        </Card>
        <Card>
          <CardHead><h3>Historial de archivos subidos</h3></CardHead>
          {uploadsQuery.isPending ? <Hint>Cargando historial…</Hint> : history.length === 0 ? (
            <Hint>Aún no hay versiones subidas al almacén. Los PDF actuales siguen disponibles.</Hint>
          ) : (
            <CvHistory>
              {history.map((upload) => (
                <CvVersion key={upload.id}>
                  <div>
                    <strong>{upload.filename} · {upload.language.toUpperCase()}</strong>
                    <small>{formatDate(upload.uploadedAt)} · {(upload.fileSize / 1024).toFixed(0)} KB</small>
                  </div>
                  <Button type="button" disabled={activateCvMutation.isPending} onClick={() => activateCvMutation.mutate(upload.id)}>
                    Usar en borrador
                  </Button>
                </CvVersion>
              ))}
            </CvHistory>
          )}
        </Card>
      </>
    )
  }

  const renderAccount = () => <AccountEditor key={username} username={username} onUsernameChange={onUsernameChange} />

  const activeItem = tabItems.find((item) => item.id === activeTab)
  const renderActiveTab = (content: PortfolioContent): ReactNode => {
    if (activeTab === 'profile') return renderProfile(content)
    if (activeTab === 'experience') return renderExperience(content)
    if (activeTab === 'projects') return renderProjects(content)
    if (activeTab === 'skills') return renderSkills(content)
    if (activeTab === 'contact') return renderContact(content)
    if (activeTab === 'cv') return renderCv(content)
    return renderAccount()
  }

  const queryError = contentQuery.error
  const errorText = queryError instanceof ApiError && queryError.status === 401
    ? 'La sesión de administración ha caducado. Sal y vuelve a entrar.'
    : queryError?.message ?? 'No se pudo cargar el borrador. Comprueba el API y la migración de la base de datos.'

  return (
    <Screen>
      <Window>
        <TitleBar><span aria-hidden="true">⚙️</span>NandOS · Centro de administración</TitleBar>
        <Layout>
          <TopBar>
            <div><h1>Administración del portfolio</h1><p>Conectado como {username}</p></div>
            <TopActions>
              {contentQuery.data && <span>Revisión pública #{contentQuery.data.revision}</span>}
              <Button type="button" onClick={logout}>Cerrar sesión</Button>
            </TopActions>
          </TopBar>
          <Body>
            <Sidebar aria-label="Secciones de administración">
              {tabItems.map((tab) => (
                <NavButton key={tab.id} type="button" $active={activeTab === tab.id} aria-current={activeTab === tab.id ? 'page' : undefined} onClick={() => setActiveTab(tab.id)}>
                  <span aria-hidden="true">{tab.icon}</span>{tab.label}
                </NavButton>
              ))}
            </Sidebar>
            <Workspace>
              <Editor aria-label={activeItem?.label ?? 'Contenido de administración'}>
                {contentQuery.isPending ? <Hint>Cargando contenido desde la base de datos…</Hint> : queryError ? (
                  <InlineError role="alert">{errorText} Revisa la configuración del backend y que las migraciones estén aplicadas.</InlineError>
                ) : currentDraft ? renderActiveTab(currentDraft) : <InlineError role="alert">No hay contenido disponible.</InlineError>}
              </Editor>
              <ActionBar>
                <Status role="status" $error={noticeIsError}>
                  {notice || (isDirty ? 'Tienes cambios sin guardar.' : contentQuery.data?.publishedAt ? `Publicado ${formatDate(contentQuery.data.publishedAt)}.` : 'Edición lista.')}
                </Status>
                {activeTab !== 'account' && <ActionGroup>
                  <Button type="button" disabled={!currentDraft || isBusy || saveMutation.isPending} onClick={() => void saveDraft()}>
                    {saveMutation.isPending ? 'Guardando…' : 'Guardar borrador'}
                  </Button>
                  <Button type="button" $primary disabled={!currentDraft || isBusy} onClick={() => void publish()}>
                    {publishMutation.isPending ? 'Publicando…' : 'Publicar cambios'}
                  </Button>
                </ActionGroup>}
              </ActionBar>
            </Workspace>
          </Body>
        </Layout>
      </Window>
    </Screen>
  )
}

function AccountEditor({ username, onUsernameChange }: { username: string; onUsernameChange: (username: string) => void }) {
  const [nextUsername, setNextUsername] = useState(username)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError(false)
    if (newPassword && newPassword !== confirmPassword) {
      setMessage('Las contraseñas nuevas no coinciden.')
      setError(true)
      return
    }
    setPending(true)
    try {
      const result = await apiRequest<{ username: string }>('admin/credentials', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, username: nextUsername, newPassword: newPassword || undefined }),
      })
      onUsernameChange(result.username)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Credenciales actualizadas. Se han cerrado las demás sesiones activas.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudieron actualizar las credenciales.')
      setError(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <SectionHeader><div><h2>Cuenta y seguridad</h2><p>Este usuario es independiente del acceso público de Invitado.</p></div></SectionHeader>
      <Card>
        <CardHead><h3>Cambiar usuario o contraseña</h3></CardHead>
        <form onSubmit={submit}>
          <Fields>
            <Field label="Nuevo nombre de usuario" value={nextUsername} onChange={setNextUsername} />
            <Field label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} type="password" />
            <Field label="Nueva contraseña · déjala vacía para conservarla" value={newPassword} onChange={setNewPassword} type="password" required={false} hint="Mínimo 12 caracteres." />
            <Field label="Repite la nueva contraseña" value={confirmPassword} onChange={setConfirmPassword} type="password" required={Boolean(newPassword)} />
          </Fields>
          {message && <Status role={error ? 'alert' : 'status'} $error={error}>{message}</Status>}
          <ActionGroup style={{ marginTop: 14 }}>
            <Button type="submit" $primary disabled={pending}>{pending ? 'Actualizando…' : 'Guardar credenciales'}</Button>
          </ActionGroup>
        </form>
      </Card>
      <Hint>Las sesiones abiertas se revocan al cambiar las credenciales. Usa una contraseña única y larga; no se habilitan valores por defecto.</Hint>
    </>
  )
}
