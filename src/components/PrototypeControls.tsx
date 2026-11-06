import { Clock, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmtDateTime, isSeedTime } from '../lib/derive'
import { useStore } from '../store/store'
import type { Licence, ModuleId } from '../types'
import { Toggle } from './ui/Toggle'

const CONTROL_MODULES: ModuleId[] = ['smart-coupons', 'bogo', 'cart-rewards', 'countdown', 'floating-bar', 'stock-bar', 'sales-pop', 'fly-cart', 'order-bump']

const LICENCES: { id: Licence; label: string }[] = [
  { id: 'free', label: 'Free' },
  { id: 'pro', label: 'Pro' },
  { id: 'proExpired', label: 'Pro (expired)' },
]

/** Reviewer panel (brief section 9). Every change re-renders the current screen. */
export function PrototypeControls() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [timeInput, setTimeInput] = useState(state.now)
  useEffect(() => setTimeInput(state.now), [state.now])
  const go = (to: string) => {
    nav(to)
    setOpen(false)
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800"
        aria-expanded={open}
      >
        <SlidersHorizontal size={16} /> Prototype
      </button>
      {open && (
        <div className="fixed bottom-16 right-5 z-50 max-h-[85vh] w-80 overflow-y-auto rounded-xl border bg-white p-4 shadow-2xl" style={{ borderColor: '#e5e7eb' }} role="dialog" aria-label="Prototype controls">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Prototype controls</div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Close controls">
              <X size={14} />
            </button>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Licence</div>
            <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: '#e5e7eb' }} role="radiogroup" aria-label="Licence">
              {LICENCES.map((l) => (
                <button key={l.id} type="button" role="radio" aria-checked={state.licence === l.id} onClick={() => actions.setLicence(l.id)} className={`rounded-md px-2.5 py-1 text-sm ${state.licence === l.id ? 'bg-gray-900 text-white' : 'text-gray-700'}`}>
                  {l.label}
                </button>
              ))}
            </div>
            <label className="mt-2 block text-xs text-gray-600">
              Licence expiry date
              <input type="date" className="input mt-1" value={state.licenceExpiresAt.slice(0, 10)} onChange={(e) => e.target.value && actions.setLicenceExpiry(`${e.target.value}T00:00`)} />
            </label>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Prototype time</div>
            <div className="text-[11px] text-gray-500">Site timezone: {state.settings.siteTimezone}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <input type="datetime-local" className="input" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} aria-label="Prototype time" />
              <button type="button" className="btn btn-blue btn-sm" onClick={() => timeInput && actions.setNow(timeInput)}>
                Set
              </button>
            </div>
            <button type="button" className="btn btn-ghost btn-sm mt-1.5 w-full justify-center" onClick={() => actions.resetTime()}>
              Reset time
            </button>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Modules</div>
            <div className="flex flex-col gap-1.5">
              {CONTROL_MODULES.map((id) => {
                const m = state.modules.find((x) => x.id === id)!
                return (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{m.name}</span>
                    <Toggle checked={m.active} onChange={(v) => actions.setModuleActive(id, v)} label={m.name} />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('/campaigns')}>
                S1 Campaigns
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('/campaigns/cmp-bf2026')}>
                S2 Black Friday
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('/modules/smart-coupons/new')}>
                S5 New coupon
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => go('/storefront?campaign=cmp-boots')}>
                S8 Storefront
              </button>
            </div>
          </div>

          <button type="button" className="btn btn-grey btn-sm w-full justify-center" onClick={() => actions.resetSeed()}>
            Reset seed
          </button>
          <div className="mt-1 text-center text-[11px] text-gray-500">Also resets the time and clears sessionStorage.</div>
        </div>
      )}
    </>
  )
}

/** "Prototype time: [date, time]", grey at the seed time, amber when moved. */
export function TimePill() {
  const { state } = useStore()
  const moved = !isSeedTime(state)
  return (
    <span className="chip" style={moved ? { background: '#fef3c7', color: '#92400e' } : { background: '#f3f4f6', color: '#374151' }} role="status">
      <Clock size={12} /> Prototype time: {fmtDateTime(state.now)}
    </span>
  )
}
