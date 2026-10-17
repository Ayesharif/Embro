import { CheckCircle2, Send } from 'lucide-react'
import { useState } from 'react'
import { apiRequest } from '../utils/api'
import { Notice, Spinner } from './States'
import StarInput from './StarInput'

const MAX = 600
const prompts = ['What did you like most?', 'How was the quality?', 'Would you recommend it to a friend?']

// Used on product pages (fixed product) and the home page (product picker).
export default function ReviewComposer({ productId, products, onDone }) {
  const [form, setForm] = useState({ productId: productId || '', rating: 0, title: '', body: '' })
  const [state, setState] = useState({ sending: false, error: '', done: false })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.rating) return setState({ sending: false, error: 'Please choose a star rating.', done: false })
    setState({ sending: true, error: '', done: false })
    try {
      await apiRequest('/reviews', { method: 'POST', body: { productId: form.productId, rating: form.rating, title: form.title, body: form.body } })
      setState({ sending: false, error: '', done: true })
      return onDone?.()
    } catch (error) {
      return setState({ sending: false, error: error.message, done: false })
    }
  }

  if (state.done) {
    return (
      <div className="fade-in py-6 text-center" role="status">
        <CheckCircle2 size={48} className="mx-auto text-emerald-300" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold">Thank you for your review!</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">It will appear on the site once our team has approved it.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {products && (
        <label className="label">Which product?
          <select required value={form.productId} onChange={set('productId')} className="input">
            <option value="">Select a product you bought…</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
      )}
      <div><p className="label mb-2">Your rating</p><StarInput value={form.rating} onChange={(rating) => setForm((current) => ({ ...current, rating }))} /></div>
      <label className="label">Headline <span className="font-normal text-white/45">(optional)</span>
        <input maxLength={120} value={form.title} onChange={set('title')} placeholder="Sum it up in a few words" className="input" />
      </label>
      <label className="label">Your review
        <textarea required minLength={10} maxLength={MAX} rows={5} value={form.body} onChange={set('body')} placeholder={prompts[form.body.length % prompts.length]} className="input resize-none" />
        <span className={`mt-1 block text-right text-xs font-normal ${form.body.length > MAX - 50 ? 'text-amber-200' : 'text-white/45'}`}>{form.body.length}/{MAX}</span>
      </label>
      <Notice>{state.error}</Notice>
      <button type="submit" disabled={state.sending || (products && !form.productId)} className="btn btn-primary btn-block">
        {state.sending ? <><Spinner className="h-4 w-4" /> Submitting...</> : <><Send size={16} /> Submit review</>}
      </button>
    </form>
  )
}
