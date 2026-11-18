export const storeConfig = {
  name: "Saranankara Oil Mart",
  phone: "+94 71 571 6717",
  whatsapp: "94715716717",
  mapsUrl: "https://maps.app.goo.gl/PyuDCjm2KZ4Vunf2A",
  address: {
    line1: "70/5B. Dhammalankara Mawatha",
    line2: "Hill St",
    city: "Dehiwala-Mount Lavinia",
    postalCode: "10350",
    country: "Sri Lanka",
    countryCode: "LK",
  },
  currency: "LKR",
  timezone: "Asia/Colombo",
  locales: ["en", "si", "ta"] as const,
  defaultLocale: "en" as const,
} as const;
