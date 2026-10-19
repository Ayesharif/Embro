import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import PageHeader from '../component/PageHeader'
import Seo from '../component/Seo'
import { FieldError, Notice, Spinner } from '../component/States'
import { site } from '../config/site'
import { apiRequest } from '../utils/api'

const info = [
  { icon: MapPin, label: 'Visit us', value: site.address },
  { icon: Phone, label: 'Call us', value: site.phone },
  { icon: Mail, label: 'Email us', value: site.email },
  { icon: Clock, label: 'Opening hours', value: site.hours },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', website: '' })
  const [status, setStatus] = useState({ sending: false, error: '', fields: {}, sent: false })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setStatus({ sending: true, error: '', fields: {}, sent: false })
    try {
      await apiRequest('/contact', { method: 'POST', body: form })
      setForm({ name: '', email: '', phone: '', message: '', website: '' })
      setStatus({ sending: false, error: '', fields: {}, sent: true })
    } catch (error) {
      setStatus({ sending: false, error: error.message, fields: error.fields || {}, sent: false })
    }
  }

  return (
    <>
      <Seo title="Contact" description="Get in touch with the Lembro team." jsonLd={{
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `Contact ${site.name}`,
        url: new URL('/contact', window.location.origin).toString(),
      }} />
      <PageHeader title="Contact us" crumbs={[{ label: 'Contact' }]} />
      <section className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          {info.map(({ icon: Icon, label, value }) => (
            <div key={label} className="panel flex items-start gap-4 p-5">
              <Icon className="mt-0.5 shrink-0 text-cyan-200" aria-hidden="true" />
              <div><h2 className="text-sm font-semibold">{label}</h2><p className="mt-1 text-sm text-white/70">{value}</p></div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="panel space-y-4 p-6" noValidate>
          <h2 className="text-xl font-bold">Send us a message</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="label">Name<input required autoComplete="name" value={form.name} onChange={set('name')} className={`input ${status.fields.name ? 'input-error' : ''}`} /><FieldError>{status.fields.name}</FieldError></label>
            <label className="label">Email<input required type="email" autoComplete="email" value={form.email} onChange={set('email')} className={`input ${status.fields.email ? 'input-error' : ''}`} /><FieldError>{status.fields.email}</FieldError></label>
          </div>
          <label className="label">Phone (optional)<input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className="input" /></label>
          <label className="label">Message<textarea required rows={6} value={form.message} onChange={set('message')} className={`input ${status.fields.message ? 'input-error' : ''}`} /><FieldError>{status.fields.message}</FieldError></label>
          {/* Honeypot field: invisible to people, tempting to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label></div>
          <Notice>{status.error}</Notice>
          {status.sent && <Notice type="success">Thanks! Your message has been sent. We'll reply as soon as we can.</Notice>}
          <button type="submit" disabled={status.sending} className="btn btn-primary">{status.sending ? <><Spinner className="h-4 w-4" /> Sending...</> : 'Send message'}</button>
        </form>
      </section>
    </>
  )
}
