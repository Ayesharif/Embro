import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import defaultImage from '../assets/3.png'
import CartDrawer from '../component/CartDrawer'
import Footer from '../component/Footer'
import Navbar from '../component/Navbar'
import Theme from '../component/theme'

function savedBackground() {
  try {
    return localStorage.getItem('bgImage') || defaultImage
  } catch {
    return defaultImage
  }
}

export default function Layout() {
  const [image, setImage] = useState(savedBackground)
  const backgroundImage = image.startsWith('linear-gradient') ? image : `url("${image}")`

  return (
    <div className="relative min-h-screen">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage }} aria-hidden="true" />
      <Theme onImageChange={setImage} />
      <div className="relative z-10 flex min-h-screen flex-col text-white">
        <Navbar />
        <div id="main" tabIndex={-1} className="flex-1 outline-none"><Outlet /></div>
        <Footer />
      </div>
      <CartDrawer />
    </div>
  )
}
