import { Heart, LogOut, Menu, ShieldCheck, ShoppingCart, User, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../auth/AuthContext'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'

const navs = [
  { name: 'Home', link: '/' },
  { name: 'Products', link: '/products' },
  { name: 'About', link: '/about' },
  { name: 'Contact', link: '/contact' },
]

function Count({ value }) {
  if (!value) return null
  return <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-900">{value}</span>
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, isAdmin, user, signOut } = useAuth()
  const itemCount = useCartStore((state) => state.cart.itemCount)
  const openCart = useCartStore((state) => state.openDrawer)
  const wishlistCount = useWishlistStore((state) => state.items.length)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-slate-950/70 text-white backdrop-blur-md">
      <div className="container-page flex items-center justify-between gap-5 py-2">
        <Link to="/" onClick={closeMenu} className="w-14 shrink-0" aria-label="Lembro home">
          <img className="h-full w-full object-contain" src={logo} alt="" />
        </Link>

        <div className={`${menuOpen ? 'flex' : 'hidden'} absolute left-0 top-full w-full flex-col gap-5 border-b border-white/10 bg-slate-950/95 p-5 sm:static sm:flex sm:w-auto sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0`}>
          <nav aria-label="Main" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            {navs.map((nav) => (
              <NavLink key={nav.link} to={nav.link} end={nav.link === '/'} onClick={closeMenu} className={({ isActive }) => `rounded px-2 py-1 transition hover:bg-white/10 ${isActive ? 'font-semibold text-white' : 'text-white/75'}`}>
                {nav.name}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-5 border-t border-white/10 pt-4 sm:border-0 sm:pt-0">
            {isAdmin && <Link to="/admin" onClick={closeMenu} aria-label="Admin portal" title="Admin portal" className="hover:text-white/70"><ShieldCheck /></Link>}
            <Link to={isAuthenticated ? '/account' : '/auth/login'} onClick={closeMenu} aria-label="Account" title={user?.name || 'Sign in'} className="hover:text-white/70"><User /></Link>
            <Link to={isAuthenticated ? '/wishlist' : '/auth/login'} onClick={closeMenu} aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`} className="relative hover:text-white/70">
              <Heart /><Count value={wishlistCount} />
            </Link>
            <button type="button" aria-label={`Shopping cart${itemCount ? `, ${itemCount} items` : ''}`} onClick={() => { closeMenu(); openCart() }} className="relative hover:text-white/70">
              <ShoppingCart /><Count value={itemCount} />
            </button>
            {isAuthenticated ? (
              <button type="button" onClick={() => { closeMenu(); signOut() }} className="flex items-center gap-1.5 text-sm text-white/75 hover:text-white"><LogOut size={16} />Sign out</button>
            ) : (
              <Link to="/auth/login" onClick={closeMenu} className="btn btn-outline btn-sm">Sign in</Link>
            )}
          </div>
        </div>

        <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="rounded p-2 transition hover:bg-white/10 sm:hidden">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  )
}
