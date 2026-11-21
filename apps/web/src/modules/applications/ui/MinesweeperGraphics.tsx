const segments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg']
const segmentPaths: Record<string, string> = {
  a: '3,1 11,1 13,3 11,5 3,5 1,3', b: '12,4 14,2 14,12 12,14 10,12 10,6',
  c: '12,15 14,17 14,27 12,25 10,23 10,17', d: '3,24 11,24 13,26 11,28 3,28 1,26',
  e: '0,17 2,15 4,17 4,23 2,25 0,27', f: '0,2 2,4 4,6 4,12 2,14 0,12',
  g: '3,12 11,12 13,14 11,16 3,16 1,14',
}
export function MineCounter({ value, label }: { value: number; label: string }) {
  const digits = value < 0 ? '-' + String(Math.min(99, -value)).padStart(2, '0') : String(Math.min(999, value)).padStart(3, '0')
  return <svg role="img" aria-label={label + ': ' + value} width="56" height="32" viewBox="0 0 50 30" shapeRendering="crispEdges">
    <rect width="50" height="30" fill="#180000" />
    {[...digits].map((digit, i) => <g key={i} transform={'translate(' + (i * 16 + 2) + ' 0)'}>
      {Object.entries(segmentPaths).map(([name, points]) => <polygon key={name} points={points} fill={(digit === '-' ? 'g' : segments[Number(digit)]).includes(name) ? '#ff0000' : '#360000'} />)}
    </g>)}
  </svg>
}

export function MineSprite({ kind }: { kind: 'flag' | 'mine' | 'wrong' }) {
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
    {kind === 'flag' ? <><path fill="#000" d="M7 3h2v9h4v2H3v-2h4z" /><path fill="#f00000" d="M7 2h1v7H7V8H4V7H2V5h2V4h3z" /></> : <>
      <path fill="#000" d="M7 0h2v16H7zM0 7h16v2H0zM2 2h2v2H2zM12 2h2v2h-2zM2 12h2v2H2zM12 12h2v2h-2zM4 3h8v10H4zM3 4h10v8H3z" />
      <path fill="#fff" d="M5 4h3v3H5z" />
      {kind === 'wrong' && <path stroke="#f00000" strokeWidth="2" d="m1 1 14 14m0-14L1 15" />}
    </>}
  </svg>
}

export function MineFace({ mood }: { mood: 'happy' | 'surprised' | 'lost' | 'won' }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#ffff00" stroke="#111" strokeWidth="1.2" />
    <path d="M5 10a7 7 0 0 1 8-6" fill="none" stroke="#ffffb0" strokeWidth="1.2" />
    {mood === 'lost' ? <g fill="none" stroke="#111" strokeWidth="1.4" strokeLinecap="round">
      <path d="m7 7 3 3m0-3-3 3m7-3 3 3m0-3-3 3M8 17q4-5 8 0" />
    </g> : <>
      {mood === 'won' ? <path fill="#111" d="M4 7h16v2h-1v3h-5V9h-4v3H5V9H4z" /> : <g fill="#111"><ellipse cx="8.5" cy="8.8" rx="1" ry="1.4" /><ellipse cx="15.5" cy="8.8" rx="1" ry="1.4" /></g>}
      {mood === 'surprised' ? <ellipse cx="12" cy="16" rx="2" ry="2.5" fill="none" stroke="#111" strokeWidth="1.3" /> : <path d="M7 14q5 8 10 0" fill="none" stroke="#111" strokeWidth="1.4" strokeLinecap="round" />}
    </>}
  </svg>
}
