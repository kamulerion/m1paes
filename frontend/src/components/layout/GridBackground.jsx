import styles from './GridBackground.module.css'

const SYMBOLS = [
  { char: 'π', eje: 'numeros', top: '12%', left: '6%', size: '3.2rem', delay: '0s' },
  { char: '√x', eje: 'algebra', top: '68%', left: '4%', size: '2.6rem', delay: '-6s' },
  { char: 'Σ', eje: 'probabilidad', top: '22%', left: '88%', size: '3rem', delay: '-3s' },
  { char: '△', eje: 'geometria', top: '78%', left: '90%', size: '2.8rem', delay: '-9s' },
  { char: '8', eje: 'numeros', top: '45%', left: '94%', size: '2.4rem', delay: '-12s' },
  { char: 'x²', eje: 'algebra', top: '88%', left: '48%', size: '2.2rem', delay: '-4s' },
  { char: '%', eje: 'probabilidad', top: '6%', left: '52%', size: '2.2rem', delay: '-8s' },
  { char: 'θ', eje: 'geometria', top: '50%', left: '2%', size: '2.4rem', delay: '-14s' },
]

export default function GridBackground() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.grid}></div>
      <div className={styles.vignette}></div>
      {SYMBOLS.map((s, i) => (
        <span
          key={i}
          className={styles.symbol}
          data-eje={s.eje}
          style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay, color: `var(--eje-${s.eje})` }}
        >
          {s.char}
        </span>
      ))}
    </div>
  )
}
