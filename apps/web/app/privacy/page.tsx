import { PageFooter } from "../_ui/page-footer";
import { PageHeader } from "../_ui/page-header";

export const metadata = { title: "Privacy · Beermacs" };

/**
 * Apple requires a privacy policy URL before submission (guideline 5.1.1).
 * This is a plain-English description of what the app actually does with
 * data, kept in sync with the real collection points (User.image for the
 * avatar, DeviceToken for push, chat messages) rather than boilerplate —
 * accurate at time of writing, not a substitute for real legal review if
 * Beermacs later needs one for a specific jurisdiction.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-stout-900">Privacy</h1>
        <div className="mt-6 space-y-4 text-stout-700/85">
          <h2 className="pt-2 text-lg font-semibold text-stout-900">What we collect</h2>
          <p className="leading-relaxed">
            A display name, the team you joined, the results of your matches, and anything you write
            in the tournament chat. If you set a profile picture, that photo. If you turn on
            notifications, a device token so we can tell you when your table is ready.
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
