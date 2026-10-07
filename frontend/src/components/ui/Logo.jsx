import { Link } from 'react-router-dom'
import styles from './Logo.module.css'

export default function Logo({ light }) {
  return (
    <Link to="/" className={`${styles.logo} ${light ? styles.light : ''}`}>
      <svg width="42" height="42" viewBox="0 0 64 64" aria-hidden="true" className={styles.mark}>
        <rect width="64" height="64" rx="14" fill="#1e2a4a"></rect>
        <path d="M14 46V18l10 14 10-14v28" fill="none" stroke="#fdf8ee" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M42 24l6-6v28" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
      <span className={styles.text}>M1<span className={light ? '' : styles.paes} style={light ? { color: 'var(--accent)' } : undefined}>PAES</span></span>
    </Link>
  )
}
