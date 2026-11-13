// The editors behind the campaign page's steps (brief v3.2, S2 section 3.2).
// Each one reads and writes the store directly. The draft page shows them inline;
// the Setup summary of a published campaign shows the same components in a drawer.

import { AlertTriangle, Check, Link2, Lock, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { offerLines, priceText, type OfferLine } from '../../lib/campaignText'
import {
  MODULE_CHIP,
  MODULE_NAMES,
  SURFACES,
  campaignModuleWarnings,
  campaignPriceCountdownClashes,
  campaignScope,
  dateChangeConflict,
  dateOverlapMessage,
  fmtDate,
  lockReason,
  offerName,
  offerOf,
  surfaceLock,
  timelineChip,
} from '../../lib/derive'
import { useStore } from '../../store/store'
import type { Campaign, CampaignPrice, OfferKey } from '../../types'
import { AttachExistingDrawer } from '../AttachExistingDrawer'
import { BogoRuleDrawer } from '../BogoRuleDrawer'
import { BumpDrawer } from '../OfferDrawers'
import { SmartCouponForm } from '../SmartCouponForm'
import { ProChip, WarnChip } from '../ui/Chip'
import { Drawer } from '../ui/Overlay'
import { ProActionButton } from '../ui/UpgradeCard'

interface EditorProps {
  c: Campaign
  readOnly: boolean
}

// ---------- 1. Name and schedule ----------

/**
 * Name, start and end. A date change that would overlap another campaign sharing an attached offer
 * shows v3.1's message and does not save.
 */
export function ScheduleEditor({ c, readOnly, needStart = false }: EditorProps & { needStart?: boolean }) {
  const { state, actions } = useStore()
  const [error, setError] = useState<string | null>(null)

  const commit = (start: string | null, end: string | null) => {
    const conflict = dateChangeConflict(state, c, start, end)
    if (conflict) {
      setError(dateOverlapMessage(conflict.offer, conflict.other))
      return
    }
    setError(null)
    actions.updateCampaign(c.id, { start, end })
  }

  const startDate = c.start?.slice(0, 10) ?? ''
  const startTime = c.start?.slice(11, 16) ?? ''
  const endDate = c.end?.slice(0, 10) ?? ''
  const endTime = c.end?.slice(11, 16) ?? ''
  // In the data model an empty end date means always on, so the box ticks itself once there is a start date.
  const alwaysOn = !!c.start && c.end === null
  const endBeforeStart = !!c.start && !!c.end && c.end < c.start

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cp-name" className="cp-label">
          Campaign name
        </label>
        <input id="cp-name" type="text" className="cp-input max-w-[480px]" placeholder="e.g. Black Friday 2026" value={c.name} disabled={readOnly} onChange={(e) => actions.updateCampaign(c.id, { name: e.target.value })} />
      </div>
      <div className="grid max-w-[640px] grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp-start-date" className="cp-label">
            Starts
          </label>
          <div className="flex gap-2">
            <input
              id="cp-start-date"
              type="date"
              className={`cp-input flex-1 ${needStart && !c.start ? 'cp-input-error' : ''}`}
              value={startDate}
              disabled={readOnly}
              aria-describedby={needStart && !c.start ? 'cp-start-needed' : undefined}
              onChange={(e) => commit(e.target.value ? `${e.target.value}T${startTime || '00:00'}` : null, c.end)}
            />
            <input type="time" aria-label="Start time" className="cp-input w-[118px]" value={startTime} disabled={readOnly || !c.start} onChange={(e) => c.start && commit(`${startDate}T${e.target.value || '00:00'}`, c.end)} />
          </div>
          {needStart && !c.start && (
            <span id="cp-start-needed" className="text-xs text-[#B42318]">
              Needed to publish
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp-end-date" className="cp-label">
            Ends
          </label>
          <div className="flex gap-2">
            <input
              id="cp-end-date"
              type="date"
              className={`cp-input flex-1 ${endBeforeStart ? 'cp-input-error' : ''}`}
              value={endDate}
              disabled={readOnly}
              onChange={(e) => commit(c.start, e.target.value ? `${e.target.value}T${endTime || '23:59'}` : null)}
            />
            <input type="time" aria-label="End time" className="cp-input w-[118px]" value={endTime} disabled={readOnly || !c.end} onChange={(e) => c.end && commit(c.start, `${endDate}T${e.target.value || '23:59'}`)} />
          </div>
          {endBeforeStart && <span className="text-xs text-[#B42318]">End date is before start date</span>}
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" className="m-0 h-4 w-4" checked={alwaysOn} disabled={readOnly || !c.start} onChange={(e) => commit(c.start, e.target.checked ? null : `${(c.start ?? state.now).slice(0, 10)}T23:59`)} />
            No end date (always on)
          </label>
        </div>
      </div>
      {error && (
        <div className="cp-warn max-w-[640px]" style={{ background: '#FEF3F2', color: '#B42318' }} role="alert">
          <AlertTriangle size={18} className="shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <p className="cp-muted m-0 text-[13px]">
        Times use your site timezone, {state.settings.siteTimezone}.{' '}
        <Link to="/settings" className="text-[#1D4ED8] underline hover:text-[#1E3A8A]">
          Change in Settings
        </Link>
      </p>
    </div>
  )
}

// ---------- 2. Offers ----------

type OfferDrawer =
  | { kind: 'none' }
  | { kind: 'attach' }
  | { kind: 'coupon'; couponId: string | null; version: boolean; customise?: boolean }
  | { kind: 'bogo'; ruleId: string | null; version: boolean; customise?: boolean }
  | { kind: 'bump'; id: string | null; version: boolean; customise?: boolean }

/** v3.1's timeline chip as a line that can wrap. Hover lists every window. */
function TimelineLine({ k }: { k: OfferKey }) {
  const { state } = useStore()
  const chip = timelineChip(state, k)
  if (!chip) return null
  return (
    <span className="cp-timeline" title={chip.title}>
      {chip.text}
    </span>
  )
}

const same = (a: OfferKey | null, b: OfferKey) => !!a && a.moduleId === b.moduleId && a.offerId === b.offerId

/**
 * Offer rows with their tags and timeline lines, plus the two ways to add one.
 * `confirmRemove` can be owned by the parent so a checklist fix can open the confirm on a row.
 */
export function OffersEditor({ c, readOnly, confirmRemove, setConfirmRemove }: EditorProps & { confirmRemove?: OfferKey | null; setConfirmRemove?: (k: OfferKey | null) => void }) {
  const { state, actions } = useStore()
  const [drawer, setDrawer] = useState<OfferDrawer>({ kind: 'none' })
  const [menu, setMenu] = useState<'none' | 'main' | 'create'>('none')
  const [ownConfirm, setOwnConfirm] = useState<OfferKey | null>(null)
  const confirming = confirmRemove === undefined ? ownConfirm : confirmRemove
  const setConfirming = setConfirmRemove ?? setOwnConfirm
  const menuRef = useRef<HTMLDivElement>(null)
  const lines = offerLines(state, c)
  const warnings = campaignModuleWarnings(state, c)
  const name = c.name.trim() || 'this campaign'

  useEffect(() => {
    if (menu === 'none') return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu('none')
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menu])

  const open = (o: OfferLine, customise = false) => {
    const version = o.attached
    if (o.key.moduleId === 'smart-coupons') setDrawer({ kind: 'coupon', couponId: o.key.offerId, version, customise })
    if (o.key.moduleId === 'bogo') setDrawer({ kind: 'bogo', ruleId: o.key.offerId, version, customise })
    if (o.key.moduleId === 'order-bump') setDrawer({ kind: 'bump', id: o.key.offerId, version, customise })
  }

  /** Attached: only the campaign version goes. Made for this campaign: ask "Delete it" or "Keep as everyday offer". */
  const remove = (o: OfferLine) => {
    if (!o.attached) {
      setConfirming(o.key)
      return
    }
    const base = offerOf(state, o.key)
    actions.removeOffer(c.id, o.key)
    actions.toast(`Removed ${base ? offerName(base) : 'the offer'} from ${name}. Its everyday version is untouched.`)
  }

  const createMenu = (
    <>
      <button type="button" role="menuitem" disabled={!!lockReason(state, { moduleId: 'smart-coupons' })} onClick={() => { setMenu('none'); setDrawer({ kind: 'coupon', couponId: null, version: false }) }}>
        Smart Coupon
      </button>
      <button type="button" role="menuitem" disabled={!!lockReason(state, { moduleId: 'bogo' })} onClick={() => { setMenu('none'); setDrawer({ kind: 'bogo', ruleId: null, version: false }) }}>
        BOGO rule
      </button>
      <button type="button" role="menuitem" disabled={!!lockReason(state, { moduleId: 'order-bump' })} onClick={() => { setMenu('none'); setDrawer({ kind: 'bump', id: null, version: false }) }}>
        Order Bump
      </button>
    </>
  )

  return (
    <div className="flex flex-col gap-4">
      {lines.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button" className="cp-choice" data-first-field disabled={readOnly} onClick={() => setDrawer({ kind: 'attach' })}>
            <span className="flex items-center gap-2 text-[15px] font-semibold text-[#1D4ED8]">
              <Link2 size={18} aria-hidden /> Attach an existing offer
            </span>
            <span className="cp-muted text-[13px] leading-[1.45]">Use a deal you already have. It keeps running as normal until this campaign starts, and comes back after.</span>
          </button>
          <div className="relative" ref={menu === 'create' ? menuRef : undefined}>
            <button type="button" className="cp-choice h-full w-full" disabled={readOnly} aria-haspopup="menu" aria-expanded={menu === 'create'} onClick={() => setMenu((m) => (m === 'create' ? 'none' : 'create'))}>
              <span className="flex items-center gap-2 text-[15px] font-semibold text-[#1D4ED8]">
                <Plus size={18} aria-hidden /> Create a new offer
              </span>
              <span className="cp-muted text-[13px] leading-[1.45]">Make a deal just for this campaign. It only runs while the campaign runs.</span>
            </button>
            {menu === 'create' && (
              <div className="cp-menu" style={{ left: 0, right: 'auto' }} role="menu" aria-label="Create a new offer">
                {createMenu}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col rounded-[10px] border border-[#E2E4E9]">
            {lines.map((o, i) => {
              const w = warnings.find((x) => x.kind === 'offer' && x.id === o.key.offerId)
              return (
                <div key={`${o.key.moduleId}:${o.key.offerId}`} className={`flex flex-wrap items-start justify-between gap-3 p-4 ${i > 0 ? 'border-t border-[#E2E4E9]' : ''}`}>
                  <div className="flex min-w-0 flex-1 basis-[320px] flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {w && <Lock size={14} className="text-[#50575E]" aria-hidden />}
                      <span className="cp-module">{o.view.chip}</span>
                      <span className="text-[15px] font-semibold">{o.name}</span>
                      <span className={`cp-pill ${o.attached ? '' : 'cp-pill-own'}`}>{!o.attached ? 'Made for this campaign' : o.customised ? 'Attached · Customised' : 'Attached · Used as is'}</span>
                    </div>
                    {o.customised ? (
                      <span className="cp-muted text-[13px]">
                        Everyday: {o.everydayShort} · <strong className="text-[#1D2327]">During this campaign: {o.campaignShort !== o.everydayShort ? o.campaignShort : 'customised settings'}</strong>
                      </span>
                    ) : (
                      o.details && <span className="cp-muted text-[13px]">{o.details}</span>
                    )}
                    {o.attached && <TimelineLine k={o.key} />}
                    {w && (
                      <span>
                        <WarnChip text={w.since ? `Module off since ${fmtDate(w.since)}` : 'Module off'} />
                      </span>
                    )}
                    {same(confirming, o.key) && (
                      <div className="cp-warn mt-1 flex-col" role="alertdialog" aria-label="Remove offer made for this campaign">
                        <span>
                          Remove {o.name} from {name}?
                        </span>
                        <span className="flex flex-wrap gap-2">
                          <button type="button" className="cp-btn cp-btn-36 cp-btn-danger" onClick={() => { actions.removeOffer(c.id, o.key, false); setConfirming(null) }}>
                            Delete it
                          </button>
                          <button type="button" className="cp-btn cp-btn-36" onClick={() => { actions.removeOffer(c.id, o.key, true); setConfirming(null); actions.toast(`${o.name} is now an everyday offer, Inactive until dates are set.`) }}>
                            Keep as everyday offer
                          </button>
                          <button type="button" className="cp-btn cp-btn-36" onClick={() => setConfirming(null)}>
                            Cancel
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {w ? (
                      <button type="button" className="cp-btn cp-btn-36" onClick={() => actions.setModuleActive(w.moduleId, true)}>
                        Enable {MODULE_NAMES[w.moduleId]}
                      </button>
                    ) : o.attached && !o.customised ? (
                      <button type="button" className="cp-btn cp-btn-36" disabled={readOnly} onClick={() => open(o, true)}>
                        Customise
                      </button>
                    ) : (
                      <button type="button" className="cp-btn cp-btn-36" disabled={readOnly} onClick={() => open(o)}>
                        Edit
                      </button>
                    )}
                    <button type="button" className="cp-btn cp-btn-36" disabled={readOnly} onClick={() => remove(o)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="relative self-start" ref={menuRef}>
            <button type="button" className="cp-btn cp-btn-40 cp-btn-outline" data-first-field disabled={readOnly} aria-haspopup="menu" aria-expanded={menu !== 'none'} onClick={() => setMenu((m) => (m === 'none' ? 'main' : 'none'))}>
              <Plus size={16} aria-hidden /> Add offer
            </button>
            {menu === 'main' && (
              <div className="cp-menu" style={{ left: 0, right: 'auto', minWidth: 280 }} role="menu" aria-label="Add offer">
                <button type="button" role="menuitem" onClick={() => { setMenu('none'); setDrawer({ kind: 'attach' }) }}>
                  Attach an existing offer
                  <span className="cp-muted block text-xs">Then Use as is, or Customise for this campaign</span>
                </button>
                <button type="button" role="menuitem" onClick={() => setMenu('create')}>
                  Create a new offer
                  <span className="cp-muted block text-xs">Made for this campaign only</span>
                </button>
              </div>
            )}
            {menu === 'create' && (
              <div className="cp-menu" style={{ left: 0, right: 'auto' }} role="menu" aria-label="Create a new offer">
                {createMenu}
                <button type="button" role="menuitem" className="cp-muted" onClick={() => setMenu('main')}>
                  Back
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <AttachExistingDrawer
        open={drawer.kind === 'attach'}
        onClose={() => setDrawer({ kind: 'none' })}
        campaign={c}
        onCustomise={(ref) => {
          if (ref.moduleId === 'smart-coupons') setDrawer({ kind: 'coupon', couponId: ref.offerId, version: true, customise: true })
          if (ref.moduleId === 'bogo') setDrawer({ kind: 'bogo', ruleId: ref.offerId, version: true, customise: true })
          if (ref.moduleId === 'order-bump') setDrawer({ kind: 'bump', id: ref.offerId, version: true, customise: true })
        }}
      />
      <Drawer open={drawer.kind === 'coupon'} onClose={() => setDrawer({ kind: 'none' })} title={drawer.kind === 'coupon' && drawer.couponId ? (drawer.version ? `${name} version` : 'Edit coupon made for this campaign') : 'New coupon for this campaign'} width={1040}>
        {drawer.kind === 'coupon' && (
          <SmartCouponForm
            key={`${drawer.couponId ?? 'new'}-${drawer.version}`}
            couponId={drawer.couponId}
            versionCampaignId={drawer.version ? c.id : null}
            campaignOnlyOf={drawer.couponId ? null : c.id}
            startCustomising={!!drawer.customise}
            inDrawer
            onDone={(saved, coupon) => {
              setDrawer({ kind: 'none' })
              if (saved && coupon) actions.toast(drawer.version ? `Saved the ${name} version of ${coupon.title}.` : `Saved ${coupon.title} inside ${name}.`)
            }}
          />
        )}
      </Drawer>
      <BogoRuleDrawer
        open={drawer.kind === 'bogo'}
        ruleId={drawer.kind === 'bogo' ? drawer.ruleId : null}
        versionCampaignId={drawer.kind === 'bogo' && drawer.version ? c.id : null}
        campaignOnlyOf={drawer.kind === 'bogo' && !drawer.ruleId ? c.id : null}
        startCustomising={drawer.kind === 'bogo' && !!drawer.customise}
        onClose={() => setDrawer({ kind: 'none' })}
      />
      <BumpDrawer
        open={drawer.kind === 'bump'}
        bumpId={drawer.kind === 'bump' ? drawer.id : null}
        versionCampaignId={drawer.kind === 'bump' && drawer.version ? c.id : null}
        campaignOnlyOf={drawer.kind === 'bump' && !drawer.id ? c.id : null}
        startCustomising={drawer.kind === 'bump' && !!drawer.customise}
        onClose={() => setDrawer({ kind: 'none' })}
      />
    </div>
  )
}

// ---------- 3. Campaign price ----------

function ChipToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="rounded-full border px-3 py-1.5 text-[13px]" style={on ? { borderColor: '#1D4ED8', background: '#EFF6FF', color: '#1E3A8A' } : { borderColor: '#C3C4C7', background: '#fff', color: '#1D2327' }}>
      {on && <Check size={12} className="mr-1 inline" aria-hidden />}
      {children}
    </button>
  )
}

/** "% off these products" through the Countdown module. Empty: a button that opens an inline form. */
export function PriceEditor({ c, readOnly, startOpen = false }: EditorProps & { startOpen?: boolean }) {
  const { state, actions } = useStore()
  const price = c.campaignPrice
  const blank: CampaignPrice = { percent: 15, categories: [], products: [] }
  const [editing, setEditing] = useState(startOpen)
  const [draft, setDraft] = useState<CampaignPrice>(price ? { ...price } : blank)
  const lock = lockReason(state, { moduleId: 'countdown' })
  const since = state.moduleOffSince.countdown
  const clashes = campaignPriceCountdownClashes(state, price)

  const startEdit = () => {
    setDraft(price ? { ...price } : blank)
    setEditing(true)
  }
  const toggle = (kind: 'categories' | 'products', v: string) => setDraft((d) => ({ ...d, [kind]: d[kind].includes(v) ? d[kind].filter((x) => x !== v) : [...d[kind], v] }))

  if (lock === 'moduleOff') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Lock size={16} className="mt-0.5 shrink-0 text-[#50575E]" aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="cp-muted text-sm font-semibold">{price ? priceText(state, price) : 'No campaign price'}</span>
            <span className="cp-muted text-[13px]">The Countdown module is off. Turn it on to use it here.</span>
            {price && (
              <span>
                <WarnChip text={since ? `Module off since ${fmtDate(since)}` : 'Module off'} />
              </span>
            )}
          </div>
        </div>
        <button type="button" className="cp-btn cp-btn-36" onClick={() => actions.setModuleActive('countdown', true)}>
          Enable Countdown
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-4 rounded-[10px] border border-[#E2E4E9] p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cp-price-percent" className="cp-label">
            Percent off
          </label>
          <div className="flex items-center gap-2">
            <input id="cp-price-percent" type="number" min={1} max={99} className="cp-input w-24" data-first-field value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) })} />
            <span className="cp-muted text-sm">%</span>
          </div>
        </div>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="cp-label mb-1.5 p-0">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {state.categories.map((cat) => (
              <ChipToggle key={cat} on={draft.categories.includes(cat)} onClick={() => toggle('categories', cat)}>
                {cat}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="cp-label mb-1.5 p-0">Products</legend>
          <div className="flex flex-wrap gap-2">
            {state.products
              .filter((p) => !p.vendor)
              .map((p) => (
                <ChipToggle key={p.id} on={draft.products.includes(p.id)} onClick={() => toggle('products', p.id)}>
                  {p.name}
                </ChipToggle>
              ))}
          </div>
        </fieldset>
        <p className="cp-muted m-0 text-[13px]">Products' own Countdown settings are kept and return after the campaign.</p>
        <div className="flex gap-2">
          <button type="button" className="cp-btn cp-btn-40 cp-btn-solid" disabled={draft.percent < 1 || draft.percent > 99 || (draft.categories.length === 0 && draft.products.length === 0)} onClick={() => { actions.setCampaignPrice(c.id, draft); setEditing(false) }}>
            Save
          </button>
          <button type="button" className="cp-btn cp-btn-40" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (!price) {
    return (
      <div>
        <button type="button" className="cp-btn cp-btn-40 cp-btn-outline" data-first-field disabled={readOnly} onClick={startEdit}>
          <Plus size={16} aria-hidden /> Add campaign price
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#E2E4E9] p-4">
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{priceText(state, price)}</span>
        {clashes.map((p) => (
          <span key={p.id} className="text-[13px] text-[#92400E]">
            {p.name}'s own {p.ownCountdown!.percent}% Countdown pauses while this runs, then comes back.
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" className="cp-btn cp-btn-36" data-first-field disabled={readOnly} onClick={startEdit}>
          Edit
        </button>
        <button type="button" className="cp-btn cp-btn-36" disabled={readOnly} onClick={() => actions.setCampaignPrice(c.id, null)}>
          Remove
        </button>
      </div>
    </div>
  )
}

// ---------- 4. Products ----------

function SearchPick({ id, label, placeholder, options, selected, disabled, onToggle, first }: { id: string; label: string; placeholder: string; options: { value: string; label: string }[]; selected: string[]; disabled: boolean; onToggle: (v: string) => void; first?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const matches = options.filter((o) => !selected.includes(o.value) && o.label.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="cp-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          autoComplete="off"
          className="cp-input w-full"
          placeholder={placeholder}
          value={q}
          disabled={disabled}
          data-first-field={first ? '' : undefined}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && matches[0]) { onToggle(matches[0].value); setQ('') }
          }}
        />
        {open && (
          <div id={`${id}-list`} role="listbox" className="cp-menu" style={{ left: 0, right: 0, marginTop: 4 }}>
            {matches.length === 0 && <div className="cp-muted px-3 py-2 text-[13px]">{options.length === selected.length ? 'All picked' : 'No matches'}</div>}
            {matches.map((o) => (
              <button key={o.value} type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => { onToggle(o.value); setQ('') }}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full border border-[#C3C4C7] py-1 pl-3 pr-1.5 text-[13px]">
              {options.find((o) => o.value === v)?.label ?? v}
              <button type="button" aria-label={`Remove ${options.find((o) => o.value === v)?.label ?? v}`} disabled={disabled} className="flex h-5 w-5 items-center justify-center rounded-full text-[#50575E] hover:bg-[#F0F0F1]" onClick={() => onToggle(v)}>
                <X size={12} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Read-only chips when anything is attached; category and product search when nothing is. */
export function ProductsEditor({ c, readOnly }: EditorProps) {
  const { state, actions } = useStore()
  const scope = campaignScope(state, c)
  if (scope.derived) {
    const everything = state.categories.length > 0 && state.categories.every((cat) => scope.categories.includes(cat))
    return (
      <div className="flex flex-wrap gap-2">
        {everything ? (
          <span className="rounded-full border border-[#C3C4C7] px-3 py-1.5 text-[13px]">Entire store</span>
        ) : (
          <>
            {scope.categories.map((cat) => (
              <span key={cat} className="rounded-full border border-[#C3C4C7] px-3 py-1.5 text-[13px]">
                {cat} <span className="cp-muted">· category</span>
              </span>
            ))}
            {scope.products.map((pid) => (
              <span key={pid} className="rounded-full border border-[#C3C4C7] px-3 py-1.5 text-[13px]">
                {state.products.find((p) => p.id === pid)?.name ?? pid}
              </span>
            ))}
          </>
        )}
        {scope.categories.length === 0 && scope.products.length === 0 && <span className="cp-muted text-sm">No products yet</span>}
      </div>
    )
  }
  const flip = (kind: 'categories' | 'products', v: string) => {
    const cur = c.productScope[kind]
    actions.updateCampaign(c.id, { productScope: { ...c.productScope, mode: 'manual', [kind]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } })
  }
  return (
    <div className="grid max-w-[640px] grid-cols-1 gap-4 sm:grid-cols-2">
      <SearchPick id="cp-cats" first label="Categories" placeholder="Search categories" options={state.categories.map((x) => ({ value: x, label: x }))} selected={c.productScope.categories} disabled={readOnly} onToggle={(v) => flip('categories', v)} />
      <SearchPick id="cp-prods" label="Products" placeholder="Search products" options={state.products.map((p) => ({ value: p.id, label: p.name }))} selected={c.productScope.products} disabled={readOnly} onToggle={(v) => flip('products', v)} />
    </div>
  )
}

// ---------- 5. Show it on your store ----------

/** One row per store display with a switch, then the "Not available" rows. Locks follow lockReason. */
export function DisplaysEditor({ c, readOnly }: EditorProps) {
  const { state, actions } = useStore()
  const rows = SURFACES.map((s) => ({ s, lock: surfaceLock(state, s), enabled: !!c.surfaces[s.id]?.enabled, since: s.moduleId ? state.moduleOffSince[s.moduleId] : undefined }))
  const available = rows.filter((r) => r.lock === null)
  const locked = rows.filter((r) => r.lock !== null)
  return (
    <div className="flex flex-col">
      {available.map(({ s, enabled }, i) => (
        <div key={s.id} className={`flex items-center justify-between gap-4 py-3 ${i < available.length - 1 ? 'border-b border-[#F0F0F1]' : ''}`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{s.label}</span>
            <span className="cp-muted text-[13px]">{s.desc}</span>
          </div>
          <button type="button" className="cp-switch" aria-pressed={enabled} aria-label={s.label} data-first-field={i === 0 ? '' : undefined} disabled={readOnly} onClick={() => actions.setSurface(c.id, s.id, !enabled)}>
            <span />
          </button>
        </div>
      ))}
      {locked.length > 0 && (
        <>
          <div className="mb-1 mt-2 flex items-center gap-3">
            <span className="cp-eyebrow">Not available</span>
            <span className="h-px flex-1 bg-[#E2E4E9]" />
          </div>
          {locked.map(({ s, lock, enabled, since }) => {
            const moduleName = s.moduleId ? MODULE_CHIP[s.moduleId] : ''
            return (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="flex items-start gap-2.5">
                  <Lock size={16} className="mt-0.5 shrink-0 text-[#50575E]" aria-hidden />
                  <div className="flex flex-col gap-0.5">
                    <span className="cp-muted flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {s.label}
                      {lock === 'pro' && <ProChip />}
                      {enabled && lock === 'moduleOff' && <WarnChip text={since ? `Module off since ${fmtDate(since)}` : 'Module off'} />}
                    </span>
                    <span className="cp-muted text-[13px]">{lock === 'moduleOff' ? `The ${moduleName} module is off. Turn it on to use it here.` : `${s.label} is a Pro feature.`}</span>
                  </div>
                </div>
                {lock === 'moduleOff' && s.moduleId ? (
                  <button type="button" className="cp-btn cp-btn-36" onClick={() => actions.setModuleActive(s.moduleId!, true)}>
                    Enable {moduleName}
                  </button>
                ) : (
                  <ProActionButton />
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
