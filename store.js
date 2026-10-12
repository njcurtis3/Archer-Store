import { PRODUCTS, logosFor, sizesFor, DEFAULT_TAX_RATE, money, round2, esc } from "./products.js";
import { getFirebase } from "./firebase.js";

const $ = (s) => document.querySelector(s);
let settings = { taxRate: DEFAULT_TAX_RATE, prices: {}, open: true };
let cart = [];
let submitting = false;
try { cart = JSON.parse(localStorage.getItem("archerCart2") || "[]"); } catch (e) { cart = []; }
const saveCart = () => { try { localStorage.setItem("archerCart2", JSON.stringify(cart)); } catch (e) {} };

const priceOf = (id) => {
  const p = settings.prices?.[id];
  if (typeof p === "number") return p;
  return PRODUCTS.find((x) => x.id === id)?.defaultPrice ?? null;
};
const swatch = (color) => ({ "Black": "#1d1f1c", "Coyote Brown": "#8a6f4e", "Tan": "#c4ad86" }[color] || "#6b6f5e");

function renderProducts() {
  const grid = $("#products");
  grid.innerHTML = PRODUCTS.map((p, i) => {
    const price = priceOf(p.id);
    return `
    <article class="card">
      <div class="visual">${visual(p, i)}</div>
      <div class="body">
        <div class="meta"><span class="chip">${esc(p.number)}</span><span class="dot" style="background:${swatch(p.color)}"></span>${esc(p.color)}</div>
        <h3>${esc(p.name)}</h3>
        <p class="sub">${esc(p.style)} · <a href="${esc(p.link)}" target="_blank" rel="noopener">Product details</a></p>
        <div class="price">${price == null ? "Price TBD" : money(price)}</div>
        <form class="add" data-i="${i}">
          <label>Size<select name="size">${sizesFor(p).map((s) => `<option${s === "M" ? " selected" : ""}>${s}</option>`).join("")}</select></label>
          <label>Logo<select name="logo">${logosFor(p).map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
          <label>Qty<input name="qty" type="number" min="1" max="20" value="1"></label>
          <button type="submit" class="primary"${settings.open ? "" : " disabled"}>${settings.open ? "Add to cart" : "Ordering closed"}</button>
        </form>
      </div>
    </article>`;
  }).join("");
  grid.querySelectorAll("form.add").forEach((f) => f.addEventListener("submit", onAdd));
  grid.querySelectorAll(".slides").forEach(wireSlides);
  grid.querySelectorAll(".visual img").forEach((img) => {
    const fallback = () => {
      const p = PRODUCTS[+img.dataset.i];
      const ph = document.createElement("div");
      ph.className = "ph"; ph.style.setProperty("--sw", swatch(p.color));
      ph.innerHTML = `<span>${esc(p.style.toUpperCase())}</span>`;
      img.replaceWith(ph);
    };
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener("error", fallback, { once: true });
  });
}

// One photo, or a swipeable gallery when the product has printer mockups.
function visual(p, i) {
  const shots = p.gallery || [{ src: p.image, view: "" }];
  const imgs = shots.map((s, k) => `<img src="${esc(s.src)}" alt="${esc(p.name)} in ${esc(p.color)}${s.view ? `, ${esc(s.view)}` : ""}" loading="${k ? "lazy" : "eager"}" data-i="${i}">`).join("");
  if (shots.length === 1) return imgs;
  return `<div class="slides">${imgs}</div>
    <button type="button" class="nav prev" aria-label="Previous photo">‹</button>
    <button type="button" class="nav next" aria-label="Next photo">›</button>
    <div class="dots">${shots.map((s, k) => `<span${k ? "" : ` class="on"`} title="${esc(s.view)}"></span>`).join("")}</div>`;
}

function wireSlides(slides) {
  const v = slides.parentElement, n = slides.children.length;
  const at = () => Math.round(slides.scrollLeft / slides.clientWidth);
  const go = (k) => slides.scrollTo({ left: ((k + n) % n) * slides.clientWidth, behavior: "smooth" });
  v.querySelector(".prev").addEventListener("click", () => go(at() - 1));
  v.querySelector(".next").addEventListener("click", () => go(at() + 1));
  const dots = [...v.querySelectorAll(".dots span")];
  slides.addEventListener("scroll", () => dots.forEach((d, k) => d.classList.toggle("on", k === at())), { passive: true });
}

function onAdd(e) {
  e.preventDefault();
  const f = e.target, p = PRODUCTS[+f.dataset.i];
  const qty = Math.min(20, Math.max(1, parseInt(f.qty.value, 10) || 1));
  const same = cart.find((c) => c.productId === p.id && c.size === f.size.value && c.logo === f.logo.value);
  if (same) same.qty = Math.min(20, same.qty + qty);
  else cart.push({ productId: p.id, size: f.size.value, logo: f.logo.value, qty });
  saveCart(); renderCart();
  const btn = f.querySelector("button"); btn.textContent = "Added ✓";
  setTimeout(() => (btn.textContent = "Add to cart"), 1200);
}

function lineItems() {
  return cart.map((c) => {
    const p = PRODUCTS.find((x) => x.id === c.productId);
    if (!p) return null;
    return { productId: p.id, number: p.number, name: p.name, color: p.color,
      size: c.size, logo: c.logo, qty: c.qty, price: priceOf(p.id) };
  }).filter(Boolean);
}

function totals(items) {
  const subtotal = round2(items.reduce((t, i) => t + (i.price || 0) * i.qty, 0));
  const tax = round2(subtotal * settings.taxRate);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

function renderCart() {
  // Drop saved cart lines for items, sizes or logos the store no longer offers.
  cart = cart.filter((c) => {
    const p = PRODUCTS.find((x) => x.id === c.productId);
    return p && sizesFor(p).includes(c.size) && logosFor(p).includes(c.logo);
  });
  const items = lineItems();
  $("#cartCount").textContent = items.reduce((n, i) => n + i.qty, 0);
  const list = $("#cartItems");
  list.innerHTML = items.length ? items.map((i, k) => `
    <li>
      <div><strong>${esc(i.name)}</strong><span>${esc(i.color)} · ${esc(i.size)} · ${esc(i.logo)} logo · ${i.price == null ? "Price TBD" : money(i.price) + " ea"}</span></div>
      <div class="qty">
        <button class="icon-btn" data-d="-1" data-k="${k}" aria-label="Decrease">−</button>
        <span>${i.qty}</span>
        <button class="icon-btn" data-d="1" data-k="${k}" aria-label="Increase">+</button>
      </div>
    </li>`).join("") : `<li class="empty">Your cart is empty.</li>`;
  list.querySelectorAll("button[data-d]").forEach((b) => b.addEventListener("click", () => {
    const c = cart[+b.dataset.k]; c.qty = Math.min(20, c.qty + +b.dataset.d);
    if (c.qty <= 0) cart.splice(+b.dataset.k, 1);
    saveCart(); renderCart();
  }));
  const t = totals(items);
  $("#cartSubtotal").textContent = money(t.subtotal);
  $("#taxLabel").textContent = `Tax (${(settings.taxRate * 100).toFixed(2).replace(/\.?0+$/, "")}%)`;
  $("#cartTax").textContent = money(t.tax);
  $("#cartTotal").textContent = money(t.total) + (items.some((i) => i.price == null) ? " + TBD" : "");
  $("#submitBtn").disabled = submitting || !items.length || !settings.open;
}

async function onCheckout(e) {
  e.preventDefault();
  if (submitting) return;
  const f = e.target, msg = $("#checkoutMsg");
  const items = lineItems();
  if (!items.length) return;
  // Lock before any await so a double-tap can't send the order twice, and read
  // the form now so nothing typed while it sends can change what was ordered.
  submitting = true; $("#submitBtn").disabled = true;
  const who = {
    first: f.first.value.trim().slice(0, 50),
    last: f.last.value.trim().slice(0, 50),
    phone: f.phone.value.replace(/\D/g, "").slice(0, 15)
  };
  const t = totals(items);
  const tbd = items.some((i) => i.price == null);
  msg.className = "msg"; msg.textContent = "Sending your order…";
  try {
    const fb = await getFirebase().catch(() => null);
    if (!fb) {
      msg.className = "msg err";
      msg.textContent = "Online ordering isn't set up yet. Please contact the unit apparel POC.";
      return;
    }
    const { fs, db } = fb;
    await fs.addDoc(fs.collection(db, "orders"), {
      ...who, items, ...t, taxRate: settings.taxRate,
      status: "unpaid",
      createdAt: fs.serverTimestamp()
    });
    cart = []; saveCart(); f.reset();
    msg.className = "msg ok";
    msg.textContent = tbd
      ? `Order placed! Your total so far is ${money(t.total)}, plus the price of any “Price TBD” items once it's set. The POC will reach out about payment.`
      : `Order placed! Your total is ${money(t.total)}. The POC will reach out about payment.`;
  } catch (err) {
    console.error(err);
    msg.className = "msg err"; msg.textContent = "Couldn't send your order. Please try again.";
  } finally {
    submitting = false; renderCart();
  }
}

async function loadSettings() {
  const fb = await getFirebase().catch(() => null);
  if (!fb) return;
  try {
    const snap = await fb.fs.getDoc(fb.fs.doc(fb.db, "settings", "store"));
    if (snap.exists()) settings = { ...settings, ...snap.data() };
  } catch (e) { console.warn("Settings not loaded", e); }
  if (!settings.open) {
    const s = $("#status"); s.hidden = false;
    s.textContent = "Ordering is closed right now. Check back for the next order window.";
  }
}

// Drawer
const drawer = $("#drawer");
const openCart = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); };
const closeCart = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); };
$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
drawer.addEventListener("click", (e) => { if (e.target === drawer) closeCart(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });
$("#checkout").addEventListener("submit", onCheckout);

renderProducts(); renderCart();
loadSettings().then(() => { renderProducts(); renderCart(); });
