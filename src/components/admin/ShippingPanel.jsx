import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Notice, Spinner } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { currencySymbol, money, toCents } from '../../utils/format'
import ImageField from './ImageField'
import { Loaded, Modal, PanelHeader, Table } from './ui'

const days = (method) => (method.estimatedDaysMax === 0 ? 'Same day' : method.estimatedDaysMin === method.estimatedDaysMax ? `${method.estimatedDaysMax} day${method.estimatedDaysMax === 1 ? '' : 's'}` : `${method.estimatedDaysMin}-${method.estimatedDaysMax} days`)

function ShippingForm({ method, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: method?.name || '',
    description: method?.description || '',
    price: method ? (method.amount / 100).toFixed(2) : '',
    min: method?.estimatedDaysMin ?? 1,
    max: method?.estimatedDaysMax ?? 3,
    isActive: method?.isActive ?? true,
    image: method?.image?.secureUrl ? { publicId: method.image.publicId, secureUrl: method.image.secureUrl } : null,
  })
  const [state, setState] = useState({ saving: false, error: '' })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setState({ saving: true, error: '' })
    const body = {
      name: form.name,
      description: form.description,
      amount: toCents(form.price),
      estimatedDaysMin: Number(form.min),
      estimatedDaysMax: Number(form.max),
      isActive: form.isActive,
      image: form.image,
    }
    try {
      await apiRequest(method ? `/admin/shipping-methods/${method.id}` : '/admin/shipping-methods', { method: method ? 'PATCH' : 'POST', body })
      toast.success('Shipping method saved')
      onSaved()
    } catch (error) {
      setState({ saving: false, error: error.message })
    }
  }

  return (
    <Modal title={method ? 'Edit shipping method' : 'New shipping method'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ImageField label="Image / logo" folder="embro/shipping" value={form.image} onChange={(image) => setForm((current) => ({ ...current, image }))} hint="Optional - e.g. the courier's logo or a delivery icon." />
        <label className="label">Title<input required minLength={2} maxLength={80} value={form.name} onChange={set('name')} placeholder="Express delivery" className="input" /></label>
        <label className="label">Description (optional)<input maxLength={200} value={form.description} onChange={set('description')} placeholder="Tracked door-to-door delivery" className="input" /></label>
        <div className="grid grid-cols-3 gap-4">
          <label className="label">Price ({currencySymbol()})<input required type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0 = free" className="input" /></label>
          <label className="label">Min days<input required type="number" min="0" max="90" step="1" value={form.min} onChange={set('min')} className="input" /></label>
          <label className="label">Max days<input required type="number" min="0" max="90" step="1" value={form.max} onChange={set('max')} className="input" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Available at checkout</label>
        <Notice>{state.error}</Notice>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn btn-outline">Cancel</button><button type="submit" disabled={state.saving} className="btn btn-primary">{state.saving ? <Spinner className="h-4 w-4" /> : 'Save'}</button></div>
      </form>
    </Modal>
  )
}

export default function ShippingPanel() {
  const result = useFetch('/admin/shipping-methods')
  const [editing, setEditing] = useState(null)

  const run = async (request, message) => {
    try {
      await request()
      if (message) toast.success(message)
      result.reload()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <PanelHeader title="Shipping methods" action={<button type="button" onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} /> New method</button>} />
      <Loaded result={result}>
        {({ data }) => (
          <Table rows={data} empty="No shipping methods yet. Customers can't check out until you add one." columns={[
            { header: 'Method', render: (method) => <span className="flex items-center gap-3">{method.image?.secureUrl ? <img src={method.image.secureUrl} alt="" className="h-12 w-12 rounded-lg bg-white/10 object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white/40"><Truck size={20} /></span>}<span><strong>{method.name}</strong>{method.description && <><br /><span className="text-xs text-white/55">{method.description}</span></>}</span></span> },
            { header: 'Price', render: (method) => (method.amount ? money(method.amount) : 'Free') },
            { header: 'Delivery', render: (method) => days(method) },
            { header: 'Active', render: (method) => <input type="checkbox" aria-label={`${method.name} available`} checked={method.isActive} onChange={(event) => run(() => apiRequest(`/admin/shipping-methods/${method.id}`, { method: 'PATCH', body: { isActive: event.target.checked } }))} /> },
            { header: '', render: (method) => <span className="flex justify-end gap-2"><button type="button" aria-label={`Edit ${method.name}`} onClick={() => setEditing(method)} className="btn btn-outline btn-sm"><Pencil size={14} /></button><button type="button" aria-label={`Delete ${method.name}`} onClick={() => window.confirm(`Delete "${method.name}"? Past orders keep their shipping details.`) && run(() => apiRequest(`/admin/shipping-methods/${method.id}`, { method: 'DELETE' }), 'Shipping method deleted')} className="btn btn-danger btn-sm"><Trash2 size={14} /></button></span> },
          ]} />
        )}
      </Loaded>
      {editing && <ShippingForm method={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); result.reload() }} />}
    </>
  )
}
