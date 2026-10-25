import { ThemeProvider } from '@emotion/react'
import { GlobalStyles } from '../shared/styles/GlobalStyles'
import { themeRegistry } from '../shared/styles/theme'
import { useThemeStore } from '../shared/styles/theme.store'
import { NandoOsShell } from '../modules/shell/ui/NandoOsShell'

export function App() {
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId)
  const theme = themeRegistry[selectedThemeId] ?? themeRegistry['classic-95']

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles theme={theme} />
      <NandoOsShell />
    </ThemeProvider>
  )
}
