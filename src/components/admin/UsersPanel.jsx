import { useAuth } from '../../auth/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { toast } from '../../stores/toastStore'
import { apiRequest } from '../../utils/api'
import { shortDate, titleCase } from '../../utils/format'
import { Loaded, PanelHeader, Table } from './ui'

const ROLES = ['customer', 'support', 'warehouse', 'admin', 'super_admin']

export default function UsersPanel() {
  const { user: me } = useAuth()
  const result = useFetch('/admin/users')
  const isSuper = me.role === 'super_admin'

  const update = async (user, changes) => {
    try {
      await apiRequest(`/admin/users/${user.id}`, { method: 'PATCH', body: changes })
      toast.success('User updated')
      result.reload()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <PanelHeader title="Users" />
      <Loaded result={result}>
        {({ data }) => <Table rows={data} columns={[
          { header: 'User', render: (user) => <span><strong>{user.name}</strong>{user.id === me.id && <span className="badge ml-2">You</span>}<br /><span className="text-xs text-white/55">{user.email}</span></span> },
          { header: 'Joined', render: (user) => shortDate(user.createdAt) },
          { header: 'Role', render: (user) => (
            isSuper && user.id !== me.id
              ? <select aria-label={`Role for ${user.name}`} value={user.role} onChange={(event) => update(user, { role: event.target.value })} className="input w-36">{ROLES.map((role) => <option key={role} value={role}>{titleCase(role)}</option>)}</select>
              : titleCase(user.role)
          ) },
          { header: 'Status', render: (user) => (
            user.id === me.id
              ? <span className="badge badge-ok">Active</span>
              : <button type="button" onClick={() => update(user, { status: user.status === 'active' ? 'suspended' : 'active' })} className={`btn btn-sm ${user.status === 'active' ? 'btn-outline' : 'btn-danger'}`}>{user.status === 'active' ? 'Suspend' : 'Reactivate'}</button>
          ) },
        ]} />}
      </Loaded>
    </>
  )
}
