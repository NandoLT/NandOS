import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import type { WikiSynchronizationStatus } from '@nandoos/contracts'
import { renderWithProviders } from '../../../test/render'
import { WikiSynchronization } from './WikiSynchronization'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const updated: WikiSynchronizationStatus = { state: 'updated', publishedArticles: 3, indexedArticles: 3, indexedChunks: 3 }

it('shows updated/outdated and synchronizes with a disabled pending action, then verifies status', async () => {
  let state: WikiSynchronizationStatus = { ...updated, state: 'outdated' }
  let release!: () => void
  const pending = new Promise<void>((resolve) => { release = resolve })
  const synchronize = vi.fn(async () => { await pending; state = updated; return updated })
  renderWithProviders(<WikiSynchronization scope="test" repository={{ status: async () => state, synchronize }} />)
  expect(await screen.findByText('Desactualizado')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Sincronizar wiki' }))
  expect(screen.getByRole('button', { name: 'Sincronizando…' })).toBeDisabled()
  expect(screen.getByText('Sincronizando')).toBeInTheDocument()
  release()
  expect(await screen.findByText('Actualizado')).toBeInTheDocument()
  expect(synchronize).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sincronizar wiki' })).toBeEnabled())
})

it('does not show a false updated status when the check fails and lets the administrator retry', async () => {
  const repository = { status: vi.fn().mockRejectedValueOnce(new Error('Connection failed')).mockResolvedValue(updated), synchronize: vi.fn() }
  renderWithProviders(<WikiSynchronization scope="test" repository={repository} />)
  expect(await screen.findByText('No se pudo comprobar')).toBeInTheDocument()
  expect(screen.queryByText('Actualizado')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sincronizar wiki' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Comprobar estado' }))
  expect(await screen.findByText('Actualizado')).toBeInTheDocument()
})

it('unconfigured environments and the isolated editor cannot call Qdrant or trigger synchronization', async () => {
  const status = vi.fn(async () => ({ ...updated, state: 'not-configured' as const }))
  const synchronize = vi.fn()
  const rendered = renderWithProviders(<WikiSynchronization scope="test" repository={{ status, synchronize }} />)
  expect(await screen.findByText('Sin configurar')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sincronizar wiki' })).toBeDisabled()
  rendered.unmount()
  renderWithProviders(<WikiSynchronization scope="preview" />)
  expect(screen.getByText('Sin configurar')).toBeInTheDocument()
  expect(synchronize).not.toHaveBeenCalled()
  expect(status).toHaveBeenCalledTimes(1)
})

it('reports synchronization errors and rechecks the real state without claiming success', async () => {
  const repository = { status: async () => ({ ...updated, state: 'outdated' as const }),
    synchronize: vi.fn(async () => { throw new Error('No se pudo confirmar la sincronización.') }) }
  renderWithProviders(<WikiSynchronization scope="test" repository={repository} />)
  await screen.findByText('Desactualizado')
  await userEvent.click(screen.getByRole('button', { name: 'Sincronizar wiki' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar la sincronización')
  expect(screen.queryByText('Actualizado')).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sincronizar wiki' })).toBeEnabled())
})
