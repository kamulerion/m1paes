import styles from './Progress.module.css'

export function ProgressBar({ value, label = 'Avance', size = 'md', eje }) {
  return (
    <div className={styles.barWrap} data-eje={eje}>
      <div className={styles.barHeader}>
        <span className={styles.barLabel}>{label}</span>
        <span className={styles.barValue}>{value}%</span>
      </div>
      <div className={`${styles.track} ${styles[size]}`} role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
        <div className={styles.fill} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  )
}

export function ProgressRing({ value, size = 96, label, eje }) {
  const r = (size - 20) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={styles.ring} data-eje={eje} role="img" aria-label={`${label ?? 'Avance general'}: ${value}%`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className={styles.ringTrack} cx={size / 2} cy={size / 2} r={r} strokeWidth="10" />
        <circle className={styles.ringFill} cx={size / 2} cy={size / 2} r={r} strokeWidth="10" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className={styles.ringCenter} aria-hidden="true">
        <span className={styles.ringValue}>{value}%</span>
      </div>
    </div>
  )
}
