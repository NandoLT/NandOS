import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PortfolioSectionWindow } from './PortfolioSectionWindow'

afterEach(cleanup)

describe('PortfolioSectionWindow', () => {
  it('presents selected projects and their technologies', () => {
    render(<PortfolioSectionWindow sectionId="projects" onDownloadCv={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Proyectos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Presupuestos hoteleros y CP-SAT' })).toBeInTheDocument()
    expect(screen.getByText('Qdrant')).toBeInTheDocument()
  })

  it('shows the supplied contact links and exposes both CV downloads', () => {
    const onDownloadCv = vi.fn()
    render(<PortfolioSectionWindow sectionId="contact" onDownloadCv={onDownloadCv} />)

    expect(screen.getByText('San Fernando, Cádiz (España) · Disponibilidad para remoto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Email: fernando.lopez.dev@hotmail.com' }))
      .toHaveAttribute('href', 'mailto:fernando.lopez.dev@hotmail.com')
    expect(screen.getByRole('link', { name: 'Teléfono: +34 688 930 344' }))
      .toHaveAttribute('href', 'tel:+34688930344')
    expect(screen.getByRole('link', { name: 'LinkedIn: linkedin.com/in/fernandolopeztrejo' }))
      .toHaveAttribute('href', 'https://linkedin.com/in/fernandolopeztrejo')
    expect(screen.getByRole('link', { name: 'GitHub: github.com/nandolt' }))
      .toHaveAttribute('href', 'https://github.com/nandolt')
    fireEvent.click(screen.getByRole('button', { name: /Descargar CV · Español/ }))
    fireEvent.click(screen.getByRole('button', { name: /Download CV · English/ }))

    expect(onDownloadCv).toHaveBeenNthCalledWith(1, 'es')
    expect(onDownloadCv).toHaveBeenNthCalledWith(2, 'en')
  })
})
