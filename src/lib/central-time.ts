const CENTRAL_TIME_ZONE = "America/Chicago";
const TWILIO_MINIMUM_LEAD_MINUTES = 16;

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const centralDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CENTRAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getCentralDateParts(date: Date): DateParts {
  const parts = Object.fromEntries(
    centralDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function getTimeZoneOffset(date: Date) {
  const parts = getCentralDateParts(date);
  const centralWallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return centralWallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function centralWallClockToUtc(parts: DateParts) {
  const wallClockAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  let instant = wallClockAsUtc;

  // Resolve the UTC offset iteratively so this follows both CST and CDT.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const corrected = wallClockAsUtc - getTimeZoneOffset(new Date(instant));
    if (corrected === instant) break;
    instant = corrected;
  }
  return new Date(instant);
}

function nextCalendarDay(parts: DateParts): DateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: 19,
    minute: 30,
    second: 0,
  };
}

export function getNextCentralNotificationTime(now = new Date()) {
  const centralNow = getCentralDateParts(now);
  const todayAtSevenThirty = centralWallClockToUtc({
    ...centralNow,
    hour: 19,
    minute: 30,
    second: 0,
  });
  const minimumLead = TWILIO_MINIMUM_LEAD_MINUTES * 60 * 1000;

  if (todayAtSevenThirty.getTime() - now.getTime() >= minimumLead) {
    return todayAtSevenThirty;
  }
  return centralWallClockToUtc(nextCalendarDay(centralNow));
}

export function formatCentralNotificationTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}
