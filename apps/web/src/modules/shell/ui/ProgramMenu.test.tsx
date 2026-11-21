import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProgramMenu } from './ProgramMenu'
import { programMenu } from '../../applications/domain/program-menu'
import type { ProgramMenuItem } from '../../applications/domain/program-menu'
import { appRegistry } from '../../applications/domain/app-registry'

afterEach(cleanup)
const props = { placement: { left: 250, top: 80, width: 250, maxHeight: 500 }, onBack: vi.fn(), onLaunch: vi.fn(), onUnavailable: vi.fn(), tooltipProps: () => ({}) }

describe('categorized Programs menu', () => {
  it('keeps every app exactly once, with games and utilities in their folders', () => {
    const flatten = (items: ProgramMenuItem[]): string[] => items.flatMap((item) => item.appId ? [item.appId] : flatten(item.children ?? []))
    const ids = flatten(programMenu)
    expect(ids.toSorted()).toEqual(appRegistry.filter((app) => app.id !== 'settings').map((app) => app.id).toSorted())
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('opens nested desktop menus by keyboard and returns focus one level at a time', async () => {
    const launch = vi.fn()
    render(<ProgramMenu {...props} onLaunch={launch} mobile={false} />)
    const accessories = screen.getByRole('button', { name: 'Accesorios' })
    accessories.focus()
    fireEvent.keyDown(accessories, { key: 'ArrowRight' })
    const tools = within(screen.getByRole('group', { name: 'Accesorios' })).getByRole('button', { name: 'Herramientas del sistema' })
    await waitFor(() => expect(tools).toHaveFocus())
    fireEvent.keyDown(tools, { key: 'ArrowDown' })
    const games = screen.getByRole('button', { name: 'Juegos' })
    expect(games).toHaveFocus()
    fireEvent.keyDown(games, { key: 'ArrowRight' })
    const mine = screen.getByRole('button', { name: 'Buscaminas' })
    await waitFor(() => expect(mine).toHaveFocus())
    fireEvent.keyDown(mine, { key: 'Escape' })
    await waitFor(() => expect(games).toHaveFocus())
    expect(screen.queryByRole('group', { name: 'Juegos' })).not.toBeInTheDocument()
    fireEvent.keyDown(games, { key: 'ArrowRight' })
    fireEvent.click(screen.getByRole('button', { name: 'Buscaminas' }))
    expect(launch).toHaveBeenCalledWith('minesweeper')
  })

  it('replaces the current mobile level, restores parents and keeps future apps informational', async () => {
    const launch = vi.fn()
    const notice = vi.fn()
    render(<ProgramMenu {...props} onLaunch={launch} onUnavailable={notice} mobile />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Accesorios' }))
    expect(screen.queryByRole('group', { name: 'Accesorios' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Accesorios' }))
    expect(screen.queryByRole('group', { name: 'Programas' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Juegos' }))
    expect(screen.getByRole('button', { name: 'Buscaminas' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Volver/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Juegos' })).toHaveFocus())
    fireEvent.click(screen.getByRole('button', { name: /Volver/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Internet' }))
    const browser = screen.getByRole('button', { name: 'Nando Browser' })
    expect(browser).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(browser)
    expect(notice).toHaveBeenCalledWith('Nando Browser estará disponible próximamente.')
    expect(launch).not.toHaveBeenCalled()
  })
})
