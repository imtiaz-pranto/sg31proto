import { BarChart3, Blocks, LayoutDashboard, Megaphone, Settings } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { expiryNoticeVisible, fmtDate } from '../lib/derive'
import { useStore } from '../store/store'
import { TimePill } from './PrototypeControls'
import { ProChip } from './ui/Chip'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone, end: false },
  { to: '/modules', label: 'Modules', icon: Blocks, end: false },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

/** Admin shell: sidebar on the left, page content on the right. Stacks under 1024px. */
export function Layout() {
  const { state, actions } = useStore()
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b bg-white lg:w-56 lg:border-b-0 lg:border-r" style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white" style={{ background: '#1d4ed8' }}>
            SG
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">StoreGrowth</div>
            <div className="text-[11px] text-gray-500">3.1 · {state.licence === 'pro' ? 'Pro' : state.licence === 'proExpired' ? 'Pro (expired)' : 'Free'}</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:pb-4" aria-label="Main">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-blue-50 font-medium text-blue-800' : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              <n.icon size={16} />
              {n.label}
              {n.label === 'Campaigns' && state.licence !== 'pro' && <ProChip />}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1360px] px-6 py-6">
          <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
            {expiryNoticeVisible(state) && (
              <div className="mr-auto flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 text-sm" style={{ background: '#fef3c7', color: '#92400e' }} role="status">
                <span>Your StoreGrowth Pro licence expires on {fmtDate(state.licenceExpiresAt)}.</span>
                <button type="button" className="font-medium underline" onClick={() => actions.renewLicence()}>
                  Renew licence.
                </button>
              </div>
            )}
            <TimePill />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
