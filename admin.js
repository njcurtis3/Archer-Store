import { PRODUCTS, SIZES, DEFAULT_TAX_RATE, ADMIN_EMAIL, logosFor, sizesFor, money, round2, esc } from "./products.js";
import { getFirebase } from "./firebase.js";

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

const fmtDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Just now";
};
const fmtPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d;
};
const itemCount = (o) => (o.items || []).reduce((n, i) => n + (i.qty || 0), 0);

// Prices arrive from the customer's browser, so the database can't vouch for
// them. Compare each order to the current catalog and to its own arithmetic.
const priceOf = (id) => {
  const p = settings.prices?.[id];
  if (typeof p === "number") return p;
  return PRODUCTS.find((x) => x.id === id)?.defaultPrice ?? null;
};
function checkOrder(o) {
  const notes = [];
  let sub = 0;
  for (const i of o.items || []) {
    const p = PRODUCTS.find((x) => x.id === i.productId);
    const label = p ? `${p.number} ${p.color}` : esc(i.productId || "Unknown item");
    if (!p) { notes.push(`${label} isn't in the catalog.`); continue; }
    if (!Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20) notes.push(`${label} has an odd quantity (${esc(i.qty)}).`);
    if (!logosFor(p).includes(i.logo)) notes.push(`${label} has a ${esc(i.logo)} logo, which isn't offered on ${esc(p.color)} items (${logosFor(p).map(esc).join(" or ")}).`);
    if (!sizesFor(p).includes(i.size)) notes.push(`${label} is size ${esc(i.size)}, which this item doesn't come in.`);
    const now = priceOf(p.id);
    if (i.price == null && now != null) notes.push(`${label} was “Price TBD” when ordered; it's now ${money(now)} each, not in this total.`);
    else if (i.price != null && now != null && round2(i.price) !== round2(now)) notes.push(`${label} charged ${money(i.price)} each; current price is ${money(now)}.`);
    else if (i.price != null && now == null) notes.push(`${label} charged ${money(i.price)} each, but its price is TBD.`);
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
    if (filter !== "all" && (o.status || "unpaid") !== filter) return false;
    if (!q) return true;
    const name = `${o.first} ${o.last}`.toLowerCase();
    return name.includes(q) || (qd && String(o.phone).includes(qd));
  });
}

function render() {
  const paid = orders.filter((o) => o.status === "paid");
  const unpaid = orders.filter((o) => o.status !== "paid");
  $("#tOrders").textContent = orders.length;
  $("#tItems").textContent = orders.reduce((n, o) => n + itemCount(o), 0);
  $("#tPaid").textContent = money(paid.reduce((t, o) => t + (o.total || 0), 0));
  $("#tOwed").textContent = money(unpaid.reduce((t, o) => t + (o.total || 0), 0));

  const list = visible();
  const box = $("#orders");
  const flagged = orders.filter((o) => checkOrder(o).length).length;
  if (!list.length) {
    box.innerHTML = `<div class="none">${orders.length ? "No orders match." : "No orders yet."}</div>`;
  } else {
    box.innerHTML = (flagged ? `<div class="flagnote">${flagged} order${flagged === 1 ? "" : "s"} need${flagged === 1 ? "s" : ""} a check — see the notes below.</div>` : "") + list.map((o) => {
      const st = o.status === "paid" ? "paid" : "unpaid";
      const notes = checkOrder(o);
      const rows = (o.items || []).map((i) => `
        <tr>
          <td>${i.qty} × ${esc(i.name)}<span class="d">${esc(i.color)} · Size ${esc(i.size)} · ${esc(i.logo)} logo · ${esc(i.number)}</span></td>
          <td class="n">${i.price == null ? "TBD" : money(i.price * i.qty)}</td>
        </tr>`).join("");
      return `
      <article class="order${selected.has(o.id) ? " sel" : ""}${notes.length ? " flag" : ""}" data-id="${o.id}">
        <label class="ocheck"><input type="checkbox" data-sel="${o.id}"${selected.has(o.id) ? " checked" : ""} aria-label="Select order"></label>
        <div class="ohead"><h3>${esc(o.last)}, ${esc(o.first)}</h3><span class="when">${fmtDate(o.createdAt)}</span></div>
        <div class="ocontact"><a href="tel:${esc(o.phone)}">${esc(fmtPhone(o.phone))}</a> · ${itemCount(o)} item${itemCount(o) === 1 ? "" : "s"}</div>
        <table class="items">${rows}</table>
        ${notes.length ? `<ul class="flags">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : ""}
        <div class="ofoot">
          <div class="amounts">Subtotal ${money(o.subtotal)} · Tax ${money(o.tax)} · Total<strong>${money(o.total)}</strong></div>
          <div class="oactions">
            <button class="pill ${st}" data-toggle="${o.id}">${st === "paid" ? "Paid ✓" : "Unpaid"}</button>
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

function renderTotals() {
  const fees = { ...DEFAULT_FEES, ...settings.fees };
  const sum = (k) => round2(orders.reduce((t, o) => t + (o[k] || 0), 0));
  const ordersTotal = sum("total");
  const grand = round2(ordersTotal + fees.setup + fees.colorChange);
  const tbd = orders.some((o) => (o.items || []).some((i) => i.price == null));
  const items = orders.reduce((n, o) => n + itemCount(o), 0);
  const row = (label, value, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><td>${label}</td><td class="n">${value}</td></tr>`;
  $("#totals").innerHTML = `<table class="sup"><tbody>
    ${row(`All orders (${orders.length} order${orders.length === 1 ? "" : "s"}, ${items} item${items === 1 ? "" : "s"})`, "")}
    ${row("Items subtotal", money(sum("subtotal")))}
    ${row("Sales tax", money(sum("tax")))}
    ${row("Orders total", money(ordersTotal), "group")}
    ${row("Printer setup fee", money(fees.setup))}
    ${row("Printer color change fee", money(fees.colorChange))}
    ${row("Total with printer fees", money(grand), "group")}
  </tbody></table>
  <p class="fine" style="margin-top:8px">Counts every order, paid and unpaid. The printer fees are charged once for the whole run.${tbd ? " Some orders have “Price TBD” items that aren't in these totals yet." : ""}</p>`;
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
    return `<label>${esc(p.name)} — ${esc(p.color)} ($)
      <input name="price_${p.id}" type="number" step="0.01" min="0" value="${v ?? ""}" placeholder="Price TBD"></label>`;
  }).join("");
}

// ---------- Actions ----------
async function setStatus(ids, status) {
  const { fs, db } = fb;
  const batch = fs.writeBatch(db);
  ids.forEach((id) => batch.update(fs.doc(db, "orders", id), {
    status, paidAt: status === "paid" ? fs.serverTimestamp() : null
  }));
  await batch.commit();
}

function exportCsv() {
  const src = selected.size ? orders.filter((o) => selected.has(o.id)) : visible();
  const head = ["Order date", "Last", "First", "Phone", "Apparel #", "Item", "Color", "Size", "Logo", "Qty", "Unit price",
    "Line total", "Order subtotal", "Order tax", "Order total", "Status"];
  const rows = [head];
  for (const o of src) for (const i of o.items || []) {
    const d = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().slice(0, 10) : "";
    rows.push([d, o.last, o.first, o.phone, i.number, i.name, i.color, i.size, i.logo, i.qty,
      i.price ?? "", i.price == null ? "" : round2(i.price * i.qty), o.subtotal, o.tax, o.total, o.status || "unpaid"]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `archer-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
  } else if (t.dataset.del) {
    const o = orders.find((x) => x.id === t.dataset.del);
    if (confirm(`Delete ${o.first} ${o.last}'s order? This can't be undone.`)) {
      await fb.fs.deleteDoc(fb.fs.doc(fb.db, "orders", o.id)).catch((err) => alert(err.message));
    }
  }
});
$("#selAll").addEventListener("change", (e) => {
  visible().forEach((o) => e.target.checked ? selected.add(o.id) : selected.delete(o.id));
  render();
});
$("#markPaid").addEventListener("click", () => setStatus([...selected], "paid").catch((err) => alert(err.message)));
$("#markUnpaid").addEventListener("click", () => setStatus([...selected], "unpaid").catch((err) => alert(err.message)));
$("#exportCsv").addEventListener("click", exportCsv);
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
      return p ? { ...i, price: priceOf(p.id) } : i;
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
  const fees = { setup: round2(parseFloat(f.feeSetup.value) || 0), colorChange: round2(parseFloat(f.feeColor.value) || 0) };
  const next = { open: f.open.checked, taxRate: Math.round(parseFloat(f.taxRate.value) * 1000) / 100000, prices, fees };
  try {
    await fb.fs.setDoc(fb.fs.doc(fb.db, "settings", "store"), next);
    settings = next;
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
