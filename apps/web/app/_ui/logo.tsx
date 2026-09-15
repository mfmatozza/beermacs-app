/** Wordmark. Type-only — the mark itself comes later with the brand work. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`text-lg font-semibold tracking-tight text-beer-100 ${className}`}
      aria-label="Beermacs"
    >
      beer<span className="text-beer-500">macs</span>
    </span>
  );
}
