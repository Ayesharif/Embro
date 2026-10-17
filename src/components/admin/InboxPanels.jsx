import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { shortDate, titleCase } from '../../utils/format'
import { Loaded, PanelHeader, Table } from './ui'

async function patch(path, status, reload) {
  try {
    await apiRequest(path, { method: 'PATCH', body: { status } })
    reload()
  } catch (error) {
    toast.error(error.message)
  }
}

export function ReviewsPanel() {
  const result = useFetch('/admin/reviews')
  return (
    <>
      <PanelHeader title="Reviews" />
      <Loaded result={result}>
        {({ data }) => <Table rows={data} empty="No reviews yet." columns={[
          { header: 'Product', render: (review) => review.product?.name || '—' },
          { header: 'Review', render: (review) => <span className="block max-w-sm"><span className="text-amber-400">{'★'.repeat(review.rating)}</span> <strong>{review.title}</strong><br /><span className="text-white/70">{review.body}</span><br /><span className="text-xs text-white/45">{review.user?.name} · {shortDate(review.createdAt)}</span></span> },
          { header: 'Status', render: (review) => (
            <select aria-label="Review status" value={review.status} onChange={(event) => patch(`/admin/reviews/${review.id}`, event.target.value, result.reload)} className="input w-32">
              {['pending', 'approved', 'rejected', 'hidden'].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          ) },
        ]} />}
      </Loaded>
    </>
  )
}

export function MessagesPanel() {
  const result = useFetch('/admin/contacts')
  return (
    <>
      <PanelHeader title="Messages" />
      <Loaded result={result}>
        {({ data }) => <Table rows={data} empty="No messages yet." columns={[
          { header: 'From', render: (message) => <span><strong>{message.name}</strong><br /><a href={`mailto:${message.email}`} className="text-cyan-200 underline">{message.email}</a>{message.phone && <><br />{message.phone}</>}</span> },
          { header: 'Message', render: (message) => <span className="block max-w-md whitespace-pre-line text-white/80">{message.message}<br /><span className="text-xs text-white/45">{shortDate(message.createdAt)}</span></span> },
          { header: 'Status', render: (message) => (
            <select aria-label="Message status" value={message.status} onChange={(event) => patch(`/admin/contacts/${message.id}`, event.target.value, result.reload)} className="input w-36">
              {['new', 'in_progress', 'resolved', 'spam'].map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
          ) },
        ]} />}
      </Loaded>
    </>
  )
}
