import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="mt-20 border-t border-stout-900/8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-sm text-stout-700/70">
        <span>© {new Date().getFullYear()} Beermacs</span>
        <div className="flex-1" />
        <Link href="/privacy" className="hover:text-stout-900">
          Privacy
        </Link>
        <Link href="/support" className="hover:text-stout-900">
          Support
        </Link>
      </div>
    </footer>
  );
}
