import './VideoPlayer.css'

function getVideoSource(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let youtubeId = null

  if (host === 'youtu.be') youtubeId = url.pathname.split('/').filter(Boolean)[0]
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') youtubeId = url.searchParams.get('v')
    else if (/^\/(embed|shorts|live)\//.test(url.pathname)) youtubeId = url.pathname.split('/')[2]
  }

  if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) {
    return { type: 'embed', src: `https://www.youtube-nocookie.com/embed/${youtubeId}` }
  }

  let vimeoId = null
  if (host === 'vimeo.com' && /^\/(\d+)(?:\/|$)/.test(url.pathname)) vimeoId = url.pathname.match(/^\/(\d+)/)?.[1]
  if (host === 'player.vimeo.com') vimeoId = url.pathname.match(/^\/video\/(\d+)(?:\/|$)/)?.[1]
  if (vimeoId) return { type: 'embed', src: `https://player.vimeo.com/video/${vimeoId}` }

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { type: 'file', src: url.href }

  return { type: 'link', src: url.href }
}

export default function VideoPlayer({ url, title = 'Video de apoyo' }) {
  const source = getVideoSource(url)
  if (!source) return <p className="video-player__error">El enlace del video no es válido.</p>

  return (
    <section className="video-player" aria-label={title}>
      <h3 className="video-player__title">{title}</h3>
      {source.type === 'embed' && (
        <div className="video-player__frame">
          <iframe
            src={source.src}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
      {source.type === 'file' && (
        <video className="video-player__native" controls preload="metadata">
          <source src={source.src} />
          Tu navegador no puede reproducir este video.
        </video>
      )}
      {source.type === 'link' && (
        <p className="video-player__fallback">
          Este proveedor no permite insertar el video aquí.{' '}
          <a href={source.src} target="_blank" rel="noopener noreferrer">Abrir video en otra pestaña</a>
        </p>
      )}
    </section>
  )
}
