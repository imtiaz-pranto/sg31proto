import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PrototypeControls } from './components/PrototypeControls'
import { Toasts } from './components/ui/Toasts'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BogoPage } from './pages/BogoPage'
import { CampaignPage } from './pages/CampaignPage'
import { CampaignsList } from './pages/CampaignsList'
import { CartRewardsPage } from './pages/CartRewardsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModulesPage } from './pages/ModulesPage'
import { OrderBumpPage } from './pages/OrderBumpPage'
import { SettingsPage } from './pages/SettingsPage'
import { SmartCouponFormPage } from './pages/SmartCouponFormPage'
import { SmartCouponsList } from './pages/SmartCouponsList'
import { StorefrontPage } from './pages/StorefrontPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="campaigns" element={<CampaignsList />} />
          <Route path="campaigns/:id" element={<CampaignPage />} />
          <Route path="modules" element={<ModulesPage />} />
          <Route path="modules/smart-coupons" element={<SmartCouponsList />} />
          <Route path="modules/smart-coupons/new" element={<SmartCouponFormPage />} />
          <Route path="modules/smart-coupons/:id" element={<SmartCouponFormPage />} />
          <Route path="modules/bogo" element={<BogoPage />} />
          <Route path="modules/order-bump" element={<OrderBumpPage />} />
          <Route path="modules/cart-rewards" element={<CartRewardsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="storefront" element={<StorefrontPage />} />
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
      <PrototypeControls />
      <Toasts />
    </>
  )
}
