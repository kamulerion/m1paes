import styles from './Card.module.css'

export default function Card({ pad = 'md', variant = 'raised', eje, interactive, className = '', children, ...props }) {
  return (
    <div className={`${styles.card} ${styles['pad-' + pad]} ${styles[variant]} ${eje ? styles.eje : ''} ${interactive ? styles.interactive : ''} ${className}`} data-eje={eje} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ icon, title, subtitle, action }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        {icon && <span className={styles.headerIcon} aria-hidden="true">{icon}</span>}
        <div>
          {title && <h3 className={styles.title}>{title}</h3>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
