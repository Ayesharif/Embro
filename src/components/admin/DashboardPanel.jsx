import { AlertTriangle } from 'lucide-react'
import { useFetch } from '../../hooks/useFetch'
import { money, shortDate, titleCase } from '../../utils/format'
import { Loaded, PanelHeader, Table } from './ui'

export default function DashboardPanel() {
  const result = useFetch('/admin/dashboard')
  return (
    <>
      <PanelHeader title="Dashboard" />
      <Loaded result={result}>
        {({ metrics, ordersByStatus, lowStock, recentOrders }) => (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[['Cash received', money(metrics.revenueAmount)], ['Orders', metrics.orders], ['Customers', metrics.customers], ['Products', metrics.products]].map(([label, value]) => (
                <div key={label} className="panel p-5"><p className="text-sm text-white/60">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p></div>
              ))}
            </div>
            {metrics.ordersNeedingAttention > 0 && <p className="flex items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100"><AlertTriangle size={18} /> {metrics.ordersNeedingAttention} order(s) need attention (e.g. a stock shortage at fulfilment). Check the Orders tab.</p>}
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 font-bold">Orders by status</h2>
                <div className="panel divide-y divide-white/10">
                  {Object.entries(ordersByStatus).map(([status, count]) => <p key={status} className="flex justify-between px-4 py-3 text-sm"><span>{titleCase(status)}</span><strong>{count}</strong></p>)}
                  {!Object.keys(ordersByStatus).length && <p className="p-4 text-sm text-white/60">No orders yet.</p>}
                </div>
              </section>
              <section>
                <h2 className="mb-3 font-bold">Low stock</h2>
                <div className="panel divide-y divide-white/10">
                  {lowStock.map((product) => <p key={product.id} className="flex justify-between px-4 py-3 text-sm"><span>{product.name}</span><strong className={product.stock === 0 ? 'text-red-300' : 'text-amber-200'}>{product.stock} left</strong></p>)}
                  {!lowStock.length && <p className="p-4 text-sm text-white/60">Everything is well stocked.</p>}
                </div>
              </section>
            </div>
            <section>
              <h2 className="mb-3 font-bold">Recent orders</h2>
              <Table rows={recentOrders} empty="No orders yet." columns={[
                { header: 'Order', render: (order) => <strong>{order.number}</strong> },
                { header: 'Customer', render: (order) => order.user?.name || '—' },
                { header: 'Date', render: (order) => shortDate(order.createdAt) },
                { header: 'Status', render: (order) => titleCase(order.status) },
                { header: 'Total', render: (order) => money(order.totalAmount, order.currency) },
              ]} />
            </section>
          </div>
        )}
      </Loaded>
    </>
  )
}
