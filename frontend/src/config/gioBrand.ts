/**
 * Identidade visual GIO v4.0 (blueprint + lime + DM Sans).
 *
 * Espelho fiel de ../GIO/src/config/gioBrand.js — fonte de verdade da marca.
 * Usado pelo shell global (Sidebar / AppHeader / DashboardLayout) para deixar
 * este sistema visual e estruturalmente idêntico ao GIO.
 */
export const GIO = {
  obsidian: '#0A0E1A',
  navBg: '#1A1A1A', // sidebar + área de conteúdo
  surface: '#232327', // topbar, cards, dropdown
  surface2: '#2A2A2E', // hover de item de menu
  surface3: '#32323A', // hover de icon-button

  lime: '#D2FF00', // acento puro — item ativo, foco
  limeDeep: '#A9BE2E', // lime fosco — CTA
  limeHover: '#B6CB3D',
  limeGrad: 'linear-gradient(135deg, #A9BE2E, #D2FF00)', // avatares

  white: '#FFFFFF',
  bone: '#ECECEE', // texto/ícone claro
  gray: '#8B8B95', // metadados, subtítulos

  // Texto/linhas sobre superfície escura
  navInk: '#FFFFFF',
  navMuted: 'rgba(255, 255, 255, 0.55)', // item de nav padrão
  navFaint: 'rgba(255, 255, 255, 0.35)', // rótulo de grupo, role
  line: 'rgba(255, 255, 255, 0.08)',
  lineStrong: 'rgba(255, 255, 255, 0.14)',
  hover: 'rgba(255, 255, 255, 0.06)', // hover de nav

  // Item ativo (lime)
  navActiveBg: 'rgba(210, 255, 0, 0.14)',
  navActiveText: '#D2FF00',

  // Botão "Assistente" (cinza-sistema da referência)
  sys: '#3D434F',
  sysHover: '#535A6A',

  late: '#DC2626', // badge de notificação / ação destrutiva
  errorText: '#FF9090',

  contentBg: '#FAFAF7', // fundo claro da área de conteúdo
} as const;

export const GIO_FONT =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

// Dimensões do shell (referência canônica)
export const SHELL = {
  sidebarW: 248,
  sidebarCollapsedW: 64,
  topbarH: 60,
} as const;
