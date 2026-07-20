import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy", description: "Privacy policy for Road & Country journal updates." };

export default function PrivacyPolicy() {
  return <main className="readable-surface page-shell my-10 max-w-4xl py-10 sm:my-16 sm:py-14">
    <p className="retro-section-label inline-block">LEGAL.TXT</p>
    <h1 className="mt-3 font-serif text-4xl font-semibold text-forest sm:text-5xl">Privacy Policy</h1>
    <p className="mt-2 text-sm text-stone-500">Effective July 20, 2026</p>
    <div className="mt-8 space-y-7 text-[.95rem] leading-7 text-stone-700">
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Information collected</h2><p className="mt-2">Road &amp; Country may collect information that you voluntarily provide, including your name, email address, mobile phone number, messaging consent, comments, and communications with the site. Basic technical information may also be processed when you visit the website.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">How information is used</h2><p className="mt-2">Information is used to operate the road-trip journal, deliver requested email and SMS/MMS journal notifications, respond to messages, moderate comments, maintain subscription records, prevent abuse, and improve the website.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Mobile information and messaging consent</h2><p className="mt-2 font-semibold">Mobile phone numbers, SMS/MMS opt-in data, and messaging consent will not be sold, rented, or shared with third parties or affiliates for marketing or promotional purposes.</p><p className="mt-2">Service providers may process this information only as necessary to provide the requested service, such as delivering messages, hosting the website, or storing subscription records. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe from text messages or HELP for assistance.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Service providers</h2><p className="mt-2">The site uses service providers including Twilio for SMS/MMS delivery, Resend for email delivery, Supabase for data and media storage, and Vercel for website hosting. These providers process information on behalf of Road &amp; Country to provide their respective services.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Choices and retention</h2><p className="mt-2">You may unsubscribe from email through the unsubscribe link in an email. You may stop text messages at any time by replying STOP. Subscription and consent records may be retained as necessary to honor opt-out requests, document consent, resolve disputes, and comply with applicable requirements.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Security and children</h2><p className="mt-2">Reasonable safeguards are used to protect stored information, but no internet service can guarantee absolute security. The subscription service is not directed to children under 13.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Policy updates and contact</h2><p className="mt-2">This policy may be updated as the service changes. The effective date above will be revised when material updates are made. Questions about this policy or messaging program may be sent to <a className="font-semibold text-[#244f76] underline" href="mailto:curtis.gerstner@gmail.com">curtis.gerstner@gmail.com</a>.</p></section>
    </div>
    <Link href="/" className="button-primary mt-9">Return to the road log</Link>
  </main>;
}
