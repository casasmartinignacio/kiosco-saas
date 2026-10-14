export type IssueLine = { name: string; quantity: number; unitPriceCrc: number; cabys: string }

export type IssueRequest = {
  idempotencyKey: string
  customerName: string
  customerTaxId: string
  paymentMethod: string
  lines: IssueLine[]
  legalId: string
  cabysDefault: string
}

export type IssueResult = {
  status: 'SUBMITTED' | 'FAILED' | 'NOT_CONFIGURED'
  clave: string
  number: string
  detail: string
}

const PAYMENT: Record<string, string> = { CASH: '01', CARD: '02', SINPE: '06' }

export function facturaBody(request: IssueRequest, kind: 'factura' | 'tiquete', environment: string, legalId: string, cabysDefault: string) {
  const body: Record<string, unknown> = {
    emisorLegalId: legalId,
    environment,
    condicionVenta: '01',
    medioPago: [PAYMENT[request.paymentMethod] || '01'],
    detalle: request.lines.map((line) => ({
      cantidad: line.quantity,
      unidadMedida: 'Unid',
      codigoCabys: line.cabys || cabysDefault,
      detalle: line.name,
      precioUnitario: line.unitPriceCrc,
      impuesto: [{ codigo: '01', codigoTarifa: '08', tarifa: 13 }],
    })),
  }
  if (kind === 'factura') {
    body.receptor = {
      tipoIdentificacion: request.customerTaxId.startsWith('3') ? '02' : '01',
      numeroIdentificacion: request.customerTaxId,
      nombre: request.customerName,
    }
  }
  return body
}

export class FacturaEnCrIssuer {
  async issue(request: IssueRequest, kind: 'factura' | 'tiquete'): Promise<IssueResult> {
    const key = process.env.FACTURAENCR_API_KEY || ''
    const secret = process.env.FACTURAENCR_API_SECRET || ''
    const environment = process.env.FACTURAENCR_ENVIRONMENT || 'sandbox'
    const base = (process.env.FACTURAENCR_BASE_URL || 'https://api.facturaencr.com').replace(/\/$/, '')
    const legalId = request.legalId || (environment === 'sandbox' ? 'EMISORPRUEBA' : '')
    const cabysDefault = request.cabysDefault || (environment === 'sandbox' ? '6331000000000' : '')
    if (!key || !secret || !legalId) {
      return { status: 'NOT_CONFIGURED', clave: '', number: '', detail: 'Falta la cédula del emisor o la llave de Hacienda.' }
    }
    if (request.lines.some((line) => !(line.cabys || cabysDefault))) {
      return { status: 'FAILED', clave: '', number: '', detail: 'Falta el código CABYS de un producto.' }
    }
    try {
      const res = await fetch(`${base}/v2/efactura/documents/${kind}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'X-API-Key': key,
          'X-API-Secret': secret,
          'Idempotency-Key': request.idempotencyKey,
        },
        body: JSON.stringify(facturaBody(request, kind, environment, legalId, cabysDefault)),
        signal: AbortSignal.timeout(20000),
      })
      const data = (await res.json().catch(() => null)) as {
        clave?: string
        consecutivo?: string
        documentId?: string
        message?: string | string[]
        error?: string
      } | null
      const message = Array.isArray(data?.message) ? data?.message[0] : data?.message
      if (!res.ok) {
        return { status: 'FAILED', clave: '', number: '', detail: message || data?.error || 'Hacienda no aceptó el envío.' }
      }
      return {
        status: 'SUBMITTED',
        clave: data?.clave || '',
        number: data?.consecutivo || '',
        detail: data?.documentId || '',
      }
    } catch {
      return { status: 'FAILED', clave: '', number: '', detail: 'No se pudo contactar el servicio de facturación.' }
    }
  }
}
