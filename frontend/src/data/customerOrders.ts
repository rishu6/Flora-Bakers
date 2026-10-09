const STORAGE_KEY = "flora-bakes-customer-order-codes";

export function readCustomerOrderCodes(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return [...new Set(saved.filter((code): code is string => typeof code === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(code)))].slice(0, 20);
  } catch {
    return [];
  }
}

export function saveCustomerOrderCodes(codes: string[]) {
  try {
    // Retain only order codes; customer names and phone numbers stay out of storage.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes.slice(0, 20)));
  } catch {
    // Checkout and live tracking still work when browser storage is unavailable.
  }
}
