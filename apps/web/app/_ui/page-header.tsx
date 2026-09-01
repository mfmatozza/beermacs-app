import Link from "next/link";
import { Logo } from "./logo";

/** Site header. One nav, no dropdowns — there are four pages. */
export function PageHeader() {
  return (
    <header className="border-b border-stout-900/8">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex-1" />
        <Link href="/support" className="text-sm text-stout-700 hover:text-stout-900">
          Support
        </Link>
        <Link href="/privacy" className="text-sm text-stout-700 hover:text-stout-900">
          Privacy
        </Link>
      </div>
    </header>
  );
}
