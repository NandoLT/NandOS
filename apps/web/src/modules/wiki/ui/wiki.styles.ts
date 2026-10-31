import styled from '@emotion/styled'

export const Root = styled.section`
  display: grid; gap: 16px; min-width: 0;
  color: var(--os-window-text); font-family: var(--os-font-family);
  h2, h3, p { margin: 0; }
  h2 { font-size: 23px; } h3 { font-size: 15px; }
  button, input, textarea, select { font: inherit; }
  button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
    outline: 2px solid var(--os-accent); outline-offset: 2px;
  }
`
export const Header = styled.header`
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  p { margin-top: 5px; max-width: 660px; color: var(--os-muted); font-size: 13px; line-height: 1.5; }
`
export const Actions = styled.div`
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
`
export const Button = styled.button<{ $primary?: boolean }>`
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 11px; min-height: 34px; border: var(--os-raised-border); border-radius: var(--os-control-radius);
  background: ${({ $primary }) => $primary ? 'var(--os-accent)' : 'var(--os-surface)'};
  color: ${({ $primary }) => $primary ? 'var(--os-accent-text)' : 'var(--os-window-text)'};
  cursor: pointer; font-size: 12px !important;
  &:disabled { opacity: .5; cursor: not-allowed; }
`
export const Stats = styled.div`
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
  > div { padding: 12px 14px; border: 1px solid var(--os-border); background: var(--os-surface-alt); }
  strong { display: block; font-size: 24px; margin-bottom: 3px; }
  span { color: var(--os-muted); font-size: 12px; }
`
export const Layout = styled.div`
  display: grid; grid-template-columns: 245px minmax(0, 1fr); min-height: 570px;
  border: 1px solid var(--os-border); background: var(--os-surface);
  @media(max-width: 1000px) { grid-template-columns: 205px minmax(0, 1fr); }
  @media(max-width: 740px) { grid-template-columns: 1fr; }
`
export const Library = styled.aside`
  display: flex; flex-direction: column; min-width: 0; padding: 13px; gap: 10px;
  border-right: 1px solid var(--os-border); background: var(--os-toolbar);
  label { display: grid; gap: 4px; font-size: 11px; color: var(--os-muted); }
  input, select { width: 100%; min-width: 0; border: var(--os-inset-border); padding: 7px; background: var(--os-input); color: var(--os-window-text); }
  @media(max-width: 740px) { border-right: 0; border-bottom: 1px solid var(--os-border); }
`
export const ArticleList = styled.div`
  display: grid; align-content: start; gap: 5px; max-height: 490px; overflow-y: auto;
  @media(max-width: 740px) { max-height: 180px; }
`
export const ArticleButton = styled.button<{ $active: boolean }>`
  width: 100%; padding: 10px; text-align: left; border: 1px solid ${({ $active }) => $active ? 'var(--os-accent)' : 'transparent'};
  color: var(--os-window-text); background: ${({ $active }) => $active ? 'var(--os-selected)' : 'var(--os-surface)'}; cursor: pointer;
  strong { display: block; font-size: 12px; line-height: 1.35; margin-bottom: 5px; overflow-wrap: anywhere; }
  small { display: block; font-size: 10px; color: var(--os-muted); line-height: 1.5; }
`
export const Editor = styled.div`
  display: grid; align-content: start; min-width: 0; gap: 13px; padding: 17px;
  label { display: grid; gap: 5px; font-size: 12px; font-weight: 600; }
  input { width: 100%; min-width: 0; padding: 8px 10px; border: var(--os-inset-border); background: var(--os-input); color: var(--os-window-text); font-size: 14px; }
`
export const Fields = styled.div`
  display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); align-items: start; gap: 12px;
  @media(max-width: 940px) { grid-template-columns: 1fr; }
`
export const Meta = styled.div`
  display: flex; flex-wrap: wrap; gap: 7px; align-items: center; font-size: 11px; color: var(--os-muted);
  strong { color: var(--os-window-text); background: var(--os-selected); padding: 4px 7px; }
`
export const Toolbar = styled.div`
  display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center; gap: 8px;
  > div { display: flex; gap: 4px; flex-wrap: wrap; }
  button { padding: 5px 8px; min-height: 29px; }
  button[aria-pressed=true] { border: var(--os-inset-border); background: var(--os-selected); }
`
export const Panes = styled.div<{ $mode: string }>`
  display: grid; grid-template-columns: ${({ $mode }) => $mode === 'split' ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)'};
  min-width: 0; border: var(--os-inset-border); background: #fff; color: #202b33;
  @media(max-width: 1000px) { grid-template-columns: minmax(0, 1fr); }
`
export const Source = styled.textarea`
  display: block; width: 100%; min-height: 390px; resize: vertical; padding: 18px; border: 0;
  color: #29343e; background: #fafbfc; font-family: ui-monospace, SFMono-Regular, monospace !important;
  font-size: 12px !important; line-height: 1.75; tab-size: 2;
`
export const Preview = styled.div`
  min-width: 0; min-height: 390px; max-height: 610px; overflow: auto; padding: 18px; border-left: 1px solid #dce0e4;
  > small { display: block; font-size: 10px; color: #64717a; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 17px; }
`
export const Footer = styled.footer`
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;
  border-top: 1px solid var(--os-border); padding-top: 13px;
  small { color: var(--os-muted); font-size: 11px; max-width: 380px; line-height: 1.5; }
`
export const Notice = styled.p<{ $error?: boolean }>`
  padding: 10px 12px; border: 1px solid ${({ $error }) => $error ? '#b44437' : 'var(--os-border)'};
  background: var(--os-surface-alt); color: ${({ $error }) => $error ? '#a02b21' : 'var(--os-window-text)'};
  font-size: 12px; line-height: 1.5;
`
