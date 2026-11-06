import { Card, Field } from '../components/ui/Field'
import { useStore } from '../store/store'

/** Settings. The link attribution window and the read-only site timezone. */
export function SettingsPage() {
  const { state, actions } = useStore()
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-600">Store-wide rules for campaigns.</p>
      </div>
      <Card title="Campaigns">
        <div className="flex max-w-md flex-col gap-4">
          <Field label="Link attribution window (days)" htmlFor="attr-window" help="An order counts for a campaign when the session started from its link within this many days.">
            <input
              id="attr-window"
              type="number"
              min={1}
              max={90}
              className="input"
              value={state.settings.attributionWindowDays}
              onChange={(e) => actions.updateSettings({ attributionWindowDays: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label="Site timezone" htmlFor="site-tz" help="Campaign and coupon dates are read in this timezone.">
            <input id="site-tz" className="input" readOnly value={`${state.settings.siteTimezone} (from WordPress settings)`} />
          </Field>
        </div>
      </Card>
    </div>
  )
}
