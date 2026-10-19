import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Seo from '../component/Seo'
import { Notice, Spinner } from '../component/States'
import { apiRequest } from '../utils/api'

export default function AdminLogin() {
  const { signIn, signOut, isAdmin, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [state, setState] = useState({ loading: false, error: location.state?.denied ? 'This account does not have admin access.' : '' })

  if (status === 'ready' && isAdmin) return <Navigate to="/admin" replace />

  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '' })
    try {
      const payload = await apiRequest('/auth/login', { method: 'POST', body: form })
      if (!['admin', 'super_admin'].includes(payload.user.role)) {
        await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {})
        setState({ loading: false, error: 'This account does not have admin access.' })
        return
      }
      await signIn(payload)
      navigate(location.state?.from?.pathname || '/admin', { replace: true })
    } catch (error) {
      setState({ loading: false, error: error.message })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <Seo title="Admin sign in" robots="noindex,nofollow" />
      <form onSubmit={submit} className="panel w-full max-w-sm space-y-4 p-8">
        <ShieldCheck size={36} className="text-cyan-200" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Admin portal</h1>
        <label className="label">Email<input type="email" required autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="input" /></label>
        <label className="label">Password<input type="password" required autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="input" /></label>
        <Notice>{state.error}</Notice>
        <button type="submit" disabled={state.loading} className="btn btn-primary btn-block">{state.loading ? <Spinner className="h-4 w-4" /> : 'Sign in'}</button>
        {status === 'ready' && !isAdmin && <button type="button" onClick={signOut} className="w-full text-center text-xs text-white/50 underline">Sign out of the current account</button>}
      </form>
    </main>
  )
}
