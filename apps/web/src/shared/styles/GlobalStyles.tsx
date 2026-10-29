import { Global, css } from '@emotion/react'
import type { NandoOsTheme } from './theme'

export function GlobalStyles({ theme }: { theme: NandoOsTheme }) {
  return (
    <Global
      styles={css`
        :root {
          --os-taskbar-height: 42px;
          --os-desktop: ${theme.colors.desktop};
          --os-desktop-text: ${theme.colors.desktopText};
          --os-desktop-selection: ${theme.colors.desktopSelection};
          --os-desktop-hover: ${theme.colors.desktopHover};
          --os-window: ${theme.colors.window};
          --os-window-text: ${theme.colors.windowText};
          --os-titlebar: ${theme.colors.titleBar};
          --os-titlebar-text: ${theme.colors.titleBarText};
          --os-titlebar-inactive: ${theme.colors.inactiveTitleBar};
          --os-taskbar: ${theme.colors.taskbar};
          --os-menu: ${theme.colors.menu};
          --os-menu-text: ${theme.colors.menuText};
          --os-menu-hover: ${theme.colors.menuHover};
          --os-menu-hover-text: ${theme.colors.menuHoverText};
          --os-accent: ${theme.colors.accent};
          --os-accent-text: ${theme.colors.accentText};
          --os-surface: ${theme.colors.surface};
          --os-surface-alt: ${theme.colors.surfaceAlt};
          --os-toolbar: ${theme.colors.toolbar};
          --os-input: ${theme.colors.input};
          --os-input-text: ${theme.colors.inputText};
          --os-input-muted: ${theme.colors.inputMuted};
          --os-selected: ${theme.colors.selected};
          --os-selected-text: ${theme.colors.selectedText};
          --os-muted: ${theme.colors.muted};
          --os-disabled: ${theme.colors.disabled};
          --os-border: ${theme.colors.border};
          --os-border-dark: ${theme.colors.borderDark};
          --os-border-light: ${theme.colors.borderLight};
          --os-divider: ${theme.colors.divider};
          --os-notice: ${theme.colors.notice};
          --os-danger: ${theme.colors.danger};
          --os-overlay: ${theme.colors.overlay};
          --os-brand-rail: ${theme.colors.brandRail};
          --os-shadow: ${theme.colors.shadow};
          --os-window-border: ${theme.windowBorder};
          --os-raised-border: ${theme.raisedBorder};
          --os-inset-border: ${theme.insetBorder};
          --os-window-radius: ${theme.windowRadius};
          --os-control-radius: ${theme.controlRadius};
          --os-window-shadow: ${theme.windowShadow};
          --os-desktop-pattern: ${theme.desktopPattern};
          --os-desktop-pattern-size: ${theme.desktopPatternSize};
          --os-font-family: ${theme.fontFamily};
          font-family: var(--os-font-family);
          color: var(--os-window-text);
          background: var(--os-desktop);
          font-synthesis: none;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: none;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          min-width: 320px;
          min-height: 100%;
          margin: 0;
        }

        body {
          min-height: 100vh;
          overflow: hidden;
          color: var(--os-window-text);
          background: var(--os-desktop);
        }

        button {
          font: inherit;
        }

        @media (max-width: 640px), (pointer: coarse) {
          :root { --os-taskbar-height: 56px; }
          button, input, select { min-height: 44px; }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}
    />
  )
}
