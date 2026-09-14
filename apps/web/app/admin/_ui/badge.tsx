import type { ReactNode } from "react";

const TONES = {
  brand: "bg-beer-100 text-beer-700",
  neutral: "bg-gray-100 text-gray-600",
  live: "bg-green-100 text-green-700",
  dispute: "bg-red-100 text-red-700",
} as const;

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
