import { useEffect, useState } from 'react'
import type { Campaign } from '../../types'

/** Copy the campaign link. `copied` stays true for a moment so the button can say so. */
export function useCopyLink(c: Campaign): [boolean, () => void] {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    // The clipboard may be unavailable in a preview pane; the button still confirms.
    navigator.clipboard?.writeText(`https://yourstore.com/?sg=${c.linkSlug}`).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }
  return [copied, copy]
}

/** Wall-clock time, refreshed every 20 seconds, for "Saved [n] minutes ago". */
export function useWallClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 20000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

/** "Not saved yet", "Unsaved changes", "Saved just now", "Saved [n] minutes ago". */
export function saveStateLabel(savedAt: number | undefined, dirty: boolean, now: number): string {
  if (savedAt === undefined) return 'Not saved yet'
  if (dirty) return 'Unsaved changes'
  const mins = Math.floor(Math.max(0, now - savedAt) / 60000)
  if (mins < 1) return 'Saved just now'
  if (mins < 60) return `Saved ${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`
  const hours = Math.floor(mins / 60)
  return `Saved ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
}
