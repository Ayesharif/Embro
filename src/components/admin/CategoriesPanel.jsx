import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Notice } from '../../component/States'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { titleCase } from '../../utils/format'
import ImageField from './ImageField'
import { Loaded, Modal, PanelHeader, Table } from './ui'

function CategoryForm({ category, onClose, onSaved }) {
  const [form, setForm] = useState({ name: category?.name || '', description: category?.description || '', sortOrder: category?.sortOrder ?? 0, status: category?.status || 'active', image: category?.image?.secureUrl ? { publicId: category.image.publicId, secureUrl: category.image.secureUrl } : null })
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    try {
      await apiRequest(category ? `/admin/categories/${category.id}` : '/admin/categories', { method: category ? 'PATCH' : 'POST', body: { ...form, sortOrder: Number(form.sortOrder) } })
      toast.success('Category saved')
      onSaved()
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return (
    <Modal title={category ? 'Edit category' : 'New category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="label">Name<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input" /></label>
        <ImageField label="Category image" folder="lembro/categories" value={form.image} onChange={(image) => setForm((current) => ({ ...current, image }))} />
        <label className="label">Description<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input" /></label>
        <div className="grid grid-cols-2 gap-4">
          <label className="label">Sort order<input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="input" /></label>
          <label className="label">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="input"><option value="active">Active</option><option value="archived">Archived</option></select></label>
        </div>
        <Notice>{error}</Notice>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn btn-outline">Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
      </form>
    </Modal>
  )
}

export default function CategoriesPanel() {
  const result = useFetch('/admin/categories')
  const [editing, setEditing] = useState(null)
  return (
    <>
      <PanelHeader title="Categories" action={<button type="button" onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} /> New category</button>} />
      <Loaded result={result}>
        {({ data }) => <Table rows={data.map((category) => ({ ...category, id: category.id || category._id }))} columns={[
          { header: 'Name', render: (category) => <span className="flex items-center gap-3">{category.image?.secureUrl ? <img src={category.image.secureUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-white/10" />}<strong>{category.name}</strong></span> },
          { header: 'Slug', render: (category) => category.slug },
          { header: 'Order', render: (category) => category.sortOrder },
          { header: 'Status', render: (category) => <span className={`badge ${category.status === 'active' ? 'badge-ok' : 'badge-bad'}`}>{titleCase(category.status)}</span> },
          { header: '', render: (category) => <button type="button" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category)} className="btn btn-outline btn-sm float-right"><Pencil size={14} /></button> },
        ]} />}
      </Loaded>
      {editing && <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); result.reload() }} />}
    </>
  )
}
