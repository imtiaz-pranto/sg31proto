import { useEffect, useState } from 'react'
import { campaignById, newId, refIn, withOverride } from '../lib/derive'
import { useStore } from '../store/store'
import type { BumpEditable, OrderBump } from '../types'
import { Field } from './ui/Field'
import { Drawer } from './ui/Overlay'
import { VersionHeader } from './ui/VersionHeader'

export function blankBump(campaignOnlyOf: string | null = null, now = ''): OrderBump {
  return { id: newId('ob'), origin: campaignOnlyOf ? 'campaignOnly' : 'everyday', campaignOnlyOf, createdAt: now, name: '', targets: { categories: [], products: [] }, offerProductId: 'p-gloves', discountPercent: 20, status: 'active' }
}

interface Props {
  open: boolean
  bumpId: string | null
  /** Edit the campaign version of an attached bump. */
  versionCampaignId?: string | null
  /** Create a campaign-only bump inside this campaign. */
  campaignOnlyOf?: string | null
  /** Open straight into editing the campaign version (after "Customise for this campaign" in the attach drawer). */
  startCustomising?: boolean
  onClose: (saved?: OrderBump) => void
}

/** Order Bump form in a drawer. Edits the everyday version, a campaign version, or creates a campaign-only bump. */
export function BumpDrawer({ open, bumpId, versionCampaignId = null, campaignOnlyOf = null, startCustomising = false, onClose }: Props) {
  const { state, actions } = useStore()
  const [b, setB] = useState<OrderBump>(blankBump)
  const [customising, setCustomising] = useState(false)
  const src = bumpId ? state.orderBumps.find((x) => x.id === bumpId) : null
  const vc = campaignById(state, versionCampaignId)
  const ref = vc && src ? refIn(vc, { moduleId: 'order-bump', offerId: src.id }) : undefined
  const asIs = !!vc && !!src && (ref?.override ?? null) === null && !customising
  const campaign = campaignById(state, versionCampaignId ?? src?.campaignOnlyOf ?? campaignOnlyOf)

  useEffect(() => {
    if (!open) return
    const existing = bumpId ? state.orderBumps.find((x) => x.id === bumpId) : null
    setB(existing ? { ...withOverride(existing, ref) } : blankBump(campaignOnlyOf, state.now))
    setCustomising(startCustomising)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bumpId, versionCampaignId])

  const offer = state.products.find((p) => p.id === b.offerProductId)
  const toggle = (kind: 'categories' | 'products', v: string) =>
    setB((x) => ({ ...x, targets: { ...x.targets, [kind]: x.targets[kind].includes(v) ? x.targets[kind].filter((y) => y !== v) : [...x.targets[kind], v] } }))

  const save = () => {
    const name = b.name.trim() || `Add ${offer?.name ?? 'product'}, ${b.discountPercent}% off`
    const final = { ...b, name }
    if (versionCampaignId && src) {
      const override: Partial<BumpEditable> = {}
      if (name !== src.name) override.name = name
      if (JSON.stringify(final.targets) !== JSON.stringify(src.targets)) override.targets = final.targets
      if (final.offerProductId !== src.offerProductId) override.offerProductId = final.offerProductId
      if (final.discountPercent !== src.discountPercent) override.discountPercent = final.discountPercent
      actions.saveCampaignVersion(versionCampaignId, { moduleId: 'order-bump', offerId: src.id }, Object.keys(override).length ? override : null)
    } else {
      actions.saveBump(final)
    }
    onClose(final)
  }

  return (
    <Drawer
      open={open}
      onClose={() => onClose()}
      title={bumpId ? 'Edit order bump' : 'New order bump'}
      footer={
        asIs ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
              Close
            </button>
            <button type="button" className="btn btn-blue" onClick={() => setCustomising(true)}>
              Customise for this campaign
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => onClose()}>
              Discard
            </button>
            <button type="button" className="btn btn-blue" onClick={save}>
              Save {versionCampaignId ? 'campaign version' : 'bump'}
            </button>
          </>
        )
      }
    >
      <VersionHeader versionCampaignId={versionCampaignId} campaignOnlyOf={b.campaignOnlyOf} />
      {asIs ? (
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-gray-600">{campaign?.name} uses this bump as is. The everyday version applies during the campaign window.</div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="font-medium">{b.name}</div>
            <div className="text-xs text-gray-500">
              {offer?.name} at {b.discountPercent}% off
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="text-xs text-gray-500">This bump comes from the Upsell Order Bump module. Its discount applies only to the bump line.</div>
          <Field label="Name" htmlFor="ob-name">
            <input id="ob-name" className="input" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="Add Leather Gloves, 25% off" />
          </Field>
          <Field label="Offer product" htmlFor="ob-product">
            <select id="ob-product" className="input" value={b.offerProductId} onChange={(e) => setB({ ...b, offerProductId: e.target.value })}>
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Percent off the bump product" htmlFor="ob-percent">
            <input id="ob-percent" type="number" min={0} max={100} className="input" value={b.discountPercent} onChange={(e) => setB({ ...b, discountPercent: Number(e.target.value) })} />
          </Field>
          {!versionCampaignId && b.origin === 'everyday' && (
            <fieldset className="flex items-center gap-4 text-sm">
              <legend className="mb-1 text-sm font-medium text-gray-800">Everyday status</legend>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="bump-status" checked={b.status === 'active'} onChange={() => setB({ ...b, status: 'active' })} /> On
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="bump-status" checked={b.status === 'off'} onChange={() => setB({ ...b, status: 'off' })} /> Off
              </label>
            </fieldset>
          )}
          <div>
            <div className="mb-1 text-sm font-medium text-gray-800">Show with</div>
            <div className="mb-1 text-xs text-gray-500">Categories</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {state.categories.map((cat) => {
                const on = b.targets.categories.includes(cat)
                return (
                  <button key={cat} type="button" aria-pressed={on} onClick={() => toggle('categories', cat)} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                    {cat}
                  </button>
                )
              })}
            </div>
            <div className="mb-1 text-xs text-gray-500">Products</div>
            <div className="flex flex-wrap gap-1.5">
              {state.products.map((p) => {
                const on = b.targets.products.includes(p.id)
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle('products', p.id)} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                    {p.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}
