import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GlobalStyles } from '../shared/styles/GlobalStyles'
import { themeRegistry } from '../shared/styles/theme'
import { useThemeStore } from '../shared/styles/theme.store'
import { NandoOsShell } from '../modules/shell/ui/NandoOsShell'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
})

export function App() {
  const selectedThemeId = useThemeStore((state) => state.selectedThemeId)
  const theme = themeRegistry[selectedThemeId] ?? themeRegistry['classic-95']

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyles theme={theme} />
        <NandoOsShell />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
