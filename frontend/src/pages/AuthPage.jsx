export default function AuthPage({ title, intro, children, links, onSubmit }) {
  return (
    <div className="container" style={{ maxWidth: 480, paddingBlock: 'var(--sp-7)' }}>
      <div style={{ background: 'var(--surface)', border: '2px solid var(--ink)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-pop)', padding: 'var(--sp-6)' }}>
        <h1>{title}</h1>
        {intro && <p style={{ marginTop: 'var(--sp-2)' }}>{intro}</p>}
        <form className="stack" style={{ marginTop: 'var(--sp-5)' }} onSubmit={onSubmit ?? ((e) => e.preventDefault())} noValidate>
          {children}
        </form>
        {links && <p style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 'var(--fs-sm)' }}>{links}</p>}
      </div>
    </div>
  )
}
