import { Lock } from 'lucide-react'
import { useState } from 'react'
import { MODULE_NAMES, OFFER_GROUP_LABEL, OFFER_MODULES, attachConflict, everydayOffers, fmtWindow, lockReason, moduleById, refIn, windowCampaigns } from '../lib/derive'
import { useStore } from '../store/store'
import type { Campaign, OfferKey } from '../types'
import { ModuleChip } from './ui/Chip'
import { Drawer } from './ui/Overlay'

interface Props {
  open: boolean
  onClose: () => void
  campaign: Campaign
  onCustomise: (k: OfferKey) => void
}

/**
 * Attach existing offer (brief S2 rail card 3). Every everyday offer, grouped by module.
 * An offer in another campaign shows "In [campaign], [dates]."; overlapping windows disable Attach.
 */
export function AttachExistingDrawer({ open, onClose, campaign, onCustomise }: Props) {
  const { state, actions } = useStore()
  const [picked, setPicked] = useState<OfferKey | null>(null)
  const offers = everydayOffers(state)
  const available = OFFER_MODULES.filter((m) => lockReason(state, { moduleId: m }) === null)
  const locked = OFFER_MODULES.filter((m) => lockReason(state, { moduleId: m }) !== null)

  const close = () => {
    setPicked(null)
    onClose()
  }
  const useAsIs = () => {
    if (!picked) return
    actions.attachExisting(campaign.id, picked, null)
    close()
  }
  const customise = () => {
    if (!picked) return
    actions.attachExisting(campaign.id, picked, null)
    const k = picked
    setPicked(null)
    onCustomise(k)
  }
  const pickedView = picked ? offers.find((o) => o.ref.moduleId === picked.moduleId && o.ref.offerId === picked.offerId) : null

  return (
    <Drawer open={open} onClose={close} title="Attach existing offer" width={620}>
      <div className="flex flex-col gap-5">
        {pickedView && (
          <div className="rounded-xl border p-3" style={{ borderColor: '#1d4ed8' }}>
            <div className="text-sm font-medium">
              {pickedView.title} <ModuleChip name={pickedView.chip} />
            </div>
            <div className="mb-2 text-xs text-gray-500">{pickedView.detail}</div>
            <div className="mb-2 text-xs text-gray-600">How should {campaign.name} use it?</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-blue btn-sm" onClick={useAsIs}>
                Use as is
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={customise}>
                Customise for this campaign
              </button>
              <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setPicked(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {available.map((m) => {
          const rows = offers.filter((o) => o.moduleId === m)
          return (
            <section key={m}>
              <h3 className="mb-2 text-sm font-semibold">{OFFER_GROUP_LABEL[m]}</h3>
              <div className="flex flex-col divide-y rounded-lg border" style={{ borderColor: '#e5e7eb' }}>
                {rows.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">Nothing here yet.</div>}
                {rows.map((o) => {
                  const key = `${o.moduleId}:${o.ref.offerId}`
                  const here = !!refIn(campaign, o.ref)
                  const elsewhere = windowCampaigns(state, o.ref).filter((c) => c.id !== campaign.id)
                  const conflict = attachConflict(state, o.ref, campaign.id, campaign.start, campaign.end)
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 px-3 py-2" style={{ borderColor: '#e5e7eb' }}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          <span className="truncate">{o.title}</span>
                          <ModuleChip name={o.chip} />
                          {o.levelLabel && <span className="text-xs font-normal text-gray-500">{o.levelLabel}</span>}
                        </div>
                        <div className="text-xs text-gray-500">{o.detail}</div>
                        {elsewhere.map((c) => (
                          <div key={c.id} className="mt-0.5 text-xs" style={{ color: conflict?.id === c.id ? '#991b1b' : '#4b5563' }}>
                            In {c.name}, {fmtWindow(c.start, c.end)}.{conflict?.id === c.id && " Campaign dates can't overlap for the same offer."}
                          </div>
                        ))}
                      </div>
                      {here ? (
                        <span className="shrink-0 text-xs text-gray-500">Attached</span>
                      ) : (
                        <button type="button" className="btn btn-blue btn-sm shrink-0" disabled={!!conflict} onClick={() => setPicked(o.ref)}>
                          Attach
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {locked.length > 0 && (
          <>
            <div className="divider-label">Not available</div>
            {locked.map((m) => (
              <div key={m} className="locked flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2" style={{ borderColor: '#e5e7eb' }}>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Lock size={13} /> {OFFER_GROUP_LABEL[m]}
                  </div>
                  <div className="text-xs">
                    {MODULE_NAMES[m]} is off. Enable it to use it here. {moduleById(state, m).adds}
                  </div>
                </div>
                <button type="button" className="btn btn-grey btn-sm shrink-0" onClick={() => actions.setModuleActive(m, true)}>
                  Enable {MODULE_NAMES[m]}
                </button>
              </div>
            ))}
          </>
        )}

        <div className="border-t pt-3 text-xs text-gray-500" style={{ borderColor: '#e5e7eb' }}>
          Deals created by vendors can't be added to campaigns.
        </div>
      </div>
    </Drawer>
  )
}
