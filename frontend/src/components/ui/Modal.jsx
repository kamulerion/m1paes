import styles from './Modal.module.css'

export default function Modal({ open, onClose, title, description, size = 'md', footer, children }) {
  if (!open) return null
  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`${styles.dialog} ${styles[size]}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={(e) => e.key === 'Escape' && onClose?.()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{title}</h3>
            {description && <p className={styles.description}>{description}</p>}
          </div>
          <button type="button" className={styles.close} aria-label="Cerrar" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
