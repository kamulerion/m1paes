import styles from './Alert.module.css'

const ICONS = {
  info: (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>),
  success: (<><circle cx="12" cy="12" r="10" /><path d="m16 9-5.5 5.5L8 12" /></>),
  warning: (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  error: (<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>),
}

export default function Alert({ variant = 'info', title, children, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[variant]}`} role={variant === 'error' ? 'alert' : 'status'}>
      <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[variant]}</svg>
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.text}>{children}</div>
      </div>
      {onClose && (
        <button type="button" className={styles.close} aria-label="Cerrar mensaje" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}
    </div>
  )
}
