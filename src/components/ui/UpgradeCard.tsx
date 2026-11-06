import { Lock } from 'lucide-react'
import { useStore } from '../../store/store'

interface Props {
  name: string
  sentence: string
  compact?: boolean
}

/**
 * S9. One reusable inline card with two modes.
 * Upgrade mode on Free: "Upgrade to Pro". Renew mode on an expired licence: "Renew licence".
 * Either button flips the prototype licence to Pro.
 */
export function UpgradeCard({ name, sentence, compact }: Props) {
  const { state, actions } = useStore()
  const renew = state.licence === 'proExpired'
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-dashed bg-gray-50 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`} style={{ borderColor: '#d1d5db' }}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-600">
        <Lock size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800">{name}</div>
        <div className="text-xs text-gray-600">{sentence}</div>
      </div>
      <button type="button" className="btn btn-grey btn-sm" onClick={() => (renew ? actions.renewLicence() : actions.upgradeToPro())}>
        {renew ? 'Renew licence' : 'Upgrade to Pro'}
      </button>
    </div>
  )
}

/** The small button used on locked rows where the full card is too much. Opens S9 by flipping the licence. */
export function ProActionButton() {
  const { state, actions } = useStore()
  const renew = state.licence === 'proExpired'
  return (
    <button type="button" className="btn btn-grey btn-sm" onClick={() => (renew ? actions.renewLicence() : actions.upgradeToPro())}>
      {renew ? 'Renew licence' : 'Upgrade to Pro'}
    </button>
  )
}
