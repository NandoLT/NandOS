import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import styled from '@emotion/styled'
import { memo } from 'react'

const Document = styled.div`
  overflow-wrap: anywhere;
  line-height: 1.65;
  font-size: 14px;
  h1, h2, h3 { line-height: 1.25; margin: 1.2em 0 .6em; }
  h1:first-child { margin-top: 0; }
  h1 { font-size: 25px; } h2 { font-size: 21px; }
  a { color: #064fa0; text-decoration: underline; }
  pre { padding: 12px; overflow-x: auto; background: #f0f2f4; border: 1px solid #ccd1d5; }
  code { font-family: monospace; background: #f0f2f4; }
  blockquote { margin-left: 0; padding-left: 14px; border-left: 3px solid #929faa; color: #4c5963; }
  table { border-collapse: collapse; display: block; overflow-x: auto; }
  th, td { border: 1px solid #bcc3c9; padding: 6px 10px; }
  input { pointer-events: none; }
`

export const MarkdownPreview = memo(function MarkdownPreview({ markdown }: { markdown: string }) {
  return <Document><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml
    urlTransform={(url) => /^tel:/i.test(url) ? url : defaultUrlTransform(url)}
    components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      img: ({ alt }) => <span>[Imagen: {alt || 'sin descripción'}; no se carga contenido externo]</span> }}
  >{markdown}</ReactMarkdown></Document>
})
