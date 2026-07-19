export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(date));
}

export function formatMiles(miles: number) {
  return new Intl.NumberFormat("en-US").format(miles);
}
