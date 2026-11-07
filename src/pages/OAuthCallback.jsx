import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Seo from '../component/Seo'
import { PageLoader } from '../component/States'
import { useAsyncOnce } from '../hooks/useAsyncOnce'
import { apiRequest } from '../utils/api'

const messages = {
  cancelled: 'Google sign-in was cancelled.',
  invalid_state: 'The sign-in request could not be verified. Please try again.',
  unverified_email: 'Your Google account email is not verified.',
  not_configured: 'Google sign-in is not available right now.',
  unavailable: 'This account is unavailable.',
}

export default function OAuthCallback() {
  const [params] = useSearchParams()
  const code = params.get('code')
  const urlError = params.get('error')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const result = useAsyncOnce(code ? `oauth:${code}` : null, () => apiRequest('/auth/oauth/callback', { method: 'POST', body: { code } }))

  useEffect(() => {
    if (result.data) signIn(result.data).then(() => navigate('/account', { replace: true }))
  }, [result.data, signIn, navigate])

  const error = urlError ? (messages[urlError] || 'Google sign-in failed. Please try again.') : result.error?.message || (!code && 'The sign-in link is incomplete.')
  if (!error) return <PageLoader />
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Seo title="Sign-in failed" robots="noindex,nofollow" />
      <h1 className="text-2xl font-bold">Sign-in failed</h1>
      <p className="mt-3 max-w-md text-white/70">{error}</p>
      <Link to="/auth/login" className="btn btn-primary mt-7">Back to sign in</Link>
    </section>
  )
}
