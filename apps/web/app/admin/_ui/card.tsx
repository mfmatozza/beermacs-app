/** Surface primitives — light cards on a light ground, deliberately NOT the
 *  dark poster theme the marketing site committed to (D23): an operator
 *  console gets read for long stretches and needs to scan fast, not sell a
 *  night out. See docs/DECISIONS.md D25. */
import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "plain" | "brand";
}) {
  const brand = tone === "brand";
  return (
    <div
      className={
        brand
          ? "rounded-2xl bg-stout-900 p-5 text-white shadow-sm"
          : "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-medium uppercase tracking-wide ${brand ? "text-white/60" : "text-gray-500"}`}>
          {label}
        </p>
        {icon ? <span className={brand ? "text-beer-400" : "text-beer-600"}>{icon}</span> : null}
      </div>
      <p className={`mt-2 text-3xl font-bold ${brand ? "text-white" : "text-gray-900"}`}>{value}</p>
      {hint ? <p className={`mt-1 text-xs ${brand ? "text-white/50" : "text-gray-400"}`}>{hint}</p> : null}
    </div>
  );
}
