export type ThemeId = 'classic-95' | 'modern-desktop'

export type NandoOsTheme = {
  id: ThemeId
  name: string
  description: string
  colors: {
    desktop: string
    desktopText: string
    desktopSelection: string
    desktopHover: string
    window: string
    windowText: string
    titleBar: string
    titleBarText: string
    inactiveTitleBar: string
    taskbar: string
    menu: string
    menuText: string
    menuHover: string
    menuHoverText: string
    accent: string
    accentText: string
    surface: string
    surfaceAlt: string
    toolbar: string
    input: string
    inputText: string
    inputMuted: string
    selected: string
    selectedText: string
    muted: string
    disabled: string
    border: string
    borderDark: string
    borderLight: string
    divider: string
    notice: string
    danger: string
    overlay: string
    brandRail: string
    shadow: string
  }
  fontFamily: string
  windowBorder: string
  raisedBorder: string
  insetBorder: string
  windowRadius: string
  controlRadius: string
  windowShadow: string
  desktopPattern: string
  desktopPatternSize: string
}

export const themeRegistry: Record<ThemeId, NandoOsTheme> = {
  'classic-95': {
    id: 'classic-95',
    name: 'Classic 95',
    description: 'El escritorio retro de NandOS, con superficies grises y relieve clásico.',
    colors: {
      desktop: '#008080',
      desktopText: '#ffffff',
      desktopSelection: 'rgba(0, 0, 128, 0.58)',
      desktopHover: 'rgba(0, 0, 128, 0.34)',
      window: '#c0c0c0',
      windowText: '#111111',
      titleBar: '#000080',
      titleBarText: '#ffffff',
      inactiveTitleBar: '#7f7f9f',
      taskbar: '#c0c0c0',
      menu: '#c0c0c0',
      menuText: '#111111',
      menuHover: '#000080',
      menuHoverText: '#ffffff',
      accent: '#000080',
      accentText: '#ffffff',
      surface: '#ffffff',
      surfaceAlt: '#f1f1f1',
      toolbar: '#c0c0c0',
      input: '#ffffff',
      inputText: '#111111',
      inputMuted: '#dfdfdf',
      selected: '#d8e5ff',
      selectedText: '#111111',
      muted: '#555555',
      disabled: '#777777',
      border: '#888888',
      borderDark: '#555555',
      borderLight: '#ffffff',
      divider: '#888888',
      notice: '#ffffe1',
      danger: '#800000',
      overlay: 'rgba(0, 0, 0, 0.35)',
      brandRail: '#7f7f7f',
      shadow: 'rgba(0, 0, 0, 0.32)',
    },
    fontFamily: "'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif",
    windowBorder: '2px outset #ffffff',
    raisedBorder: '2px outset #ffffff',
    insetBorder: '2px inset #ffffff',
    windowRadius: '0px',
    controlRadius: '0px',
    windowShadow: '3px 3px 0 rgba(0, 0, 0, 0.35)',
    desktopPattern: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
    desktopPatternSize: '4px 4px',
  },
  'modern-desktop': {
    id: 'modern-desktop',
    name: 'Modern Desktop',
    description: 'Una versión limpia y actual, con tonos pizarra, azul y superficies suaves.',
    colors: {
      desktop: '#1d2939',
      desktopText: '#f8fafc',
      desktopSelection: 'rgba(65, 126, 207, 0.58)',
      desktopHover: 'rgba(255, 255, 255, 0.14)',
      window: '#f4f7fb',
      windowText: '#172033',
      titleBar: '#e7edf5',
      titleBarText: '#172033',
      inactiveTitleBar: '#d2dae5',
      taskbar: 'rgba(241, 245, 250, 0.96)',
      menu: '#f4f7fb',
      menuText: '#172033',
      menuHover: '#2e75cc',
      menuHoverText: '#ffffff',
      accent: '#2e75cc',
      accentText: '#ffffff',
      surface: '#ffffff',
      surfaceAlt: '#edf2f8',
      toolbar: '#e7edf5',
      input: '#ffffff',
      inputText: '#172033',
      inputMuted: '#e7edf5',
      selected: '#dceafe',
      selectedText: '#172033',
      muted: '#58677b',
      disabled: '#8793a4',
      border: '#c7d1df',
      borderDark: '#aab8c9',
      borderLight: '#ffffff',
      divider: '#c7d1df',
      notice: '#fff8df',
      danger: '#a63838',
      overlay: 'rgba(15, 23, 42, 0.38)',
      brandRail: '#172638',
      shadow: 'rgba(15, 23, 42, 0.2)',
    },
    fontFamily: "'Segoe UI', Inter, system-ui, sans-serif",
    windowBorder: '1px solid #c7d1df',
    raisedBorder: '1px solid #c7d1df',
    insetBorder: '1px solid #aab8c9',
    windowRadius: '10px',
    controlRadius: '6px',
    windowShadow: '0 16px 48px rgba(15, 23, 42, 0.2)',
    desktopPattern: 'radial-gradient(circle at 15% 10%, rgba(72, 132, 212, 0.26), transparent 42%), linear-gradient(135deg, #1d2939, #283d56)',
    desktopPatternSize: 'cover',
  },
}

export const classicTheme = themeRegistry['classic-95']
