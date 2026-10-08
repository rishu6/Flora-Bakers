import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LogOut, MessageSquareText, Minus, Package, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { createStaffOrder, getStaffFeedback, getStaffOrders, getStaffProducts, getStaffSession, importStaffFeedback, loginStaff, logoutStaff, saveStaffProductsBulk, updateStaffOrder, type OrderDraft, type StoreProduct } from "../services/api";

type StaffTab = "orders" | "products" | "feedback";
const money = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
const orderStatuses = ["new", "confirmed", "preparing", "ready", "completed", "cancelled"];

export function StaffPortal() {
  const client = useQueryClient();
  const session = useQuery({ queryKey: ["staff-session"], queryFn: getStaffSession, retry: false, staleTime: 60_000 });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({ mutationFn: () => loginStaff(username, password), onSuccess: async () => { setPassword(""); await client.invalidateQueries({ queryKey: ["staff-session"] }); } });

  if (session.isLoading) return <div className="loading-panel card"><p>Checking staff access…</p></div>;
  if (session.isError || !session.data) return <section className="staff-login card"><span className="insight-icon"><ShieldCheck size={20}/></span><span className="section-eyebrow">STAFF ONLY</span><h2>Sign in to manage the bakery</h2><p>Orders, contact details, menu prices, and customer feedback are restricted to staff.</p><form onSubmit={(event) => { event.preventDefault(); login.mutate(); }}><label>Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)}/></label>{login.isError && <p className="error-text">{login.error.message}</p>}<button className="button button-primary" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}</button></form></section>;

  return <StaffWorkspace username={session.data.username}/>;
}

function StaffWorkspace({ username }: { username: string }) {
  const [tab, setTab] = useState<StaffTab>("orders");
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(true);
  const client = useQueryClient();
  const feedback = useQuery({ queryKey: ["staff-feedback"], queryFn: getStaffFeedback, refetchInterval: 60_000 });
  const firstSuggestion = feedback.data?.suggestions[0];
  const logout = useMutation({ mutationFn: logoutStaff, onSuccess: async () => { await client.invalidateQueries({ queryKey: ["staff-session"] }); } });
  return <section className="staff-workspace">
    {showSuggestionPopup && firstSuggestion && <div className="suggestion-modal-backdrop" role="presentation"><section className="suggestion-modal card" role="dialog" aria-modal="true" aria-labelledby="suggestion-title"><button className="icon-button suggestion-dismiss" aria-label="Dismiss suggestion" onClick={() => setShowSuggestionPopup(false)}><X size={17}/></button><span className={`suggestion-badge ${firstSuggestion.kind}`}>{firstSuggestion.kind === "attention" ? "FEEDBACK SIGNAL" : "CUSTOMER FAVOURITE"}</span><h2 id="suggestion-title">{firstSuggestion.title}: {firstSuggestion.item}</h2><p>{firstSuggestion.detail}</p><div><button className="button button-primary" onClick={() => { setTab("feedback"); setShowSuggestionPopup(false); }}>View feedback suggestions</button><button className="button button-quiet" onClick={() => setShowSuggestionPopup(false)}>Dismiss</button></div></section></div>}
    <div className="staff-toolbar card"><div><span className="section-eyebrow">BAKERY MANAGEMENT</span><h2>Signed in as {username}</h2></div><button className="button button-outline" onClick={() => logout.mutate()}><LogOut size={15}/> Sign out</button></div>
    <div className="staff-tabs" role="tablist"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ClipboardList size={15}/> Orders</button><button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}><Package size={15}/> Menu &amp; prices</button><button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}><MessageSquareText size={15}/> Feedback &amp; suggestions</button></div>
    {tab === "orders" && <StaffOrders/>}{tab === "products" && <StaffProducts/>}{tab === "feedback" && <StaffFeedback/>}
  </section>;
}

function StaffProducts() {
  const client = useQueryClient();
  const products = useQuery({ queryKey: ["staff-products"], queryFn: getStaffProducts });
  const [rows, setRows] = useState<(StoreProduct & { key: string })[]>([]);
  useEffect(() => { if (products.data) setRows(products.data.map((product) => ({ ...product, key: `product-${product.id}` }))); }, [products.data]);
  const save = useMutation({ mutationFn: saveStaffProductsBulk, onSuccess: async (saved) => { setRows(saved.map((product) => ({ ...product, key: `product-${product.id}` }))); await Promise.all([client.invalidateQueries({ queryKey: ["staff-products"] }), client.invalidateQueries({ queryKey: ["store-products"] })]); } });
  const publishAll = useMutation({ mutationFn: saveStaffProductsBulk, onSuccess: async (saved) => { setRows(saved.map((product) => ({ ...product, key: `product-${product.id}` }))); await Promise.all([client.invalidateQueries({ queryKey: ["staff-products"] }), client.invalidateQueries({ queryKey: ["store-products"] })]); } });
  const willPublishAll = !rows.length || rows.some((row) => !row.available);
  const updateRow = (key: string, update: Partial<StoreProduct>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...update } : row));
  const addRow = () => setRows((current) => [...current, { id: 0, key: `draft-${Date.now()}-${current.length}`, item_name: "", current_price: 0, available: false }]);
  return <div className="staff-panel card"><div className="staff-panel-heading"><div><span className="muted-label">CUSTOMER MENU</span><h3>Build your menu in one go</h3></div><p>Add or edit multiple items below and set current prices. One click makes the whole menu available to customers. Uploaded sales items appear as drafts.</p></div>
    <div className="menu-bulk-actions"><button className="button button-outline" type="button" onClick={addRow}><Plus size={15}/> Add menu item</button><div className="menu-save-actions"><button className="button button-outline" type="button" disabled={save.isPending || publishAll.isPending || products.isLoading || !rows.length} onClick={() => save.mutate(rows.map(({ id, item_name, current_price, available }) => ({ ...(id ? { id } : {}), item_name, current_price: Number(current_price), available })))}>{save.isPending ? "Saving menu…" : `Save all ${rows.length} items`}</button><button className="button button-primary" type="button" disabled={save.isPending || publishAll.isPending || products.isLoading || !rows.length} onClick={() => publishAll.mutate(rows.map(({ id, item_name, current_price }) => ({ ...(id ? { id } : {}), item_name, current_price: Number(current_price), available: willPublishAll })))}>{publishAll.isPending ? "Updating menu…" : willPublishAll ? `Make all ${rows.length} items available` : `Hide all ${rows.length} items`}</button></div></div>
    {products.isLoading && <p className="empty-copy">Loading your menu…</p>}{products.isError && <p className="error-text">{products.error.message}</p>}{save.isError && <p className="error-text">{save.error.message}</p>}{publishAll.isError && <p className="error-text">{publishAll.error.message}</p>}{save.isSuccess && <p className="inline-note">All menu changes saved.</p>}{publishAll.isSuccess && <p className="inline-note">All {publishAll.data.length} menu items are now {publishAll.variables?.[0]?.available ? "available to" : "hidden from"} customer orders.</p>}
    <div className="staff-product-list">{rows.map((row) => <div className="staff-product-row" key={row.key}><label className="menu-item-name">Product name<input required maxLength={200} value={row.item_name} onChange={(event) => updateRow(row.key, { item_name: event.target.value })} placeholder="e.g. Chocolate croissant"/></label><label>Current price<input required type="number" min="0" step="0.01" value={row.current_price} onChange={(event) => updateRow(row.key, { current_price: Number(event.target.value) })}/></label><span className={`menu-availability ${row.available ? "published" : "draft"}`}>{row.available ? "Available to order" : "Draft"}</span>{!row.id && <button className="icon-button menu-remove" type="button" aria-label="Remove new menu item" title="Remove row" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={15}/></button>}</div>)}</div>
    {!rows.length && !products.isLoading && <p className="empty-copy">No menu items yet. Add several items, then save them together.</p>}
  </div>;
}

function StaffOrders() {
  const client = useQueryClient();
  const products = useQuery({ queryKey: ["staff-products"], queryFn: getStaffProducts });
  const orders = useQuery({ queryKey: ["staff-orders"], queryFn: getStaffOrders });
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("paid");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const availableProducts = products.data?.filter((product) => product.available) ?? [];
  const create = useMutation({ mutationFn: createStaffOrder, onSuccess: async () => { setCustomerName(""); setPhone(""); setPickupAt(""); setQuantities({}); await client.invalidateQueries({ queryKey: ["staff-orders"] }); } });
  const update = useMutation({ mutationFn: ({ id, status, payment_status }: { id: number; status: string; payment_status: string }) => updateStaffOrder(id, { status, payment_status }), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["staff-orders"] }); await client.invalidateQueries({ queryKey: ["staff-feedback"] }); } });
  const searchText = productSearch.trim().toLowerCase().replace(/\s+/g, "");
  const matches = availableProducts.filter((product) => {
    if (!searchText) return true;
    const name = product.item_name.toLowerCase();
    const initials = name.split(/\s+/).map((part) => part[0] ?? "").join("");
    return name.replace(/\s+/g, "").includes(searchText) || initials.startsWith(searchText);
  }).slice(0, 8);
  const selected = availableProducts.filter((product) => quantities[product.id]);
  const addProduct = (product: (typeof availableProducts)[number]) => {
    setQuantities((current) => ({ ...current, [product.id]: Math.min((current[product.id] ?? 0) + 1, 100) }));
    setProductSearch("");
    setProductDropdownOpen(false);
  };
  const changeQuantity = (id: number, delta: number) => setQuantities((current) => {
    const next = (current[id] ?? 0) + delta;
    if (next <= 0) { const { [id]: _removed, ...remaining } = current; return remaining; }
    return { ...current, [id]: Math.min(next, 100) };
  });
  const draft: OrderDraft = { customer_name: customerName, customer_phone: phone, pickup_at: pickupAt || null, items: selected.map((product) => ({ product_id: product.id, quantity: quantities[product.id] })) };

  return <div className="staff-orders-layout"><section className="staff-panel card"><div className="staff-panel-heading"><div><span className="muted-label">WALK-IN OR PHONE ORDER</span><h3>Enter an order</h3></div></div>
    <form className="staff-order-form" onSubmit={(event) => { event.preventDefault(); create.mutate({ ...draft, payment_status: paymentStatus }); }}><div className="staff-order-fields"><label>Customer name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)}/></label><label>Phone<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)}/></label><label>Pickup time<input type="datetime-local" value={pickupAt} onChange={(event) => setPickupAt(event.target.value)}/></label><label>Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as "pending" | "paid")}><option value="paid">Paid (staff confirmed)</option><option value="pending">Pending</option></select></label></div>
      <div className="order-product-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProductDropdownOpen(false); }}><label htmlFor="staff-product-search">Add products <span>Search by name or initials, such as “BFC”</span></label><input id="staff-product-search" type="search" value={productSearch} placeholder="Type to find a product…" autoComplete="off" onFocus={() => setProductDropdownOpen(true)} onChange={(event) => { setProductSearch(event.target.value); setProductDropdownOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (searchText && matches.length) addProduct(matches[0]); } if (event.key === "Escape") setProductDropdownOpen(false); }}/>
        {productDropdownOpen && <div className="order-product-options" role="listbox">{matches.map((product) => <button type="button" role="option" aria-selected={Boolean(quantities[product.id])} key={product.id} onMouseDown={(event) => event.preventDefault()} onClick={() => addProduct(product)}><span>{product.item_name}</span><strong>{money(product.current_price)}</strong></button>)}{!matches.length && <p>No matching available products.</p>}</div>}
      </div>
      <div className="staff-order-items"><strong className="order-selected-heading">Selected items · {selected.length}</strong>{selected.map((product) => <div className="staff-order-item" key={product.id}><span>{product.item_name} · {money(product.current_price)}</span><div><button type="button" className="icon-button" aria-label={`Remove one ${product.item_name}`} onClick={() => changeQuantity(product.id, -1)}><Minus size={14}/></button><strong>{quantities[product.id]}</strong><button type="button" className="icon-button" aria-label={`Add one ${product.item_name}`} disabled={quantities[product.id] >= 100} onClick={() => changeQuantity(product.id, 1)}><Plus size={14}/></button><button type="button" className="icon-button remove-order-item" aria-label={`Remove ${product.item_name}`} onClick={() => setQuantities((current) => { const { [product.id]: _removed, ...remaining } = current; return remaining; })}><X size={14}/></button></div></div>)}{!selected.length && <p className="empty-copy">Search for products above to add them to this order.</p>}</div>
      {create.isError && <p className="error-text">{create.error.message}</p>}<button className="button button-primary" disabled={!selected.length || create.isPending}>Save staff order</button>
    </form></section>
    <section className="staff-panel card"><div className="staff-panel-heading"><div><span className="muted-label">PICKUP QUEUE</span><h3>Orders</h3></div><button className="button button-outline" onClick={() => void orders.refetch()}>Refresh</button></div>
      {orders.isError && <p className="error-text">{orders.error.message}</p>}{!orders.data?.length && !orders.isLoading && <p className="empty-copy">No orders yet.</p>}
      <div className="order-queue">{orders.data?.map((order) => <article className="order-queue-card" key={order.id}><div className="order-queue-heading"><strong>{order.customer_name}</strong><code>{order.public_code}</code><span>{new Date(order.created_at).toLocaleString()}</span></div><div className="order-queue-contact">{order.customer_phone} · pickup {order.pickup_at ? new Date(order.pickup_at).toLocaleString() : "time not set"}</div><div className="order-queue-lines">{order.items.map((item, index) => <span key={`${item.product_name}-${index}`}>{item.quantity} × {item.product_name}</span>)}</div><div className="order-queue-controls"><strong>Total {money(order.total)}</strong><label>Status<select value={order.status} onChange={(event) => update.mutate({ id: order.id, status: event.target.value, payment_status: order.payment_status })}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Payment<select value={order.payment_status} onChange={(event) => update.mutate({ id: order.id, status: order.status, payment_status: event.target.value })}><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label></div></article>)}</div>
    </section></div>;
}

function StaffFeedback() {
  const client = useQueryClient();
  const feedback = useQuery({ queryKey: ["staff-feedback"], queryFn: getStaffFeedback });
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({ mutationFn: importStaffFeedback, onSuccess: async () => { setFile(null); await client.invalidateQueries({ queryKey: ["staff-feedback"] }); } });
  return <div className="staff-feedback-layout"><section className="staff-panel card"><div className="staff-panel-heading"><div><span className="muted-label">CUSTOMER VOICE</span><h3>Feedback signals &amp; sales ideas</h3></div><span className="feedback-count">{feedback.data?.total_responses ?? 0} responses</span></div>
    {!feedback.data?.suggestions.length && <p className="empty-copy">Feedback trends will appear as customers and staff add ratings.</p>}{feedback.data?.suggestions.map((suggestion) => <article className={`feedback-suggestion ${suggestion.kind}`} key={`${suggestion.item}-${suggestion.kind}`}><strong>{suggestion.title} · {suggestion.item}</strong><p>{suggestion.detail}</p></article>)}
    <h4>Recent feedback</h4>{feedback.data?.responses.slice(0, 12).map((response) => <article className="feedback-response" key={response.id}><div><strong>{response.product_name}</strong><span>{"★".repeat(response.rating)}{"☆".repeat(5 - response.rating)}</span></div><p>{response.comment || "No written comment"}</p><small>{response.source === "import" ? "Imported" : "Completed order"} · {new Date(response.created_at).toLocaleDateString()}</small></article>)}
  </section><aside className="staff-panel card"><span className="muted-label">IMPORT EXISTING REVIEWS</span><h3>Bring in customer feedback</h3><p>Upload an Excel workbook with <strong>Item Name</strong> and <strong>Rating</strong> columns. A <strong>Feedback</strong> or <strong>Comment</strong> column is optional. Ratings must be 1–5.</p><input type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/>{upload.isError && <p className="error-text">{upload.error.message}</p>}{upload.data && <p className="inline-note">Imported {upload.data.imported} rows; skipped {upload.data.rejected} invalid rows.</p>}<button className="button button-primary" disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)}>{upload.isPending ? "Importing…" : "Import feedback"}</button></aside></div>;
}
