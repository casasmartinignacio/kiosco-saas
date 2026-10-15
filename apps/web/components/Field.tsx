'use client'

import { useId, type FocusEvent } from 'react'

export type FieldOption = { value: string; label: string }

type FieldProps = {
  label?: string
  hint?: string
  error?: string
  value: string
  onValue: (value: string) => void
  kind?: 'text' | 'digits' | 'code' | 'date' | 'textarea' | 'select'
  options?: FieldOption[]
  placeholder?: string
  readOnly?: boolean
  maxLength?: number
  id?: string
  compact?: boolean
  grow?: boolean
  size?: 'md' | 'lg'
  ariaLabel?: string
  autoComplete?: string
  onFocus?: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export function digits(value: string, maxLength?: number) {
  const next = value.replace(/\D/g, '')
  return maxLength ? next.slice(0, maxLength) : next
}

export function Field({
  label,
  hint,
  error,
  value,
  onValue,
  kind = 'text',
  options = [],
  placeholder,
  readOnly,
  maxLength,
  id,
  compact,
  grow,
  size = 'md',
  ariaLabel,
  autoComplete,
  onFocus,
}: FieldProps) {
  const generated = useId()
  const fieldId = id || generated
  const invalid = Boolean(error)

  function change(raw: string) {
    if (kind === 'digits') onValue(digits(raw, maxLength))
    else if (kind === 'code') onValue(raw.toUpperCase().replace(/\s/g, ''))
    else onValue(raw)
  }

  const shared = {
    id: fieldId,
    value,
    placeholder,
    'aria-invalid': invalid || undefined,
    'aria-label': label ? ariaLabel : ariaLabel,
  }

  return (
    <label className={`field${invalid ? ' invalid' : ''}${compact ? ' compact' : ''}${grow ? ' grow' : ''}${size === 'lg' ? ' lg' : ''}`} htmlFor={fieldId}>
      {label ? <span className="field-label">{label}</span> : null}
      {kind === 'textarea' ? (
        <textarea {...shared} readOnly={readOnly} maxLength={maxLength} onChange={(event) => change(event.target.value)} onFocus={onFocus} />
      ) : kind === 'select' ? (
        <select id={fieldId} value={value} aria-invalid={invalid || undefined} aria-label={ariaLabel} onChange={(event) => onValue(event.target.value)}>
          {options.map((option) => <option key={option.value || option.label} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input
          {...shared}
          type={kind === 'date' ? 'date' : 'text'}
          inputMode={kind === 'digits' ? 'numeric' : 'text'}
          autoCapitalize={kind === 'code' ? 'characters' : undefined}
          autoComplete={autoComplete || (kind === 'digits' ? 'off' : undefined)}
          readOnly={readOnly}
          maxLength={maxLength}
          onChange={(event) => change(event.target.value)}
          onFocus={onFocus}
        />
      )}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="field check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}
