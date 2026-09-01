/** Card — a bordered surface that lifts off the tinted page backdrop. */
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-stout-900/8 bg-white p-6 ${className}`}>
      {children}
    </div>
  );
}
