import { LogOut, MapPin, Package, Pencil, Plus, ShieldCheck, Trash2, User as UserIcon, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import OrderTracker from '../component/OrderTracker'
import { useAuth } from '../auth/AuthContext'
import PageHeader from '../component/PageHeader'
import Seo from '../component/Seo'
import { EmptyState, ErrorState, Notice, PageLoader, Spinner } from '../component/States'
import { useFetch } from '../hooks/useFetch'
import { toast } from '../stores/toastStore'
import { apiRequest } from '../utils/api'
import { money as formatMoney, shortDate } from '../utils/format'
import { deliveryInfo, paymentInfo } from '../utils/orderStatus'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: UserIcon },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'security', label: 'Profile & security', icon: ShieldCheck },
]

const Badge = ({ tone, children }) => <span className={`badge ${tone}`}>{children}</span>

function OrderDetail({ id, onClose }) {
  const { data, error, loading } = useFetch(`/orders/${id}`)
  const money = (amount) => formatMoney(amount, data?.order.currency)
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Order details">
      <button type="button" aria-label="Close" onClick={onClose} className="fade-in absolute inset-0 bg-black/70" />
      <div className="panel fade-in relative max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-slate-950 p-6">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 text-white/60 hover:text-white"><X /></button>
        {loading && <PageLoader />}
        {error && <ErrorState message={error.message} />}
        {data && (
          <>
            <h2 className="text-xl font-bold">Order {data.order.number}</h2>
            <p className="mt-1 text-sm text-white/60">Placed on {shortDate(data.order.createdAt)}</p>
            <div className="mt-6"><OrderTracker order={data.order} /></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(() => {
                const payment = paymentInfo(data.order)
                const delivery = deliveryInfo(data.order)
                return (
                  <>
                    <div className="rounded-lg bg-white/5 p-4 text-sm"><p className="text-xs uppercase tracking-wider text-white/50">Payment</p><p className="mt-1"><Badge tone={payment.tone}>{payment.label}</Badge></p><p className="mt-2 text-white/70">{payment.method}</p><p className="mt-1 text-xs text-white/55">{payment.hint}</p></div>
                    <div className="rounded-lg bg-white/5 p-4 text-sm"><p className="text-xs uppercase tracking-wider text-white/50">Delivery</p><p className="mt-1"><Badge tone={delivery.tone}>{delivery.label}</Badge></p>{data.order.deliveredAt && <p className="mt-2 text-white/70">Delivered {shortDate(data.order.deliveredAt)}</p>}{data.shipments.length === 0 && delivery.key !== 'delivered' && delivery.step >= 0 && <p className="mt-2 text-xs text-white/55">Tracking details appear here once your order ships.</p>}</div>
                  </>
                )
              })()}
            </div>
            <ul className="mt-5 divide-y divide-white/10">
              {data.order.items.map((item) => (
                <li key={item.id || item._id} className="flex justify-between gap-3 py-3 text-sm"><span>{item.productNameSnapshot}{item.variantLabel && <span className="text-white/55"> ({item.variantLabel})</span>} × {item.quantity}</span><span>{money(item.lineTotalAmount)}</span></li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-white/65">Subtotal</dt><dd>{money(data.order.subtotalAmount)}</dd></div>
              {data.order.discountAmount > 0 && <div className="flex justify-between"><dt className="text-white/65">Discount</dt><dd>-{money(data.order.discountAmount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-white/65">Shipping</dt><dd>{money(data.order.shippingAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-white/65">Tax</dt><dd>{money(data.order.taxAmount)}</dd></div>
              <div className="flex justify-between border-t border-white/15 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(data.order.totalAmount)}</dd></div>
              {data.order.refundedAmount > 0 && <div className="flex justify-between text-amber-200"><dt>Refunded</dt><dd>{money(data.order.refundedAmount)}</dd></div>}
            </dl>
            {data.order.addressSnapshot && <p className="mt-5 rounded-lg bg-white/5 p-4 text-sm text-white/80"><strong>Delivered to:</strong> {data.order.addressSnapshot.name}, {data.order.addressSnapshot.line1}, {data.order.addressSnapshot.city} {data.order.addressSnapshot.postalCode}, {data.order.addressSnapshot.country}</p>}
            {data.shipments.map((shipment) => <p key={shipment.id || shipment._id} className="mt-3 rounded-lg bg-white/5 p-4 text-sm"><strong>{shipment.carrier}</strong> · tracking number <span className="select-all font-mono">{shipment.trackingNumber}</span></p>)}
          </>
        )}
      </div>
    </div>
  )
}

function Orders({ limit }) {
  const { data, error, loading, reload } = useFetch('/orders')
  const [openId, setOpenId] = useState(null)
  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error.message} onRetry={reload} />
  const orders = limit ? data.data.slice(0, limit) : data.data
  if (!orders.length) return <EmptyState icon={Package} title="No orders yet" description="When you place an order it will show up here." action={<Link to="/products" className="btn btn-primary">Start shopping</Link>} />
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-white/55"><tr><th className="py-3 pr-4">Order</th><th className="pr-4">Date</th><th className="pr-4">Payment</th><th className="pr-4">Delivery</th><th className="pr-4">Total</th><th /></tr></thead>
          <tbody className="divide-y divide-white/10">
            {orders.map((order) => (
              <tr key={order.id}><td className="py-3 pr-4 font-semibold">{order.number}</td><td className="pr-4">{shortDate(order.createdAt)}</td><td className="pr-4"><Badge tone={paymentInfo(order).tone}>{paymentInfo(order).label}</Badge></td><td className="pr-4"><Badge tone={deliveryInfo(order).tone}>{deliveryInfo(order).label}</Badge></td><td className="pr-4">{formatMoney(order.totalAmount, order.currency)}</td><td className="text-right"><button type="button" onClick={() => setOpenId(order.id)} className="btn btn-outline btn-sm">View</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {openId && <OrderDetail id={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

const blankAddress = { name: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '', phone: '', isDefault: false }

function Addresses() {
  const { data, error, loading, reload } = useFetch('/me/addresses')
  const [editing, setEditing] = useState(null) // null | 'new' | address
  const [form, setForm] = useState(blankAddress)
  const [formError, setFormError] = useState('')

  const startEdit = (address) => {
    setEditing(address)
    setForm(address === 'new' ? blankAddress : { ...blankAddress, ...address })
    setFormError('')
  }
  const save = async (event) => {
    event.preventDefault()
    const { name, line1, line2, city, state, postalCode, country, phone, isDefault } = form
    const body = { name, line1, line2, city, state, postalCode, country, phone, isDefault }
    try {
      if (editing === 'new') await apiRequest('/me/addresses', { method: 'POST', body })
      else await apiRequest(`/me/addresses/${editing.id}`, { method: 'PATCH', body })
      setEditing(null)
      reload()
      toast.success('Address saved')
    } catch (requestError) {
      setFormError(requestError.message)
    }
  }
  const remove = async (id) => {
    try {
      await apiRequest(`/me/addresses/${id}`, { method: 'DELETE' })
      reload()
    } catch (requestError) {
      toast.error(requestError.message)
    }
  }
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error.message} onRetry={reload} />

  return (
    <div>
      {!editing && <button type="button" onClick={() => startEdit('new')} className="btn btn-outline mb-5"><Plus size={16} /> Add address</button>}
      {editing && (
        <form onSubmit={save} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
          <h3 className="font-bold sm:col-span-2">{editing === 'new' ? 'New address' : 'Edit address'}</h3>
          {[['name', 'Full name', true, true], ['line1', 'Address line 1', true, true], ['line2', 'Address line 2', false, true], ['city', 'City', true], ['state', 'State / province', false], ['postalCode', 'Postal code', true], ['country', 'Country', true], ['phone', 'Phone', false]].map(([key, label, required, wide]) => (
            <label key={key} className={`label ${wide ? 'sm:col-span-2' : ''}`}>{label}<input required={required} value={form[key] || ''} onChange={set(key)} className="input" /></label>
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={Boolean(form.isDefault)} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} /> Use as default address</label>
          <div className="sm:col-span-2"><Notice>{formError}</Notice></div>
          <div className="flex gap-3 sm:col-span-2"><button type="submit" className="btn btn-primary">Save address</button><button type="button" onClick={() => setEditing(null)} className="btn btn-outline">Cancel</button></div>
        </form>
      )}
      {data.data.length === 0 && !editing && <EmptyState icon={MapPin} title="No saved addresses" description="Save an address to check out faster." />}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.data.map((address) => (
          <div key={address.id} className="panel p-5 text-sm">
            <p className="font-bold">{address.name} {address.isDefault && <span className="badge ml-1">Default</span>}</p>
            <p className="mt-2 leading-6 text-white/75">{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}{address.state && `, ${address.state}`} {address.postalCode}<br />{address.country}{address.phone && <><br />{address.phone}</>}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => startEdit(address)} className="btn btn-outline btn-sm"><Pencil size={14} /> Edit</button>
              <button type="button" onClick={() => remove(address.id)} className="btn btn-danger btn-sm"><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Security() {
  const { user, updateUser, signIn } = useAuth()
  const [name, setName] = useState(user.name)
  const [profile, setProfile] = useState({ error: '', saved: false })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [pw, setPw] = useState({ error: '', saved: false, saving: false })

  const saveProfile = async (event) => {
    event.preventDefault()
    try {
      const { user: updated } = await apiRequest('/auth/me', { method: 'PATCH', body: { name } })
      updateUser(updated)
      setProfile({ error: '', saved: true })
    } catch (error) {
      setProfile({ error: error.message, saved: false })
    }
  }
  const changePassword = async (event) => {
    event.preventDefault()
    setPw({ error: '', saved: false, saving: true })
    try {
      const payload = await apiRequest('/auth/change-password', { method: 'POST', body: { ...(user.hasPassword ? { currentPassword: passwords.currentPassword } : {}), newPassword: passwords.newPassword } })
      await signIn(payload)
      setPasswords({ currentPassword: '', newPassword: '' })
      setPw({ error: '', saved: true, saving: false })
    } catch (error) {
      setPw({ error: error.message, saved: false, saving: false })
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="panel space-y-4 p-5">
        <h3 className="font-bold">Profile</h3>
        <label className="label">Full name<input required minLength={2} value={name} onChange={(event) => { setName(event.target.value); setProfile({ error: '', saved: false }) }} className="input" /></label>
        <label className="label">Email<input value={user.email} readOnly className="input opacity-60" /></label>
        <Notice>{profile.error}</Notice>{profile.saved && <Notice type="success">Profile updated.</Notice>}
        <button type="submit" className="btn btn-primary">Save profile</button>
      </form>
      <form onSubmit={changePassword} className="panel space-y-4 p-5">
        <h3 className="font-bold">{user.hasPassword === false ? 'Set a password' : 'Change password'}</h3>
        {user.hasPassword !== false && <label className="label">Current password<input type="password" required autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} className="input" /></label>}
        <label className="label">New password<input type="password" required minLength={8} autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} className="input" /></label>
        <Notice>{pw.error}</Notice>{pw.saved && <Notice type="success">Password updated. Other devices have been signed out.</Notice>}
        <button type="submit" disabled={pw.saving} className="btn btn-primary">{pw.saving ? <Spinner className="h-4 w-4" /> : 'Update password'}</button>
      </form>
      <div className="panel p-5 lg:col-span-2">
        <h3 className="font-bold">Payment methods</h3>
        <p className="mt-2 text-sm text-white/70">Card details are entered securely with Stripe at checkout. We never store your card number on our servers or in your browser.</p>
      </div>
    </div>
  )
}

export default function Account() {
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const { data: addresses } = useFetch('/me/addresses')
  const { data: orders } = useFetch('/orders')

  return (
    <>
      <Seo title="My account" robots="noindex,nofollow" />
      <PageHeader title="My account" crumbs={[{ label: 'Account' }]} />
      <section className="container-page grid gap-8 py-10 lg:grid-cols-[16rem_1fr]">
        <aside className="panel h-fit p-4">
          <div className="border-b border-white/15 px-2 pb-4"><p className="truncate font-bold">{user.name}</p><p className="truncate text-xs text-white/60">{user.email}</p></div>
          <nav aria-label="Account sections" className="mt-3 flex flex-col gap-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${tab === id ? 'bg-white font-semibold text-slate-900' : 'text-white/80 hover:bg-white/10'}`}><Icon size={17} />{label}</button>
            ))}
            <button type="button" onClick={signOut} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-200 hover:bg-red-500/10"><LogOut size={17} />Sign out</button>
          </nav>
        </aside>

        <div>
          {tab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Hello, {user.name.split(' ')[0]}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <button type="button" onClick={() => setTab('orders')} className="panel p-5 text-left transition hover:border-white/40"><p className="text-3xl font-bold">{orders?.data.length ?? '–'}</p><p className="text-sm text-white/65">Orders placed</p></button>
                <button type="button" onClick={() => setTab('addresses')} className="panel p-5 text-left transition hover:border-white/40"><p className="text-3xl font-bold">{addresses?.data.length ?? '–'}</p><p className="text-sm text-white/65">Saved addresses</p></button>
              </div>
              <h3 className="text-lg font-bold">Recent orders</h3>
              <Orders limit={5} />
            </div>
          )}
          {tab === 'orders' && <><h2 className="mb-5 text-2xl font-bold">Orders</h2><Orders /></>}
          {tab === 'addresses' && <><h2 className="mb-5 text-2xl font-bold">Addresses</h2><Addresses /></>}
          {tab === 'security' && <><h2 className="mb-5 text-2xl font-bold">Profile & security</h2><Security /></>}
        </div>
      </section>
    </>
  )
}
