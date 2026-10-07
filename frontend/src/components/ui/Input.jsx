import styles from './Input.module.css'

export default function Field({ label, required, hint, error, htmlFor, children }) {
  return (
    <div className={`${styles.field} ${error ? styles.hasError : ''}`}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className={styles.error} role="alert">{error}</p>
      ) : (
        hint && <p className={styles.hint}>{hint}</p>
      )}
    </div>
  )
}

export function Input({ icon, toggle, className = '', ...props }) {
  return (
    <div className={styles.control}>
      {icon}
      <input className={`${styles.input} ${icon ? styles.withIcon : ''} ${toggle ? styles.withToggle : ''} ${className}`} {...props} />
      {toggle}
    </div>
  )
}

export function Textarea(props) {
  return (<textarea className={`${styles.input} ${styles.textarea}`} {...props} />)
}

export function Select({ children, ...props }) {
  return <select className={`${styles.input} ${styles.select}`} {...props}>{children}</select>
}
