"use client";

import {
  Analytics,
  type BeforeSendEvent,
} from "@vercel/analytics/next";

const privateRoutes = [
  "/admin",
  "/login",
  "/subscribe/confirm",
  "/unsubscribe",
];

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const pathname = new URL(event.url, "https://analytics.local").pathname;
        if (privateRoutes.some((route) => pathname.startsWith(route))) {
          return null;
        }
        return event;
      }}
    />
  );
}
