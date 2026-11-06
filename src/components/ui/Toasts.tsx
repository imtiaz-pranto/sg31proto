import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/store'

export function Toasts() {
  const { state, actions } = useStore()
  const toasts = state.toasts
  useEffect(() => {
    if (toasts.length === 0) return
    const t = toasts[0]
    const h = setTimeout(() => actions.dismissToast(t.id), t.action ? 9000 : 4000)
    return () => clearTimeout(h)
  }, [toasts, actions])
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span>{t.text}</span>
          {t.action && (
            <Link to={t.action.to} className="font-medium text-blue-300 underline" onClick={() => actions.dismissToast(t.id)}>
              {t.action.label}
            </Link>
          )}
          <button type="button" className="text-gray-400 hover:text-white" onClick={() => actions.dismissToast(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
