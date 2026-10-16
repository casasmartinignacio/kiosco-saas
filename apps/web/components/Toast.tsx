'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

type ToastItem = { id: number; variant: ToastVariant; message: string }
type Push = (toast: { variant: ToastVariant; message: string }) => void

const ToastContext = createContext<Push>(() => {})

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback<Push>((toast) => {
    const id = nextId++
    setItems((current) => [...current.slice(-2), { id, variant: toast.variant, message: toast.message }])
    window.setTimeout(() => dismiss(id), toast.variant === 'error' ? 6000 : 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((item) => (
          <div className={`toast ${item.variant}`} key={item.id} role={item.variant === 'error' ? 'alert' : 'status'}>
            <span className="toast-mark" aria-hidden="true">{item.variant === 'error' ? '!' : item.variant === 'info' ? 'i' : '✓'}</span>
            <span>{item.message}</span>
            <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(item.id)}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
