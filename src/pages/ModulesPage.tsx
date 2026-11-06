import { Link } from 'react-router-dom'
import { Toggle } from '../components/ui/Toggle'
import { useStore } from '../store/store'
import type { ModuleId } from '../types'

const LINKS: Partial<Record<ModuleId, string>> = {
  'smart-coupons': '/modules/smart-coupons',
  bogo: '/modules/bogo',
  'order-bump': '/modules/order-bump',
  'cart-rewards': '/modules/cart-rewards',
}

/** Modules grid. Smart Coupons, BOGO, Order Bump and Cart Rewards open their module pages from here. */
export function ModulesPage() {
  const { state, actions } = useStore()
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Modules</h1>
        <p className="text-sm text-gray-600">Turn modules on or off. Campaigns can use any module that is on. No module is Pro-only; Pro limits apply to options inside modules.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.modules.map((m) => {
          const link = LINKS[m.id]
          return (
            <div key={m.id} className="card flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{m.name}</div>
                <Toggle checked={m.active} onChange={(v) => actions.setModuleActive(m.id, v)} label={`${m.name} on or off`} />
              </div>
              <div className="text-xs text-gray-600">{m.adds}</div>
              <div className="mt-auto flex items-center gap-2 pt-1 text-xs">
                <span className="text-gray-500">
                  {m.role === 'offer' && 'Offer source'}
                  {m.role === 'surface' && 'Surface'}
                  {m.role === 'both' && 'Offer source (campaign price) and surface'}
                  {m.role === 'none' && 'Not used by campaigns'}
                </span>
                {link && (
                  <Link to={link} className="ml-auto font-medium text-blue-700 hover:underline">
                    Open
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
