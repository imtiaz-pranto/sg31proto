import { AlertTriangle, Info } from 'lucide-react'
import type { ReactNode } from 'react'

/** Amber "Worth a look" box: the warning text, then its fix links. */
export function WarnBox({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="cp-warn">
      <AlertTriangle size={18} className="shrink-0" style={{ color: '#B54708' }} aria-hidden />
      <div className="flex min-w-0 flex-col gap-1">
        <span>{children}</span>
        {actions && <span className="flex flex-wrap gap-x-3 gap-y-1">{actions}</span>}
      </div>
    </div>
  )
}

/** Grey info line, e.g. "Also running: Free shipping, always on". */
export function InfoLine({ children }: { children: ReactNode }) {
  return (
    <div className="cp-info">
      <Info size={18} className="shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function RailCard({ id, title, children, dashed, gap = 12 }: { id: string; title: ReactNode; children: ReactNode; dashed?: boolean; gap?: number }) {
  return (
    <section aria-labelledby={id} className={`cp-card ${dashed ? 'cp-card-dashed' : ''} flex flex-col p-5`} style={{ gap }}>
      <h2 id={id} className="cp-h2-rail">
        {title}
      </h2>
      {children}
    </section>
  )
}
