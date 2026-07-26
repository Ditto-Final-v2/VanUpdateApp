"use client";

import { useFormStatus } from "react-dom";

export function RetryMmsButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border-2 border-[#4a164f] bg-[#fff0f8] px-3 py-2 text-xs font-bold uppercase text-[#4a164f] disabled:cursor-wait disabled:opacity-60"
      onClick={(event) => {
        if (
          !window.confirm(
            `Check Twilio and resend only failed MMS notifications for “${title}”?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Checking Twilio…" : "Retry failed MMS"}
    </button>
  );
}
