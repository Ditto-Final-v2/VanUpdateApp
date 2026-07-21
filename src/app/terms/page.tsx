import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms and Conditions", description: "Terms for Road & Country journal and messaging updates." };

export default function TermsAndConditions() {
  return <main className="readable-surface page-shell my-10 max-w-4xl py-10 sm:my-16 sm:py-14">
    <p className="retro-section-label inline-block">LEGAL.TXT</p>
    <h1 className="mt-3 font-serif text-4xl font-semibold text-forest sm:text-5xl">Terms and Conditions</h1>
    <p className="mt-2 text-sm text-stone-500">Effective July 20, 2026</p>
    <div className="mt-8 space-y-7 text-[.95rem] leading-7 text-stone-700">
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Website terms</h2><p className="mt-2">Road &amp; Country is a personal travel journal provided for general information and entertainment. Content may change, contain errors, or become unavailable. You agree not to misuse the website, interfere with its operation, or submit unlawful, abusive, or infringing material.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Journal messaging program</h2><p className="mt-2">Curtis Road Trip operates the Road &amp; Country journal messaging program. By entering your mobile number, checking the separate optional SMS/MMS consent box, and submitting the public <Link href="/sms-signup" className="font-semibold text-[#244f76] underline">signup form</Link>, you agree to receive recurring automated journal alerts by SMS or MMS at the mobile number you provide. Messages may include a trip day number, journal hook, image, and link to a new entry. Message frequency varies. Message and data rates may apply. Consent to text messages is not a condition of purchase or of receiving email-only updates.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Stopping messages and getting help</h2><p className="mt-2">Reply STOP to any text message to unsubscribe. After opting out, you may receive one final confirmation message. Reply HELP for assistance or email <a className="font-semibold text-[#244f76] underline" href="mailto:curtis.gerstner@gmail.com">curtis.gerstner@gmail.com</a>. You may rejoin later by submitting the public signup form and providing consent again.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Delivery and carrier terms</h2><p className="mt-2">Message delivery is not guaranteed and may be delayed or unavailable due to carriers, connectivity, device compatibility, or service-provider issues. Mobile carriers are not liable for delayed or undelivered messages. Your mobile carrier’s terms and charges continue to apply.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Privacy</h2><p className="mt-2">Use of personal information is described in the <Link href="/privacy" className="font-semibold text-[#244f76] underline">Privacy Policy</Link>. Mobile phone numbers and messaging consent are not sold or shared with third parties or affiliates for marketing or promotional purposes.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Changes and termination</h2><p className="mt-2">Road &amp; Country may update these terms or discontinue all or part of the website or messaging program. Material changes will be reflected by revising the effective date. Messaging access may be suspended when needed to protect the service, comply with requirements, or address misuse.</p></section>
      <section><h2 className="font-serif text-2xl font-semibold text-forest">Contact</h2><p className="mt-2">Questions about these terms or the journal messaging program may be sent to <a className="font-semibold text-[#244f76] underline" href="mailto:curtis.gerstner@gmail.com">curtis.gerstner@gmail.com</a>.</p></section>
    </div>
    <Link href="/" className="button-primary mt-9">Return to the road log</Link>
  </main>;
}
