// Hand-drawn accent marks pulled from the Porter House x Beermacs poster
// (spray-can squiggle, splatter star, spiral, dot grid) — simple inline SVG,
// no image assets, so they inherit currentColor and scale for free. Each one
// takes only a className for placement; the shape itself never changes.

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 90" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 44C28 8 52 8 66 30C82 55 100 55 112 34C126 10 150 10 166 32C176 46 182 52 194 46"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SplatterStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden="true">
      <path
        d="M50 2c3 16 8 24 14 28 14-8 24-10 30-8-4 10-10 18-10 24s6 14 10 24c-6 2-16 0-30-8-6 4-11 12-14 28-3-16-8-24-14-28-14 8-24 10-30 8 4-10 10-18 10-24S10 44 6 34c6-2 16 0 30 8 6-4 11-12 14-28Z"
      />
    </svg>
  );
}

export function SpiralMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <path
        d="M60 60c0 12 10 20 21 20s24-10 24-27-14-33-35-33-42 16-42 40 20 47 47 47 51-22 51-51"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DotGrid({ className }: { className?: string }) {
  const dots = Array.from({ length: 16 }, (_, i) => i);
  return (
    <svg viewBox="0 0 60 60" fill="currentColor" className={className} aria-hidden="true">
      {dots.map((i) => (
        <circle key={i} cx={8 + (i % 4) * 15} cy={8 + Math.floor(i / 4) * 15} r="3.4" />
      ))}
    </svg>
  );
}

export function ZigZag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 20 22 4l20 16 20-16 20 16 20-16 20 16 20-16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
