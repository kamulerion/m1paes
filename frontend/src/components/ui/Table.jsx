import styles from './Table.module.css'

export default function Table({ caption, head, children }) {
  return (
    <div className={styles.wrap} tabIndex="0" role="region" aria-label={caption}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{head.map((h, i) => <th key={i} scope="col" style={{ textAlign: h.align || 'left' }}>{h.label}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
