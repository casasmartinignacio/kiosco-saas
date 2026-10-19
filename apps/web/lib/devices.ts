export const CARD_TERMINAL_ENABLED = false

export type StorePrinter = { name: string; host: string }

type Bridge = {
  pay: (payload: string) => string
  printTicket: (payload: string) => string
  listPrinters?: () => string
  configure?: (payload: string) => void
}

function bridge(): Bridge | null {
  const host = window as Window & { Kiosk?: Bridge }
  if (!host.Kiosk?.pay || !host.Kiosk?.printTicket) return null
  return host.Kiosk
}

export function configureDevices(devices: { terminalUrl: string; printers: StorePrinter[] }) {
  const payload = CARD_TERMINAL_ENABLED ? devices : { ...devices, terminalUrl: '' }
  bridge()?.configure?.(JSON.stringify(payload))
}

export async function chargeCard(amountCrc: number, method: string, reference: string) {
  if (method !== 'CARD' || !CARD_TERMINAL_ENABLED) return { ok: true, message: '' }
  const native = bridge()
  if (native) {
    try {
      const result = JSON.parse(native.pay(JSON.stringify({ amountCrc, method, reference }))) as { ok?: boolean; message?: string }
      return { ok: result.ok !== false, message: result.message || '' }
    } catch {
      return { ok: false, message: 'No se pudo hablar con el datáfono.' }
    }
  }
  const url = localStorage.getItem('kiosco-terminal-url') || ''
  if (!url) return { ok: true, message: '' }
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/v1/charge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amount: amountCrc, currency: 'CRC', reference, method }),
    })
    const data = (await res.json().catch(() => null)) as { approved?: boolean; message?: string } | null
    return { ok: res.ok && data?.approved === true, message: data?.message || 'El datáfono no aprobó el pago.' }
  } catch {
    return { ok: false, message: 'El datáfono no respondió.' }
  }
}

export function printReceipt(input: { text: string; html: string; host?: string; prompt: boolean }) {
  const native = bridge()
  if (native) {
    try {
      const result = JSON.parse(native.printTicket(JSON.stringify({ text: input.text, host: input.host || '' }))) as { ok?: boolean }
      return result.ok === true
    } catch {
      return false
    }
  }
  if (!input.prompt) return false
  const frame = document.createElement('iframe')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  if (!doc) return false
  doc.open()
  doc.write(input.html)
  doc.close()
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  window.setTimeout(() => frame.remove(), 1000)
  return true
}
