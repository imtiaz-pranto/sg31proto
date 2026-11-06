import { AlertTriangle, Check, ChevronDown, Copy, Info, Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AttachExistingDrawer } from '../components/AttachExistingDrawer'
import { BogoRuleDrawer } from '../components/BogoRuleDrawer'
import { BumpDrawer } from '../components/OfferDrawers'
import { OfferTag, TimelineChip } from '../components/OfferLifecycle'
import { SmartCouponForm } from '../components/SmartCouponForm'
import { TemplatePicker } from '../components/TemplatePicker'
import { DayBars, SurfaceBars } from '../components/ui/Charts'
import { ModuleChip, ProChip, StatusChip, WarnChip } from '../components/ui/Chip'
import { Card } from '../components/ui/Field'
import { Drawer } from '../components/ui/Overlay'
import { Toggle } from '../components/ui/Toggle'
import { ProActionButton, UpgradeCard } from '../components/ui/UpgradeCard'
import {
  MODULE_NAMES,
  READINESS_CHECK_COUNT,
  SURFACES,
  campaignModuleWarnings,
  campaignOffers,
  campaignPriceCountdownClashes,
  campaignScope,
  dateChangeConflict,
  dateOverlapMessage,
  daysBetween,
  effectiveStatus,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPct,
  fmtRange,
  fmtShortDateTime,
  hasAnythingAttached,
  licenceWarning,
  lockReason,
  nowOf,
  offerOf,
  offerName,
  overlapChecks,
  overlapWarningText,
  refIn,
  readinessChecks,
  revenueNote,
  storeDuringLine,
  surfaceLock,
  surfaceOwnerName,
  todayOf,
  type ReadinessCheck,
} from '../lib/derive'
import { useStore } from '../store/store'
import type { Campaign, CampaignPrice, ModuleId, OfferKey } from '../types'

type DrawerState =
  | { kind: 'none' }
  | { kind: 'attach' }
  | { kind: 'coupon'; couponId: string | null; version: boolean; customise?: boolean }
  | { kind: 'bogo'; ruleId: string | null; version: boolean; customise?: boolean }
  | { kind: 'bump'; id: string | null; version: boolean; customise?: boolean }

/** S2. Campaign page: main column by status, right rail with Runs, Products, Offers, Campaign price, Surfaces, Link. */
export function CampaignPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, actions } = useStore()
  const c = state.campaigns.find((x) => x.id === id)
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'none' })
  const [picker, setPicker] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showClashes, setShowClashes] = useState(false)
  const [seeProductsFor, setSeeProductsFor] = useState<string | null>(null)
  const [addMenu, setAddMenu] = useState<'none' | 'main' | 'create'>('none')
  const [editingDates, setEditingDates] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<OfferKey | null>(null)

  if (!c) {
    return (
      <div className="text-sm text-gray-600">
        That campaign no longer exists.{' '}
        <Link to="/campaigns" className="text-blue-700 underline">
          Back to Campaigns
        </Link>
      </div>
    )
  }

  const st = effectiveStatus(state, c)
  const locked = state.licence !== 'pro'
  const expired = state.licence === 'proExpired'
  const readOnly = locked || st === 'ended'
  const checks = st === 'draft' ? readinessChecks(state, c) : []
  const blocking = checks.filter((x) => x.kind === 'blocking')
  const offers = campaignOffers(state, c)
  const scope = campaignScope(state, c)
  const warnings = campaignModuleWarnings(state, c)
  const overlaps = overlapChecks(state, c)
  const days = state.settings.attributionWindowDays

  const runFix = (f: ReadinessCheck['fixes'][number]) => {
    switch (f.action) {
      case 'editDates':
        setEditingDates(true)
        break
      case 'onSale':
        actions.setOnSaleDecision(c.id, f.arg as 'exclude' | 'stack')
        break
      case 'seeProducts':
        setSeeProductsFor((v) => (v === f.arg ? null : (f.arg ?? null)))
        break
      case 'removeOffer': {
        const [moduleId, offerId] = (f.arg ?? '').split(':') as [OfferKey['moduleId'], string]
        removeOffer({ moduleId, offerId })
        break
      }
      case 'renewLicence':
        actions.renewLicence()
        break
      case 'keepBoth':
        actions.keepBothBogo(c.id)
        break
      case 'reviewProducts':
        setShowClashes((v) => !v)
        break
      case 'countdownOk':
        actions.acceptCountdownClash(c.id)
        break
      case 'attachOffer':
        setAddMenu('main')
        break
      case 'enableModule':
        actions.setModuleActive(f.arg as ModuleId, true)
        break
    }
  }

  const editOffer = (ref: OfferKey) => {
    const version = refIn(c, ref)?.mode === 'attached'
    if (ref.moduleId === 'smart-coupons') setDrawer({ kind: 'coupon', couponId: ref.offerId, version })
    if (ref.moduleId === 'bogo') setDrawer({ kind: 'bogo', ruleId: ref.offerId, version })
    if (ref.moduleId === 'order-bump') setDrawer({ kind: 'bump', id: ref.offerId, version })
  }

  /** Attached: only the campaign version goes. Campaign-only: ask "Delete it" or "Keep as everyday offer". */
  const removeOffer = (ref: OfferKey) => {
    if (refIn(c, ref)?.mode === 'campaignOnly') {
      setConfirmRemove(ref)
      return
    }
    const o = offerOf(state, ref)
    actions.removeOffer(c.id, ref)
    actions.toast(`Removed ${o ? offerName(o) : 'the offer'} from ${c.name}. Its everyday version is untouched.`)
  }

  const campaignOnlyNames = c.offerRefs.filter((r) => r.mode === 'campaignOnly').map((r) => offerOf(state, r)).filter((o) => !!o).map((o) => offerName(o!))
  const lic = st !== 'draft' ? licenceWarning(state, c) : null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://yourstore.com/?sg=${c.linkSlug}`)
    } catch {
      /* clipboard may be unavailable in the preview pane */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const del = () => {
    actions.deleteCampaign(c.id)
    nav('/campaigns')
  }

  const cloneBtn = (
    <button type="button" className="btn btn-ghost" disabled={locked} onClick={() => nav(`/campaigns/${actions.clone(c.id)}`)}>
      Clone
    </button>
  )
  const deleteBtn = (
    <button type="button" className="btn btn-danger" disabled={locked} onClick={() => setConfirmDelete(true)} aria-label="Delete campaign">
      <Trash2 size={14} /> Delete
    </button>
  )

  return (
    <div className="flex flex-col gap-5">
      {locked && (
        <div className="card flex items-center gap-4 p-4" style={{ borderColor: '#d1d5db', background: '#f9fafb' }}>
          <div className="flex-1 text-sm font-semibold">
            {expired ? 'Your StoreGrowth Pro licence has expired, so your campaigns are stopped. Renew it to run them again.' : 'Campaigns is a StoreGrowth Pro feature. This is a preview with sample data.'}
          </div>
          <ProActionButton />
        </div>
      )}

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: '#fee2e2', color: '#991b1b' }} role="alertdialog" aria-label="Confirm delete">
          <span className="flex-1">
            Delete {c.name}? Attached offers go back to their everyday versions.
            {campaignOnlyNames.length > 0 && <span className="block">These campaign-only offers will be deleted: {campaignOnlyNames.join(', ')}.</span>}
          </span>
          <button type="button" className="btn btn-danger btn-sm" onClick={del}>
            Delete campaign
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">
            <Link to="/campaigns" className="hover:underline">
              Campaigns
            </Link>{' '}
            / {c.name}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-semibold">{c.name}</h1>
            <StatusChip status={st} />
            {warnings.length > 0 && st !== 'ended' && <WarnChip text="Module off" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => nav(`/storefront?campaign=${c.id}`)}>
            Preview storefront
          </button>
          {st === 'draft' && (
            <>
              <button type="button" className="btn btn-ghost" disabled={readOnly} onClick={() => setPicker(true)}>
                Use template
              </button>
              {cloneBtn}
              {deleteBtn}
              <button type="button" className="btn btn-blue" disabled={readOnly || blocking.length > 0} onClick={() => actions.publish(c.id)} title={blocking.length ? 'Fix the blocking checks first' : undefined}>
                Publish
              </button>
            </>
          )}
          {st === 'scheduled' && (
            <>
              {cloneBtn}
              {deleteBtn}
              <button type="button" className="btn btn-ghost" disabled={readOnly} onClick={() => actions.unpublish(c.id)}>
                Unpublish
              </button>
            </>
          )}
          {st === 'running' && (
            <>
              <button type="button" className="btn btn-ghost" disabled={readOnly} onClick={() => actions.pause(c.id)}>
                Pause
              </button>
              <button type="button" className="btn btn-danger" disabled={readOnly} onClick={() => actions.endNow(c.id)}>
                End now
              </button>
              {cloneBtn}
              {deleteBtn}
            </>
          )}
          {st === 'paused' && (
            <>
              <button type="button" className="btn btn-blue" disabled={readOnly} onClick={() => actions.resume(c.id)}>
                Resume
              </button>
              <button type="button" className="btn btn-danger" disabled={readOnly} onClick={() => actions.endNow(c.id)}>
                End now
              </button>
              {deleteBtn}
            </>
          )}
          {st === 'ended' && (
            <>
              {cloneBtn}
              {deleteBtn}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="flex flex-col gap-4">
          {st === 'draft' && (
            <ReadinessCard checks={checks} onFix={runFix} disabled={readOnly} infos={overlaps.infos.map((o) => o.name)}>
              {seeProductsFor && (
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <div className="mb-1 font-medium">Products both campaigns discount</div>
                  {(overlaps.warnings.find((w) => w.campaign.id === seeProductsFor)?.products ?? []).map((pid) => (
                    <div key={pid}>{state.products.find((p) => p.id === pid)?.name}</div>
                  ))}
                </div>
              )}
              {showClashes && (
                <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  <div className="mb-1 font-medium">Products with their own Countdown discount</div>
                  {campaignPriceCountdownClashes(state, c.campaignPrice).map((p) => (
                    <div key={p.id}>
                      {p.name}: {p.ownCountdown!.percent}% off until {fmtDate(p.ownCountdown!.end)}. Campaign price {c.campaignPrice!.percent}% replaces it while the campaign runs.
                    </div>
                  ))}
                </div>
              )}
            </ReadinessCard>
          )}
          {st === 'scheduled' && c.start && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#dbeafe', color: '#1e3a8a' }}>
              Starts in {daysBetween(nowOf(state), c.start)} days, on {fmtShortDateTime(c.start)}.
            </div>
          )}
          {st === 'paused' && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
              Paused since {fmtDate(c.pausedSince ?? todayOf(state))}. Offers are back to their everyday versions and surfaces are off.
            </div>
          )}
          {st === 'ended' && c.metrics && (
            <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm">
                <span className="font-semibold">{c.name}</span> earned {fmtMoney(c.metrics.revenue)} from {c.metrics.orders} orders, with AOV {fmtPct(c.metrics.aovLift)} vs the 30 days before. Ended {fmtDate(c.endedOn ?? c.end)}.
              </div>
              <button type="button" className="btn btn-blue" disabled={locked} onClick={() => nav(`/campaigns/${actions.clone(c.id)}`)}>
                Run again
              </button>
            </div>
          )}

          <ReportCard c={c} st={st} days={days} />

          {(st === 'running' || st === 'paused' || st === 'ended') && c.metrics && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card title="Revenue by day">
                <DayBars data={c.metrics.byDay} />
              </Card>
              <Card title="Which surface led to the sale">
                <SurfaceBars data={c.metrics.bySurface} />
                <div className="mt-2 text-[11px] text-gray-500">Last surface clicked before a campaign product was added. None counts as Direct.</div>
              </Card>
            </div>
          )}

          {st === 'draft' && (
            <Card title="When it ends">
              <div className="text-sm text-gray-700">
                {!c.start ? (
                  <>No dates yet. Set the start and end in Runs to schedule this campaign.</>
                ) : c.end ? (
                  <>
                    On {fmtDateTime(c.end)} the offers go back to their everyday versions, the surfaces hide and the report freezes. The countdown ends with the campaign.
                    {c.campaignPrice && " Products' own Countdown settings return."}
                  </>
                ) : (
                  <>This campaign is always on. It runs until you pause or end it, and the report keeps counting.</>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          {st === 'running' && !readOnly && <div className="text-xs text-gray-500">Changes apply immediately.</div>}
          {st === 'ended' && <div className="text-xs text-gray-500">This campaign has ended. Its setup is read-only.</div>}

          <RunsCard c={c} readOnly={readOnly} editing={editingDates} setEditing={setEditingDates} />
          {(st === 'scheduled' || st === 'running' || st === 'paused') && (
            <OverlapLines overlaps={overlaps} licence={lic} seeProductsFor={seeProductsFor} onSeeProducts={(id) => setSeeProductsFor((v) => (v === id ? null : id))} />
          )}

          {/* 2. Products */}
          <Card title="Products">
            {scope.derived ? (
              <>
                <div className="mb-2 text-xs text-gray-500">From attached offers and campaign price</div>
                <div className="flex flex-wrap gap-1.5">
                  {scope.categories.map((cat) => (
                    <span key={cat} className="chip bg-gray-100 text-gray-800">
                      {cat}
                    </span>
                  ))}
                  {scope.products.map((pid) => {
                    const p = state.products.find((x) => x.id === pid)
                    return (
                      <span key={pid} className="chip bg-gray-100 text-gray-800">
                        {p?.category}: {p?.name}
                      </span>
                    )
                  })}
                  {scope.categories.length === 0 && scope.products.length === 0 && <span className="text-sm text-gray-500">No products yet</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-gray-500">Nothing attached. Pick what this campaign covers.</div>
                <div className="text-xs font-medium text-gray-700">Categories</div>
                <div className="flex flex-wrap gap-1.5">
                  {state.categories.map((cat) => {
                    const on = c.productScope.categories.includes(cat)
                    return (
                      <button key={cat} type="button" aria-pressed={on} disabled={readOnly} onClick={() => actions.updateCampaign(c.id, { productScope: { ...c.productScope, categories: on ? c.productScope.categories.filter((x) => x !== cat) : [...c.productScope.categories, cat] } })} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                        {cat}
                      </button>
                    )
                  })}
                </div>
                <div className="text-xs font-medium text-gray-700">Products</div>
                <div className="flex flex-wrap gap-1.5">
                  {state.products.map((p) => {
                    const on = c.productScope.products.includes(p.id)
                    return (
                      <button key={p.id} type="button" aria-pressed={on} disabled={readOnly} onClick={() => actions.updateCampaign(c.id, { productScope: { ...c.productScope, products: on ? c.productScope.products.filter((x) => x !== p.id) : [...c.productScope.products, p.id] } })} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 3. Offers */}
          <Card
            title="Offers"
            right={
              <div className="relative">
                <button type="button" className="btn btn-blue btn-sm" disabled={readOnly} onClick={() => setAddMenu((m) => (m === 'none' ? 'main' : 'none'))} aria-haspopup="menu" aria-expanded={addMenu !== 'none'}>
                  Add offer <ChevronDown size={14} />
                </button>
                {addMenu === 'main' && (
                  <div className="absolute right-0 z-20 mt-1 w-60 rounded-lg border bg-white p-1 shadow-lg" style={{ borderColor: '#e5e7eb' }} role="menu">
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => { setAddMenu('none'); setDrawer({ kind: 'attach' }) }}>
                      Attach existing offer
                      <span className="block text-xs text-gray-500">Then Use as is, or Customise for this campaign</span>
                    </button>
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50" onClick={() => setAddMenu('create')}>
                      Create campaign-only offer
                      <span className="block text-xs text-gray-500">Lives only inside this campaign</span>
                    </button>
                  </div>
                )}
                {addMenu === 'create' && (
                  <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border bg-white p-1 shadow-lg" style={{ borderColor: '#e5e7eb' }} role="menu">
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50" disabled={!!lockReason(state, { moduleId: 'smart-coupons' })} onClick={() => { setAddMenu('none'); setDrawer({ kind: 'coupon', couponId: null, version: false }) }}>
                      Smart Coupon
                    </button>
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50" disabled={!!lockReason(state, { moduleId: 'bogo' })} onClick={() => { setAddMenu('none'); setDrawer({ kind: 'bogo', ruleId: null, version: false }) }}>
                      BOGO rule
                    </button>
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50" disabled={!!lockReason(state, { moduleId: 'order-bump' })} onClick={() => { setAddMenu('none'); setDrawer({ kind: 'bump', id: null, version: false }) }}>
                      Order Bump
                    </button>
                    <button type="button" role="menuitem" className="block w-full rounded-md px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50" onClick={() => setAddMenu('main')}>
                      Back
                    </button>
                  </div>
                )}
              </div>
            }
          >
            <div className="flex flex-col divide-y" style={{ borderColor: '#e5e7eb' }}>
              {offers.length === 0 && <div className="text-sm text-gray-500">No offer attached. A campaign without an offer is allowed; attribution then uses the link and surface clicks.</div>}
              {offers.map((o) => {
                const w = warnings.find((x) => x.kind === 'offer' && x.id === o.ref.offerId)
                const base = offerOf(state, o.ref)!
                const ref = refIn(c, o.ref)!
                const confirming = confirmRemove?.moduleId === o.ref.moduleId && confirmRemove.offerId === o.ref.offerId
                return (
                  <div key={`${o.moduleId}:${o.ref.offerId}`} className={`flex flex-col gap-1 py-2 ${w ? 'locked' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {w && <Lock size={13} />}
                      <span className="truncate">{o.title}</span>
                      <ModuleChip name={o.chip} />
                      {o.levelLabel && <span className="text-xs font-normal text-gray-500">{o.levelLabel}</span>}
                      <OfferTag offer={base} />
                      {ref.mode === 'attached' && <span className="text-xs font-normal text-gray-500">{ref.override ? 'Customised' : 'Use as is'}</span>}
                    </div>
                    <div className="text-xs text-gray-500">{o.detail}</div>
                    {ref.mode === 'attached' && (
                      <div className="flex flex-wrap gap-1">
                        <TimelineChip k={o.ref} />
                      </div>
                    )}
                    {w && <WarnChip text={w.since ? `Module off since ${fmtDate(w.since)}` : 'Module off'} />}
                    <div className="flex items-center gap-1.5">
                      {w ? (
                        <button type="button" className="btn btn-grey btn-sm" onClick={() => actions.setModuleActive(w.moduleId, true)}>
                          Enable {MODULE_NAMES[w.moduleId]}
                        </button>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={() => editOffer(o.ref)}>
                          Edit
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={() => removeOffer(o.ref)}>
                        Remove
                      </button>
                    </div>
                    {confirming && (
                      <div className="mt-1 flex flex-col gap-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: '#fef3c7', color: '#92400e' }} role="alertdialog" aria-label="Remove campaign-only offer">
                        <span>
                          Remove {o.title} from {c.name}?
                        </span>
                        <span className="flex flex-wrap gap-1.5">
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => { actions.removeOffer(c.id, o.ref, false); setConfirmRemove(null) }}>
                            Delete it
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { actions.removeOffer(c.id, o.ref, true); setConfirmRemove(null); actions.toast(`${o.title} is now an everyday offer, Inactive until dates are set.`) }}>
                            Keep as everyday offer
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(null)}>
                            Cancel
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <CampaignPriceCard c={c} readOnly={readOnly} />
          <SurfacesCard c={c} readOnly={readOnly} />

          <Card title="Campaign link">
            <div className="flex items-center gap-2">
              <input className="input font-mono text-xs" readOnly value={`yourstore.com/?sg=${c.linkSlug}`} aria-label="Campaign link" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink} aria-label="Copy link">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">Applies the offer and credits this campaign. Use it in ads, email, Texty.</div>
          </Card>
        </div>
      </div>

      {/* Drawers and modals */}
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
      <Drawer open={drawer.kind === 'coupon'} onClose={() => setDrawer({ kind: 'none' })} title={drawer.kind === 'coupon' && drawer.couponId ? (drawer.version ? `${c.name} version` : 'Edit campaign-only coupon') : 'New campaign-only coupon'} width={1040}>
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
              if (saved && coupon) actions.toast(drawer.version ? `Saved the ${c.name} version of ${coupon.title}.` : `Saved ${coupon.title} inside ${c.name}.`)
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
      <TemplatePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(t) => {
          actions.useTemplate(c.id, t)
          setPicker(false)
        }}
      />
    </div>
  )
}

/** Under the Runs card for scheduled, running and paused campaigns: overlap warning, info line and licence warning. */
function OverlapLines({ overlaps, licence, seeProductsFor, onSeeProducts }: { overlaps: ReturnType<typeof overlapChecks>; licence: string | null; seeProductsFor: string | null; onSeeProducts: (id: string) => void }) {
  const { state, actions } = useStore()
  if (overlaps.warnings.length === 0 && overlaps.infos.length === 0 && !licence) return null
  return (
    <div className="flex flex-col gap-2">
      {licence && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
          <AlertTriangle size={14} className="shrink-0" />
          <span className="flex-1">{licence}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.renewLicence()}>
            Renew licence
          </button>
        </div>
      )}
      {overlaps.warnings.map((w) => (
        <div key={w.campaign.id} className="flex flex-col gap-1 rounded-lg px-3 py-2 text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
          <div className="flex flex-wrap items-center gap-3">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1">{overlapWarningText(w)}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSeeProducts(w.campaign.id)}>
              See products
            </button>
          </div>
          {seeProductsFor === w.campaign.id && <div className="text-xs">{w.products.map((pid) => state.products.find((p) => p.id === pid)?.name).join(', ')}</div>}
        </div>
      ))}
      {overlaps.infos.map((o) => (
        <div key={o.id} className="flex items-center gap-2 text-xs text-gray-600">
          <Info size={13} /> Also running: {o.name}
        </div>
      ))}
    </div>
  )
}

function ReadinessCard({ checks, onFix, disabled, infos, children }: { checks: ReadinessCheck[]; onFix: (f: ReadinessCheck['fixes'][number]) => void; disabled: boolean; infos: string[]; children?: React.ReactNode }) {
  return (
    <Card title={<span>Ready to publish? {checks.length === 0 ? 'All checks pass.' : `${checks.length} of ${READINESS_CHECK_COUNT} checks need attention`}</span>}>
      {checks.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-green-800">
          <Check size={14} /> Dates, offers and surfaces look good.
        </div>
      )}
      <div className="flex flex-col gap-2">
        {checks.map((k) => (
          <div key={k.id} className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-2 text-sm" style={k.kind === 'blocking' ? { background: '#fee2e2', color: '#991b1b' } : { background: '#fef3c7', color: '#92400e' }}>
            <AlertTriangle size={14} className="shrink-0" />
            <span className="flex-1">{k.text}</span>
            <span className="flex gap-1.5">
              {k.fixes.map((f) => (
                <button key={f.label} type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onFix(f)}>
                  {f.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
      {children}
      {infos.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {infos.map((name) => (
            <div key={name} className="flex items-center gap-2 text-xs text-gray-600">
              <Info size={13} /> Also running: {name}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/** Rail card 1. Dates and times in the site timezone. A date change that would overlap another campaign sharing an offer does not save. */
function RunsCard({ c, readOnly, editing, setEditing }: { c: Campaign; readOnly: boolean; editing: boolean; setEditing: (v: boolean) => void }) {
  const { state, actions } = useStore()
  const [start, setStart] = useState(c.start ?? '')
  const [end, setEnd] = useState<string | null>(c.end)
  const [error, setError] = useState<string | null>(null)

  const begin = () => {
    setStart(c.start ?? '')
    setEnd(c.end)
    setError(null)
    setEditing(true)
  }
  const done = () => {
    const s = start || null
    const conflict = dateChangeConflict(state, c, s, end)
    if (conflict) {
      setError(dateOverlapMessage(conflict.offer, conflict.other))
      return
    }
    actions.updateCampaign(c.id, { start: s, end })
    setEditing(false)
  }

  return (
    <Card
      title="Runs"
      right={
        !readOnly &&
        !editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={begin}>
            Edit
          </button>
        )
      }
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-600">
            Start
            <input type="datetime-local" className="input mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="text-xs text-gray-600">
            End
            <input type="datetime-local" className="input mt-1" value={end ?? ''} disabled={end === null} onChange={(e) => setEnd(e.target.value || null)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={end === null} onChange={(e) => setEnd(e.target.checked ? null : `${todayOf(state)}T23:59`)} />
            Always on
          </label>
          <div className="text-xs text-gray-500">Timezone: {state.settings.siteTimezone}</div>
          {error && (
            <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#fee2e2', color: '#991b1b' }} role="alert">
              {error}
            </div>
          )}
          <div className="flex gap-1.5">
            <button type="button" className="btn btn-blue btn-sm" onClick={done}>
              Done
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          <div>{!c.start ? 'No dates set' : c.end === null ? `${fmtDateTime(c.start)} · Always on` : fmtRange(c.start, c.end)}</div>
          <div className="mt-1 text-xs text-gray-500">Timezone: {state.settings.siteTimezone}</div>
        </div>
      )}
    </Card>
  )
}

function ReportCard({ c, st, days }: { c: Campaign; st: Campaign['status']; days: number }) {
  const { state } = useStore()
  const storeLine = storeDuringLine(state, c)
  const live = (st === 'running' || st === 'paused' || st === 'ended') && c.metrics
  const m = c.metrics
  const cell = (v: string) => (live ? v : '--')
  return (
    <Card title={st === 'ended' ? 'Report (frozen)' : 'Report'} right={st === 'ended' ? <span className="text-xs text-gray-500">Frozen at {fmtDate(c.endedOn ?? c.end)}</span> : null}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Attributed revenue" value={cell(m ? fmtMoney(m.revenue) : '--')} note={revenueNote(days)} />
        <Metric label="Orders" value={cell(m ? String(m.orders) : '--')} note="Same rule as revenue" />
        <Metric label="Offer acceptance" value={cell(m ? `${m.acceptance}%` : '--')} note="Carts that qualified and checked out" />
        <Metric label="AOV change" value={cell(m ? fmtPct(m.aovLift) : '--')} note="Campaign orders vs the 30 days before" tone={live && m ? (m.aovLift >= 0 ? 'good' : 'bad') : undefined} />
      </div>
      {storeLine && (
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="text-sm text-gray-800">{storeLine}</div>
          <div className="text-[11px] text-gray-500">All store orders in the window. Context only, not credited to the campaign.</div>
        </div>
      )}
      <div className="mt-3 text-[11px] text-gray-500">
        Baseline: the 30 days before the campaign started, frozen at publish. AOV {fmtMoney(c.baseline.aov)}, revenue {fmtMoney(c.baseline.revenue)}.
      </div>
    </Card>
  )
}

function Metric({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: '#e5e7eb' }}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={tone ? { color: tone === 'good' ? '#065f46' : '#b91c1c' } : undefined}>
        {value}
      </div>
      <div className="mt-1 text-[11px] leading-snug text-gray-500">{note}</div>
    </div>
  )
}

function CampaignPriceCard({ c, readOnly }: { c: Campaign; readOnly: boolean }) {
  const { state, actions } = useStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CampaignPrice>({ percent: 15, categories: [], products: [] })
  const lock = lockReason(state, { moduleId: 'countdown' })
  const price = c.campaignPrice
  const since = state.moduleOffSince.countdown

  const startEdit = () => {
    setDraft(price ? { ...price } : { percent: 15, categories: [], products: [] })
    setEditing(true)
  }
  const toggle = (kind: 'categories' | 'products', v: string) => setDraft((d) => ({ ...d, [kind]: d[kind].includes(v) ? d[kind].filter((x) => x !== v) : [...d[kind], v] }))

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Campaign price <ModuleChip name="Countdown" />
        </span>
      }
      right={
        lock === null && !readOnly && !editing ? (
          <button type="button" className="btn btn-blue btn-sm" onClick={startEdit}>
            {price ? 'Edit' : 'Add campaign price'}
          </button>
        ) : null
      }
      className={lock === 'moduleOff' ? 'locked' : ''}
    >
      {lock === 'moduleOff' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Lock size={13} /> {price ? `${price.percent}% off ${scopeText(state, price)}` : 'No campaign price'}
            {price && <WarnChip text={since ? `Module off since ${fmtDate(since)}` : 'Module off'} />}
          </div>
          <div className="text-xs">Countdown Timer is off. Enable it to use it here. The campaign price is a Countdown discount on the campaign products.</div>
          <button type="button" className="btn btn-grey btn-sm w-fit" onClick={() => actions.setModuleActive('countdown', true)}>
            Enable Countdown Timer
          </button>
        </div>
      ) : editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-600">
            Percent off
            <div className="mt-1 flex items-center gap-2">
              <input type="number" min={1} max={99} className="input w-24" value={draft.percent} onChange={(e) => setDraft({ ...draft, percent: Number(e.target.value) })} />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </label>
          <div className="text-xs font-medium text-gray-700">Categories</div>
          <div className="flex flex-wrap gap-1.5">
            {state.categories.map((cat) => {
              const on = draft.categories.includes(cat)
              return (
                <button key={cat} type="button" aria-pressed={on} onClick={() => toggle('categories', cat)} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                  {cat}
                </button>
              )
            })}
          </div>
          <div className="text-xs font-medium text-gray-700">Products</div>
          <div className="flex flex-wrap gap-1.5">
            {state.products
              .filter((p) => !p.vendor)
              .map((p) => {
                const on = draft.products.includes(p.id)
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => toggle('products', p.id)} className={`chip border ${on ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700'}`}>
                    {p.name}
                  </button>
                )
              })}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className="btn btn-blue btn-sm" disabled={draft.categories.length === 0 && draft.products.length === 0} onClick={() => { actions.setCampaignPrice(c.id, draft); setEditing(false) }}>
              Save
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
            {price && (
              <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => { actions.setCampaignPrice(c.id, null); setEditing(false) }}>
                Remove
              </button>
            )}
          </div>
        </div>
      ) : price ? (
        <div className="text-sm">
          <div className="font-medium">{price.percent}% off</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {price.categories.map((cat) => (
              <span key={cat} className="chip bg-gray-100 text-gray-800">
                {cat}
              </span>
            ))}
            {price.products.map((pid) => (
              <span key={pid} className="chip bg-gray-100 text-gray-800">
                {state.products.find((p) => p.id === pid)?.name}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">No campaign price. Add one to set "% off these products" for the run.</div>
      )}
      <div className="mt-2 text-[11px] text-gray-500">Products' own Countdown settings are kept and return after the campaign.</div>
    </Card>
  )
}

function scopeText(state: ReturnType<typeof useStore>['state'], price: CampaignPrice): string {
  return [...price.categories, ...price.products.map((id) => state.products.find((p) => p.id === id)?.name ?? id)].join(', ')
}

function SurfacesCard({ c, readOnly }: { c: Campaign; readOnly: boolean }) {
  const { state, actions } = useStore()
  const rows = SURFACES.map((s) => ({ s, lock: surfaceLock(state, s), enabled: !!c.surfaces[s.id]?.enabled, since: s.moduleId ? state.moduleOffSince[s.moduleId] : undefined }))
  const active = rows.filter((r) => r.lock === null)
  const locked = rows.filter((r) => r.lock !== null)
  return (
    <Card title="Surfaces">
      <div className="flex flex-col divide-y" style={{ borderColor: '#e5e7eb' }}>
        {active.map(({ s, enabled }) => (
          <div key={s.id} className="flex items-center justify-between gap-2 py-2">
            <div>
              <div className="text-sm">{s.label}</div>
              <div className="text-[11px] text-gray-500">{surfaceOwnerName(s)}</div>
              {s.note && <div className="text-[11px] text-gray-500">{s.note}</div>}
            </div>
            <Toggle checked={enabled} disabled={readOnly} onChange={(v) => actions.setSurface(c.id, s.id, v)} label={`${s.label} on or off`} />
          </div>
        ))}
      </div>
      {locked.length > 0 && (
        <>
          <div className="divider-label my-3">Not available</div>
          <div className="flex flex-col divide-y" style={{ borderColor: '#e5e7eb' }}>
            {locked.map(({ s, lock, enabled, since }) => (
              <div key={s.id} className="locked flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Lock size={13} />
                  {s.label}
                  {lock === 'pro' && <ProChip />}
                  {enabled && lock === 'moduleOff' && <WarnChip text={since ? `Module off since ${fmtDate(since)}` : 'Module off'} />}
                </div>
                <div className="text-[11px]">
                  {lock === 'moduleOff' ? `${surfaceOwnerName(s)} is off. Enable it to use it here.` : `${s.label} is a Pro feature.`} {s.moduleId ? state.modules.find((m) => m.id === s.moduleId)?.adds : 'A badge on exactly the campaign products.'}
                </div>
                {lock === 'moduleOff' && s.moduleId ? (
                  <button type="button" className="btn btn-grey btn-sm w-fit" onClick={() => actions.setModuleActive(s.moduleId!, true)}>
                    Enable {MODULE_NAMES[s.moduleId]}
                  </button>
                ) : (
                  <UpgradeCard name={s.label} sentence={s.moduleId ? state.modules.find((m) => m.id === s.moduleId)!.adds : 'A badge on exactly the campaign products.'} compact />
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {!hasAnythingAttached(c) && surfaceLock(state, SURFACES[6]) === null && <div className="mt-2 text-[11px] text-gray-500">The badge and countdown show on the products picked above.</div>}
    </Card>
  )
}
