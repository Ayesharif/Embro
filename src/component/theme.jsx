import { useState } from 'react'
import image1 from '../assets/1.png'
import image2 from '../assets/2.png'
import image3 from '../assets/3.png'
import { Settings } from 'lucide-react'

const gradients = [
  {
    name: 'Ocean',
    value: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #22d3ee 100%)',
  },
  {
    name: 'Sunset',
    value: 'linear-gradient(135deg, #7f1d1d 0%, #ea580c 50%, #facc15 100%)',
  },
  {
    name: 'Aurora',
    value: 'linear-gradient(135deg, #312e81 0%, #7e22ce 50%, #14b8a6 100%)',
  },
  {
    name: 'Rose',
    value: 'linear-gradient(135deg, #4c0519 0%, #be123c 50%, #fb7185 100%)',
  },
]

export default function Theme({ onImageChange }) {
    const[isOpen, setIsOpen] = useState(false)
    // console.log(isOpen);
    
    const handleImageClick = (image) => {
      try { localStorage.setItem('bgImage', image) } catch { /* storage unavailable */ }
      onImageChange(image)
    }
    
  return (
    <div className="pointer-events-none fixed right-0 top-0 z-[60]">
      
        <button
        type="button"
        aria-label={isOpen ? 'Close theme customizer' : 'Open theme customizer'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`pointer-events-auto absolute  top-1/2 flex -translate-y-1/2 right-0 items-center justify-center rounded-l-lg bg-black/70 p-3 text-white backdrop-blur-sm transition hover:bg-black ${
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Settings size={22} />
      </button>

      <div inert={!isOpen} className={`pointer-events-auto h-screen w-[min(20rem,100vw)] overflow-y-auto bg-black text-white transition-transform duration-500
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <button
          type="button"
          aria-label="Close theme customizer"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      <div className="p-4">
        <h2 className="text-lg font-semibold uppercase py-3">Theme Customizer</h2>
        <p className=" border border-x-0 border-gray-500 py-3 text-gray-300">Gaussian Texture</p>
      </div>

      <div className="grid grid-cols-3 gap-2 p-4">

      <div className="p-4">
        <button type="button" onClick={() => handleImageClick(image1)} aria-label="Use Background 1"><img src={image1} alt="" className="h-full w-full rounded object-cover" /></button>
      </div>
      <div className="p-4">
        <button type="button" onClick={() => handleImageClick(image2)} aria-label="Use Background 2"><img src={image2} alt="" className="h-full w-full rounded object-cover" /></button>
      </div>
      <div className="p-4">
        <button type="button" onClick={() => handleImageClick(image3)} aria-label="Use Background 3"><img src={image3} alt="" className="h-full w-full rounded object-cover" /></button>
      </div>
    
      </div>

<div className="p-4">

        <p className=" border border-x-0 border-gray-500 py-3 text-gray-300">Gradient Background</p>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 place-items-center">
  {gradients.map((gradient) => (
        <button
          key={gradient.name}
          type="button"
          aria-label={`Use ${gradient.name} gradient`}
          onClick={() => handleImageClick(gradient.value)}
          className=" h-10 w-15 rounded border border-white/20"
          style={{ backgroundImage: gradient.value }}
        />
      ))}
      </div>
      </div>
    </div>
    
  )
}
