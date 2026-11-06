import { useEffect, useState } from 'react'
import { bogoOnlyWithCoupon, campaignById, newId, refIn, withOverride } from '../lib/derive'
import { useStore } from '../store/store'
import type { BogoEditable, BogoRule } from '../types'
import { Field } from './ui/Field'
import { Drawer } from './ui/Overlay'
import { VersionHeader } from './ui/VersionHeader'

interface Props {
  open: boolean
  ruleId: string | null
  versionCampaignId?: string | null
  campaignOnlyOf?: string | null
  /** Open straight into editing the campaign version (after "Customise for this campaign" in the attach drawer). */
  startCustomising?: boolean
  onClose: (saved?: BogoRule) => void
}

function blankRule(campaignOnlyOf: string | null = null, now = ''): BogoRule {
  return { id: newId('r'), origin: campaignOnlyOf ? 'campaignOnly' : 'everyday', campaignOnlyOf, createdAt: now, name: '', level: 'storeWide', owner: 'admin', vendorName: null, buyQty: 2, buyScope: 'Boots', getQty: 1, getScope: 'Boots', getDiscount: 'free', getPercent: 100, status: 'active', usedByCouponId: null }
}

/** S6 rule form, in a drawer. Edits the everyday version, a campaign version, or creates a campaign-only rule. */
export function BogoRuleDrawer({ open, ruleId, versionCampaignId = null, campaignOnlyOf = null, startCustomising = false, onClose }: Props) {
  const { state, actions } = useStore()
  const [rule, setRule] = useState<BogoRule>(blankRule)
  const [customising, setCustomising] = useState(false)
  const src = ruleId ? state.bogoRules.find((r) => r.id === ruleId) : null
  const vc = campaignById(state, versionCampaignId)
  const ref = vc && src ? refIn(vc, { moduleId: 'bogo', offerId: src.id }) : undefined
  const asIs = !!vc && !!src && (ref?.override ?? null) === null && !customising
  const campaign = campaignById(state, versionCampaignId ?? src?.campaignOnlyOf ?? campaignOnlyOf)

  useEffect(() => {
    if (!open) return
    const existing = ruleId ? state.bogoRules.find((r) => r.id === ruleId) : null
    setRule(existing ? { ...withOverride(existing, ref) } : blankRule(campaignOnlyOf, state.now))
    setCustomising(startCustomising)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ruleId, versionCampaignId])

  const categoryScopes = state.categories.map((c) => ({ value: c, label: c }))
  const productScopes = state.products.map((p) => ({ value: p.id, label: p.name }))
  const scopes = rule.level === 'storeWide' ? categoryScopes : productScopes
  const set = (patch: Partial<BogoRule>) => setRule((r) => ({ ...r, ...patch }))
  const usedBy = rule.usedByCouponId ? state.coupons.find((c) => c.id === rule.usedByCouponId) : null
  const onlyWith = bogoOnlyWithCoupon(state, rule)

  const setLevel = (level: BogoRule['level']) => {
    const first = level === 'storeWide' ? categoryScopes[0].value : productScopes[0].value
    set({ level, buyScope: first, getScope: first })
  }

  const save = () => {
    const name = rule.name.trim() || `Buy ${rule.buyQty} get ${rule.getQty} ${rule.getDiscount === 'free' ? 'free' : `at ${rule.getPercent}% off`}`
    const final = { ...rule, name }
    if (versionCampaignId && src) {
      const override: Partial<BogoEditable> = {}
      const keys: (keyof BogoEditable)[] = ['buyQty', 'buyScope', 'getQty', 'getScope', 'getDiscount', 'getPercent']
      if (name !== src.name) override.name = name
      for (const k of keys) if (final[k] !== src[k]) (override as Record<string, unknown>)[k] = final[k]
      actions.saveCampaignVersion(versionCampaignId, { moduleId: 'bogo', offerId: src.id }, Object.keys(override).length ? override : null)
    } else {
      actions.saveBogoRule(final)
    }
    onClose(final)
  }

  return (
    <Drawer
      open={open}
      onClose={() => onClose()}
      title={ruleId ? 'Edit BOGO rule' : 'New BOGO rule'}
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
            <button type="button" className="btn btn-blue" onClick={save} disabled={rule.owner === 'vendor'}>
              Save {versionCampaignId ? 'campaign version' : 'rule'}
            </button>
          </>
        )
      }
    >
      <VersionHeader versionCampaignId={versionCampaignId} campaignOnlyOf={rule.campaignOnlyOf} />
      {asIs ? (
        <div className="flex flex-col gap-2 text-sm">
          <div className="text-gray-600">{campaign?.name} uses this rule as is. The everyday version applies during the campaign window.</div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 font-medium">{rule.name}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rule.owner === 'vendor' && <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">Vendor: {rule.vendorName}. Vendor rules are read-only here and can't join campaigns.</div>}
          <Field label="Rule name" htmlFor="bogo-name">
            <input id="bogo-name" className="input" value={rule.name} onChange={(e) => set({ name: e.target.value })} placeholder="Buy 2 boots get 1 free" />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-gray-800">Level</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="level" checked={rule.level === 'storeWide'} onChange={() => setLevel('storeWide')} />
              Store-wide rule <span className="text-xs text-gray-500">(a category)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="level" checked={rule.level === 'product'} onChange={() => setLevel('product')} />
              Product rule <span className="text-xs text-gray-500">(one product)</span>
            </label>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Buy quantity" htmlFor="bogo-buyqty">
              <input id="bogo-buyqty" type="number" min={1} className="input" value={rule.buyQty} onChange={(e) => set({ buyQty: Number(e.target.value) })} />
            </Field>
            <Field label="Buy scope" htmlFor="bogo-buyscope">
              <select id="bogo-buyscope" className="input" value={rule.buyScope} onChange={(e) => set({ buyScope: e.target.value })}>
                {scopes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Get quantity" htmlFor="bogo-getqty">
              <input id="bogo-getqty" type="number" min={1} className="input" value={rule.getQty} onChange={(e) => set({ getQty: Number(e.target.value) })} />
            </Field>
            <Field label="Get scope" htmlFor="bogo-getscope">
              <select id="bogo-getscope" className="input" value={rule.getScope} onChange={(e) => set({ getScope: e.target.value })}>
                {scopes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-gray-800">The "get" items are</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="getDiscount" checked={rule.getDiscount === 'free'} onChange={() => set({ getDiscount: 'free', getPercent: 100 })} />
              Free
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="getDiscount" checked={rule.getDiscount === 'percent'} onChange={() => set({ getDiscount: 'percent', getPercent: rule.getPercent === 100 ? 50 : rule.getPercent })} />
              Percent off
              {rule.getDiscount === 'percent' && <input type="number" min={1} max={99} className="input w-20" value={rule.getPercent} onChange={(e) => set({ getPercent: Number(e.target.value) })} aria-label="Percent off" />}
            </label>
          </fieldset>
          {!versionCampaignId && rule.origin === 'everyday' && (
            <fieldset className="flex flex-wrap items-center gap-4 text-sm">
              <legend className="mb-1 text-sm font-medium text-gray-800">Everyday status</legend>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="rule-status" checked={rule.status === 'active'} onChange={() => set({ status: 'active' })} /> On
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="rule-status" checked={rule.status === 'off'} onChange={() => set({ status: 'off' })} /> Off
              </label>
              <span className="text-xs text-gray-500">A campaign switches the rule on during its window even when this is off.</span>
            </fieldset>
          )}
          {usedBy && (
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Used by coupon: {usedBy.title}. {onlyWith ? 'The rule only applies when shoppers use that coupon.' : 'The coupon applies automatically, so the rule does too.'} The coupon's code, link and limits live in Smart Coupons; the deal math lives here.
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
