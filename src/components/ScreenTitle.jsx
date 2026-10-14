export default function ScreenTitle({ preview, kicker, title, className = '' }) {
  return (
    <div className={`screen-title ${className}`.trim()}>
      {preview ? <div className="screen-title__preview">{preview}</div> : null}
      <div className="screen-title__content">
        {kicker ? <div className="screen-title__kicker">{kicker}</div> : null}
        {title ? <h1 className="screen-title__title">{title}</h1> : null}
      </div>
    </div>
  )
}
