/**
 * Inline SVG icon set for the admin console. Outline style (stroke =
 * currentColor, round caps/joins), no icon-library dependency — size and
 * color come from the parent, same convention as everything else here.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.5 14.4A5.5 5.5 0 0 1 20.5 20" />
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M4 4.5h16l1 5a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-3-.5Z" />
      <path d="M5 11v9h14v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

/** Trophy — tournaments. */
export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M7 4.5h10v5a5 5 0 0 1-10 0v-5Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4" />
      <path d="M12 14.5V18M9 21h6M8.5 21v-2.2c0-.4.3-.8.8-.8h5.4c.5 0 .8.4.8.8V21" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M12 3.5 19 6v5.5c0 4-2.9 7.5-7 9-4.1-1.5-7-5-7-9V6l7-2.5Z" />
      <path d="m9.2 12.2 2 2 3.6-3.9" />
    </svg>
  );
}

/** Document/file — site content. */
export function FileIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M6.5 3h7L19 8.5V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 19V4.5A1.5 1.5 0 0 1 6.5 3Z" />
      <path d="M13.5 3v5h5" />
      <path d="M9 12.5h6M9 16h4" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M14 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h7" />
      <path d="M15 8.5 19.5 12 15 15.5M9.5 12h10" />
    </svg>
  );
}

/** Beer cups — a live/on-table match. */
export function CupsIcon(props: IconProps) {
  return (
    <svg {...base(props)} aria-hidden="true">
      <path d="M6 4h5l-.6 8a2 2 0 0 1-2 1.8h-.8A2 2 0 0 1 5.6 12L5 4Z" />
      <path d="M13 8h5l-.5 5.5a1.7 1.7 0 0 1-1.7 1.5h-.6a1.7 1.7 0 0 1-1.7-1.5L13 8Z" />
      <path d="M4 20h9M14.5 20h4.5" />
    </svg>
  );
}
