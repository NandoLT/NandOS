export function AppIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  return icon.startsWith('/')
    ? <img src={icon} width={size} height={size} alt="" draggable={false}
        style={{ objectFit: 'contain', verticalAlign: 'middle', flexShrink: 0 }} />
    : <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>{icon}</span>
}
