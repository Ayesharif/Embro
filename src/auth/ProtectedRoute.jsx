import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { PageLoader } from '../component/States'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { status, isAuthenticated, isAdmin } = useAuth()
  const location = useLocation()

  // Wait for the session check; otherwise a signed-in user is bounced to /login on every refresh.
  if (status === 'loading') return <PageLoader />
  if (!isAuthenticated) {
    return <Navigate to={adminOnly ? '/admin/login' : '/auth/login'} replace state={{ from: location }} />
  }
  if (adminOnly && !isAdmin) return <Navigate to="/admin/login" replace state={{ denied: true }} />
  return children
}
