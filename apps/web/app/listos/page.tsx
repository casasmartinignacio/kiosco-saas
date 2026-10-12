'use client'

import { useEffect, useState } from 'react'

export default function ListosPage() {
  const [numbers, setNumbers] = useState<number[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      const res = await fetch('/api/listos')
      if (!res.ok || !active) return
      const data = (await res.json()) as { number: number }[]
      setNumbers(data.map((order) => order.number))
    }
    load()
    const poll = setInterval(load, 3000)
    return () => {
      active = false
      clearInterval(poll)
    }
  }, [])

  return (
    <div className="ready-board">
      <header>
        <img className="mark" src="/assets/logo-mark-light.png" alt="" />
        <div>
          <b>Puerta Cuatro</b>
          <div>Pedidos listos para retirar</div>
        </div>
      </header>
      {numbers.length === 0 ? <p className="ready-empty">Cuando un pedido esté listo, el número aparece aquí.</p> : null}
      <div className="ready-numbers">
        {numbers.map((number) => (
          <span key={number}>#{number}</span>
        ))}
      </div>
    </div>
  )
}
