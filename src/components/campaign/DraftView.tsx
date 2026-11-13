// Draft layout (brief v3.2, S2 section 3): six numbered steps on the left,
// "Ready to publish?" and the summary cards in the rail.

import { Check, CheckCircle2, Circle, LayoutGrid } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { isEmptyDraft, offerLines, plural, priceText, requiredItems, startsIn, stepsDone, whenItEnds } from '../../lib/campaignText'
import { activeSurfaces, campaignPriceCountdownClashes, campaignScope, fmtShortDateTime, fmtWindow, nowOf, overlapChecks, readinessChecks, type ReadinessCheck } from '../../lib/derive'
import { useStore } from '../../store/store'
import type { Campaign, ModuleId, OfferKey } from '../../types'
import { InfoLine, RailCard, WarnBox } from './bits'
import { DisplaysEditor, OffersEditor, PriceEditor, ProductsEditor, ScheduleEditor } from './editors'
import { useCopyLink } from './hooks'

interface Props {
  c: Campaign
  readOnly: boolean
  canPublish: boolean
  publishTitle?: string
  onPublish: () => void
  onBrowseTemplates: () => void
}

/** Which step each "Worth a look" fix belongs to, so its link can scroll there. */
const FIX_STEP: Record<string, number> = { editDates: 1, attachOffer: 2, removeOffer: 2, keepBoth: 2, reviewProducts: 3, countdownOk: 3, seeProducts: 4, onSale: 4, enableModule: 5 }

export function DraftView({ c, readOnly, canPublish, publishTitle, onPublish, onBrowseTemplates }: Props) {
  const { state, actions } = useStore()
  const stepEls = useRef<Record<number, HTMLElement | null>>({})
  const [flash, setFlash] = useState<number | null>(null)
  const [seeProductsFor, setSeeProductsFor] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<OfferKey | null>(null)
  const [copied, copyLink] = useCopyLink(c)

  const done = stepsDone(state, c)
  const required = requiredItems(state, c)
  const left = required.filter((r) => !r.done).length
  const ready = left === 0
  // "No discount attached" says the same thing as the open required item on an empty draft, so it waits until that is done.
  const nothingYet = required.some((r) => r.id === 'empty' && !r.done)
  const warnings = readinessChecks(state, c).filter((k) => k.kind === 'warning' && !(nothingYet && k.id === 'noDiscount'))
  const overlaps = overlapChecks(state, c)
  const lines = offerLines(state, c)
  const scope = campaignScope(state, c)
  const displaysOn = activeSurfaces(state, c).length
  const saved = c.savedAt !== undefined
  const startIn = startsIn(state, c)

  /** Scroll to a step, focus its first field and briefly highlight the card. */
  const goToStep = (n: number, focusId?: string) => {
    const el = stepEls.current[n]
    if (!el) return
    const target = (focusId ? el.querySelector<HTMLElement>(`#${focusId}`) : null) ?? el.querySelector<HTMLElement>('[data-first-field]:not(:disabled)') ?? el.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled)')
    // Focus first: focusing after the scroll starts cancels a smooth scroll in Chromium.
    target?.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    // If the smooth scroll did not get there (some browsers skip it in background or embedded tabs), jump.
    window.setTimeout(() => {
      const top = el.getBoundingClientRect().top
      const canScroll = document.documentElement.scrollHeight - window.innerHeight - window.scrollY
      if (top > 40 && canScroll > 4) el.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 700)
    setFlash(n)
    window.setTimeout(() => setFlash((f) => (f === n ? null : f)), 1800)
  }

  const runFix = (f: ReadinessCheck['fixes'][number]) => {
    switch (f.action) {
      case 'editDates':
        goToStep(1, 'cp-start-date')
        break
      case 'onSale':
        actions.setOnSaleDecision(c.id, f.arg as 'exclude' | 'stack')
        break
      case 'seeProducts':
        setSeeProductsFor(f.arg ?? null)
        goToStep(4)
        break
      case 'removeOffer': {
        const [moduleId, offerId] = (f.arg ?? '').split(':') as [OfferKey['moduleId'], string]
        const key = { moduleId, offerId }
        if (c.offerRefs.find((r) => r.moduleId === moduleId && r.offerId === offerId)?.mode === 'campaignOnly') setConfirmRemove(key)
        else actions.removeOffer(c.id, key)
        goToStep(2)
        break
      }
      case 'renewLicence':
        actions.renewLicence()
        break
      case 'keepBoth':
        actions.keepBothBogo(c.id)
        break
      case 'reviewProducts':
        goToStep(3)
        break
      case 'countdownOk':
        actions.acceptCountdownClash(c.id)
        break
      case 'attachOffer':
        goToStep(2)
        break
      case 'enableModule':
        actions.setModuleActive(f.arg as ModuleId, true)
        break
    }
  }

  const step = (n: number, title: ReactNode, desc: string, body: ReactNode, opts: { optional?: boolean; gap?: number } = {}) => (
    <section
      key={n}
      id={`step-${n}`}
      aria-labelledby={`step-${n}-title`}
      ref={(el) => {
        stepEls.current[n] = el
      }}
      className={`cp-card cp-step ${flash === n ? 'cp-step-flash' : ''}`}
      style={{ gap: opts.gap ?? 16 }}
    >
      <div className="flex items-start gap-3.5">
        {done[n - 1] ? (
          <span className="cp-badge cp-badge-done" role="img" aria-label={`Step ${n}, done`}>
            <Check size={16} strokeWidth={3} aria-hidden />
          </span>
        ) : (
          <span className="cp-badge" aria-label={`Step ${n}`}>
            {n}
          </span>
        )}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`step-${n}-title`} className="cp-h2">
              {title}
            </h2>
            {opts.optional && <span className="cp-pill cp-pill-soft">Optional</span>}
          </div>
          <p className="cp-muted m-0 text-sm">{desc}</p>
        </div>
      </div>
      {body && <div className="cp-step-body">{body}</div>}
    </section>
  )

  const count = (text: string) => <span className="cp-muted font-medium">({text})</span>
  const sharedProducts = overlaps.warnings.find((w) => w.campaign.id === seeProductsFor)

  return (
    <>
      {isEmptyDraft(c) && (
        <div className="cp-card flex flex-wrap items-center gap-3 px-[18px] py-3.5">
          <LayoutGrid size={20} color="#1D4ED8" aria-hidden />
          <span className="flex-1 basis-[300px] text-sm">Starting from scratch? A template fills in offers and store displays for you.</span>
          <button type="button" className="cp-btn cp-btn-40 cp-btn-outline" disabled={readOnly} onClick={onBrowseTemplates}>
            Browse templates
          </button>
        </div>
      )}

      <div className="cp-cols">
        <div className="cp-main">
          {step(1, 'Name and schedule', 'When the campaign starts, its offers take over. When it ends, your everyday offers come back.', <ScheduleEditor c={c} readOnly={readOnly} needStart />, { gap: 20 })}

          {step(
            2,
            <>Offers {lines.length > 0 && count(String(lines.length))}</>,
            'The deals shoppers get during this campaign: Smart Coupons, BOGO rules and Order Bumps.',
            <OffersEditor c={c} readOnly={readOnly} confirmRemove={confirmRemove} setConfirmRemove={setConfirmRemove} />,
            { gap: lines.length > 0 ? 16 : 20 },
          )}

          {step(3, 'Campaign price', 'One % off chosen products for the whole campaign, shown with a strike-through price. Uses the Countdown module.', <PriceEditor c={c} readOnly={readOnly} />, { optional: true })}

          {step(
            4,
            'Products',
            scope.derived ? 'Filled in from your offers and campaign price. Change them in the offers above.' : 'Filled in from your offers and campaign price. Nothing is attached yet, so you can pick them here.',
            <div className="flex flex-col gap-3">
              <ProductsEditor c={c} readOnly={readOnly} />
              {sharedProducts && (
                <WarnBox
                  actions={
                    <button type="button" className="cp-link" onClick={() => setSeeProductsFor(null)}>
                      Hide
                    </button>
                  }
                >
                  {sharedProducts.campaign.name} also discounts: {sharedProducts.products.map((pid) => state.products.find((p) => p.id === pid)?.name ?? pid).join(', ')}. The larger deal applies.
                </WarnBox>
              )}
            </div>,
          )}

          {step(5, <>Show it on your store {displaysOn > 0 && count(`${displaysOn} on`)}</>, "Choose where shoppers see this campaign. Each uses the campaign's dates and products.", <DisplaysEditor c={c} readOnly={readOnly} />)}

          {step(
            6,
            'Campaign link',
            `Share it in ads, emails or Texty. It applies the offer and credits this campaign.${saved ? '' : ' Your link appears once the draft is saved.'}`,
            saved ? (
              <div className="flex max-w-[640px] gap-2">
                <label htmlFor="cp-link" className="sr-only">
                  Campaign link
                </label>
                <input id="cp-link" type="text" readOnly className="cp-input flex-1 bg-[#F6F7F7]" value={`yourstore.com/?sg=${c.linkSlug}`} />
                <button type="button" className="cp-btn cp-btn-outline" onClick={copyLink}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : null,
            { gap: saved ? 16 : 12 },
          )}
        </div>

        <aside aria-label="Publishing" className="cp-rail">
          <section aria-labelledby="cp-ready" className="cp-card flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2.5">
              <h2 id="cp-ready" className="cp-h2-rail flex items-center gap-2">
                {ready && <CheckCircle2 size={20} color="#067647" strokeWidth={2.5} aria-hidden />}
                {ready ? 'Ready to publish' : 'Ready to publish?'}
              </h2>
              <div className="cp-muted flex items-center justify-between text-[13px]">
                <span>{ready ? 'All required steps done' : `${plural(left, 'thing')} left`}</span>
                <span>
                  {required.length - left} of {required.length}
                  {ready ? '' : ' done'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F0F0F1]" role="progressbar" aria-label="Required steps done" aria-valuemin={0} aria-valuemax={required.length} aria-valuenow={required.length - left}>
                <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round(((required.length - left) / required.length) * 100))}%`, background: ready ? '#067647' : '#1D4ED8' }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="cp-eyebrow">Required</span>
              {required.map((r) =>
                r.done ? (
                  <div key={r.id} className="flex items-center gap-2.5 py-1 text-sm">
                    <Check size={18} color="#067647" strokeWidth={2.5} aria-hidden />
                    {r.doneLabel}
                  </div>
                ) : (
                  <button key={r.id} type="button" className="cp-req" onClick={() => goToStep(r.step, r.step === 1 ? (r.id === 'dates' ? 'cp-end-date' : 'cp-start-date') : undefined)}>
                    <Circle size={18} color="#B42318" className="mt-0.5 shrink-0" aria-hidden />
                    <span className="flex flex-col gap-0.5 text-sm">
                      <span className="font-semibold">{r.label}</span>
                      <span className="text-[13px] text-[#1D4ED8]">{r.link}</span>
                    </span>
                  </button>
                ),
              )}
            </div>

            {(warnings.length > 0 || overlaps.infos.length > 0) && (
              <div className="flex flex-col gap-2">
                {warnings.length > 0 && <span className="cp-eyebrow">Worth a look ({warnings.length})</span>}
                {warnings.map((k) => (
                  <WarnBox
                    key={k.id}
                    actions={k.fixes.map((f) => (
                      <button key={f.label} type="button" className="cp-link" disabled={readOnly} onClick={() => runFix(f)} title={FIX_STEP[f.action] ? `Step ${FIX_STEP[f.action]}` : undefined}>
                        {f.label}
                      </button>
                    ))}
                  >
                    {k.text}
                  </WarnBox>
                ))}
                {overlaps.infos.map((o) => (
                  <InfoLine key={o.id}>Also running: {o.name}</InfoLine>
                ))}
              </div>
            )}

            <button type="button" className="cp-btn cp-btn-48 cp-btn-solid w-full" disabled={!canPublish} title={publishTitle} onClick={onPublish}>
              Publish
            </button>
            <p className="cp-muted -mt-1.5 mb-0 text-center text-[13px]">
              {!ready ? 'Finish the required steps to publish' : c.start && c.start > nowOf(state) ? `Starts ${fmtShortDateTime(c.start)}. Offers switch over by themselves.` : 'Starts as soon as you publish. Offers switch over by themselves.'}
            </p>
          </section>

          <RailCard id="cp-glance" title="At a glance">
            <dl className="cp-dl">
              <dt>Runs</dt>
              <dd>{c.start ? fmtWindow(c.start, c.end) : 'Not set'}</dd>
              {c.start && (
                <>
                  <dt>Starts in</dt>
                  <dd>{startIn ? startIn.replace(/^in /, '') : 'As soon as you publish'}</dd>
                </>
              )}
              <dt>Offers</dt>
              <dd>{lines.length || 'None'}</dd>
              <dt>Campaign price</dt>
              <dd>{c.campaignPrice ? priceText(state, c.campaignPrice) : 'None'}</dd>
              <dt>Store displays</dt>
              <dd>{displaysOn ? `${displaysOn} on` : 'None'}</dd>
            </dl>
          </RailCard>

          <RailCard id="cp-ends" title="When it ends" gap={8}>
            <p className="cp-muted m-0 text-sm leading-normal">{whenItEnds(state, c, false)}</p>
            {c.campaignPrice && campaignPriceCountdownClashes(state, c.campaignPrice).length === 0 && <p className="cp-muted m-0 text-[13px] leading-normal">Products' own Countdown settings are kept and return after the campaign.</p>}
          </RailCard>

          <RailCard id="cp-results" title="Results" dashed gap={8}>
            <p className="cp-muted m-0 text-sm leading-normal">Revenue, orders and AOV change show here once the campaign starts.</p>
          </RailCard>
        </aside>
      </div>
    </>
  )
}
