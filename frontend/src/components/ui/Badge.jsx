import styles from './Badge.module.css'

export default function Badge({ variant = 'neutral', eje, children, ...props }) {
  if (eje) return <span className={`${styles.badge} ${styles.eje}`} data-eje={eje} {...props}>{children}</span>
  return <span className={`${styles.badge} ${styles[variant]}`} {...props}>{children}</span>
}
