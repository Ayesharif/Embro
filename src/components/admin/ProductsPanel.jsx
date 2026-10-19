import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Notice, Spinner } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { currencySymbol, money, titleCase, toCents } from '../../utils/format'
import ImageField from './ImageField'
import { Loaded, Modal, PanelHeader, Table } from './ui'

const statusTone = { published: 'badge-ok', draft: 'badge-warn', archived: 'badge-bad' }
let nextKey = 1
const newVariant = () => ({ key: `new-${nextKey++}`, color: '', size: '', sku: '', price: '', cost: '', discount: '0', stock: '0', image: null, status: 'active' })

function toForm(product) {
  return {
    name: product.name,
    categoryId: product.category?.id || '',
    description: product.description,
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    variants: product.variants.map((variant) => ({
      key: variant.id, id: variant.id, color: variant.color || '', size: variant.size || '', sku: variant.sku || '',
      price: (variant.sellingAmount / 100).toFixed(2), cost: (variant.costAmount / 100).toFixed(2),
      discount: String(variant.discountPercent), stock: String(variant.stock), image: variant.image, status: variant.status,
    })),
  }
}

// Live preview of what a variant sells for and earns, so a bad margin is obvious before saving.
function Margin({ variant }) {
  const price = Number(variant.price)
  const cost = Number(variant.cost)
  if (!variant.price || !variant.cost) return null
  const final = price * (1 - (Number(variant.discount) || 0) / 100)
  const profit = final - cost
  return (
    <p className={`text-xs ${profit < 0 ? 'text-red-300' : 'text-emerald-200'}`}>
      Sells for {currencySymbol()} {final.toFixed(2)} · profit {currencySymbol()} {profit.toFixed(2)} per unit{final > 0 && ` (${Math.round((profit / final) * 100)}%)`}
    </p>
  )
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(product ? toForm(product) : { name: '', categoryId: '', description: '', status: 'draft', isFeatured: false, isNewArrival: false, variants: [newVariant()] })
  const [state, setState] = useState({ saving: false, error: '' })
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const setVariant = (key, field, value) => setForm((current) => ({ ...current, variants: current.variants.map((variant) => (variant.key === key ? { ...variant, [field]: value } : variant)) }))

  const submit = async (event) => {
    event.preventDefault()
    setState({ saving: true, error: '' })
    const body = {
      name: form.name,
      categoryId: form.categoryId,
      description: form.description,
      status: form.status,
      isFeatured: form.isFeatured,
      isNewArrival: form.isNewArrival,
      variants: form.variants.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        color: variant.color, size: variant.size, sku: variant.sku,
        sellingAmount: toCents(variant.price), costAmount: toCents(variant.cost),
        discountPercent: Number(variant.discount) || 0, stock: Number(variant.stock),
        image: variant.image ? { publicId: variant.image.publicId, secureUrl: variant.image.secureUrl } : null,
        status: variant.status,
      })),
    }
    try {
      await apiRequest(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PATCH' : 'POST', body })
      toast.success(product ? 'Product updated' : 'Product created')
      onSaved()
    } catch (error) {
      setState({ saving: false, error: error.message })
    }
  }

  return (
    <Modal title={product ? 'Edit product' : 'New product'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label sm:col-span-2">Name<input required minLength={2} value={form.name} onChange={set('name')} className="input" /></label>
          <label className="label">Category<select required value={form.categoryId} onChange={set('categoryId')} className="input"><option value="">Select…</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="label">Status<select value={form.status} onChange={set('status')} className="input"><option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
          <label className="label sm:col-span-2">Description<textarea required rows={4} value={form.description} onChange={set('description')} className="input" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} /> Featured on home page</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isNewArrival} onChange={set('isNewArrival')} /> New arrival</label>
        </div>

        <fieldset>
          <legend className="text-lg font-bold">Variants</legend>
          <p className="mt-1 text-sm text-white/60">Price, purchasing cost, discount, stock and image are set per variant. A simple product just needs one variant - leave colour and size empty.</p>
          <div className="mt-4 space-y-4">
            {form.variants.map((variant, index) => (
              <div key={variant.key} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-semibold">Variant {index + 1}{variant.status === 'archived' && <span className="badge badge-bad ml-2">Archived</span>}</p>
                  {form.variants.length > 1 && <button type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((item) => item.key !== variant.key) }))} className="btn btn-danger btn-sm"><Trash2 size={14} /> Remove</button>}
                </div>
                <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                  <ImageField label="Image" folder="embro/products" value={variant.image} onChange={(image) => setVariant(variant.key, 'image', image)} hint="Shown when this variant is selected." />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="label">Colour<input maxLength={40} value={variant.color} onChange={(event) => setVariant(variant.key, 'color', event.target.value)} placeholder="e.g. Red" className="input" /></label>
                    <label className="label">Size<input maxLength={40} value={variant.size} onChange={(event) => setVariant(variant.key, 'size', event.target.value)} placeholder="e.g. Large" className="input" /></label>
                    <label className="label">SKU<input maxLength={60} value={variant.sku} onChange={(event) => setVariant(variant.key, 'sku', event.target.value)} className="input" /></label>
                    <label className="label">Selling price ({currencySymbol()})<input required type="number" min="0" step="0.01" value={variant.price} onChange={(event) => setVariant(variant.key, 'price', event.target.value)} className="input" /></label>
                    <label className="label">Purchasing cost ({currencySymbol()})<input required type="number" min="0" step="0.01" value={variant.cost} onChange={(event) => setVariant(variant.key, 'cost', event.target.value)} className="input" /></label>
                    <label className="label">Discount (%)<input type="number" min="0" max="100" step="1" value={variant.discount} onChange={(event) => setVariant(variant.key, 'discount', event.target.value)} className="input" /></label>
                    <label className="label">Stock<input required type="number" min="0" step="1" value={variant.stock} onChange={(event) => setVariant(variant.key, 'stock', event.target.value)} className="input" /></label>
                    <label className="label">Status<select value={variant.status} onChange={(event) => setVariant(variant.key, 'status', event.target.value)} className="input"><option value="active">Active</option><option value="archived">Archived (hidden)</option></select></label>
                    <div className="flex items-end"><Margin variant={variant} /></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, newVariant()] }))} className="btn btn-outline btn-sm mt-4"><Plus size={14} /> Add variant</button>
        </fieldset>

        <Notice>{state.error}</Notice>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn btn-outline">Cancel</button><button type="submit" disabled={state.saving} className="btn btn-primary">{state.saving ? <Spinner className="h-4 w-4" /> : 'Save product'}</button></div>
      </form>
    </Modal>
  )
}

export default function ProductsPanel() {
  const result = useFetch('/admin/products?limit=200')
  const categories = useFetch('/admin/categories')
  const [editing, setEditing] = useState(null)
  const [discount, setDiscount] = useState('')

  const archive = async (product) => {
    if (!window.confirm(`Archive "${product.name}"? It will disappear from the store.`)) return
    try {
      await apiRequest(`/admin/products/${product.id}`, { method: 'DELETE' })
      result.reload()
    } catch (error) {
      toast.error(error.message)
    }
  }
  const applyDiscount = async (event) => {
    event.preventDefault()
    try {
      const { updated } = await apiRequest('/admin/products/bulk-discount', { method: 'POST', body: { discountPercent: Number(discount) } })
      toast.success(`Discount applied to ${updated} product(s)`)
      result.reload()
    } catch (error) {
      toast.error(error.message)
    }
  }
  const price = (product) => {
    const prices = product.variants.filter((variant) => variant.status === 'active').map((variant) => variant.finalAmount)
    if (!prices.length) return '—'
    const low = Math.min(...prices)
    const high = Math.max(...prices)
    return low === high ? money(low) : `${money(low)} - ${money(high)}`
  }

  return (
    <>
      <PanelHeader title="Products" action={<button type="button" onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} /> New product</button>} />
      <form onSubmit={applyDiscount} className="mb-5 flex flex-wrap items-end gap-3">
        <label className="label">Store-wide discount (%)<input required type="number" min="0" max="100" step="1" value={discount} onChange={(event) => setDiscount(event.target.value)} className="input w-40" /></label>
        <button type="submit" className="btn btn-outline">Apply to all variants</button>
      </form>
      <Loaded result={result}>
        {({ data }) => (
          <Table rows={data} empty="No products yet. Create your first one." columns={[
            { header: 'Product', render: (product) => <span className="flex items-center gap-3">{product.image ? <img src={product.image} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded bg-white/10" />}<span><strong>{product.name}</strong><br /><span className="text-xs text-white/55">{product.category?.name}</span></span></span> },
            { header: 'Price', render: price },
            { header: 'Variants', render: (product) => product.variants.length },
            { header: 'Stock', render: (product) => <span className={product.stock < 6 ? 'text-amber-200' : ''}>{product.stock}</span> },
            { header: 'Status', render: (product) => <span className={`badge ${statusTone[product.status]}`}>{titleCase(product.status)}</span> },
            { header: '', render: (product) => <span className="flex justify-end gap-2"><button type="button" aria-label={`Edit ${product.name}`} onClick={() => setEditing(product)} className="btn btn-outline btn-sm"><Pencil size={14} /></button>{product.status !== 'archived' && <button type="button" aria-label={`Archive ${product.name}`} onClick={() => archive(product)} className="btn btn-danger btn-sm"><Trash2 size={14} /></button>}</span> },
          ]} />
        )}
      </Loaded>
      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={(categories.data?.data || []).filter((category) => category.status === 'active')}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); result.reload() }}
        />
      )}
    </>
  )
}
