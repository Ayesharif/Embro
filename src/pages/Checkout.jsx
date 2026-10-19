import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Banknote, Check, CheckCircle2, CreditCard, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { CartLines } from '../component/CartDrawer'
import PageHeader from '../component/PageHeader'
import Seo from '../component/Seo'
import { EmptyState, ErrorState, Notice, PageLoader, Spinner } from '../component/States'
import { useAsyncOnce } from '../hooks/useAsyncOnce'
import { useFetch } from '../hooks/useFetch'
import { useCartStore } from '../stores/cartStore'
import { apiRequest } from '../utils/api'
import { money as formatMoney } from '../utils/format'

const money = (amount) => formatMoney(amount)

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) : null
const steps = ['Cart', 'Details', 'Shipping', 'Review', 'Payment']
const emptyAddress = { name: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: '', phone: '' }

function Stepper({ step }) {
  return (
    <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Checkout progress">
      {steps.map((label, index) => (
        <li key={label} aria-current={index === step ? 'step' : undefined} className="text-center">
          <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${index < step ? 'border-emerald-300 bg-emerald-400 text-slate-900' : index === step ? 'border-white bg-white text-slate-900' : 'border-white/25 text-white/50'}`}>
            {index < step ? <Check size={16} /> : index + 1}
          </span>
          <span className={`mt-1 block text-xs ${index === step ? 'font-semibold' : 'text-white/55'}`}>{label}</span>
        </li>
      ))}
    </ol>
  )
}

function Totals({ quote }) {
  const money = (amount) => formatMoney(amount, quote.currency)
  const rows = [
    ['Subtotal', quote.subtotalAmount],
    ...(quote.discountAmount ? [[`Discount (${quote.discountCode})`, -quote.discountAmount]] : []),
    [`Shipping (${quote.shippingMethodName})`, quote.shippingAmount],
    ['Tax', quote.taxAmount],
  ]
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, amount]) => <div key={label} className="flex justify-between"><dt className="text-white/70">{label}</dt><dd>{amount < 0 ? `-${money(-amount)}` : money(amount)}</dd></div>)}
      <div className="flex justify-between border-t border-white/15 pt-3 text-lg font-bold"><dt>Total</dt><dd>{money(quote.totalAmount)}</dd></div>
    </dl>
  )
}

function PayForm({ quote, onPaid }) {
  const stripe = useStripe()
  const elements = useElements()
  const [state, setState] = useState({ paying: false, error: '' })

  const pay = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return
    setState({ paying: true, error: '' })
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    if (error) return setState({ paying: false, error: error.message })
    try {
      const { order } = await apiRequest('/orders', { method: 'POST', body: { paymentIntentId: paymentIntent.id } })
      return onPaid(order)
    } catch {
      // The card was charged. The Stripe webhook creates the order even if this request failed.
      return onPaid(null)
    }
  }

  return (
    <form onSubmit={pay} className="space-y-5">
      <PaymentElement />
      <Notice>{state.error}</Notice>
      <button type="submit" disabled={!stripe || state.paying} className="btn btn-primary btn-block py-3.5 text-base">
        {state.paying ? <><Spinner className="h-4 w-4" /> Processing...</> : `Pay ${formatMoney(quote.totalAmount, quote.currency)}`}
      </button>
      <p className="text-center text-xs text-white/50">Payments are processed securely by Stripe. We never see or store your card details.</p>
    </form>
  )
}

function PaymentStep({ quote, onPaid }) {
  const intent = useAsyncOnce(`intent:${quote.id}`, () => apiRequest('/payments/intent', { method: 'POST', body: { quoteId: quote.id } }))
  if (!stripePromise) return <Notice>Online payments are not configured (missing VITE_STRIPE_PUBLISHABLE_KEY).</Notice>
  if (intent.pending) return <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div>
  if (intent.error) return <ErrorState message={intent.error.message} />
  return (
    <Elements stripe={stripePromise} options={{ clientSecret: intent.data.clientSecret, appearance: { theme: 'night' } }}>
      <PayForm quote={quote} onPaid={onPaid} />
    </Elements>
  )
}

function CodStep({ quote, onPlaced }) {
  const needsPhone = !quote.shippingAddress.phone
  const [phone, setPhone] = useState('')
  const [state, setState] = useState({ placing: false, error: '' })

  const place = async (event) => {
    event.preventDefault()
    setState({ placing: true, error: '' })
    try {
      const { order } = await apiRequest('/orders/cod', { method: 'POST', body: { quoteId: quote.id, ...(needsPhone ? { phone } : {}) } })
      onPlaced(order)
    } catch (error) {
      setState({ placing: false, error: error.message })
    }
  }

  return (
    <form onSubmit={place} className="space-y-5">
      <div className="rounded-lg bg-white/5 p-4 text-sm leading-6 text-white/80">
        Pay <strong>{formatMoney(quote.totalAmount, quote.currency)}</strong> in cash when your order arrives. Please keep the exact amount ready - couriers may not carry change.
      </div>
      {needsPhone && (
        <label className="label">Phone number for the courier
          <input required type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+92 300 1234567" className="input" />
        </label>
      )}
      <Notice>{state.error}</Notice>
      <button type="submit" disabled={state.placing} className="btn btn-primary btn-block py-3.5 text-base">
        {state.placing ? <><Spinner className="h-4 w-4" /> Placing order...</> : 'Place order (pay on delivery)'}
      </button>
    </form>
  )
}

function AddressFields({ value, onChange }) {
  const field = (key, label, extra = {}) => (
    <label className={`label ${extra.wide ? 'sm:col-span-2' : ''}`}>{label}
      <input required={extra.required !== false} autoComplete={extra.autoComplete} value={value[key]} onChange={(event) => onChange({ ...value, [key]: event.target.value })} className="input" />
    </label>
  )
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('name', 'Full name', { autoComplete: 'name', wide: true })}
      {field('line1', 'Address line 1', { autoComplete: 'address-line1', wide: true })}
      {field('line2', 'Address line 2 (optional)', { autoComplete: 'address-line2', wide: true, required: false })}
      {field('city', 'City', { autoComplete: 'address-level2' })}
      {field('state', 'State / province', { autoComplete: 'address-level1', required: false })}
      {field('postalCode', 'Postal code', { autoComplete: 'postal-code' })}
      {field('country', 'Country', { autoComplete: 'country-name' })}
      {field('phone', 'Phone (optional)', { autoComplete: 'tel', required: false })}
    </div>
  )
}

export default function Checkout() {
  const { user } = useAuth()
  const cart = useCartStore((state) => state.cart)
  const loaded = useCartStore((state) => state.loaded)
  const reloadCart = useCartStore((state) => state.load)
  const { data: addressData, loading: addressesLoading } = useFetch('/me/addresses')
  const { data: methodData, error: methodError, loading: methodsLoading } = useFetch('/shipping/methods')
  const { data: optionData } = useFetch('/checkout/options')
  const [paymentMethod, setPaymentMethod] = useState('online')

  const [step, setStep] = useState(0)
  const [addressChoice, setAddressChoice] = useState('') // '' = default saved address / new
  const [newAddress, setNewAddress] = useState({ ...emptyAddress, name: user?.name || '' })
  const [methodId, setMethodId] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState('')
  const [quoteState, setQuoteState] = useState({ key: null, quote: null, error: '' })
  const [order, setOrder] = useState(undefined) // undefined = not paid, null = paid but order pending
  const [saveAddress, setSaveAddress] = useState(true)

  const saved = addressData?.data || []
  const usingSaved = saved.length > 0 && addressChoice !== 'new'
  const selectedSaved = usingSaved ? (saved.find((address) => address.id === addressChoice) || saved.find((address) => address.isDefault) || saved[0]) : null
  const method = (methodData?.data || []).find((item) => item.id === methodId) || methodData?.data?.[0]

  const quoteBody = method && (selectedSaved || step >= 3) ? {
    shippingMethodId: method.id,
    ...(appliedCode ? { discountCode: appliedCode } : {}),
    ...(selectedSaved ? { addressId: selectedSaved.id } : { address: Object.fromEntries(Object.entries(newAddress).filter(([, value]) => value !== '')) }),
  } : null
  const quoteKey = quoteBody ? JSON.stringify(quoteBody) : null

  useEffect(() => {
    if (step < 3 || !quoteKey) return undefined
    let active = true
    apiRequest('/checkout/quote', { method: 'POST', body: JSON.parse(quoteKey) })
      .then(({ quote }) => active && setQuoteState({ key: quoteKey, quote, error: '' }))
      .catch((error) => active && setQuoteState({ key: quoteKey, quote: null, error: error.message }))
    return () => { active = false }
  }, [step, quoteKey])

  const quoteReady = quoteState.key === quoteKey
  const quote = quoteReady ? quoteState.quote : null
  const quoteError = quoteReady ? quoteState.error : ''

  if (!loaded || addressesLoading || methodsLoading) return <PageLoader />

  if (order !== undefined) {
    return (
      <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center fade-in">
        <Seo title="Order confirmed" robots="noindex,nofollow" />
        <CheckCircle2 size={64} className="text-emerald-300" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-bold">Thank you for your order!</h1>
        {order?.paymentMethod === 'cod' ? <p className="mt-3 max-w-md text-white/75">Your order <strong>{order.number}</strong> is placed. Please pay <strong>{formatMoney(order.totalAmount, order.currency)}</strong> in cash when it arrives. We've emailed the details to {user.email}.</p> : order ? <p className="mt-3 text-white/75">Your order <strong>{order.number}</strong> is confirmed. A receipt is on its way to {user.email}.</p> : <p className="mt-3 max-w-md text-white/75">Your payment was received and your order is being finalised. It will appear under "My orders" in a moment.</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/account" className="btn btn-primary">View my orders</Link>
          <Link to="/products" className="btn btn-outline">Continue shopping</Link>
        </div>
      </section>
    )
  }

  if (cart.items.length === 0) {
    return (
      <>
        <Seo title="Checkout" robots="noindex,nofollow" />
        <PageHeader title="Checkout" crumbs={[{ label: 'Checkout' }]} />
        <div className="container-page py-12"><EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add something you love, then come back to check out." action={<Link to="/products" className="btn btn-primary">Browse products</Link>} /></div>
      </>
    )
  }

  const submitDetails = async (event) => {
    event.preventDefault()
    if (!usingSaved && saveAddress) {
      await apiRequest('/me/addresses', { method: 'POST', body: Object.fromEntries(Object.entries(newAddress).filter(([, value]) => value !== '')) }).catch(() => {})
    }
    setStep(2)
  }
  const applyCode = (event) => {
    event.preventDefault()
    setAppliedCode(codeInput.trim().toUpperCase())
  }
  const onPaid = (created) => {
    setOrder(created)
    reloadCart()
  }

  return (
    <>
      <Seo title="Checkout" robots="noindex,nofollow" />
      <PageHeader title="Checkout" crumbs={[{ label: 'Cart' }, { label: 'Checkout' }]} />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="panel p-5 sm:p-7">
          <Stepper step={step} />

          {step === 0 && (
            <div>
              <h2 className="mb-2 text-xl font-bold">Your cart</h2>
              <CartLines />
              <button type="button" disabled={cart.hasProblems} onClick={() => setStep(1)} className="btn btn-primary mt-6">Continue to details</button>
              {cart.hasProblems && <p className="mt-2 text-sm text-amber-200">Fix or remove the highlighted items to continue.</p>}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={submitDetails} className="space-y-5">
              <h2 className="text-xl font-bold">Delivery address</h2>
              {saved.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Choose an address</legend>
                  {saved.map((address) => (
                    <label key={address.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/20 p-4 has-[:checked]:border-white has-[:checked]:bg-white/10">
                      <input type="radio" name="address" checked={usingSaved && selectedSaved?.id === address.id} onChange={() => setAddressChoice(address.id)} className="mt-1" />
                      <span className="text-sm"><strong>{address.name}</strong>{address.isDefault && <span className="badge ml-2">Default</span>}<br />{address.line1}{address.line2 && `, ${address.line2}`}, {address.city} {address.postalCode}, {address.country}</span>
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/20 p-4 has-[:checked]:border-white has-[:checked]:bg-white/10">
                    <input type="radio" name="address" checked={!usingSaved} onChange={() => setAddressChoice('new')} /> <span className="text-sm">Use a new address</span>
                  </label>
                </fieldset>
              )}
              {!usingSaved && (
                <>
                  <AddressFields value={newAddress} onChange={setNewAddress} />
                  <label className="flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} /> Save this address for next time</label>
                </>
              )}
              <div className="flex gap-3"><button type="button" onClick={() => setStep(0)} className="btn btn-outline">Back</button><button type="submit" className="btn btn-primary">Continue to shipping</button></div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Shipping method</h2>
              {methodError && <ErrorState message={methodError.message} />}
              <fieldset className="space-y-2">
                <legend className="sr-only">Shipping method</legend>
                {(methodData?.data || []).map((item) => (
                  <label key={item.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/20 p-4 has-[:checked]:border-white has-[:checked]:bg-white/10">
                    <span className="flex items-center gap-3"><input type="radio" name="shipping" checked={method?.id === item.id} onChange={() => setMethodId(item.id)} />{item.image && <img src={item.image} alt="" className="h-11 w-11 rounded-lg bg-white/10 object-cover" />}<span><span className="block text-sm font-semibold">{item.name}</span>{item.description && <span className="block text-xs text-white/60">{item.description}</span>}<span className="text-xs text-white/60">{item.estimatedDaysMax ? (item.estimatedDaysMin === item.estimatedDaysMax ? `${item.estimatedDaysMax} business days` : `${item.estimatedDaysMin}-${item.estimatedDaysMax} business days`) : 'Same day'}</span></span></span>
                    <span className="font-semibold">{item.amount ? money(item.amount) : 'Free'}</span>
                  </label>
                ))}
              </fieldset>
              <div className="flex gap-3"><button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back</button><button type="button" disabled={!method} onClick={() => setStep(3)} className="btn btn-primary">Review order</button></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Review your order</h2>
              {!quoteReady && <div className="flex justify-center py-8"><Spinner className="h-7 w-7" /></div>}
              {quoteError && <Notice>{quoteError}</Notice>}
              {quote && (
                <>
                  <ul className="divide-y divide-white/10 text-sm">
                    {quote.items.map((item, index) => <li key={index} className="flex justify-between gap-3 py-3"><span>{item.productNameSnapshot}{item.variantLabel && <span className="text-white/55"> ({item.variantLabel})</span>} × {item.quantity}</span><span>{formatMoney(item.lineTotalAmount, quote.currency)}</span></li>)}
                  </ul>
                  <p className="rounded-lg bg-white/5 p-4 text-sm text-white/80"><strong>Ship to:</strong> {quote.shippingAddress.name}, {quote.shippingAddress.line1}, {quote.shippingAddress.city} {quote.shippingAddress.postalCode}, {quote.shippingAddress.country}</p>
                </>
              )}
              <form onSubmit={applyCode} className="flex gap-2">
                <label className="sr-only" htmlFor="discount">Discount code</label>
                <input id="discount" value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="Discount code" className="input" />
                <button type="submit" className="btn btn-outline">Apply</button>
              </form>
              {appliedCode && <button type="button" onClick={() => { setAppliedCode(''); setCodeInput('') }} className="text-xs underline">Remove code {appliedCode}</button>}
              <div className="flex gap-3"><button type="button" onClick={() => setStep(2)} className="btn btn-outline">Back</button><button type="button" disabled={!quote} onClick={() => setStep(4)} className="btn btn-primary">Continue to payment</button></div>
            </div>
          )}

          {step === 4 && quote && (() => {
            const cod = optionData?.cod
            const codAvailable = Boolean(cod?.enabled) && (!cod.maxAmount || quote.totalAmount <= cod.maxAmount)
            const method = codAvailable ? paymentMethod : 'online'
            const choices = [
              { id: 'online', icon: CreditCard, title: 'Pay online', text: 'Credit / debit card, secured by Stripe', available: true },
              { id: 'cod', icon: Banknote, title: 'Cash on delivery', text: cod?.maxAmount && quote.totalAmount > cod.maxAmount ? `Available for orders up to ${money(cod.maxAmount)}` : 'Pay in cash when your order arrives', available: codAvailable },
            ]
            return (
              <div className="space-y-5">
                <h2 className="text-xl font-bold">Payment</h2>
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">Payment method</legend>
                  {choices.filter((choice) => choice.available || choice.id === 'cod').map(({ id, icon: Icon, title, text, available }) => (
                    <label key={id} className={`flex items-start gap-3 rounded-xl border p-4 transition ${available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${method === id ? 'border-white bg-white/10' : 'border-white/20 hover:border-white/50'}`}>
                      <input type="radio" name="payment-method" className="mt-1" disabled={!available} checked={method === id} onChange={() => setPaymentMethod(id)} />
                      <span><span className="flex items-center gap-2 font-semibold"><Icon size={18} aria-hidden="true" />{title}</span><span className="mt-1 block text-xs text-white/60">{text}</span></span>
                    </label>
                  ))}
                </fieldset>
                {method === 'online' ? <PaymentStep quote={quote} onPaid={onPaid} /> : <CodStep quote={quote} onPlaced={onPaid} />}
                <button type="button" onClick={() => setStep(3)} className="btn btn-outline btn-sm">Back to review</button>
              </div>
            )
          })()}
        </div>

        <aside className="panel h-fit space-y-4 p-5" aria-label="Order summary">
          <h2 className="text-lg font-bold">Order summary</h2>
          {quote ? <Totals quote={quote} /> : (
            <p className="flex justify-between text-sm"><span className="text-white/70">Subtotal ({cart.itemCount} item{cart.itemCount === 1 ? '' : 's'})</span><span>{money(cart.subtotalAmount)}</span></p>
          )}
          {!quote && <p className="text-xs text-white/50">Shipping, discounts and tax are confirmed at the review step.</p>}
        </aside>
      </div>
    </>
  )
}
