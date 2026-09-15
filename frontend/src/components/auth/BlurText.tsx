import { motion, useReducedMotion } from 'framer-motion'

/**
 * Texto que entra palavra a palavra saindo de um blur (padrão "blur-text" do
 * React Bits, sobre o Framer Motion). Roda uma única vez, na montagem.
 */
interface BlurTextProps {
  text: string
  className?: string
  /** Atraso inicial em segundos antes da primeira palavra. */
  delay?: number
  /** Intervalo entre palavras em segundos. */
  stagger?: number
}

export default function BlurText({ text, className = '', delay = 0, stagger = 0.08 }: BlurTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = text.split(' ')

  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, filter: 'blur(8px)', y: 8 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ duration: 0.45, delay: delay + i * stagger, ease: 'easeOut' }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}
