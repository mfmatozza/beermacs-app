import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  block?: boolean;
};

export function Button({ variant = "primary", block = false, className = "", ...props }: Props) {
  const styles =
    variant === "primary"
      ? "bg-beer-500 text-stout-900 hover:bg-beer-400"
      : variant === "danger"
        ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
        : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${block ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
