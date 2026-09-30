import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Privacy · Beermacs" };

/**
 * Apple requires a privacy policy URL before submission (guideline 5.1.1),
 * and the App Store Connect privacy label must say the same thing. This is
 * a plain-English description kept in sync with the real collection points
 * (User email/name/phone/image, Device for push, chat, SupportMessage) —
 * accurate at time of writing, not a substitute for legal review.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-beer-100">Privacy</h1>
        <div className="mt-6 space-y-4 text-beer-100/70">
          <h2 className="pt-2 text-lg font-semibold text-beer-100">What we collect</h2>
          <p className="leading-relaxed">
            <strong className="text-beer-100">Required to have an account:</strong> your email address, a
            password (stored only as a secure hash) and a display name.
          </p>
          <p className="leading-relaxed">
            <strong className="text-beer-100">Optional:</strong> a phone number, if you add one in your
            profile, and a profile picture.
          </p>
          <p className="leading-relaxed">
            <strong className="text-beer-100">From using the app:</strong> the teams and tournaments you
            join, your match results, messages you write in tournament chat, messages you send us through
            support, and, if you allow notifications, a device token so we can tell you when your table is
            ready.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">What we don&rsquo;t collect</h2>
          <p className="leading-relaxed">
            No location tracking, no advertising identifiers, no tracking across other apps or websites, and
            no third-party analytics on your behaviour.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Who sees it</h2>
          <p className="leading-relaxed">
            Other players see your display name, team, results and chat messages in tournaments you join.
            Staff at a venue where you&rsquo;ve played can also see your email address and, if you added
            one, your phone number, so they can tell you about future tournaments. Reported chat messages
            are reviewed by the venue and by us. We never sell your data or use it for advertising.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Deleting your account</h2>
          <p className="leading-relaxed">
            In the app, go to <strong className="text-beer-100">Profile → Delete account</strong>. Your
            account, profile, team memberships and devices are deleted immediately, and your name and
            contact details are removed from any support messages. Match results and chat messages stay in
            the venue&rsquo;s tournament history, shown as &ldquo;Deleted user&rdquo;. You can also email{" "}
            <a className="text-beer-500 underline underline-offset-2" href="mailto:support@beermacs.com">
              support@beermacs.com
            </a>{" "}
            and we&rsquo;ll do it for you.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-beer-100">Contact</h2>
          <p className="leading-relaxed">
            Questions about your data:{" "}
            <a className="text-beer-500 underline underline-offset-2" href="mailto:support@beermacs.com">
              support@beermacs.com
            </a>
            .
          </p>
        </div>
      </main>
      <PageFooter />
    </>
  );
}
