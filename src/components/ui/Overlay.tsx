import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Open drawers and dialogs, oldest first. Escape only closes the one on top, so a drawer opened from a drawer closes alone. */
const openLayers: object[] = []

function useEscapeToClose(open: boolean, onClose: () => void) {
  const latest = useRef(onClose)
  useEffect(() => {
    latest.current = onClose
  })
  useEffect(() => {
    if (!open) return
    const layer = {}
    openLayers.push(layer)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openLayers[openLayers.length - 1] === layer) latest.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      openLayers.splice(openLayers.indexOf(layer), 1)
    }
  }, [open])
}

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
  footer?: ReactNode
}

/** Right-side drawer. Escape closes it. */
export function Drawer({ open, onClose, title, children, width = 560, footer }: DrawerProps) {
  useEscapeToClose(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute right-0 top-0 flex h-full flex-col bg-white shadow-2xl"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close drawer">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: '#e5e7eb' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, width = 880 }: ModalProps) {
  useEscapeToClose(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-full w-full overflow-y-auto rounded-xl bg-white shadow-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
