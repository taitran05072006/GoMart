export const PRODUCT_FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#e5e7eb'/>
          <stop offset='100%' stop-color='#d1d5db'/>
        </linearGradient>
      </defs>
      <rect width='600' height='600' fill='url(#g)'/>
      <g fill='#6b7280' font-family='Arial, sans-serif' text-anchor='middle'>
        <circle cx='300' cy='245' r='70' fill='#9ca3af'/>
        <rect x='180' y='340' width='240' height='28' rx='14' fill='#9ca3af'/>
        <text x='300' y='430' font-size='28' font-weight='700'>No Image</text>
      </g>
    </svg>
  `);

export function ensureImageFallback(event) {
  const img = event.currentTarget;
  if (img.src !== PRODUCT_FALLBACK_IMAGE) {
    img.src = PRODUCT_FALLBACK_IMAGE;
  }
}
