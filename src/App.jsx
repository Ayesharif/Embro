import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import { PageLoader } from './component/States'
import Toaster from './component/Toaster'
import Layout from './layout/layout'
import About from './pages/About'
import Account from './pages/Account'
import { ForgotPassword, Login, Register, ResetPassword, VerifyEmail } from './pages/Auth'
import Contact from './pages/Contact'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import OAuthCallback from './pages/OAuthCallback'
import ProductDetail from './pages/ProductDetail'
import Shop from './pages/Shop'
import Wishlist from './pages/Wishlist'

// Heavy, rarely-used areas are split out so the storefront loads quickly.
const Checkout = lazy(() => import('./pages/Checkout'))
const Admin = lazy(() => import('./pages/Admin'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))

export default function App() {
  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Shop />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="auth/login" element={<Login />} />
            <Route path="auth/register" element={<Register />} />
            <Route path="auth/forgot-password" element={<ForgotPassword />} />
            <Route path="auth/reset-password" element={<ResetPassword />} />
            <Route path="auth/verify-email" element={<VerifyEmail />} />
            <Route path="auth/callback" element={<OAuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/*" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  )
}
