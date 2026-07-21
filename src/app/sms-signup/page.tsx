import type { Metadata } from "next";
import Link from "next/link";
import { SubscribeForm } from "@/components/forms/subscribe-form";

export const metadata: Metadata = {
  title: "Text and MMS Alerts Signup",
  description: "Opt in to Curtis Road Trip journal alerts by text or MMS.",
};

export default function SmsSignupPage() {
  return <main className="readable-surface page-shell my-10 max-w-4xl py-10 sm:my-16 sm:py-14">
    <p className="retro-section-label inline-block">MESSAGE_SIGNUP.EXE</p>
    <h1 className="mt-3 font-serif text-4xl font-semibold text-forest sm:text-5xl">Road Journal Text Alerts</h1>
    <p className="mt-4 max-w-2xl leading-7 text-stone-700">Sign up for email updates and, if you choose, recurring text/MMS alerts from <strong>Curtis Road Trip (Road &amp; Country)</strong> whenever a new road journal entry is posted.</p>

    <section className="mt-8 border-2 border-forest bg-white/75 p-5 shadow-[5px_5px_0_rgba(12,25,21,.2)] sm:p-7" aria-labelledby="signup-heading">
      <h2 id="signup-heading" className="font-serif text-2xl font-semibold text-forest">Public opt-in form</h2>
      <p className="mb-6 mt-2 text-sm leading-6 text-stone-700">To receive text/MMS alerts, enter your mobile number and affirmatively check the optional consent box before submitting. The checkbox is unchecked by default. You can still subscribe to email without consenting to texts.</p>
      <SubscribeForm />
    </section>

    <section className="mt-8 text-sm leading-6 text-stone-700" aria-labelledby="program-details-heading">
      <h2 id="program-details-heading" className="font-serif text-2xl font-semibold text-forest">Messaging program details</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Messages announce newly published road-journal entries and may contain a day number, short description, image, and link.</li>
        <li>Message frequency varies. Message and data rates may apply.</li>
        <li>Reply STOP to opt out at any time. Reply HELP for help.</li>
        <li>Consent is not a condition of purchase or email signup.</li>
      </ul>
      <p className="mt-4">Read the <Link href="/terms" className="font-bold text-[#244f76] underline">Terms and Conditions</Link> and <Link href="/privacy" className="font-bold text-[#244f76] underline">Privacy Policy</Link>. For assistance, email <a href="mailto:curtis.gerstner@gmail.com" className="font-bold text-[#244f76] underline">curtis.gerstner@gmail.com</a>.</p>
    </section>
  </main>;
}
