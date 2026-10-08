export interface ProductPhoto { url: string; source: string; label: string; }

const photos: { category: string; photo: ProductPhoto }[] = [
  { category: "cake", photo: { url: "https://images.unsplash.com/photo-1582577829927-897c60e62d52?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/chocolate-cake-on-white-table-cloth-gZS7mJOTNCo", label: "cake" } },
  { category: "cupcake", photo: { url: "https://images.unsplash.com/photo-1680310765701-c292e765296b?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/es/fotos/una-variedad-de-cupcakes-y-muffins-estan-en-exhibicion-yI_jyVkbFVM", label: "cupcakes" } },
  { category: "bread", photo: { url: "https://images.unsplash.com/photo-1675725291010-cb1020860cb2?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/a-loaf-of-bread-sitting-on-top-of-a-wooden-cutting-board--ee84xVMlOA", label: "bread" } },
  { category: "croissant", photo: { url: "https://images.unsplash.com/photo-1747459707225-65744d0ae6be?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/freshly-baked-croissants-sit-on-a-tray-7Yl_Qhxfgok", label: "croissants" } },
  { category: "roll", photo: { url: "https://images.unsplash.com/photo-1668015826833-9aeafb608ccd?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/ja/photos/H1i3PJUzbRg", label: "cinnamon rolls" } },
  { category: "cookie", photo: { url: "https://images.unsplash.com/photo-1657418830273-40c19cfff4d7?auto=format&fit=crop&w=1000&q=82", source: "https://unsplash.com/photos/a-group-of-cookies-7QGrloNqx6w", label: "cookies" } },
];
const fallbackPhoto = photos[3].photo;

export function getProductPhoto(name: string): ProductPhoto {
  const normalized = name.toLowerCase();
  const category = /cupcake|muffin/.test(normalized) ? "cupcake"
    : /croissant|danish|puff|pastry/.test(normalized) ? "croissant"
      : /cookie|biscuit/.test(normalized) ? "cookie"
        : /bread|loaf|baguette|sourdough|bun/.test(normalized) ? "bread"
          : /roll|cinnamon/.test(normalized) ? "roll"
            : /cake|torte/.test(normalized) ? "cake" : "";
  return photos.find((entry) => entry.category === category)?.photo ?? fallbackPhoto;
}
