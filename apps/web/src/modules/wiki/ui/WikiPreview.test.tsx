import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import WikiPreview from './WikiPreview'

afterEach(cleanup)

it('provides a viewport-sized scroll container even when the desktop locks body scrolling', async () => {
  renderWithProviders(<WikiPreview />)
  await screen.findByRole('button', { name: /Bienvenido a NandOS/ })
  expect(screen.getByRole('main')).toHaveStyle({ height: '100dvh', overflowY: 'auto' })
  expect(screen.getByRole('button', { name: 'Publicar artículo' })).toBeInTheDocument()
})
