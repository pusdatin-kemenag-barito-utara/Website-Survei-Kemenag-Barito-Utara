
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function MaklumatModal() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = sessionStorage.getItem('maklumat_seen')
    if (!seen) {
      const timer = setTimeout(() => setShow(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  function close() {
    setShow(false)
    sessionStorage.setItem('maklumat_seen', '1')
  }


  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            key="maklumat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          <motion.div
            key="maklumat-modal"
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
            className="fixed inset-0 z-[201] flex items-center justify-center px-4"
            onClick={close}
          >
            {/* Wrapper column: X button atas, gambar bawah */}
            <div className="flex flex-col items-end gap-2 w-full max-w-4xl lg:max-w-6xl" onClick={(e) => e.stopPropagation()}>
              {/* Tombol tutup — di LUAR gambar, selalu terlihat */}
              <button
                onClick={close}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 hover:bg-white text-slate-800 text-xs font-bold shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="size-4" />
                <span>Tutup</span>
              </button>

              {/* Gambar Maklumat */}
              <div className="w-full overflow-hidden">
                <Image
                  src="/maklumat-pelayanan.webp"
                  alt="Maklumat Pelayanan Kantor Kementerian Agama Kabupaten Barito Utara"
                  width={1600}
                  height={600}
                  priority
                  className="w-full h-auto object-contain"
                  style={{ display: 'block' }}
                />
              </div>

              <p className="w-full text-center text-xs text-white/60 select-none pointer-events-none mt-1">
                Klik di luar atau tekan Tutup untuk menutup
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
