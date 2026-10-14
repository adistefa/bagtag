function MegaphoneIcon() {
  return (
    <svg className="announcement-ticker__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 11.5V9.5L15 5.5V18.5L3 14.5V11.5Z" fill="currentColor" />
      <path d="M15 8.5L19 7.5V16.5L15 15.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15.5C5.6 15.9 6.9 16.1 8 16.1C9.6 16.1 11 15.3 12 14.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 18.5L7 15.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

const DEFAULT_ANNOUNCEMENT = 'NEW BAGTAG PREVIEW! TEST IT & REPORT WRONG TAG NUMBERS'

export default function AnnouncementTicker({ text = DEFAULT_ANNOUNCEMENT }) {
  const announcement = text?.trim() || DEFAULT_ANNOUNCEMENT

  return (
    <div className="announcement-ticker" role="status" aria-live="polite" aria-label={announcement}>
      <div className="announcement-ticker__track">
        <div className="announcement-ticker__item">
          <MegaphoneIcon />
          <span>{announcement}</span>
        </div>
        <div className="announcement-ticker__item" aria-hidden="true">
          <MegaphoneIcon />
          <span>{announcement}</span>
        </div>
      </div>
    </div>
  )
}
