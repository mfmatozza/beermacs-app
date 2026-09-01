import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Privacy · Beermacs" };

/**
 * Apple requires a privacy policy URL before submission. This describes the
 * intended design; it must be reviewed by someone qualified before the app
 * ships, which is what the banner says out loud rather than pretending
 * otherwise.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-stout-900">Privacy</h1>
        <p className="mt-4 rounded-xl border border-beer-200 bg-beer-100/50 px-4 py-3 text-sm text-stout-700">
          Draft. To be reviewed before the app is submitted to the App Store.
        </p>
        <div className="mt-6 space-y-4 text-stout-700/85">
          <h2 className="pt-2 text-lg font-semibold text-stout-900">What we collect</h2>
          <p className="leading-relaxed">
            A display name, the team you joined, the results of your matches, and anything you write
            in the tournament chat. If you turn on notifications, a device token so we can tell you
            when your table is ready.
          </p>
          <p className="leading-relaxed">
            You can play without giving us an email address or a phone number. Accounts are
            anonymous by default; you only attach contact details if you want your record to follow
            you between nights.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-stout-900">What we don&rsquo;t collect</h2>
          <p className="leading-relaxed">
            No location tracking, no advertising identifiers, no third-party analytics on your
            behaviour.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-stout-900">Who sees it</h2>
          <p className="leading-relaxed">
            Staff at the venue running your tournament see your display name, team and results.
            Other players see the same. We do not sell it.
          </p>

          <h2 className="pt-2 text-lg font-semibold text-stout-900">Deletion</h2>
          <p className="leading-relaxed">
            Email{" "}
            <a
              className="text-beer-700 underline underline-offset-2"
              href="mailto:support@beermacs.com"
            >
              support@beermacs.com
            </a>{" "}
            and we delete your account and personal data. Match results stay in the venue&rsquo;s
            tournament history with your name removed.
          </p>
        </div>
      </main>
      <PageFooter />
    </>
  );
}
