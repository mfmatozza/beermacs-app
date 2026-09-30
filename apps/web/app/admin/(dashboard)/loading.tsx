/** Shown inside the shell while a server page queries — navigation used to
 *  give no feedback at all until the whole page arrived. */
export default function AdminLoading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="mb-2 h-7 w-48 rounded-lg bg-gray-200" />
      <div className="mb-6 h-4 w-72 rounded bg-gray-100" />
      <div className="h-40 rounded-2xl bg-gray-100" />
    </div>
  );
}
