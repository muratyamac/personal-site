// All site copy lives here. Edit this file, not the markup.

export const profile = {
  name: "Murat Yamac",
  tagline: "I build things that stay.",
  role: "Founder · Ecommerce & DevOps",
  companies: ["Odinzone Labs LLC", "Workodin LLC"],
  avatar:
    "https://2.gravatar.com/avatar/15f98e0928f76f82d053c6dcbde0a369fa93fbabb94058fa76c73bd83c5abd03?s=320",
};

// The grid — products, shown as a timing screen.
// status: "running" | "garage" (not public yet)
export const products = [
  {
    code: "DSO",
    name: "Designodin",
    url: "https://designodin.com",
    blurb: "Web design studio — WordPress, WooCommerce and Shopify builds for US & EU businesses.",
    color: "#c47445",
    status: "running",
  },
  {
    code: "PAY",
    name: "Payodin",
    url: "https://payodin.com",
    blurb: "Proposals, contracts, invoices and payouts for freelancers without a company.",
    color: "#4ba8c4",
    status: "running",
  },
  {
    code: "BLT",
    name: "Boltramp",
    url: "https://boltramp.com",
    blurb: "Shopify speed, conversion and migration — written for store owners.",
    color: "#0ea5e9",
    status: "running",
  },
  {
    code: "ATL",
    name: "Atlasway",
    url: null,
    blurb: "In the garage. Not on track yet.",
    color: "#8a8f98",
    status: "garage",
  },
];

// Build log — each step adds a stage of the LEGO car.
export const buildLog = [
  { step: "01", part: "Floor", title: "Ecommerce foundations", text: "WooCommerce and Shopify stores that carry real revenue — the flat, boring, load-bearing part." },
  { step: "02", part: "Sidepods", title: "Infrastructure", text: "Servers, DNS, edge, CI. Cooling for everything that runs hot." },
  { step: "03", part: "Power unit", title: "Odinzone Labs", text: "The engine: the company that builds and runs the products." },
  { step: "04", part: "Nose & wings", title: "Design & speed", text: "Designodin and Boltramp — the aero. Clean lines, less drag." },
  { step: "05", part: "Cockpit", title: "Workodin", text: "The seat everything is driven from." },
  { step: "06", part: "Wheels", title: "Shipped", text: "Payodin and whatever's next. Things that stay on the road." },
];

export const links = [
  { label: "LinkedIn", handle: "in/muratyamac", url: "https://www.linkedin.com/in/muratyamac" },
  { label: "GitHub", handle: "@muratyamac", url: "https://github.com/muratyamac" },
  { label: "Certificates", handle: "Coursera", url: "https://go.odinzone.com/muratcertificates" },
];

// Hot Wheels garage. PLACEHOLDERS — replace with the real collection.
// body: one of "muscle" | "gt" | "formula" | "wagon"
export const garage = [
  { name: "Placeholder No. 1", series: "Mainline", year: 2024, color: "#d7263d", body: "muscle" },
  { name: "Placeholder No. 2", series: "Car Culture", year: 2023, color: "#1b98e0", body: "gt" },
  { name: "Placeholder No. 3", series: "Premium", year: 2025, color: "#ffd400", body: "formula" },
  { name: "Placeholder No. 4", series: "Treasure Hunt", year: 2022, color: "#2ec4b6", body: "wagon" },
  { name: "Placeholder No. 5", series: "Mainline", year: 2026, color: "#f46036", body: "gt" },
  { name: "Placeholder No. 6", series: "Boulevard", year: 2024, color: "#e6e6e6", body: "muscle" },
];
