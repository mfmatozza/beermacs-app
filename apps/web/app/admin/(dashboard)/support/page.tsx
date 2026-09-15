import { Prisma, prisma } from "@beermacs/db";
import { PageHeader } from "../../_ui/page-header";
import { SupportInbox } from "./support-inbox";

export const dynamic = "force-dynamic";

const MESSAGE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  body: true,
  source: true,
  resolvedAt: true,
  createdAt: true,
  userId: true,
} satisfies Prisma.SupportMessageSelect;

export type SupportMessageData = Prisma.SupportMessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

/**
 * The one inbox behind both entry points: the public /support contact form
 * and the mobile app's "?" help button in Profile (guideline 1.2's
 * "published way to contact us", independent of chat's own report/block/mute
 * kit, which only covers in-tournament conduct). Not venue-scoped — a
 * contact-form message isn't about any one venue — so platform-admin only,
 * same as Access and Site content.
 */
export default async function SupportPage() {
  const messages = await prisma.supportMessage.findMany({
    orderBy: [{ resolvedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: MESSAGE_SELECT,
  });

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Contact-form messages and in-app help requests, in one inbox."
      />
      <SupportInbox messages={messages} />
    </>
  );
}
