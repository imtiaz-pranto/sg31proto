import { useStore } from '../../store/store'

/** Names the version a drawer edits: "Everyday version", "[Campaign] version" or "Campaign-only: [Campaign]". */
export function VersionHeader({ versionCampaignId, campaignOnlyOf }: { versionCampaignId: string | null | undefined; campaignOnlyOf: string | null | undefined }) {
  const { state } = useStore()
  const vc = versionCampaignId ? state.campaigns.find((x) => x.id === versionCampaignId) : null
  const oc = campaignOnlyOf ? state.campaigns.find((x) => x.id === campaignOnlyOf) : null
  const label = vc ? `${vc.name} version` : oc ? `Campaign-only: ${oc.name}` : 'Everyday version'
  const sub = vc
    ? 'Only what this campaign changes. The everyday version is untouched.'
    : oc
      ? 'Lives only inside this campaign. It is offline outside the campaign window.'
      : 'What the module applies whenever no running campaign controls this offer.'
  const blue = vc || oc
  return (
    <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: blue ? '#dbeafe' : '#f3f4f6', color: blue ? '#1e3a8a' : '#374151' }}>
      <div className="text-sm font-semibold">{label}</div>
      <div>{sub}</div>
    </div>
  )
}
