import { Lock } from 'lucide-react'
import { MODULE_NAMES, SURFACES, lockReason } from '../lib/derive'
import { TEMPLATES, useStore } from '../store/store'
import type { TemplateId } from '../types'
import { Modal } from './ui/Overlay'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (id: TemplateId) => void
}

/** S3. Modal from "New campaign". Each card lists its pre-fills and locks when a needed module is off. */
export function TemplatePicker({ open, onClose, onPick }: Props) {
  const { state, actions } = useStore()
  return (
    <Modal open={open} onClose={onClose} title="Choose a template">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const missing = t.needs.filter((m) => lockReason(state, { moduleId: m }) === 'moduleOff')
          const surfaces = t.surfaces.map((s) => SURFACES.find((x) => x.id === s)?.short ?? s)
          return (
            <div key={t.id} className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: '#e5e7eb' }}>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="text-xs text-gray-600">
                <div>
                  <span className="text-gray-500">Offer or price: </span>
                  {t.offerLine}
                </div>
                <div>
                  <span className="text-gray-500">Surfaces: </span>
                  {surfaces.length ? surfaces.join(', ') : 'None'}
                </div>
                {t.note && <div className="mt-1 text-gray-500">{t.note}</div>}
              </div>
              {missing.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
                  {missing.map((m) => (
                    <div key={m} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1">
                        <Lock size={11} /> Needs {MODULE_NAMES[m]}
                      </span>
                      <button type="button" className="btn btn-grey btn-sm" onClick={() => actions.setModuleActive(m, true)}>
                        Enable
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="btn btn-blue btn-sm mt-auto w-fit" onClick={() => onPick(t.id)}>
                Use {t.name}
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
