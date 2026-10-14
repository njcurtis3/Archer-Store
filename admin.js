import { PRODUCTS, SIZES, DEFAULT_TAX_RATE, DEFAULT_UPCHARGES, UPCHARGE_SIZES, RUN_MINIMUM, sizePrice, ADMIN_EMAIL, logosFor, sizesFor, venmoPayLink, orderCode, cleanPhone, cleanEmail, fmtPhone, money, round2, esc } from "./products.js?v=dev";
import { getFirebase } from "./firebase.js?v=dev";

const $ = (s) => document.querySelector(s);
let fb = null;
let orders = [];
let selected = new Set();
let filter = "all";
let query = "";
// Flat printer charges for the whole run, not per order. Editable in settings.
const DEFAULT_FEES = { setup: 50, colorChange: 10 };
let settings = { taxRate: DEFAULT_TAX_RATE, prices: {}, open: true, fees: { ...DEFAULT_FEES } };
let unsub = null;
// What each item costs you. Private: only the admin account can read it.
let costs = {};

const fmtDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Just now";
};
const itemCount = (o) => (o.items || []).reduce((n, i) => n + (i.qty || 0), 0);
const shortDate = (ts) => ts?.toDate ? ts.toDate().toLocaleDateString([], { month: "short", day: "numeric" }) : "";
const productLabel = (p) => `${p.number} ${p.name} — ${p.color}`;
// What the customer has paid so far, and what they still owe. Paid orders from before
// amountPaid existed count as paid in full.
const amountPaid = (o) => o.status === "paid" ? (typeof o.amountPaid === "number" ? o.amountPaid : o.total || 0) : 0;
const balanceDue = (o) => Math.max(0, round2((o.total || 0) - amountPaid(o)));

// Prices arrive from the customer's browser, so the database can't vouch for
// them. Compare each order to the current catalog and to its own arithmetic.
const priceOf = (id) => {
  const p = settings.prices?.[id];
  if (typeof p === "number") return p;
  return PRODUCTS.find((x) => x.id === id)?.defaultPrice ?? null;
};
const upcharges = () => settings.upcharges || DEFAULT_UPCHARGES;
// Current price of one piece in a size, big-size upcharge included.
const priceFor = (id, size) => sizePrice(priceOf(id), size, upcharges());
function checkOrder(o) {
  const notes = [];
  let sub = 0;
  for (const i of o.items || []) {
    const p = PRODUCTS.find((x) => x.id === i.productId);
    const label = p ? `${p.number} ${p.color}` : esc(i.productId || "Unknown item");
    if (!p) { notes.push(`${label} isn't in the catalog.`); continue; }
    if (!Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20) notes.push(`${label} has an odd quantity (${esc(i.qty)}).`);
    if (!logosFor(p).includes(i.logo)) notes.push(`${label} has a ${esc(i.logo)} logo, which isn't offered on ${esc(p.color)} ${esc(p.number)} (${logosFor(p).map(esc).join(" or ")}).`);
    if (!sizesFor(p).includes(i.size)) notes.push(`${label} is size ${esc(i.size)}, which this item doesn't come in.`);
    const now = priceFor(p.id, i.size);
    const sized = `${label} (${esc(i.size)})`;
    if (i.price == null && now != null) notes.push(`${sized} was “Price TBD” when ordered; it's now ${money(now)} each, not in this total.`);
    else if (i.price != null && now != null && round2(i.price) !== round2(now)) notes.push(`${sized} charged ${money(i.price)} each; current price is ${money(now)}.`);
    else if (i.price != null && now == null) notes.push(`${sized} charged ${money(i.price)} each, but its price is TBD.`);
    sub += (i.price || 0) * (i.qty || 0);
  }
  sub = round2(sub);
  const rate = settings.taxRate ?? DEFAULT_TAX_RATE;
  if (round2(o.subtotal) !== sub) notes.push(`Subtotal says ${money(o.subtotal)}, but the items add up to ${money(sub)}.`);
  if (Math.abs(round2(o.tax) - round2(sub * rate)) > 0.01) notes.push(`Tax says ${money(o.tax)}; ${(rate * 100).toFixed(2).replace(/\.?0+$/, "")}% of ${money(sub)} is ${money(round2(sub * rate))}.`);
  if (Math.abs(round2(o.total) - round2(o.subtotal + o.tax)) > 0.01) notes.push(`Total ${money(o.total)} doesn't equal subtotal plus tax.`);
  return notes;
}

// ---------- Auth ----------
async function init() {
  fb = await getFirebase().catch(() => null);
  if (!fb) {
    $("#gateMsg").textContent = "Firebase isn't connected yet. Add your project settings to firebase-config.js.";
    $("#signIn").hidden = true;
    return;
  }
  const { authMod, auth } = fb;
  $("#signIn").addEventListener("click", async () => {
    try { await authMod.signInWithPopup(auth, new authMod.GoogleAuthProvider()); }
    catch (e) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        await authMod.signInWithRedirect(auth, new authMod.GoogleAuthProvider());
      } else $("#gateMsg").textContent = "Sign-in failed: " + (e.message || e.code);
    }
  });
  $("#signOut").addEventListener("click", () => authMod.signOut(auth));
  authMod.onAuthStateChanged(auth, (user) => {
    const ok = user && user.email?.toLowerCase() === ADMIN_EMAIL && user.emailVerified;
    $("#gate").hidden = !!ok;
    $("#app").hidden = !ok;
    $("#signOut").hidden = !user;
    $("#who").textContent = user ? user.email : "Archer Store";
    if (user && !ok) $("#gateMsg").textContent = `${user.email} doesn't have admin access.`;
    if (ok) start(); else stop();
  });
}

function stop() {
  if (unsub) { unsub(); unsub = null; }
  orders = []; selected.clear();
}

async function start() {
  const { fs, db } = fb;
  try {
    const snap = await fs.getDoc(fs.doc(db, "settings", "store"));
    if (snap.exists()) settings = { ...settings, ...snap.data() };
  } catch (e) { console.warn(e); }
  try {
    const snap = await fs.getDoc(fs.doc(db, "private", "costs"));
    costs = snap.exists() ? snap.data().costs || {} : {};
  } catch (e) { console.warn("Costs not loaded", e); }
  renderSettings();
  if (unsub) unsub();
  unsub = fs.onSnapshot(fs.query(fs.collection(db, "orders"), fs.orderBy("createdAt", "desc")), (snap) => {
    orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    selected = new Set([...selected].filter((id) => orders.some((o) => o.id === id)));
    render();
  }, (err) => {
    $("#orders").innerHTML = `<div class="none">Couldn't load orders: ${esc(err.message)}</div>`;
  });
}

// ---------- Rendering ----------
function visible() {
  const q = query.trim().toLowerCase();
  const qd = q.replace(/\D/g, "");
  return orders.filter((o) => {
    if (filter === "pickup") { if (o.pickedUp) return false; }
    else if (filter !== "all" && (o.status || "unpaid") !== filter) return false;
    if (!q) return true;
    const name = `${o.first} ${o.last}`.toLowerCase();
    return name.includes(q) || orderCode(o.id).toLowerCase().includes(q) || (qd && String(o.phone).includes(qd));
  });
}

function render() {
  $("#tOrders").textContent = orders.length;
  $("#tItems").textContent = orders.reduce((n, o) => n + itemCount(o), 0);
  $("#tPaid").textContent = money(orders.reduce((t, o) => t + amountPaid(o), 0));
  $("#tOwed").textContent = money(orders.reduce((t, o) => t + balanceDue(o), 0));

  const list = visible();
  const box = $("#orders");
  const flagged = orders.filter((o) => checkOrder(o).length).length;
  if (!list.length) {
    box.innerHTML = `<div class="none">${orders.length ? "No orders match." : "No orders yet."}</div>`;
  } else {
    box.innerHTML = (flagged ? `<div class="flagnote">${flagged} order${flagged === 1 ? "" : "s"} need${flagged === 1 ? "s" : ""} a check — see the notes below.</div>` : "") + list.map((o) => {
      const st = o.status === "paid" ? "paid" : "unpaid";
      const notes = checkOrder(o);
      const due = st === "paid" ? balanceDue(o) : 0;
      const rows = (o.items || []).map((i) => `
        <tr>
          <td>${i.qty} × ${esc(i.name)}<span class="d">${esc(i.color)} · Size ${esc(i.size)} · ${esc(i.logo)} logo · ${esc(i.number)}</span></td>
          <td class="n">${i.price == null ? "TBD" : money(i.price * i.qty)}</td>
        </tr>`).join("");
      return `
      <article class="order${selected.has(o.id) ? " sel" : ""}${notes.length ? " flag" : ""}" data-id="${o.id}">
        <label class="ocheck"><input type="checkbox" data-sel="${o.id}"${selected.has(o.id) ? " checked" : ""} aria-label="Select order"></label>
        <div class="ohead"><h3>${esc(o.last)}, ${esc(o.first)}</h3><span class="when">#${esc(orderCode(o.id))} · ${fmtDate(o.createdAt)}</span></div>
        <div class="ocontact"><a href="tel:${esc(o.phone)}">${esc(fmtPhone(o.phone))}</a>${o.email ? ` · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>${o.emailedAt ? ` <span class="sent" title="Receipt emailed ${esc(shortDate(o.emailedAt))}">✓ receipt sent</span>` : ""}` : ""} · ${itemCount(o)} item${itemCount(o) === 1 ? "" : "s"}</div>
        <table class="items">${rows}</table>
        ${notes.length ? `<ul class="flags">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
        ${due ? `<div class="balance"><span>Paid ${money(amountPaid(o))} of ${money(o.total)} — <strong>owes ${money(due)} more</strong></span>
          <span class="bactions"><a class="ghost" href="${esc(balanceTextLink(o))}">Text about balance</a>${o.email ? `<a class="ghost" href="${esc(balanceEmailLink(o))}">Email about balance</a>` : ""}<button class="ghost" data-settle="${o.id}">Mark ${money(due)} paid</button></span></div>` : ""}
        <label class="onotes">Notes<textarea rows="1" data-notes="${o.id}" maxlength="500" placeholder="Paid cash, swap to XL, …">${esc(o.notes || "")}</textarea></label>
        <div class="ofoot">
          <div class="amounts">Subtotal ${money(o.subtotal)} · Tax ${money(o.tax)} · Total<strong>${money(o.total)}</strong></div>
          <div class="oactions">
            <button class="pill ${st}" data-toggle="${o.id}">${st === "paid" ? `Paid ✓${o.paidAt ? ` ${shortDate(o.paidAt)}` : ""}` : "Unpaid"}</button>
            <button class="pill ${o.pickedUp ? "picked" : "waiting"}" data-pick="${o.id}">${o.pickedUp ? `Picked up ✓${o.pickedUpAt ? ` ${shortDate(o.pickedUpAt)}` : ""}` : "Not picked up"}</button>
            ${st === "unpaid" ? `<a class="ghost" href="${esc(reminderLink(o))}">Text reminder</a>` : ""}
            <button class="ghost" data-edit="${o.id}">Edit</button>
            <button class="ghost danger" data-del="${o.id}" aria-label="Delete order">Delete</button>
          </div>
        </div>
      </article>`;
    }).join("");
  }
  renderSelection(list);
  renderSupplier(selected.size ? orders.filter((o) => selected.has(o.id)) : list);
  renderTotals();
}

// Pieces ordered per printer run, in catalog order.
function runs() {
  const n = new Map(PRODUCTS.map((p) => [p.run || "Other", 0]));
  for (const o of orders) for (const i of o.items || []) {
    const run = PRODUCTS.find((p) => p.id === i.productId)?.run || "Other";
    n.set(run, (n.get(run) || 0) + (i.qty || 0));
  }
  return [...n];
}

function renderTotals() {
  const fees = { ...DEFAULT_FEES, ...settings.fees };
  const sum = (k) => round2(orders.reduce((t, o) => t + (o[k] || 0), 0));
  const ordersTotal = sum("total");
  const grand = round2(ordersTotal + fees.setup + fees.colorChange);
  const tbd = orders.some((o) => (o.items || []).some((i) => i.price == null));
  const items = orders.reduce((n, o) => n + itemCount(o), 0);
  const row = (label, value, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td class="n">${value}</td></tr>`;
  let cost = 0, uncosted = 0;
  for (const o of orders) for (const i of o.items || []) {
    if (typeof costs[i.productId] === "number") cost += sizePrice(costs[i.productId], i.size, upcharges()) * (i.qty || 0);
    else uncosted += i.qty || 0;
  }
  cost = round2(cost);
  const profit = round2(sum("subtotal") - cost - fees.setup - fees.colorChange);
  $("#totals").innerHTML = `<table class="sup"><tbody>
    ${row(`All orders (${orders.length} order${orders.length === 1 ? "" : "s"}, ${items} item${items === 1 ? "" : "s"})`, "")}
    ${row("Items subtotal", money(sum("subtotal")))}
    ${row("Sales tax", money(sum("tax")))}
    ${row("Orders total", money(ordersTotal), "group")}
    ${row("Printer setup fee", money(fees.setup))}
    ${row("Printer color change fee", money(fees.colorChange))}
    ${row("Total with printer fees", money(grand), "group")}
  </tbody></table>
  <h4 class="subhead">Profit</h4>
  <table class="sup"><tbody>
    ${row("Item sales (before tax)", money(sum("subtotal")))}
    ${row("Item cost", "− " + money(cost))}
    ${row("Printer fees", "− " + money(fees.setup + fees.colorChange))}
    ${row("Profit", money(profit), "group")}
  </tbody></table>
  <h4 class="subhead">Printer minimums</h4>
  <table class="sup"><tbody>${runs().map(([run, n]) =>
    row(`${esc(run)}${n >= RUN_MINIMUM ? " ✓" : ` — ${RUN_MINIMUM - n} more needed`}`, `${n} of ${RUN_MINIMUM}`)).join("")}</tbody></table>
  <p class="fine" style="margin-top:8px">Counts every order, paid and unpaid. Each printer run needs ${RUN_MINIMUM} pieces in total across its items and sizes. The printer fees are charged once for the whole run. Sales tax isn't counted as profit.${tbd ? " Some orders have “Price TBD” items that aren't in these totals yet." : ""}${uncosted ? ` ${uncosted} item${uncosted === 1 ? " has" : "s have"} no cost entered yet, so profit is overstated — add costs under “Prices, tax and ordering.”` : ""}</p>`;
}

function renderSelection(list) {
  const sel = orders.filter((o) => selected.has(o.id));
  const sum = (k) => round2(sel.reduce((t, o) => t + (o[k] || 0), 0));
  $("#selSum").textContent = sel.length
    ? `${sel.length} selected · ${sel.reduce((n, o) => n + itemCount(o), 0)} items · Subtotal ${money(sum("subtotal"))} · Tax ${money(sum("tax"))} · Total ${money(sum("total"))}`
    : "Nothing selected";
  $("#markPaid").disabled = $("#markUnpaid").disabled = !sel.length;
  $("#selAll").checked = list.length > 0 && list.every((o) => selected.has(o.id));
  $("#exportCsv").textContent = sel.length ? "Export selected" : "Export CSV";
}

function renderSupplier(src) {
  $("#supHint").textContent = selected.size ? "(selected orders)" : "(all shown orders)";
  const map = new Map();
  for (const o of src) for (const i of o.items || []) {
    const key = `${i.productId}|${i.logo}`;
    if (!map.has(key)) map.set(key, { label: `${i.number} ${i.name} — ${i.color}`, logo: i.logo, sizes: {} });
    const g = map.get(key);
    g.sizes[i.size] = (g.sizes[i.size] || 0) + (i.qty || 0);
  }
  if (!map.size) { $("#supplier").innerHTML = `<p class="fine" style="margin-top:10px">No items.</p>`; return; }
  let grand = 0;
  const body = [...map.values()].map((g) => {
    const sizes = SIZES.filter((s) => g.sizes[s]).concat(Object.keys(g.sizes).filter((s) => !SIZES.includes(s)));
    const total = sizes.reduce((t, s) => t + g.sizes[s], 0); grand += total;
    return `<tr class="group"><td>${esc(g.label)} · ${esc(g.logo)} logo</td><td class="n">${total}</td></tr>` +
      sizes.map((s) => `<tr><td>&nbsp;&nbsp;${esc(s)}</td><td class="n">${g.sizes[s]}</td></tr>`).join("");
  }).join("");
  $("#supplier").innerHTML = `<table class="sup"><thead><tr><th>Item / size</th><th class="n">Qty</th></tr></thead>
    <tbody>${body}<tr class="group"><td>Total pieces</td><td class="n">${grand}</td></tr></tbody></table>`;
}

function renderSettings() {
  const f = $("#settingsForm");
  f.open.checked = settings.open !== false;
  f.taxRate.value = round2((settings.taxRate ?? DEFAULT_TAX_RATE) * 100 * 1000) / 1000;
  const fees = { ...DEFAULT_FEES, ...settings.fees };
  f.feeSetup.value = fees.setup;
  f.feeColor.value = fees.colorChange;
  $("#priceFields").innerHTML = PRODUCTS.map((p) => {
    const v = typeof settings.prices?.[p.id] === "number" ? settings.prices[p.id] : p.defaultPrice;
    const c = typeof costs[p.id] === "number" ? costs[p.id] : "";
    return `<fieldset class="pricerow"><legend>${esc(p.name)} — ${esc(p.color)}</legend>
      <label>Price ($)<input name="price_${p.id}" type="number" step="0.01" min="0" value="${v ?? ""}" placeholder="Price TBD"></label>
      <label>Your cost ($)<input name="cost_${p.id}" type="number" step="0.01" min="0" value="${c}" placeholder="Not set"></label>
    </fieldset>`;
  }).join("");
  $("#upchargeFields").innerHTML = `<fieldset class="pricerow ups"><legend>Big-size upcharge, per piece</legend>${UPCHARGE_SIZES.map((s) =>
    `<label>${s} (+$)<input name="up_${s}" type="number" step="0.01" min="0" value="${upcharges()[s] ?? 0}"></label>`).join("")}</fieldset>`;
}

// ---------- Actions ----------
async function setStatus(ids, status) {
  const { fs, db } = fb;
  const batch = fs.writeBatch(db);
  ids.forEach((id) => batch.update(fs.doc(db, "orders", id), {
    status, paidAt: status === "paid" ? fs.serverTimestamp() : null,
    amountPaid: status === "paid" ? orders.find((o) => o.id === id)?.total ?? fs.deleteField() : fs.deleteField()
  }));
  await batch.commit();
}

function exportCsv() {
  const src = selected.size ? orders.filter((o) => selected.has(o.id)) : visible();
  const head = ["Order #", "Order date", "Last", "First", "Phone", "Email", "Apparel #", "Item", "Color", "Size", "Logo", "Qty", "Unit price",
    "Line total", "Order subtotal", "Order tax", "Order total", "Status", "Amount paid", "Balance due", "Paid on", "Picked up", "Notes"];
  const day = (ts) => ts?.toDate ? ts.toDate().toISOString().slice(0, 10) : "";
  const rows = [head];
  for (const o of src) for (const i of o.items || []) {
    const d = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().slice(0, 10) : "";
    rows.push([orderCode(o.id), d, o.last, o.first, o.phone, o.email || "", i.number, i.name, i.color, i.size, i.logo, i.qty,
      i.price ?? "", i.price == null ? "" : round2(i.price * i.qty), o.subtotal, o.tax, o.total, o.status || "unpaid",
      amountPaid(o), balanceDue(o), o.status === "paid" ? day(o.paidAt) : "", o.pickedUp ? day(o.pickedUpAt) || "yes" : "", o.notes || ""]);
  }
  downloadCsv(rows, "archer-orders");
}

function downloadCsv(rows, name) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Supplier / printer sheet: one row per item, color and logo, with a column per size.
function supplierRows(src) {
  const map = new Map();
  for (const o of src) for (const i of o.items || []) {
    const key = `${i.productId}|${i.logo}`;
    if (!map.has(key)) map.set(key, { i, sizes: {} });
    map.get(key).sizes[i.size] = (map.get(key).sizes[i.size] || 0) + (i.qty || 0);
  }
  const extra = [...new Set([...map.values()].flatMap((g) => Object.keys(g.sizes)).filter((s) => !SIZES.includes(s)))];
  const cols = SIZES.concat(extra);
  const rows = [["Style #", "Description", "Color", "Logo / ink", ...cols, "Total"]];
  const grand = Object.fromEntries(cols.map((s) => [s, 0]));
  for (const { i, sizes } of map.values()) {
    const n = cols.map((s) => sizes[s] || 0);
    cols.forEach((s, k) => (grand[s] += n[k]));
    rows.push([i.number, i.name, i.color, i.logo, ...n.map((x) => x || ""), n.reduce((a, b) => a + b, 0)]);
  }
  rows.push(["", "", "", "Total", ...cols.map((s) => grand[s] || ""), cols.reduce((t, s) => t + grand[s], 0)]);
  return rows;
}

// Text reminder: opens the phone's messaging app with the amount and Venmo link filled in.
function reminderLink(o) {
  const code = orderCode(o.id);
  const body = `Hi ${o.first}, this is a reminder from the Archer Store. Your order #${code} total is ${money(o.total)}. ` +
    `You can pay on Venmo here: ${venmoPayLink(o.total, `Archer Store #${code} - ${o.first} ${o.last}`)}`;
  return `sms:${o.phone}?&body=${encodeURIComponent(body)}`;
}

// Balance notice for a paid order whose total went up. Both links only open your own
// messaging or email app with the message filled in; nothing is sent until you send it.
function balanceMessage(o) {
  const code = orderCode(o.id), due = balanceDue(o);
  return `Hi ${o.first}, this is the Archer Store. Our printer's prices went up after you ordered, so your order #${code} ` +
    `total is now ${money(o.total)}. You paid ${money(amountPaid(o))}, so there's a balance of ${money(due)}. ` +
    `Sorry for the change. You can pay the rest on Venmo here: ${venmoPayLink(due, `Archer Store #${code} balance - ${o.first} ${o.last}`)}`;
}
const balanceTextLink = (o) => `sms:${o.phone}?&body=${encodeURIComponent(balanceMessage(o))}`;
const balanceEmailLink = (o) => `mailto:${o.email}?subject=${encodeURIComponent(`Archer Store order #${orderCode(o.id)}: ${money(balanceDue(o))} balance`)}` +
  `&body=${encodeURIComponent(balanceMessage(o))}`;

// Pickup list for printing, sorted by last name.
function printPickupList() {
  const src = (selected.size ? orders.filter((o) => selected.has(o.id)) : visible())
    .slice().sort((a, b) => `${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`));
  $("#printArea").innerHTML = `<h1>Archer Store pickup list</h1>
    <p>${src.length} order${src.length === 1 ? "" : "s"} · printed ${new Date().toLocaleDateString()}</p>
    <table><thead><tr><th></th><th>Name</th><th>Order #</th><th>Phone</th><th>Items</th><th>Paid</th></tr></thead><tbody>
    ${src.map((o) => `<tr><td class="box">☐</td><td><strong>${esc(o.last)}, ${esc(o.first)}</strong></td><td>${esc(orderCode(o.id))}</td>
      <td>${esc(fmtPhone(o.phone))}</td>
      <td>${(o.items || []).map((i) => `${i.qty} × ${esc(i.number)} ${esc(i.color)} · ${esc(i.size)} · ${esc(i.logo)} logo`).join("<br>")}</td>
      <td>${balanceDue(o) ? `<strong>Owes ${money(balanceDue(o))}</strong>` : "Paid"}</td></tr>`).join("")}
    </tbody></table>`;
  window.print();
}

$("#orders").addEventListener("click", async (e) => {
  const t = e.target;
  if (t.dataset.sel) {
    t.checked ? selected.add(t.dataset.sel) : selected.delete(t.dataset.sel);
    render();
  } else if (t.dataset.toggle) {
    const o = orders.find((x) => x.id === t.dataset.toggle);
    t.disabled = true;
    await setStatus([o.id], o.status === "paid" ? "unpaid" : "paid").catch((err) => alert(err.message));
  } else if (t.dataset.pick) {
    const o = orders.find((x) => x.id === t.dataset.pick);
    t.disabled = true;
    await fb.fs.updateDoc(fb.fs.doc(fb.db, "orders", o.id), {
      pickedUp: !o.pickedUp, pickedUpAt: o.pickedUp ? null : fb.fs.serverTimestamp()
    }).catch((err) => alert(err.message));
  } else if (t.dataset.settle) {
    const o = orders.find((x) => x.id === t.dataset.settle);
    t.disabled = true;
    await fb.fs.updateDoc(fb.fs.doc(fb.db, "orders", o.id), { amountPaid: o.total })
      .catch((err) => alert(err.message));
  } else if (t.dataset.edit) {
    openEditor(orders.find((x) => x.id === t.dataset.edit));
  } else if (t.dataset.del) {
    const o = orders.find((x) => x.id === t.dataset.del);
    if (confirm(`Delete ${o.first} ${o.last}'s order? This can't be undone.`)) {
      await fb.fs.deleteDoc(fb.fs.doc(fb.db, "orders", o.id)).catch((err) => alert(err.message));
    }
  }
});
$("#orders").addEventListener("change", async (e) => {
  const t = e.target;
  if (!t.dataset.notes) return;
  const notes = t.value.trim().slice(0, 500);
  t.classList.remove("saved");
  await fb.fs.updateDoc(fb.fs.doc(fb.db, "orders", t.dataset.notes), { notes })
    .then(() => t.classList.add("saved")).catch((err) => alert(err.message));
});
$("#selAll").addEventListener("change", (e) => {
  visible().forEach((o) => e.target.checked ? selected.add(o.id) : selected.delete(o.id));
  render();
});
$("#markPaid").addEventListener("click", () => setStatus([...selected], "paid").catch((err) => alert(err.message)));
$("#markUnpaid").addEventListener("click", () => setStatus([...selected], "unpaid").catch((err) => alert(err.message)));
$("#exportCsv").addEventListener("click", exportCsv);
$("#printPickup").addEventListener("click", printPickupList);
$("#exportSupplier").addEventListener("click", () => {
  const src = selected.size ? orders.filter((o) => selected.has(o.id)) : visible();
  downloadCsv(supplierRows(src), "archer-supplier-order");
});

// ---------- Edit an order ----------
const editor = $("#editor");
let editing = null, editItems = [];
function openEditor(o) {
  editing = o;
  // A logo that's no longer offered shows as the first offered one; save that, not the old one.
  editItems = (o.items || []).map((i) => {
    const p = PRODUCTS.find((x) => x.id === i.productId);
    return p && !logosFor(p).includes(i.logo) ? { ...i, logo: logosFor(p)[0] } : { ...i };
  });
  const f = $("#editForm");
  f.first.value = o.first || ""; f.last.value = o.last || ""; f.phone.value = o.phone || ""; f.email.value = o.email || "";
  $("#paidWrap").hidden = o.status !== "paid";
  f.amountPaid.value = o.status === "paid" ? amountPaid(o) : "";
  $("#editTitle").textContent = `Edit order #${orderCode(o.id)}`;
  $("#editMsg").textContent = ""; $("#editMsg").className = "msg";
  renderEditItems();
  editor.showModal();
}
function renderEditItems() {
  $("#editItems").innerHTML = editItems.map((i, k) => {
    const p = PRODUCTS.find((x) => x.id === i.productId) || PRODUCTS[0];
    const opt = (list, cur) => list.map((v) => `<option${v === cur ? " selected" : ""}>${esc(v)}</option>`).join("");
    return `<div class="eitem" data-k="${k}">
      <label class="eprod">Item<select data-f="productId">${PRODUCTS.map((x) => `<option value="${x.id}"${x.id === p.id ? " selected" : ""}>${esc(productLabel(x))}</option>`).join("")}</select></label>
      <label>Size<select data-f="size">${opt(sizesFor(p), i.size)}</select></label>
      <label>Logo<select data-f="logo">${opt(logosFor(p), i.logo)}</select></label>
      <label>Qty<input data-f="qty" type="number" min="1" max="20" value="${i.qty}"></label>
      <button type="button" class="ghost danger" data-remove="${k}" aria-label="Remove item">Remove</button>
    </div>`;
  }).join("") || `<p class="fine">No items. Add one below.</p>`;
}
$("#editItems").addEventListener("change", (e) => {
  const row = e.target.closest(".eitem"); if (!row) return;
  const i = editItems[+row.dataset.k], f = e.target.dataset.f;
  if (f === "productId") {
    const p = PRODUCTS.find((x) => x.id === e.target.value);
    Object.assign(i, { productId: p.id, number: p.number, name: p.name, color: p.color });
    if (!sizesFor(p).includes(i.size)) i.size = sizesFor(p).includes("M") ? "M" : sizesFor(p)[0];
    if (!logosFor(p).includes(i.logo)) i.logo = logosFor(p)[0];
    i.price = undefined; // repriced on save
    renderEditItems();
  } else if (f === "size") { i.size = e.target.value; i.price = undefined; } // big sizes cost more
  else if (f === "qty") i.qty = Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1));
  else i[f] = e.target.value;
});
$("#editItems").addEventListener("click", (e) => {
  if (e.target.dataset.remove == null) return;
  editItems.splice(+e.target.dataset.remove, 1); renderEditItems();
});
$("#addItem").addEventListener("click", () => {
  const p = PRODUCTS[0];
  editItems.push({ productId: p.id, number: p.number, name: p.name, color: p.color,
    size: sizesFor(p).includes("M") ? "M" : sizesFor(p)[0], logo: logosFor(p)[0], qty: 1, price: undefined });
  renderEditItems();
});
$("#editCancel").addEventListener("click", () => editor.close());
$("#editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $("#editMsg");
  const phone = cleanPhone(f.phone.value);
  if (!f.first.value.trim() || !f.last.value.trim()) { msg.className = "msg err"; msg.textContent = "First and last name are required."; return; }
  if (!phone) { msg.className = "msg err"; msg.textContent = "Enter a 10-digit phone number."; return; }
  const email = f.email.value.trim() ? cleanEmail(f.email.value) : "";
  if (email === null) { msg.className = "msg err"; msg.textContent = "Check the email address, or leave it blank."; return; }
  if (!editItems.length) { msg.className = "msg err"; msg.textContent = "An order needs at least one item. To remove it entirely, use Delete."; return; }
  // Unpaid orders always use current prices. Paid orders keep what each original
  // line was charged; new or changed lines use the current price.
  const paid = editing.status === "paid";
  const items = editItems.map((i) => {
    const keep = paid && i.price !== undefined;
    return { productId: i.productId, number: i.number, name: i.name, color: i.color,
      size: i.size, logo: i.logo, qty: i.qty, price: keep ? i.price : priceFor(i.productId, i.size) };
  });
  const rate = paid ? (editing.taxRate ?? settings.taxRate ?? DEFAULT_TAX_RATE) : (settings.taxRate ?? DEFAULT_TAX_RATE);
  const subtotal = round2(items.reduce((t, i) => t + (i.price || 0) * i.qty, 0));
  const tax = round2(subtotal * rate);
  // On a paid order, record what they've actually paid so a higher new total shows as a balance.
  const paidSoFar = paid ? round2(parseFloat(f.amountPaid.value)) : null;
  if (paid && !(paidSoFar >= 0)) { msg.className = "msg err"; msg.textContent = "Enter the amount paid so far."; return; }
  try {
    await fb.fs.updateDoc(fb.fs.doc(fb.db, "orders", editing.id), {
      first: f.first.value.trim().slice(0, 50), last: f.last.value.trim().slice(0, 50), phone,
      email: email || fb.fs.deleteField(),
      items, subtotal, tax, total: round2(subtotal + tax), taxRate: rate,
      ...(paid ? { amountPaid: paidSoFar } : {})
    });
    editor.close();
  } catch (err) {
    msg.className = "msg err"; msg.textContent = "Couldn't save: " + err.message;
  }
});
document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".seg button").forEach((x) => x.classList.toggle("on", x === b));
  filter = b.dataset.f; render();
}));
$("#search").addEventListener("input", (e) => { query = e.target.value; render(); });

// Bring every unpaid order in line with the current prices and tax rate. Paid
// orders keep what was charged. Returns how many orders changed.
async function repriceUnpaid() {
  const { fs, db } = fb;
  const rate = settings.taxRate ?? DEFAULT_TAX_RATE;
  const changes = [];
  for (const o of orders) {
    if (o.status === "paid") continue;
    const items = (o.items || []).map((i) => {
      const p = PRODUCTS.find((x) => x.id === i.productId);
      return p ? { ...i, price: priceFor(p.id, i.size) } : i;
    });
    const subtotal = round2(items.reduce((t, i) => t + (i.price || 0) * (i.qty || 0), 0));
    const tax = round2(subtotal * rate);
    const total = round2(subtotal + tax);
    const same = subtotal === o.subtotal && tax === o.tax && total === o.total && o.taxRate === rate &&
      items.every((i, k) => i.price === o.items[k].price);
    if (!same) changes.push([o.id, { items, subtotal, tax, total, taxRate: rate }]);
  }
  for (let k = 0; k < changes.length; k += 400) {
    const batch = fs.writeBatch(db);
    changes.slice(k, k + 400).forEach(([id, data]) => batch.update(fs.doc(db, "orders", id), data));
    await batch.commit();
  }
  return changes.length;
}

$("#settingsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, msg = $("#settingsMsg");
  const prices = {};
  PRODUCTS.forEach((p) => {
    const v = f[`price_${p.id}`].value;
    if (v !== "") prices[p.id] = round2(parseFloat(v));
  });
  const nextCosts = {};
  PRODUCTS.forEach((p) => {
    const v = f[`cost_${p.id}`].value;
    if (v !== "") nextCosts[p.id] = round2(parseFloat(v));
  });
  const fees = { setup: round2(parseFloat(f.feeSetup.value) || 0), colorChange: round2(parseFloat(f.feeColor.value) || 0) };
  const ups = Object.fromEntries(UPCHARGE_SIZES.map((s) => [s, round2(parseFloat(f[`up_${s}`].value) || 0)]));
  const next = { open: f.open.checked, taxRate: Math.round(parseFloat(f.taxRate.value) * 1000) / 100000, prices, fees, upcharges: ups };
  try {
    await fb.fs.setDoc(fb.fs.doc(fb.db, "settings", "store"), next);
    settings = next;
    await fb.fs.setDoc(fb.fs.doc(fb.db, "private", "costs"), { costs: nextCosts });
    costs = nextCosts;
    renderTotals();
  } catch (err) {
    msg.className = "msg err"; msg.textContent = "Couldn't save: " + err.message;
    return;
  }
  try {
    const n = await repriceUnpaid();
    msg.className = "msg ok";
    msg.textContent = n ? `Saved. Updated ${n} unpaid order${n === 1 ? "" : "s"} to the new prices.` : "Saved. No unpaid orders needed new prices.";
  } catch (err) {
    msg.className = "msg err"; msg.textContent = "Settings saved, but unpaid orders couldn't be updated: " + err.message;
  }
});

init();
