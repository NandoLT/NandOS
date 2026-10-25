import styled from '@emotion/styled'
import { themeRegistry } from '../../../shared/styles/theme'
import type { ThemeId } from '../../../shared/styles/theme'

const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 152px minmax(0, 1fr);
  gap: 18px;
  min-height: 100%;
  color: var(--os-window-text);

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`

const SettingsNavigation = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border: var(--os-inset-border);
  border-radius: var(--os-control-radius);
  background: var(--os-surface-alt);
`

const NavigationItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--os-accent)' : 'transparent')};
  border-radius: var(--os-control-radius);
  color: ${({ $active }) => ($active ? 'var(--os-accent-text)' : 'var(--os-window-text)')};
  background: ${({ $active }) => ($active ? 'var(--os-accent)' : 'transparent')};
  text-align: left;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.55 : 1)};

  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 1px; }
`

const SettingsContent = styled.section`
  min-width: 0;

  h2 {
    margin: 0 0 6px;
    font-size: 20px;
  }

  p {
    margin: 0 0 16px;
    color: var(--os-muted);
    font-size: 13px;
    line-height: 1.5;
  }
`

const ThemeList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const ThemeCard = styled.button<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 84px;
  padding: 10px;
  border: ${({ $selected }) => ($selected ? '2px solid var(--os-accent)' : 'var(--os-raised-border)')};
  border-radius: var(--os-control-radius);
  color: var(--os-window-text);
  background: ${({ $selected }) => ($selected ? 'var(--os-selected)' : 'var(--os-surface)')};
  text-align: left;
  cursor: pointer;

  &:hover { border-color: var(--os-accent); }
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }

  strong { display: block; margin-bottom: 4px; font-size: 13px; }
  small { display: block; color: var(--os-muted); font-size: 11px; line-height: 1.35; }
`

const ThemePreview = styled.span<{ $desktop: string; $window: string; $titleBar: string }>`
  position: relative;
  display: block;
  width: 64px;
  height: 52px;
  overflow: hidden;
  border: 1px solid var(--os-border);
  border-radius: calc(var(--os-control-radius) / 2);
  background: ${({ $desktop }) => $desktop};

  &::before {
    position: absolute;
    inset: 10px 6px 6px 11px;
    border: 1px solid ${({ $titleBar }) => $titleBar};
    border-radius: calc(var(--os-control-radius) / 2);
    background: ${({ $window }) => $window};
    content: '';
  }

  &::after {
    position: absolute;
    top: 11px;
    right: 7px;
    left: 12px;
    height: 8px;
    border-radius: calc(var(--os-control-radius) / 3);
    background: ${({ $titleBar }) => $titleBar};
    content: '';
  }
`

const CurrentThemeNote = styled.div`
  margin-top: 16px;
  padding: 10px 12px;
  border: 1px solid var(--os-border);
  border-radius: var(--os-control-radius);
  color: var(--os-muted);
  background: var(--os-surface-alt);
  font-size: 12px;
`

type SettingsWindowProps = {
  selectedThemeId: ThemeId
  onSelectTheme: (themeId: ThemeId) => void
}

export function SettingsWindow({ selectedThemeId, onSelectTheme }: SettingsWindowProps) {
  return (
    <SettingsLayout aria-label="Configuración del sistema">
      <SettingsNavigation aria-label="Secciones de configuración">
        <NavigationItem type="button" $active aria-current="page">
          🎨 Apariencia
        </NavigationItem>
        <NavigationItem type="button" disabled title="Disponible próximamente">
          🖥️ Sistema
        </NavigationItem>
        <NavigationItem type="button" disabled title="Disponible próximamente">
          ♿ Accesibilidad
        </NavigationItem>
      </SettingsNavigation>

      <SettingsContent>
        <h2>Apariencia</h2>
        <p>Elige el escritorio que quieres usar. La preferencia se guarda en este navegador.</p>
        <ThemeList aria-label="Temas disponibles">
          {Object.values(themeRegistry).map((theme) => (
            <ThemeCard
              key={theme.id}
              type="button"
              $selected={selectedThemeId === theme.id}
              aria-pressed={selectedThemeId === theme.id}
              onClick={() => onSelectTheme(theme.id)}
            >
              <ThemePreview
                aria-hidden="true"
                $desktop={theme.colors.desktop}
                $window={theme.colors.window}
                $titleBar={theme.colors.titleBar}
              />
              <span>
                <strong>{theme.name}</strong>
                <small>{theme.description}</small>
              </span>
            </ThemeCard>
          ))}
        </ThemeList>
        <CurrentThemeNote role="status">
          Tema actual: <strong>{themeRegistry[selectedThemeId].name}</strong>
        </CurrentThemeNote>
      </SettingsContent>
    </SettingsLayout>
  )
}
