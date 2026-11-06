import type { ReactNode } from 'react'

export function Field({ label, children, help, htmlFor }: { label: string; children: ReactNode; help?: string; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-800">
        {label}
      </label>
      {children}
      {help && <div className="text-xs text-gray-500">{help}</div>}
    </div>
  )
}

export function Card({ title, children, right, className = '' }: { title?: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  )
}
