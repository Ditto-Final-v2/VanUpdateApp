export const siteConfig = {
  name: "Road & Country",
  description: "Sometimes all you need in life is a parking spot",
  tripName: "The Wandering",
  tripStatus: "Currently near El Paso, TX",
  tripStats: [
    { label: "Days", value: "0" },
    { label: "Driven", value: "0 mi" },
    { label: "States", value: "1" },
    { label: "National Parks", value: "0" },
    { label: "Major Cities", value: "1" },
    { label: "Walked", value: "0 mi" },
    { label: "Biked", value: "0 mi" },
    { label: "Ran", value: "0 mi" },
    { label: "Tanks of Gas", value: "0" },
  ],
  mapStyleUrl:
    process.env.NEXT_PUBLIC_MAP_STYLE_URL ??
    "https://tiles.openfreemap.org/styles/positron",
  contactEmail: "hello@example.com",
  socialLinks: {
    instagram: "https://www.instagram.com/",
  },
  features: {
    comments: true,
    subscriptions: true,
    adminPlaceholders: true,
  },
} as const;
