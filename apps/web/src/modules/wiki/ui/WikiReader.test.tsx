import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublishedWikiArticle } from '@nandoos/contracts'
import { renderWithProviders } from '../../../test/render'
import { WikiReader } from './WikiReader'

const articles: PublishedWikiArticle[] = [
  { id: 'start', content: { title: 'Abrir Start', category: 'Menú Start', markdown: '# Abrir Start\n\nPulsa **Start** para explorar.\n\n[Contacto](https://example.com)' }, revision: 2, publishedAt: '2026-11-01T10:00:00Z' },
  { id: 'windows', content: { title: 'Mover ventanas', category: 'Escritorio', markdown: '# Mover ventanas\n\nArrastra la barra de título.' }, revision: 1, publishedAt: '2026-11-01T09:00:00Z' },
  { id: 'logoff', content: { title: 'Cerrar sesión', category: 'Menú Start', markdown: '# Cerrar sesión\n\nUsa Log off Invitado.' }, revision: 3, publishedAt: '2026-11-01T11:00:00Z' },
]
const response = (items = articles) => ({ ok: true, json: async () => ({ articles: items }) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('public wiki reader', () => {
  it('notifies the window only when entering or leaving the reading view', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
    const onReadingChange = vi.fn()
    renderWithProviders(<WikiReader onReadingChange={onReadingChange} />)
    await screen.findByRole('option', { name: 'Abrir Start' })
    expect(onReadingChange).toHaveBeenLastCalledWith(false)
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'start' } })
    expect(onReadingChange).toHaveBeenLastCalledWith(true)
    const count = onReadingChange.mock.calls.length
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'windows' } })
    expect(onReadingChange).toHaveBeenCalledTimes(count)
    fireEvent.click(screen.getByRole('button', { name: 'Inicio de la wiki' }))
    expect(onReadingChange).toHaveBeenLastCalledWith(false)
  })

  it('announces loading while waiting for the public documentation', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    renderWithProviders(<WikiReader />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando documentación publicada')
    expect(screen.getByLabelText('Artículo')).toBeDisabled()
  })

  it('introduces the wiki and reads only the public endpoint without selecting an article', async () => {
    const fetch = vi.fn().mockResolvedValue(response())
    vi.stubGlobal('fetch', fetch)
    renderWithProviders(<WikiReader />)
    expect(screen.getByRole('heading', { name: 'Wiki de NandOS' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Abrir Start' })).toBeInTheDocument()
    expect(screen.getByLabelText('Artículo')).toHaveValue('')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '¿Por dónde empezamos?' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Leer / })).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe('/api/wiki/articles')
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    expect(screen.queryByRole('button', { name: /Guardar|Publicar|Cargar documentación/ })).not.toBeInTheDocument()
  })

  it('filters published sections and renders the selected Markdown as a document', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
    renderWithProviders(<WikiReader />)
    await screen.findByRole('option', { name: 'Abrir Start' })
    fireEvent.change(screen.getByLabelText('Sección'), { target: { value: 'Menú Start' } })
    expect(within(screen.getByLabelText('Artículo')).queryByRole('option', { name: 'Mover ventanas' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'start' } })
    const document = screen.getByRole('article', { name: 'Abrir Start' })
    expect(within(document).getByRole('heading', { name: 'Abrir Start' })).toBeInTheDocument()
    expect(within(document).getByText('Start', { selector: 'strong' })).toBeInTheDocument()
    expect(within(document).getByRole('link', { name: 'Contacto' })).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.change(screen.getByLabelText('Sección'), { target: { value: 'Escritorio' } })
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Artículo')).toHaveValue('')
  })

  it('opens articles only through the selector and returns to its presentation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
    renderWithProviders(<WikiReader />)
    await screen.findByRole('option', { name: 'Mover ventanas' })
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'windows' } })
    expect(screen.getByRole('article', { name: 'Mover ventanas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Inicio de la wiki' }))
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Sección')).toHaveValue('')
  })

  it('shows an honest empty state without exposing or inventing draft articles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])))
    renderWithProviders(<WikiReader />)
    expect(await screen.findByText('Todavía no hay artículos publicados.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sección')).toBeDisabled()
    expect(screen.getByLabelText('Artículo')).toBeDisabled()
    expect(screen.queryByText('Bienvenido a NandOS')).not.toBeInTheDocument()
  })

  it('reports a failed request and lets the visitor retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(response())
    vi.stubGlobal('fetch', fetch)
    renderWithProviders(<WikiReader />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la wiki')
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar wiki' }))
    expect(await screen.findByRole('option', { name: 'Abrir Start' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('removes a withdrawn article from the reading view when refreshed', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response()).mockResolvedValue(response(articles.slice(1)))
    vi.stubGlobal('fetch', fetch)
    renderWithProviders(<WikiReader />)
    await screen.findByRole('option', { name: 'Abrir Start' })
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'start' } })
    expect(screen.getByRole('article', { name: 'Abrir Start' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar wiki' }))
    await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Artículo')).toHaveValue('')
    expect(screen.queryByRole('option', { name: 'Abrir Start' })).not.toBeInTheDocument()
  })

  it('never renders private draft fields included alongside a published snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ articles: [{ ...articles[0], draft: { markdown: '# PRIVATE DRAFT' } }] }) }))
    renderWithProviders(<WikiReader />)
    await screen.findByRole('option', { name: 'Abrir Start' })
    fireEvent.change(screen.getByLabelText('Artículo'), { target: { value: 'start' } })
    expect(screen.queryByText(/PRIVATE DRAFT/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Abrir Start' })).toBeInTheDocument()
  })
})
