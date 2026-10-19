import Breadcrumbs from './Breadcrumbs'

// The title bar repeated across Shop, Wishlist, Account, About and Contact.
export default function PageHeader({ title, crumbs = [] }) {
  return (
    <header className="border-b border-white/15 bg-black/20">
      <div className="container-page flex flex-wrap items-center justify-between gap-4 py-7">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <Breadcrumbs items={crumbs} />
      </div>
    </header>
  )
}
