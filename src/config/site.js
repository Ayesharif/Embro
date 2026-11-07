// Store contact details live in one place and can be overridden per deployment via .env.
export const site = {
  name: 'Embro',
  tagline: 'Quality materials and beautiful details for every creative project.',
  url: (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, ''),
  logo: import.meta.env.VITE_SITE_LOGO || '',
  currency: (import.meta.env.VITE_STORE_CURRENCY || 'USD').toUpperCase(),
  email: import.meta.env.VITE_CONTACT_EMAIL || 'hello@embro.example',
  phone: import.meta.env.VITE_CONTACT_PHONE || '+92 300 0000000',
  address: import.meta.env.VITE_CONTACT_ADDRESS || '123 Craft Street, Lahore, Pakistan',
  instagram: import.meta.env.VITE_INSTAGRAM_URL || '',
  hours: 'Mon - Fri / 9:30 AM - 6:30 PM',
}
