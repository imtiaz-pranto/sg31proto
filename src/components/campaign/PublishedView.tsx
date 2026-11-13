// Scheduled, Running, Paused and Ended layouts (brief v3.2, S2 sections 4 to 6):
// a status strip, then results and a compact Setup summary, with status and controls in the rail.

import { CirclePause, Clock, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  displayLabel,
  displayName,
  endedSentence,
  fmtDateAtTime,
  offerLines,
  offerSummaryNote,
  plural,
  priceText,
  productsText,
  progressPct,
  runDays,
  startsIn,
  topDisplay,
  whatHappensWhen,
  whenItEnded,
  whenItEnds,
  windowDates,
} from '../../lib/campaignText'
import {
  activeSurfaces,
  campaignModuleWarnings,
  daysBetween,
  fmtDate,
  fmtMoney,
  fmtPct,
  fmtRange,
  fmtShort,
  fmtShortDateTime,
  isCampaignLive,
  licenceWarning,
  nowOf,
  overlapChecks,
  overlapWarningText,
  revenueNote,
  storeDuring,
  todayOf,
} from '../../lib/derive'
import { useStore } from '../../store/store'
import type { AppState, Campaign, CampaignStatus } from '../../types'
import { LedToSale, RevenueByDay, type DayColumn } from '../ui/Charts'
import { WarnChip } from '../ui/Chip'
import { Drawer } from '../ui/Overlay'
import { InfoLine, RailCard, WarnBox } from './bits'
import { DisplaysEditor, OffersEditor, PriceEditor, ScheduleEditor } from './editors'
import { useCopyLink } from './hooks'

type Published = Exclude<CampaignStatus, 'draft'>
type SetupStep = 'schedule' | 'offers' | 'price' | 'displays'

interface Props {
  c: Campaign
  st: Published
  /** Licence Free or expired: nothing can be changed. */
  locked: boolean
  onPause: () => void
  onResume: () => void
  onEndNow: () => void
  onRunAgain: () => void
}

const GOOD = '#067647'
const BAD = '#B42318'
const tone = (n: number) => (n >= 0 ? GOOD : BAD)

export function PublishedView({ c, st, locked, onPause, onResume, onEndNow, onRunAgain }: Props) {
  const { state, actions } = useStore()
  const [setup, setSetup] = useState<SetupStep | null>(null)
  const [seeProductsFor, setSeeProductsFor] = useState<string | null>(null)
  const [copied, copyLink] = useCopyLink(c)
  const editable = st !== 'ended' && !locked

  // Setup edits apply to the store as they are made; the snapshot taken on open lets Cancel put things back.
  const openRef = useRef(false)
  useEffect(() => {
    openRef.current = setup !== null
  }, [setup])
  const openSetup = (s: SetupStep) => {
    actions.beginEdit(c.id)
    setSetup(s)
  }
  const closeSetup = (save: boolean) => {
    if (save) {
      actions.commitEdit(c.id)
      actions.toast(st === 'running' ? 'Saved. Changes apply right away.' : st === 'paused' ? 'Saved. Changes apply when you resume.' : 'Saved.')
    } else actions.cancelEdit(c.id)
    setSetup(null)
  }
  useEffect(
    () => () => {
      if (openRef.current) actions.cancelEdit(c.id)
    },
    [actions, c.id],
  )

  const lines = offerLines(state, c)
  const displays = activeSurfaces(state, c)
  const displayNames = displays.map((s) => s.summary).join(', ')
  const moduleWarnings = st === 'ended' ? [] : campaignModuleWarnings(state, c)
  const overlaps = st === 'ended' ? { warnings: [], infos: [] } : overlapChecks(state, c)
  const licence = st === 'ended' ? null : licenceWarning(state, c)
  const hasWarnings = overlaps.warnings.length > 0 || !!licence
  const endShort = c.end ? fmtShort(c.end) : null

  // ---------- status strip ----------

  let strip: ReactNode
  if (st === 'scheduled' && c.start) {
    const when = startsIn(state, c)
    strip = (
      <section aria-label="Status" className="cp-card flex flex-col gap-3.5 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock size={22} color="#1E3A8A" aria-hidden />
            <span className="text-[17px] font-semibold">
              Starts {when ?? 'now'}, on {fmtDateAtTime(c.start)}
            </span>
          </div>
          <span className="cp-muted text-sm">{c.end ? `Runs ${plural(runDays(c.start, c.end), 'day')}, until ${fmtDateAtTime(c.end)}` : 'No end date, always on'}</span>
        </div>
        <p className="cp-muted m-0 text-sm">Until then, your everyday offers keep running as normal. You can still change anything below.</p>
      </section>
    )
  } else if (st === 'running' && c.start) {
    if (c.end) {
      const total = runDays(c.start, c.end)
      const day = Math.min(total, Math.max(1, daysBetween(c.start, nowOf(state)) + 1))
      const leftDays = Math.max(0, daysBetween(nowOf(state), c.end))
      strip = (
        <section aria-label="Status" className="cp-card flex flex-col gap-3 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[17px] font-semibold">
              Day {day} of {total} · {leftDays === 0 ? 'ends today' : `ends in ${plural(leftDays, 'day')}`}
            </span>
            <span className="cp-muted text-sm">
              {fmtShortDateTime(c.start)} to {fmtShortDateTime(c.end)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F0F0F1]" role="progressbar" aria-label="Campaign progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct(state, c)}>
            <div className="h-2 rounded-full" style={{ width: `${progressPct(state, c)}%`, background: GOOD }} />
          </div>
        </section>
      )
    } else {
      strip = (
        <section aria-label="Status" className="cp-card flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <span className="text-[17px] font-semibold">Running since {fmtShort(c.start)} · always on</span>
          <span className="cp-muted text-sm">Started {fmtShortDateTime(c.start)}, no end date</span>
        </section>
      )
    }
  } else if (st === 'paused') {
    strip = (
      <section aria-label="Status" className="flex flex-col gap-3 rounded-xl border border-[#FEC84B] bg-[#FFFAEB] px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[17px] font-semibold">
            <CirclePause size={22} color="#B54708" aria-hidden />
            Paused since {fmtShortDateTime(c.pausedSince ?? nowOf(state))}
          </span>
          <span className="cp-muted text-sm">{c.end ? `Scheduled to end ${fmtShortDateTime(c.end)}` : 'No end date'}</span>
        </div>
        <p className="m-0 text-sm">Offers are back to their everyday versions and store displays are off. {endShort ? `Resume before ${endShort} to finish the campaign.` : 'Resume any time to carry on.'}</p>
      </section>
    )
  } else if (st === 'ended') {
    const end = c.end ?? c.endedOn ?? nowOf(state)
    strip = (
      <section aria-label="Summary" className="cp-card flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="flex flex-1 basis-[480px] flex-col gap-1.5">
          <span className="cp-muted text-sm">
            Ended {fmtDateAtTime(end)}
            {c.start ? ` · ran ${plural(runDays(c.start, end), 'day')}` : ''}
          </span>
          <span className="text-lg font-semibold leading-[1.4]">{endedSentence(c)}</span>
        </div>
        <button type="button" className="cp-btn cp-btn-outline" disabled={locked} onClick={onRunAgain}>
          Run again
        </button>
      </section>
    )
  }

  // ---------- results ----------

  const m = c.metrics
  const store = storeDuring(state, c)
  const results =
    st === 'scheduled' ? (
      <section aria-labelledby="cp-res" className="cp-card cp-card-dashed flex flex-col items-center gap-2 px-6 py-8 text-center">
        <TrendingUp size={28} color="#50575E" aria-hidden />
        <h2 id="cp-res" className="cp-h2">
          Results start on {fmtShort(c.start)}
        </h2>
        <p className="cp-muted m-0 max-w-[460px] text-sm">Revenue, orders, offer acceptance and AOV change appear here once the campaign is live, compared with the 30 days before it.</p>
      </section>
    ) : (
      <section aria-labelledby="cp-res" className="cp-card flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="cp-res" className="cp-h2">
            {st === 'running' ? 'Results so far' : st === 'paused' ? 'Results up to the pause' : 'Final results'}
          </h2>
          <span className="cp-muted text-xs">{st === 'running' ? 'Updated a few minutes ago' : st === 'paused' ? 'Nothing new is counted while paused' : 'Frozen when the campaign ended'}</span>
        </div>
        <div className="cp-metrics">
          <Metric label="Revenue from this campaign" value={m ? fmtMoney(m.revenue) : '--'} note={revenueNote(state.settings.attributionWindowDays)} />
          <Metric label="Orders" value={m ? String(m.orders) : '--'} note="Same rule as revenue" />
          <Metric label="Offer acceptance" value={m && m.acceptance !== null ? `${m.acceptance}%` : '--'} note="Carts that qualified and checked out" />
          <Metric label="Average order value" value={m ? fmtPct(m.aovLift) : '--'} note="Campaign orders vs the 30 days before" color={m ? tone(m.aovLift) : undefined} />
        </div>
        {store && c.start && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-[#F6F7F7] px-3.5 py-3 text-sm">
            <span className="font-semibold">Your whole store during this campaign:</span>
            <span>
              {fmtMoney(store.revenue)} {st === 'running' ? 'so far' : st === 'paused' ? 'while it ran' : `over the ${plural(runDays(c.start, c.end ?? nowOf(state)), 'day')}`},{' '}
              <span className="font-semibold" style={{ color: tone(store.pct) }}>
                {fmtPct(store.pct)} a day
              </span>{' '}
              vs the 30 days before
            </span>
            <span className="cp-muted text-xs">All store orders in the window. Context only, not credited to the campaign.</span>
          </div>
        )}
        <div className="cp-charts">
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="m-0 text-sm font-semibold">Revenue by day</h3>
            <RevenueByDay days={dayColumns(state, c, st)} />
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="m-0 text-sm font-semibold">What led to the sale</h3>
            <LedToSale data={m?.bySurface ?? {}} label={displayLabel} />
            <span className="cp-muted text-xs">Orders, by the last campaign display the shopper used</span>
          </div>
        </div>
      </section>
    )

  // ---------- Setup summary ----------

  const offerWarn = (offerId: string) => moduleWarnings.find((w) => w.kind === 'offer' && w.id === offerId)
  const modWarn = (kind: 'price' | 'surface') => moduleWarnings.find((w) => w.kind === kind)
  const chip = (since: string | null | undefined) => <WarnChip text={since ? `Module off since ${fmtDate(since)}` : 'Module off'} />
  const row = (label: string, value: ReactNode, action?: { text: string; onClick: () => void }) => (
    <div className={`cp-setup-row ${st === 'ended' ? 'cp-setup-row-ro' : ''}`}>
      <span className="font-semibold">{label}</span>
      <span className="min-w-0">{value}</span>
      {st !== 'ended' && (
        <span className="text-right">
          {action && (
            <button type="button" className="cp-link" disabled={locked && action.text !== 'Copy' && action.text !== 'Copied'} onClick={action.onClick}>
              {action.text}
            </button>
          )}
        </span>
      )}
    </div>
  )
  const none = <span className="cp-muted">None</span>
  const edit = (s: SetupStep, empty: boolean) => (editable ? { text: empty ? 'Add' : 'Edit', onClick: () => openSetup(s) } : undefined)

  const setupCard = (
    <section aria-labelledby="cp-setup" className="cp-card px-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 pt-4">
        <h2 id="cp-setup" className="cp-h2">
          Setup
        </h2>
        {st === 'running' ? <span className="text-[13px] font-semibold text-[#B54708]">Changes apply right away</span> : <span className="cp-muted text-[13px]">{st === 'scheduled' ? 'Editable until it starts' : st === 'paused' ? 'Changes apply when you resume' : 'Read-only. Run again to reuse it.'}</span>}
      </div>
      <div className="flex flex-col">
        {row(
          '1 · Schedule',
          <>
            {c.end === null && c.start ? `${fmtShortDateTime(c.start)}, always on` : c.start ? `${fmtShortDateTime(c.start)} to ${fmtShortDateTime(c.end)}` : fmtRange(c.start, c.end)} <span className="cp-muted">({state.settings.siteTimezone})</span>
          </>,
          edit('schedule', false),
        )}
        {row(
          `2 · Offers (${lines.length})`,
          lines.length === 0 ? (
            none
          ) : (
            <span className="flex flex-col gap-1">
              {lines.map((o) => (
                <span key={`${o.key.moduleId}:${o.key.offerId}`} className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span>
                    {o.name} <span className="cp-muted">· {offerSummaryNote(o)}</span>
                  </span>
                  {offerWarn(o.key.offerId) && chip(offerWarn(o.key.offerId)!.since)}
                </span>
              ))}
            </span>
          ),
          edit('offers', lines.length === 0),
        )}
        {row(
          '3 · Campaign price',
          c.campaignPrice ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {priceText(state, c.campaignPrice)}
              {modWarn('price') && chip(modWarn('price')!.since)}
            </span>
          ) : (
            none
          ),
          edit('price', !c.campaignPrice),
        )}
        {row('4 · Products', productsText(state, c) || none)}
        {row(
          '5 · On your store',
          displays.length > 0 || modWarn('surface') ? (
            <span className="flex flex-wrap items-center gap-1.5">
              {displayNames}
              {modWarn('surface') && chip(modWarn('surface')!.since)}
            </span>
          ) : (
            none
          ),
          edit('displays', displays.length === 0),
        )}
        {row(
          '6 · Campaign link',
          <>
            <span className="break-all">yourstore.com/?sg={c.linkSlug}</span>
            {st === 'ended' && <span className="cp-muted"> · no longer applies an offer</span>}
          </>,
          { text: copied ? 'Copied' : 'Copy', onClick: copyLink },
        )}
      </div>
    </section>
  )

  // ---------- rail ----------

  const worthALook = (withInfos: boolean) =>
    hasWarnings || (withInfos && overlaps.infos.length > 0) ? (
      <RailCard id="cp-look" title="Worth a look" gap={10}>
        {licence && (
          <WarnBox
            actions={
              <button type="button" className="cp-link" onClick={() => actions.renewLicence()}>
                Renew licence
              </button>
            }
          >
            {licence}
          </WarnBox>
        )}
        {overlaps.warnings.map((w) => (
          <WarnBox
            key={w.campaign.id}
            actions={
              <button type="button" className="cp-link" aria-expanded={seeProductsFor === w.campaign.id} onClick={() => setSeeProductsFor((v) => (v === w.campaign.id ? null : w.campaign.id))}>
                See products
              </button>
            }
          >
            {overlapWarningText(w)}
            {seeProductsFor === w.campaign.id && <span className="mt-1 block font-semibold">{w.products.map((pid) => state.products.find((p) => p.id === pid)?.name ?? pid).join(', ')}</span>}
          </WarnBox>
        ))}
        {withInfos && overlaps.infos.map((o) => <InfoLine key={o.id}>Also running: {o.name}</InfoLine>)}
      </RailCard>
    ) : null

  const live = isCampaignLive(state, c)
  const offerStates = (
    <>
      {lines.map((o) => {
        let line: string
        if (st === 'paused') line = o.attached ? `Back to its everyday version, ${o.everydayOn ? 'Live' : 'Off'}, until you resume` : 'Off until you resume'
        else if (!live) line = o.attached ? `Back to its everyday version, ${o.everydayOn ? 'Live' : 'Off'}, while the licence is not active` : 'Off while the licence is not active'
        else if (o.attached) line = `Campaign version · ${c.end ? `until ${fmtShortDateTime(c.end)}` : 'while the campaign runs'} · then back to ${o.everydayOn ? 'its everyday version' : 'Off'}`
        else line = `Made for this campaign · ${c.end ? `until ${fmtShortDateTime(c.end)}` : 'while the campaign runs'} · then it stops`
        const w = offerWarn(o.key.offerId)
        return (
          <div key={`${o.key.moduleId}:${o.key.offerId}`} className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">{o.name}</span>
            <span className="cp-timeline self-stretch">{line}</span>
            {w && <span>{chip(w.since)}</span>}
          </div>
        )
      })}
      {c.campaignPrice && (
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Campaign price: {priceText(state, c.campaignPrice)}</span>
          <span className="cp-timeline self-stretch">{st === 'paused' || !live ? 'Off for now. Products are back to their own prices.' : `${c.end ? `Until ${fmtShortDateTime(c.end)}` : 'While the campaign runs'} · then products go back to their own prices`}</span>
        </div>
      )}
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">{displays.length === 0 ? 'No store displays' : `${plural(displays.length, 'store display')}${st === 'paused' || !live ? ', all off' : ''}`}</span>
        {displays.length > 0 && <span className="cp-muted text-[13px]">{displayNames}</span>}
      </div>
      {overlaps.infos.map((o) => (
        <InfoLine key={o.id}>Also running: {o.name}</InfoLine>
      ))}
    </>
  )

  let rail: ReactNode
  if (st === 'scheduled') {
    rail = (
      <>
        <RailCard id="cp-timeline" title="What happens when" gap={14}>
          <div className="flex flex-col gap-3.5 text-sm">
            {whatHappensWhen(state, c).map((p) => (
              <div key={p.label} className="flex gap-3">
                <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full" style={p.filled ? { background: '#1E3A8A' } : { border: '2px solid #1E3A8A' }} />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{p.label}</span>
                  <span className="cp-muted">{p.text}</span>
                </span>
              </div>
            ))}
          </div>
        </RailCard>
        {worthALook(true)}
        <RailCard id="cp-share" title="Get ready" gap={10}>
          <p className="cp-muted m-0 text-sm leading-normal">Your campaign link works from {fmtShort(c.start)}. Add it to your emails, ads and Texty messages now.</p>
          <button type="button" className="cp-btn cp-btn-40 cp-btn-outline" onClick={copyLink}>
            {copied ? 'Link copied' : 'Copy campaign link'}
          </button>
        </RailCard>
      </>
    )
  } else if (st === 'running') {
    rail = (
      <>
        <RailCard id="cp-live" title={live ? 'Live on your store now' : 'Not live on your store'} gap={14}>
          {offerStates}
        </RailCard>
        {worthALook(false)}
        <RailCard id="cp-ctrl" title="Need to stop it?">
          <div className="cp-muted flex flex-col gap-1 text-[13px] leading-[1.45]">
            <span>
              <strong className="text-[#1D2327]">Pause</strong> turns everything off for now. {endShort ? `Resume any time before ${endShort}.` : 'Resume any time.'}
            </span>
            <span>
              <strong className="text-[#1D2327]">End now</strong> finishes it for good and freezes the results.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="cp-btn cp-btn-40" disabled={locked} onClick={onPause}>
              Pause
            </button>
            <button type="button" className="cp-btn cp-btn-40" disabled={locked} onClick={onEndNow}>
              End now
            </button>
          </div>
        </RailCard>
        <RailCard id="cp-ends" title="When it ends" gap={8}>
          <p className="cp-muted m-0 text-sm leading-normal">{whenItEnds(state, c, true)}</p>
        </RailCard>
      </>
    )
  } else if (st === 'paused') {
    rail = (
      <>
        <RailCard id="cp-live" title="Off while paused" gap={14}>
          {offerStates}
        </RailCard>
        {worthALook(false)}
        <RailCard id="cp-ctrl" title="Pick it back up">
          <div className="cp-muted flex flex-col gap-1 text-[13px] leading-[1.45]">
            <span>
              <strong className="text-[#1D2327]">Resume</strong> switches the campaign offers and displays back on{endShort ? ` until ${endShort}` : ''}.
            </span>
            <span>
              <strong className="text-[#1D2327]">End now</strong> finishes it for good and freezes the results.
            </span>
          </div>
          <button type="button" className="cp-btn cp-btn-solid text-[15px]" disabled={locked} onClick={onResume}>
            Resume
          </button>
          <button type="button" className="cp-btn cp-btn-40" disabled={locked} onClick={onEndNow}>
            End now
          </button>
        </RailCard>
        <RailCard id="cp-ends" title="When it ends" gap={8}>
          <p className="cp-muted m-0 text-sm leading-normal">{whenItEnds(state, c, true)}</p>
        </RailCard>
      </>
    )
  } else {
    const top = topDisplay(c)
    rail = (
      <>
        <RailCard id="cp-cmp" title="Compared with the 30 days before">
          <dl className="cp-dl">
            <dt>Average order value</dt>
            <dd className="font-semibold" style={m ? { color: tone(m.aovLift) } : undefined}>
              {m ? fmtPct(m.aovLift) : '--'}
            </dd>
            <dt>Store revenue a day</dt>
            <dd className="font-semibold" style={store ? { color: tone(store.pct) } : undefined}>
              {store ? fmtPct(store.pct) : '--'}
            </dd>
            <dt>Top store display</dt>
            <dd>{top ?? '--'}</dd>
          </dl>
        </RailCard>
        <RailCard id="cp-after" title="When it ended" gap={8}>
          <p className="cp-muted m-0 text-sm leading-normal">{whenItEnded(state, c)}</p>
        </RailCard>
        <RailCard id="cp-again" title="Run it again">
          <p className="cp-muted m-0 text-sm leading-normal">Copies the offers and store displays into a new draft. You pick new dates.</p>
          <button type="button" className="cp-btn cp-btn-solid text-[15px]" disabled={locked} onClick={onRunAgain}>
            Run again
          </button>
        </RailCard>
      </>
    )
  }

  const SETUP_TITLE: Record<SetupStep, string> = { schedule: 'Name and schedule', offers: 'Offers', price: 'Campaign price', displays: 'Show it on your store' }

  return (
    <>
      {strip}
      <div className="cp-cols">
        <div className="cp-main">
          {results}
          {setupCard}
        </div>
        <aside aria-label={st === 'ended' ? 'After the campaign' : 'Campaign status'} className="cp-rail">
          {rail}
        </aside>
      </div>

      <Drawer
        open={setup !== null}
        onClose={() => closeSetup(false)}
        title={setup ? `${SETUP_TITLE[setup]}: ${displayName(c)}` : ''}
        width={setup === 'offers' ? 760 : 640}
        footer={
          <>
            <button type="button" className="cp-btn cp-btn-40" onClick={() => closeSetup(false)}>
              Cancel
            </button>
            <button type="button" className="cp-btn cp-btn-40 cp-btn-solid" onClick={() => closeSetup(true)}>
              Save
            </button>
          </>
        }
      >
        <div className="cp" style={{ gap: 16 }}>
          <p className="m-0 text-[13px]" style={{ color: st === 'running' ? '#B54708' : '#50575E', fontWeight: st === 'running' ? 600 : 400 }}>
            {st === 'running' ? 'Changes apply right away' : st === 'paused' ? 'Changes apply when you resume' : 'Editable until it starts'}
          </p>
          {setup === 'schedule' && <ScheduleEditor c={c} readOnly={false} />}
          {setup === 'offers' && <OffersEditor c={c} readOnly={false} />}
          {setup === 'price' && <PriceEditor c={c} readOnly={false} startOpen={!c.campaignPrice} />}
          {setup === 'displays' && <DisplaysEditor c={c} readOnly={false} />}
        </div>
      </Drawer>
    </>
  )
}

function Metric({ label, value, note, color }: { label: string; value: string; note: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-[#E2E4E9] p-4">
      <span className="cp-muted text-[13px]">{label}</span>
      <span className="text-[26px] font-bold leading-tight" style={color ? { color } : undefined}>
        {value}
      </span>
      <span className="cp-muted text-xs leading-[1.4]">{note}</span>
    </div>
  )
}

/**
 * One column per day of the window. Running: days to come are placeholders and today is marked.
 * Paused: only the days that have numbers are bars. Ended: only the campaign's days.
 */
function dayColumns(state: AppState, c: Campaign, st: Published): DayColumn[] {
  const byDay = new Map((c.metrics?.byDay ?? []).map((d) => [d.date, d.revenue]))
  if (!c.start || byDay.size === 0) return []
  const today = todayOf(state)
  const lastData = [...byDay.keys()].sort().pop()!
  const end = c.end ? c.end.slice(0, 10) : today > lastData ? today : lastData
  return windowDates(c.start, end).map((date) => {
    const isToday = st === 'running' && date === today
    let revenue: number | null
    if (st === 'running') revenue = date <= today ? (byDay.get(date) ?? 0) : null
    else if (st === 'paused') revenue = byDay.get(date) ?? null
    else revenue = byDay.get(date) ?? 0
    return { date, label: isToday ? 'Today' : fmtShort(date), revenue, today: isToday }
  })
}
