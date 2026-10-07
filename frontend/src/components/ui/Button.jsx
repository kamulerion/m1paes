import styles from './Button.module.css'

export default function Button({ variant = 'primary', size = 'md', full, loading, disabled, className = '', children, ...props }) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${styles[size]} ${full ? styles.full : ''} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <svg className={styles.spin} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
      {children}
    </button>
  )
}
