import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { DraftView } from '../components/campaign/DraftView'
import { saveStateLabel, useWallClock } from '../components/campaign/hooks'
import { PublishedView } from '../components/campaign/PublishedView'
import { TemplatePicker } from '../components/TemplatePicker'
import { WarnChip } from '../components/ui/Chip'
import { Modal } from '../components/ui/Overlay'
import { ProActionButton } from '../components/ui/UpgradeCard'
import { displayName, requiredItems } from '../lib/campaignText'
import { campaignModuleWarnings, effectiveStatus, offerName, offerOf } from '../lib/derive'
import { useStore } from '../store/store'
import type { Campaign, CampaignStatus } from '../types'

const STATUS: Record<CampaignStatus, { bg: string; fg: string; label: string }> = {
  running: { bg: '#D1FAE5', fg: '#065F46', label: 'Running' },
  scheduled: { bg: '#DBEAFE', fg: '#1E3A8A', label: 'Scheduled' },
  draft: { bg: '#FEF3C7', fg: '#92400E', label: 'Draft' },
  paused: { bg: '#FEF3C7', fg: '#92400E', label: 'Paused' },
  ended: { bg: '#F3F4F6', fg: '#374151', label: 'Ended' },
}

/** S2. Campaign page. Draft: six setup steps with a publish checklist. Published: results first, setup as a summary. */
export function CampaignPage() {
  const { id } = useParams()
  const { state } = useStore()
  const c = state.campaigns.find((x) => x.id === id)
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
  return <CampaignView key={c.id} c={c} />
}

function CampaignView({ c }: { c: Campaign }) {
  const nav = useNavigate()
  const { state, actions } = useStore()
  const [picker, setPicker] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const wallClock = useWallClock()

  const st = effectiveStatus(state, c)
  const locked = state.licence !== 'pro'
  const expired = state.licence === 'proExpired'
  const name = displayName(c)
  const dirty = st === 'draft' && !!state.editBackups[c.id]
  const left = st === 'draft' ? requiredItems(state, c).filter((r) => !r.done).length : 0
  const canPublish = !locked && left === 0
  const publishTitle = left > 0 ? `Finish the ${left} required ${left === 1 ? 'step' : 'steps'} to publish` : undefined
  const moduleOff = st !== 'ended' && campaignModuleWarnings(state, c).length > 0
  const ownOfferNames = c.offerRefs
    .filter((r) => r.mode === 'campaignOnly')
    .map((r) => offerOf(state, r))
    .filter((o) => !!o)
    .map((o) => offerName(o!))

  // "Leave without saving?": block in-app navigation away from a draft with unsaved changes.
  const dirtyRef = useRef(dirty)
  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])
  const leaving = useRef(false)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && !leaving.current && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (!menu) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const runAgain = () => nav(`/campaigns/${actions.clone(c.id)}`)
  const del = () => {
    leaving.current = true
    actions.deleteCampaign(c.id)
    nav('/campaigns')
  }
  const endNow = () => {
    actions.endNow(c.id)
    setConfirmEnd(false)
  }
  const item = (label: string, onClick: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
    <button
      type="button"
      role="menuitem"
      className={opts.danger ? 'cp-menu-danger' : undefined}
      disabled={opts.disabled}
      onClick={() => {
        setMenu(false)
        onClick()
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="cp">
      {locked && (
        <div className="cp-card flex flex-wrap items-center gap-4 bg-[#F9FAFB] p-4">
          <div className="flex-1 text-sm font-semibold">{expired ? 'Your StoreGrowth Pro licence has expired, so your campaigns are stopped. Renew it to run them again.' : 'Campaigns is a StoreGrowth Pro feature. This is a preview with sample data.'}</div>
          <ProActionButton />
        </div>
      )}

      {/* Header: back link, name, status chip, save state, then the buttons for this status. */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link to="/campaigns" className="cp-muted flex items-center gap-1.5 self-start text-[13px] hover:underline">
            <ChevronLeft size={16} aria-hidden />
            Campaigns
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-[26px] font-bold leading-tight tracking-[-0.02em]">{name}</h1>
            <span className="flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ background: STATUS[st].bg, color: STATUS[st].fg }}>
              {st === 'running' && <span className="h-[7px] w-[7px] rounded-full bg-[#067647]" />}
              {STATUS[st].label}
            </span>
            {st === 'draft' && (
              <span className="cp-muted text-[13px]" role="status">
                {saveStateLabel(c.savedAt, dirty, wallClock)}
              </span>
            )}
            {moduleOff && <WarnChip text="Module off" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {st === 'draft' && (
            <>
              <button type="button" className="cp-btn" disabled={locked} onClick={() => actions.saveDraft(c.id)}>
                Save draft
              </button>
              <button type="button" className="cp-btn cp-btn-solid" disabled={!canPublish} title={publishTitle} onClick={() => actions.publish(c.id)}>
                Publish
              </button>
            </>
          )}
          {st === 'scheduled' && (
            <button type="button" className="cp-btn" disabled={locked} onClick={() => actions.unpublish(c.id)}>
              Unpublish
            </button>
          )}
          {st === 'running' && (
            <>
              <button type="button" className="cp-btn" disabled={locked} onClick={() => actions.pause(c.id)}>
                Pause
              </button>
              <button type="button" className="cp-btn" disabled={locked} onClick={() => setConfirmEnd(true)}>
                End now
              </button>
            </>
          )}
          {st === 'paused' && (
            <>
              <button type="button" className="cp-btn cp-btn-solid" disabled={locked} onClick={() => actions.resume(c.id)}>
                Resume
              </button>
              <button type="button" className="cp-btn" disabled={locked} onClick={() => setConfirmEnd(true)}>
                End now
              </button>
            </>
          )}
          {st === 'ended' && (
            <button type="button" className="cp-btn cp-btn-solid" disabled={locked} onClick={runAgain}>
              Run again
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button type="button" className="cp-btn cp-btn-icon" aria-label="More actions" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal size={18} aria-hidden />
            </button>
            {menu && (
              <div className="cp-menu" role="menu" aria-label="More actions">
                {st === 'draft' && item('Use template', () => setPicker(true), { disabled: locked })}
                {item('Clone', () => nav(`/campaigns/${actions.clone(c.id)}`), { disabled: locked })}
                {item('Preview storefront', () => nav(`/storefront?campaign=${c.id}`))}
                {item('Delete', () => setConfirmDelete(true), { danger: true, disabled: locked })}
              </div>
            )}
          </div>
        </div>
      </div>

      {st === 'draft' ? (
        <DraftView c={c} readOnly={locked} canPublish={canPublish} publishTitle={publishTitle} onPublish={() => actions.publish(c.id)} onBrowseTemplates={() => setPicker(true)} />
      ) : (
        <PublishedView c={c} st={st} locked={locked} onPause={() => actions.pause(c.id)} onResume={() => actions.resume(c.id)} onEndNow={() => setConfirmEnd(true)} onRunAgain={runAgain} />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete campaign" width={480}>
        <div className="cp" style={{ gap: 16 }} role="alertdialog" aria-label="Confirm delete">
          <p className="m-0 text-sm">
            Delete {name}? Attached offers go back to their everyday versions.
            {ownOfferNames.length > 0 && <span className="mt-2 block">These offers made for this campaign will be deleted: {ownOfferNames.join(', ')}.</span>}
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" className="cp-btn cp-btn-40" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button type="button" className="cp-btn cp-btn-40 cp-btn-danger" onClick={del}>
              Delete campaign
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End campaign" width={480}>
        <div className="cp" style={{ gap: 16 }} role="alertdialog" aria-label="Confirm end now">
          <p className="m-0 text-sm">End {name} now? It finishes for good and the results freeze.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="cp-btn cp-btn-40" onClick={() => setConfirmEnd(false)}>
              Cancel
            </button>
            <button type="button" className="cp-btn cp-btn-40 cp-btn-solid" onClick={endNow}>
              End now
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title="Leave without saving?" width={480}>
        <div className="cp" style={{ gap: 16 }} role="alertdialog" aria-label="Leave without saving?">
          <p className="m-0 text-sm">{name} has changes that are not saved. If you leave now, they are lost.</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="cp-btn cp-btn-40" onClick={() => blocker.reset?.()}>
              Keep editing
            </button>
            <button
              type="button"
              className="cp-btn cp-btn-40 cp-btn-danger"
              onClick={() => {
                actions.cancelEdit(c.id)
                blocker.proceed?.()
              }}
            >
              Leave without saving
            </button>
          </div>
        </div>
      </Modal>

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
