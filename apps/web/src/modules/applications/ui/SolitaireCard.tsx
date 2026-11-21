import { useId } from 'react'
import { cardRank, cardSuit, isRedCard, rankLabel, suitSymbols } from '../domain/solitaire'
export type CardBack = 'blue' | 'red' | 'castle'
const pair = (ys: number[]) => ys.flatMap((y) => [[24, y], [48, y]])
const pipPositions: Record<number, number[][]> = {
  2: [[36, 25], [36, 75]], 3: [[36, 25], [36, 50], [36, 75]],
  4: pair([25, 75]), 5: [...pair([25, 75]), [36, 50]],
  6: pair([25, 50, 75]), 7: [...pair([25, 50, 75]), [36, 37]],
  8: [...pair([25, 50, 75]), [36, 37], [36, 63]],
  9: [...pair([21, 40, 60, 79]), [36, 50]],
  10: [...pair([21, 40, 60, 79]), [36, 30], [36, 70]],
}
export function SolitaireCard({ id, back = 'blue' }: { id?: number; back?: CardBack }) {
  const pattern = useId()
  const rank = id === undefined ? 0 : cardRank(id)
  const color = id !== undefined && isRedCard(id) ? '#bc0000' : '#111'
  const suit = id === undefined ? '' : suitSymbols[cardSuit(id)]
  return <svg aria-hidden="true" width="100%" height="100%" viewBox="0 0 72 100" style={{ display: 'block', pointerEvents: 'none' }}>
    <rect x=".5" y=".5" width="71" height="99" rx="3" fill="#fff" stroke="#111" />
    {id === undefined ? <>
      <defs><pattern id={pattern} width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill={back === 'red' ? '#a00000' : '#000080'} />
        <path d="m0 3 3-3 3 3-3 3z" fill="none" stroke="#fff" strokeWidth=".65" />
      </pattern></defs>
      <rect x="4" y="4" width="64" height="92" rx="1" fill={'url(#' + pattern + ')'} stroke={back === 'red' ? '#a00000' : '#000080'} />
      {back === 'castle' ? <g shapeRendering="crispEdges">
        <rect x="12" y="23" width="48" height="55" fill="#001050" />
        <path d="M15 75V42h4v-8h5v8h5V27h5v-7h5v7h5v15h5v-8h5v8h4v33z" fill="#eee7b4" stroke="#000" />
        <path d="M30 75V62a6 6 0 0 1 12 0v13M20 47h4v6h-4zm15-13h4v6h-4zm14 13h4v6h-4z" fill="#000080" />
        <path d="M36 20V13h10l-4 4h-6z" fill="#f00000" /><circle cx="50" cy="29" r="4" fill="#ffea00" />
      </g> : <g>
        <path d="m36 27 16 23-16 23-16-23z" fill={back === 'red' ? '#a00000' : '#000080'} stroke="#fff" strokeWidth="2" />
        <path d="m36 36 10 14-10 14-10-14z" fill="none" stroke="#fff" /><circle cx="36" cy="50" r="4" fill="#fff" />
      </g>}
    </> : <>
      {[false, true].map((rotated) => <g key={String(rotated)} transform={rotated ? 'translate(72 100) rotate(180)' : undefined} fill={color} fontFamily="'Times New Roman', serif" textAnchor="middle">
        <text x="8.5" y="14" fontSize={rank === 10 ? 12 : 15} fontWeight="bold">{rankLabel(id)}</text>
        <text x="8.5" y="27" fontSize="15">{suit}</text>
      </g>)}
      {rank === 1 ? <text x="36" y="62" textAnchor="middle" fontFamily="serif" fontSize="38" fill={color}>{suit}</text> : rank <= 10 ? pipPositions[rank].map(([x, y], index) => <text key={index} x={x} y={y + 6} textAnchor="middle" fontFamily="serif" fontSize="19" fill={color} transform={y > 50 ? 'rotate(180 ' + x + ' ' + y + ') translate(0 -12)' : undefined}>{suit}</text>) : <>
        <rect x="18" y="17" width="36" height="66" fill="#fffce2" stroke={color} strokeWidth="1" />
        {[false, true].map((rotated) => <g key={String(rotated)} transform={rotated ? 'translate(72 100) rotate(180)' : undefined} stroke="#111" strokeWidth=".8">
          <path d="M20 50V40l9-9h14l9 9v10z" fill={color === '#111' ? '#173e89' : '#bf1616'} />
          <path d="m24 50 5-17 7 11 7-11 5 17" fill="#e4b837" />
          <path d="M29 24h14v11l-7 6-7-6z" fill="#ffdbad" />
          <path d={rank === 12 ? 'm27 25-2-7 7 4 4-6 4 6 7-4-2 7z' : 'm27 25 1-7 7 3 6-3 5 7z'} fill="#e4b837" />
          <path d="M33 28h2m4 0h2m-5 1-1 4h3m-5 3h6" fill="none" />
          {rank === 13 && <path d="m31 34 5 7 5-7-5 3z" fill="#512b16" />}
          <path d="m21 43 7 3m16-1 7-3M20 49h32" fill="none" />
        </g>)}
      </>}
    </>}
  </svg>
}
