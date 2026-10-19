import { ArrowUp, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'
import { site } from '../config/site'
import { toast } from '../stores/toastStore'
import { apiRequest } from '../utils/api'

const shopLinks = [
  { label: 'All products', to: '/products' },
  { label: 'New arrivals', to: '/products?sort=newest' },
  { label: 'Top rated', to: '/products?sort=rating' },
]
const companyLinks = [
  { label: 'About us', to: '/about' },
  { label: 'Contact us', to: '/contact' },
  { label: 'My account', to: '/account' },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const subscribe = async (event) => {
    event.preventDefault()
    setSending(true)
    try {
      const { message } = await apiRequest('/newsletter', { method: 'POST', body: { email } })
      toast.success(message)
      setEmail('')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <footer className="mt-12 border-t border-white/15 bg-black/70 text-white backdrop-blur-md">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Link to="/" className="inline-block w-20" aria-label="Go to home"><img src={logo} alt="Lembro" className="w-full object-contain" /></Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/65">{site.tagline}</p>
          <div className="mt-5 flex gap-3">
            {site.instagram && <a href={site.instagram} target="_blank" rel="noreferrer noopener" aria-label="Instagram" className="rounded-full border border-white/20 p-2 text-sm font-bold transition hover:border-white hover:bg-white/10">ig</a>}
            <a href={`mailto:${site.email}`} aria-label="Email us" className="rounded-full border border-white/20 p-2 transition hover:border-white hover:bg-white/10"><Mail size={17} /></a>
          </div>
        </div>

        {[['Shop', shopLinks], ['Information', companyLinks]].map(([heading, links]) => (
          <nav key={heading} aria-label={heading}>
            <h2 className="text-sm font-semibold uppercase tracking-widest">{heading}</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-white/65">
              {links.map((link) => <Link key={link.label} to={link.to} className="transition hover:text-white">{link.label}</Link>)}
            </div>
          </nav>
        ))}

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest">Stay connected</h2>
          <p className="mt-4 text-sm leading-6 text-white/65">Subscribe for new product updates and creative inspiration.</p>
          <form onSubmit={subscribe} className="mt-4 flex overflow-hidden rounded-lg border border-white/20 bg-white/5 focus-within:border-white/60">
            <label htmlFor="footer-email" className="sr-only">Email address</label>
            <input id="footer-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" autoComplete="email" className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/40" />
            <button type="submit" disabled={sending} aria-label="Subscribe" className="px-3 transition hover:bg-white hover:text-black disabled:opacity-50"><Send size={17} /></button>
          </form>
          <div className="mt-5 space-y-2 text-sm text-white/65">
            <p className="flex items-center gap-2"><MapPin size={15} /> {site.address}</p>
            <p className="flex items-center gap-2"><Phone size={15} /> {site.phone}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 self-start transition hover:text-white sm:self-auto">Back to top <ArrowUp size={14} /></button>
        </div>
      </div>
    </footer>
  )
}
