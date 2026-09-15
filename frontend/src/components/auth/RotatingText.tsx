import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * Slot de texto rotativo (padrão "rotating-text" do React Bits sobre o
 * Framer Motion): alterna as frases num ciclo com saída/entrada verticais +
 * blur. Com preferência de movimento reduzido, mostra só a primeira frase.
 */
interface RotatingTextProps {
  items: string[]
  /** Intervalo entre trocas, em ms. */
  interval?: number
  className?: string
}

export default function RotatingText({ items, interval = 3500, className = '' }: RotatingTextProps) {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion || items.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % items.length), interval)
    return () => clearInterval(id)
  }, [items.length, interval, prefersReducedMotion])

  if (prefersReducedMotion || items.length < 2) {
    return <span className={className}>{items[0]}</span>
  }

  return (
    // Grid 1×1: as frases se sobrepõem na mesma célula durante a troca,
    // e a célula guarda a largura/altura da maior, sem pulos de layout.
    <span className={`inline-grid overflow-hidden align-bottom ${className}`}>
      {/* Fantasma invisível da maior frase para travar a largura */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-nowrap">
        {items.reduce((a, b) => (a.length >= b.length ? a : b))}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={items[index]}
          className="col-start-1 row-start-1 whitespace-nowrap"
          initial={{ y: '105%', opacity: 0, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-105%', opacity: 0, filter: 'blur(4px)' }}
          transition={{ type: 'spring' as const, stiffness: 260, damping: 30 }}
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
