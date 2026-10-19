import { ChevronRight, Home as HomeIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/75">
      <Link to="/" className="flex items-center gap-1 transition hover:text-white">
        <HomeIcon size={16} aria-hidden="true" />
        Home
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <ChevronRight size={17} className="text-white/45" aria-hidden="true" />
          {item.to ? (
            <Link to={item.to} className="transition hover:text-white">{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
