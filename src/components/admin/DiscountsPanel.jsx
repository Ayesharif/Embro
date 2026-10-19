import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Notice } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { currencySymbol, money, shortDate } from '../../utils/format'
import { Loaded, Modal, PanelHeader, Table } from './ui'

function DiscountForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', minimum: '', usageLimit: '', endsAt: '' })
  const [error, setError] = useState('')
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    const value = form.type === 'percentage' ? Number(form.value) : Math.round(Number(form.value) * 100)
    try {
      await apiRequest('/admin/discounts', { method: 'POST', body: {
        code: form.code, type: form.type, value,
        ...(form.minimum ? { minimumOrderAmount: Math.round(Number(form.minimum) * 100) } : {}),
        ...(form.usageLimit ? { usageLimit: Number(form.usageLimit) } : {}),
        ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
      } })
      toast.success('Discount created')
      onSaved()
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return (
    <Modal title="New discount code" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="label">Code<input required minLength={3} value={form.code} onChange={set('code')} className="input uppercase" placeholder="SPRING10" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="label">Type<select value={form.type} onChange={set('type')} className="input"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          <label className="label">{form.type === 'percentage' ? 'Percent off' : `Amount off (${currencySymbol()})`}<input required type="number" min="1" max={form.type === 'percentage' ? 100 : undefined} step={form.type === 'percentage' ? 1 : 0.01} value={form.value} onChange={set('value')} className="input" /></label>
          <label className="label">Minimum order ({currencySymbol()})<input type="number" min="0" step="0.01" value={form.minimum} onChange={set('minimum')} className="input" /></label>
          <label className="label">Usage limit<input type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} className="input" /></label>
        </div>
        <label className="label">Expires<input type="date" value={form.endsAt} onChange={set('endsAt')} className="input" /></label>
        <Notice>{error}</Notice>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn btn-outline">Cancel</button><button type="submit" className="btn btn-primary">Create</button></div>
      </form>
    </Modal>
  )
}

export default function DiscountsPanel() {
  const result = useFetch('/admin/discounts')
  const [creating, setCreating] = useState(false)
  const run = async (request) => {
    try {
      await request()
      result.reload()
    } catch (error) {
      toast.error(error.message)
    }
  }
  return (
    <>
      <PanelHeader title="Discount codes" action={<button type="button" onClick={() => setCreating(true)} className="btn btn-primary"><Plus size={16} /> New code</button>} />
      <Loaded result={result}>
        {({ data }) => <Table rows={data} empty="No discount codes yet." columns={[
          { header: 'Code', render: (discount) => <strong>{discount.code}</strong> },
          { header: 'Value', render: (discount) => (discount.type === 'percentage' ? `${discount.value}% off` : `${money(discount.value)} off`) },
          { header: 'Used', render: (discount) => `${discount.usedCount}${discount.usageLimit ? ` / ${discount.usageLimit}` : ''}` },
          { header: 'Expires', render: (discount) => (discount.endsAt ? shortDate(discount.endsAt) : 'Never') },
          { header: 'Active', render: (discount) => <input type="checkbox" aria-label={`${discount.code} active`} checked={discount.isActive} onChange={(event) => run(() => apiRequest(`/admin/discounts/${discount.id}`, { method: 'PATCH', body: { isActive: event.target.checked } }))} /> },
          { header: '', render: (discount) => <button type="button" aria-label={`Delete ${discount.code}`} onClick={() => window.confirm(`Delete ${discount.code}?`) && run(() => apiRequest(`/admin/discounts/${discount.id}`, { method: 'DELETE' }))} className="btn btn-danger btn-sm float-right"><Trash2 size={14} /></button> },
        ]} />}
      </Loaded>
      {creating && <DiscountForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); result.reload() }} />}
    </>
  )
}
