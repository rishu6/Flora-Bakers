import catalog from "./productPhotoCatalog.json";

export interface ProductPhoto {
  url: string;
  source: string;
  label: string;
  provider: string;
  credit?: string;
  license?: string;
}

const normalize = (name: string) => name.toLowerCase()
  .replace(/blue[\s-]*berry/g, "blueberry")
  .replace(/cheese[\s-]*cake/g, "cheesecake")
  .replace(/doughnut/g, "donut")
  .replace(/[^a-z0-9]+/g, " ").trim();

const photos = new Map<string, ProductPhoto>(Object.entries(catalog).map(([name, photo]) => [normalize(name), photo]));
const aliases: Record<string, string> = {
  "black forest pastry": "black forest cake",
  "cheesecake slice": "cheesecake",
  "butter cookie": "butter cookies",
  "chocolate chip cookies": "chocolate chip cookie",
  "pain au chocolat": "chocolate croissant",
  "vegetable puff": "veg puff",
  "plain croissant": "croissant",
  "multigrain loaf": "multigrain bread",
};
const knownNames = [...photos.keys()].sort((a, b) => b.length - a.length);
const placeholder: ProductPhoto = { url: "/images/products/placeholder.svg", source: "/images/products/credits.html", label: "bakery product", provider: "Flora Bakes" };

export function getProductPhoto(name: string): ProductPhoto {
  const normalized = normalize(name);
  const exact = photos.get(aliases[normalized] ?? normalized);
  if (exact) return exact;
  // Preserve flavour matches when imported names include extras such as “eggless” or “slice”.
  const match = knownNames.find((key) => ` ${normalized} `.includes(` ${key} `));
  if (match) return photos.get(match)!;
  return placeholder;
}
