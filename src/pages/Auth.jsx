import { CheckCircle2, Eye, EyeOff, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { googleSignInUrl, useAuth } from '../auth/AuthContext'
import Seo from '../component/Seo'
import { FieldError, Notice, PageLoader, Spinner } from '../component/States'
import { useAsyncOnce } from '../hooks/useAsyncOnce'
import { apiRequest } from '../utils/api'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="panel fade-in w-full max-w-md p-7 sm:p-9">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-white/65">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-white/65">{footer}</div>}
      </div>
    </section>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, invalid, placeholder = 'Password' }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative field-wrap">
      <input id={id} type={visible ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete} value={value} onChange={onChange} placeholder={placeholder} className={`input pr-11 ${invalid ? 'input-error' : ''}`} />
      <button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

function GoogleButton() {
  return (
    <a href={googleSignInUrl()} className="btn btn-outline btn-block">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.3-13.5-10l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
      Continue with Google
    </a>
  )
}

const Divider = () => <p className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-white/40"><span className="h-px flex-1 bg-white/15" />or<span className="h-px flex-1 bg-white/15" /></p>

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [state, setState] = useState({ loading: false, error: '', unverified: false, resent: false })
  const redirectTo = location.state?.from?.pathname || '/account'

  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '', unverified: false, resent: false })
    try {
      await signIn(await apiRequest('/auth/login', { method: 'POST', body: form }))
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setState({ loading: false, error: error.message, unverified: error.code === 'EMAIL_NOT_VERIFIED', resent: false })
    }
  }

  const resend = async () => {
    await apiRequest('/auth/resend-verification', { method: 'POST', body: { email: form.email } }).catch(() => {})
    setState((current) => ({ ...current, resent: true }))
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track orders and checkout faster." footer={<>New here? <Link to="/auth/register" className="font-semibold text-white underline">Create an account</Link></>}>
      <Seo title="Sign in" robots="noindex,nofollow" />
      <form onSubmit={submit} className="space-y-4">
        <Notice type="success">{location.state?.message}</Notice>
        <label className="label" htmlFor="login-email">Email<input id="login-email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" className="input" /></label>
        <div>
          <div className="mb-1.5 flex items-center justify-between"><label htmlFor="login-password" className="label">Password</label><Link to="/auth/forgot-password" className="text-xs text-white/70 hover:text-white">Forgot password?</Link></div>
          <PasswordInput id="login-password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </div>
        <Notice>{state.error}</Notice>
        {state.unverified && (state.resent ? <Notice type="success">If your account needs verification, a new link is on its way.</Notice> : <button type="button" onClick={resend} className="text-sm underline">Resend verification email</button>)}
        <button type="submit" disabled={state.loading} className="btn btn-primary btn-block">{state.loading ? <Spinner className="h-4 w-4" /> : 'Sign in'}</button>
      </form>
      <Divider />
      <GoogleButton />
    </AuthShell>
  )
}

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [state, setState] = useState({ loading: false, error: '', fields: {}, done: '' })

  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '', fields: {}, done: '' })
    try {
      const { message } = await apiRequest('/auth/register', { method: 'POST', body: form })
      setState({ loading: false, error: '', fields: {}, done: message })
    } catch (error) {
      setState({ loading: false, error: error.message, fields: error.fields || {}, done: '' })
    }
  }

  if (state.done) {
    return (
      <AuthShell title="Check your inbox">
        <Seo title="Create account" robots="noindex,nofollow" />
        <CheckCircle2 className="mb-4 text-emerald-300" size={40} aria-hidden="true" />
        <p className="text-white/80">{state.done}</p>
        <Link to="/auth/login" className="btn btn-primary mt-7">Go to sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="Join to save favourites and check out in seconds." footer={<>Already registered? <Link to="/auth/login" className="font-semibold text-white underline">Sign in</Link></>}>
      <Seo title="Create account" robots="noindex,nofollow" />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="label">Full name<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`input ${state.fields.name ? 'input-error' : ''}`} /><FieldError>{state.fields.name}</FieldError></label>
        <label className="label">Email<input type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={`input ${state.fields.email ? 'input-error' : ''}`} /><FieldError>{state.fields.email}</FieldError></label>
        <div>
          <label htmlFor="register-password" className="label mb-1.5">Password</label>
          <PasswordInput id="register-password" autoComplete="new-password" invalid={state.fields.password} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" />
          <FieldError>{state.fields.password}</FieldError>
        </div>
        <Notice>{state.error}</Notice>
        <button type="submit" disabled={state.loading} className="btn btn-primary btn-block">{state.loading ? <Spinner className="h-4 w-4" /> : 'Create account'}</button>
      </form>
      <Divider />
      <GoogleButton />
    </AuthShell>
  )
}

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ loading: false, error: '', done: '' })

  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '', done: '' })
    try {
      const { message } = await apiRequest('/auth/forgot-password', { method: 'POST', body: { email } })
      setState({ loading: false, error: '', done: message })
    } catch (error) {
      setState({ loading: false, error: error.message, done: '' })
    }
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send you a reset link." footer={<Link to="/auth/login" className="font-semibold text-white underline">Back to sign in</Link>}>
      <Seo title="Reset password" robots="noindex,nofollow" />
      <form onSubmit={submit} className="space-y-4">
        <label className="label">Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" /></label>
        <Notice>{state.error}</Notice>
        <Notice type="success">{state.done}</Notice>
        <button type="submit" disabled={state.loading} className="btn btn-primary btn-block">{state.loading ? <Spinner className="h-4 w-4" /> : 'Send reset link'}</button>
      </form>
    </AuthShell>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [state, setState] = useState({ loading: false, error: '' })

  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '' })
    try {
      const { message } = await apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } })
      navigate('/auth/login', { replace: true, state: { message } })
    } catch (error) {
      setState({ loading: false, error: error.message })
    }
  }

  if (!token) return <AuthShell title="Invalid link" subtitle="This password reset link is missing its token."><Link to="/auth/forgot-password" className="btn btn-primary">Request a new link</Link></AuthShell>

  return (
    <AuthShell title="Choose a new password" subtitle="Pick something you haven't used elsewhere.">
      <Seo title="Choose a new password" robots="noindex,nofollow" />
      <form onSubmit={submit} className="space-y-4">
        <PasswordInput id="reset-password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
        <Notice>{state.error}</Notice>
        <button type="submit" disabled={state.loading} className="btn btn-primary btn-block">{state.loading ? <Spinner className="h-4 w-4" /> : 'Reset password'}</button>
      </form>
    </AuthShell>
  )
}

export function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  // One-time tokens: the request must run exactly once even though React may mount twice in dev.
  const result = useAsyncOnce(token ? `verify:${token}` : null, () => apiRequest('/auth/verify-email', { method: 'POST', body: { token } }))

  if (!token) return <AuthShell title="Invalid link" subtitle="This verification link is missing its token."><Link to="/auth/login" className="btn btn-primary">Go to sign in</Link></AuthShell>
  if (result.pending) return <PageLoader />
  return (
    <AuthShell title={result.error ? 'Verification failed' : 'Email verified'}>
      <Seo title="Verify email" robots="noindex,nofollow" />
      {result.error ? <XCircle className="mb-4 text-red-300" size={40} aria-hidden="true" /> : <CheckCircle2 className="mb-4 text-emerald-300" size={40} aria-hidden="true" />}
      <p className="text-white/80">{result.error ? result.error.message : result.data.message}</p>
      <Link to="/auth/login" className="btn btn-primary mt-7">Go to sign in</Link>
    </AuthShell>
  )
}
