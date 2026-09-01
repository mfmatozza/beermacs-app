/** Button — brand-filled primary + subtle secondary, matching the mobile app. */
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  block?: boolean;
};

export function Button({ variant = "primary", block = false, className = "", ...props }: Props) {
  const styles =
    variant === "primary"
      ? "bg-stout-900 text-white hover:bg-stout-700 active:bg-stout-700"
      : "border border-stout-900/12 bg-white text-stout-700 hover:bg-stout-900/4";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${
        block ? "w-full" : ""
      } ${className}`}
      {...props}
    />
  );
}
