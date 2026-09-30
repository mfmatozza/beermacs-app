import { prisma } from "@beermacs/db";
import { requireAdminPage } from "@/lib/admin-session";
import { Card } from "../../_ui/card";
import { PageHeader } from "../../_ui/page-header";
import { UnlockButton } from "./unlock-button";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Admin login lockouts (lib/admin-auth.ts): 10 failed attempts from one
 *  network locks it. Unlock here — e.g. after locking yourself out at home,
 *  sign in from your phone's data connection and unlock the home IP. */
export default async function SecurityPage() {
  await requireAdminPage();
  const rows = await prisma.adminLoginLock.findMany({ orderBy: { updatedAt: "desc" }, take: 100 });

  return (
    <>
      <PageHeader
        title="Security"
        subtitle="Failed admin sign-ins by network. 10 failures locks that network until you unlock it (or for 24 hours)."
      />
      <Card className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400">No failed sign-ins recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">IP address</th>
                  <th className="px-4 py-3 font-medium">Failures</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last attempt</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr key={r.ip}>
                    <td className="px-4 py-3 font-mono text-gray-800">{r.ip}</td>
                    <td className="px-4 py-3 text-gray-600">{r.failures}</td>
                    <td className="px-4 py-3">
                      {r.lockedAt ? (
                        <span className="font-medium text-red-600">Locked since {fmt.format(r.lockedAt)}</span>
                      ) : (
                        <span className="text-gray-500">Counting</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fmt.format(r.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <UnlockButton ip={r.ip} locked={Boolean(r.lockedAt)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
