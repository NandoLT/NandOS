import styled from '@emotion/styled'

export const Root = styled.section<{ $reading: boolean }>`
  display: grid; gap: 12px; min-width: 0; min-height: 0; color: var(--os-window-text); font-size: 13px;
  align-content: start;
  height: ${({ $reading }) => $reading ? '100%' : 'auto'};
  grid-template-rows: ${({ $reading }) => $reading ? 'auto auto auto minmax(140px, 1fr) auto' : 'none'};
  h2, h3, p { margin: 0; }
  button, select { font: inherit; }
  button:focus-visible, select:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: 2px; }
`
export const Introduction = styled.header`
  display: flex; align-items: center; gap: 17px; padding: 20px;
  border: var(--os-raised-border); border-radius: var(--os-control-radius);
  background: var(--os-accent); color: var(--os-accent-text);
  > span { font-size: 42px; line-height: 1; }
  small { display: block; margin-bottom: 6px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
  h2 { font-size: 25px; line-height: 1.15; }
  p { margin-top: 9px; max-width: 520px; font-size: 12px; line-height: 1.6; }
  @media(max-width: 440px) { padding: 15px; gap: 12px; h2 { font-size: 22px; } > span { font-size: 30px; } }
`
export const Navigation = styled.nav`
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  small { color: var(--os-muted); font-size: 11px; }
  > div { display: flex; flex-wrap: wrap; gap: 6px; }
`
export const Button = styled.button`
  min-height: 34px; padding: 6px 10px; border: var(--os-raised-border); border-radius: var(--os-control-radius);
  background: var(--os-window); color: var(--os-window-text); cursor: pointer;
  &:disabled { opacity: .55; cursor: wait; }
  &:active:not(:disabled) { border-style: inset; }
`
export const Selectors = styled.div`
  display: grid; grid-template-columns: minmax(130px, .8fr) minmax(160px, 1.2fr); gap: 12px;
  padding: 12px; border: 1px solid var(--os-border); background: var(--os-toolbar);
  label { display: grid; gap: 6px; min-width: 0; font-size: 11px; font-weight: bold; }
  select { width: 100%; min-width: 0; min-height: 36px; padding: 6px 8px;
    border: var(--os-inset-border); background: var(--os-input); color: var(--os-input-text); font-weight: normal; }
  @media(max-width: 480px) { grid-template-columns: 1fr; }
`
export const Document = styled.article`
  min-width: 0; min-height: 0; padding: 18px; border: var(--os-inset-border); background: var(--os-surface);
  overflow-wrap: anywhere; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable;
  &:focus-visible { outline: 2px dotted var(--os-accent); outline-offset: -4px; }
  @media(max-width: 440px) { padding: 14px; }
`
export const Metadata = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px 16px; padding-bottom: 12px; margin-bottom: 16px;
  border-bottom: 1px solid var(--os-border); color: var(--os-muted); font-size: 11px;
`
export const Notice = styled.div`
  padding: 20px; border: var(--os-inset-border); background: var(--os-surface); line-height: 1.7;
  strong { display: block; margin-bottom: 5px; }
`
export const Footer = styled.footer`
  padding-top: 10px; border-top: 1px solid var(--os-border); color: var(--os-muted); font-size: 11px; line-height: 1.6;
`
