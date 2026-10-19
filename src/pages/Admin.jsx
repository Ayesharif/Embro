import { BarChart3, Calculator, FolderTree, LogOut, Mail, MessageSquare, Package, Percent, Settings, ShoppingBag, Store, Truck, Users } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Seo from '../component/Seo'
import { PageLoader } from '../component/States'
import Toaster from '../component/Toaster'

const DashboardPanel = lazy(() => import('../components/admin/DashboardPanel'))
const ProductsPanel = lazy(() => import('../components/admin/ProductsPanel'))
const CategoriesPanel = lazy(() => import('../components/admin/CategoriesPanel'))
const ShippingPanel = lazy(() => import('../components/admin/ShippingPanel'))
const AccountsPanel = lazy(() => import('../components/admin/AccountsPanel'))
const SettingsPanel = lazy(() => import('../components/admin/SettingsPanel'))
const OrdersPanel = lazy(() => import('../components/admin/OrdersPanel'))
const DiscountsPanel = lazy(() => import('../components/admin/DiscountsPanel'))
const UsersPanel = lazy(() => import('../components/admin/UsersPanel'))
const ReviewsPanel = lazy(() => import('../components/admin/InboxPanels').then((module) => ({ default: module.ReviewsPanel })))
const MessagesPanel = lazy(() => import('../components/admin/InboxPanels').then((module) => ({ default: module.MessagesPanel })))

const nav = [
  { to: '', label: 'Dashboard', icon: BarChart3 },
  { to: 'products', label: 'Products', icon: Package },
  { to: 'categories', label: 'Categories', icon: FolderTree },
  { to: 'orders', label: 'Orders', icon: ShoppingBag },
  { to: 'accounts', label: 'Accounts', icon: Calculator },
  { to: 'shipping', label: 'Shipping', icon: Truck },
  { to: 'discounts', label: 'Discounts', icon: Percent },
  { to: 'reviews', label: 'Reviews', icon: MessageSquare },
  { to: 'messages', label: 'Messages', icon: Mail },
  { to: 'users', label: 'Users', icon: Users },
  { to: 'settings', label: 'Settings', icon: Settings },
]

export default function Admin() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-950 text-white lg:grid lg:grid-cols-[15rem_1fr]">
      <Seo title="Admin" robots="noindex,nofollow" />
      <aside className="border-b border-white/10 bg-black/40 p-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <p className="px-2 text-lg font-bold">Lembro admin</p>
        <p className="truncate px-2 text-xs text-white/55">{user.email}</p>
        <nav aria-label="Admin" className="mt-4 flex gap-1 overflow-x-auto lg:flex-col">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={label} to={`/admin/${to}`} end={to === ''} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${isActive ? 'bg-white font-semibold text-slate-900' : 'text-white/75 hover:bg-white/10'}`}><Icon size={17} />{label}</NavLink>
          ))}
        </nav>
        <div className="mt-4 hidden flex-col gap-1 border-t border-white/10 pt-4 lg:flex">
          <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 hover:bg-white/10"><Store size={17} />View store</Link>
          <button type="button" onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-500/10"><LogOut size={17} />Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 p-5 sm:p-8">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<DashboardPanel />} />
            <Route path="products" element={<ProductsPanel />} />
            <Route path="categories" element={<CategoriesPanel />} />
            <Route path="orders" element={<OrdersPanel />} />
            <Route path="accounts" element={<AccountsPanel />} />
            <Route path="shipping" element={<ShippingPanel />} />
            <Route path="discounts" element={<DiscountsPanel />} />
            <Route path="reviews" element={<ReviewsPanel />} />
            <Route path="messages" element={<MessagesPanel />} />
            <Route path="users" element={<UsersPanel />} />
            <Route path="settings" element={<SettingsPanel />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Toaster />
    </div>
  )
}
