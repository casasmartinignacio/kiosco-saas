import { money } from '@/lib/money'

export type Mod = { name: string; priceCrc?: number }

export function optionNames(label: string) {
  if (!label.trim()) return []
  const parts = label.includes('\n') ? label.split('\n') : label.split(', ')
  return parts.map((name) => name.trim()).filter(Boolean)
}

export function Mods({ items }: { items: Mod[] }) {
  if (!items.length) return null
  return (
    <ul className="mods">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          <span>{item.name}</span>
          {item.priceCrc ? <b>+{money(item.priceCrc)}</b> : null}
        </li>
      ))}
    </ul>
  )
}
