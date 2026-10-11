(function () {
  "use strict";
  const C = window.STORE_CONFIG;
  const $ = (s) => document.querySelector(s);
  const money = (n) => (n == null || isNaN(n) ? "Price TBD" : "$" + Number(n).toFixed(2));

  let products = [];
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("archerCart") || "[]"); } catch (e) { cart = []; }
  const saveCart = () => { try { localStorage.setItem("archerCart", JSON.stringify(cart)); } catch (e) {} };

  // ---- CSV parsing (handles quoted fields) ----
  function parseCSV(text) {
    const rows = []; let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') q = false;
        else field += ch;
      } else if (ch === '"') q = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function colorFromType(type) {
    const t = type.toLowerCase();
    if (t.includes("coyote")) return "Coyote";
    if (t.includes("black")) return "Black";
    if (t.includes("white")) return "White";
    return "";
  }
  function styleFromType(type) {
    const t = type.toLowerCase();
    if (t.includes("hoodie")) return "Hoodie";
    if (t.includes("long")) return "Long Sleeve";
    if (t.includes("short")) return "Short Sleeve Tee";
    return type;
  }
  const cleanName = (s) => s.replace(/:\s*$/, "").trim();

  async function loadCatalog() {
    const url = `https://docs.google.com/spreadsheets/d/${C.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(C.CATALOG_TAB)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCSV(await res.text()).filter((r) => r.some((c) => c.trim()));
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    const idx = (name) => head.findIndex((h) => h === name || h.startsWith(name));
    const iLink = idx("catalog"), iType = idx("type"), iNum = idx("apparel #"),
          iName = idx("apparel name"), iPrice = idx("price"), iImg = idx("image");
    return rows.map((r) => {
      const type = (r[iType] || "").trim();
      const rawPrice = iPrice >= 0 ? parseFloat(String(r[iPrice]).replace(/[$,]/g, "")) : NaN;
      return {
        id: (r[iNum] || "") + "|" + type,
        number: (r[iNum] || "").trim(),
        name: cleanName(r[iName] || ""),
        type,
        style: styleFromType(type),
        color: colorFromType(type),
        link: (r[iLink] || "").trim(),
        image: iImg >= 0 ? (r[iImg] || "").trim() : "",
        price: !isNaN(rawPrice) ? rawPrice : C.DEFAULT_PRICES[type.toLowerCase()]
      };
    }).filter((p) => p.name);
  }

  // ---- Rendering ----
  function swatch(color) {
    const map = { Black: "#1d1f1c", Coyote: "#8a6f4e", White: "#f3f1ea" };
    return map[color] || "#6b6f5e";
  }

  function renderProducts() {
    const grid = $("#products");
    grid.innerHTML = "";
    products.forEach((p, i) => {
      const card = document.createElement("article");
      card.className = "card";
      const visual = p.image
        ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
        : `<div class="ph" style="--sw:${swatch(p.color)}"><span>${p.style.toUpperCase()}</span></div>`;
      card.innerHTML = `
        <div class="visual">${visual}</div>
        <div class="body">
          <div class="meta"><span class="chip">${p.number}</span><span class="dot" style="background:${swatch(p.color)}"></span>${p.color}</div>
          <h3>${p.name}</h3>
          <p class="sub">${p.style}${p.link ? ` · <a href="${p.link}" target="_blank" rel="noopener">View details</a>` : ""}</p>
          <div class="price">${money(p.price)}</div>
          <form class="add" data-i="${i}">
            <label>Size<select name="size">${C.SIZES.map((s) => `<option${s === "M" ? " selected" : ""}>${s}</option>`).join("")}</select></label>
            <label>Logo<select name="logo">${C.LOGO_COLORS.map((c) => `<option>${c}</option>`).join("")}</select></label>
            <label>Qty<input name="qty" type="number" min="1" max="20" value="1"></label>
            <button type="submit" class="primary">Add to cart</button>
          </form>
        </div>`;
      grid.appendChild(card);
    });
    grid.querySelectorAll("form.add").forEach((f) => f.addEventListener("submit", onAdd));
  }

  function onAdd(e) {
    e.preventDefault();
    const f = e.target, p = products[+f.dataset.i];
    const item = { id: p.id, number: p.number, name: p.name, color: p.color, link: p.link, price: p.price,
      size: f.size.value, logo: f.logo.value, qty: Math.max(1, parseInt(f.qty.value, 10) || 1) };
    const same = cart.find((c) => c.id === item.id && c.size === item.size && c.logo === item.logo);
    if (same) same.qty += item.qty; else cart.push(item);
    saveCart(); renderCart();
    const btn = f.querySelector("button"); btn.textContent = "Added ✓";
    setTimeout(() => (btn.textContent = "Add to cart"), 1200);
  }

  function renderCart() {
    const list = $("#cartItems");
    $("#cartCount").textContent = cart.reduce((n, c) => n + c.qty, 0);
    if (!cart.length) { list.innerHTML = `<li class="empty">Your cart is empty.</li>`; }
    else list.innerHTML = cart.map((c, i) => `
      <li>
        <div><strong>${c.name}</strong><span>${c.color} · ${c.size} · ${c.logo} logo</span></div>
        <div class="qty">
          <button class="icon-btn" data-d="-1" data-i="${i}" aria-label="Decrease">−</button>
          <span>${c.qty}</span>
          <button class="icon-btn" data-d="1" data-i="${i}" aria-label="Increase">+</button>
        </div>
      </li>`).join("");
    list.querySelectorAll("button[data-d]").forEach((b) => b.addEventListener("click", () => {
      const c = cart[+b.dataset.i]; c.qty += +b.dataset.d;
      if (c.qty <= 0) cart.splice(+b.dataset.i, 1);
      saveCart(); renderCart();
    }));
    const total = cart.reduce((t, c) => t + (c.price || 0) * c.qty, 0);
    const anyTbd = cart.some((c) => c.price == null);
    $("#cartTotal").textContent = "$" + total.toFixed(2) + (anyTbd ? " + TBD" : "");
    $("#submitBtn").disabled = !cart.length;
  }

  // ---- Checkout ----
  async function onCheckout(e) {
    e.preventDefault();
    const f = e.target, msg = $("#checkoutMsg");
    const order = {
      first: f.first.value.trim(), last: f.last.value.trim(),
      phone: f.phone.value.replace(/\D/g, ""),
      items: cart.map((c) => ({ number: c.number, name: c.name, qty: c.qty, size: c.size, logo: c.logo, color: c.color, link: c.link }))
    };
    if (!cart.length) return;

    if (!C.ORDER_ENDPOINT) {
      const lines = order.items.map((i) => `- ${i.qty} x ${i.name} (${i.number}) | ${i.color} | Size ${i.size} | ${i.logo} logo`);
      const body = `Name: ${order.first} ${order.last}\nPhone: ${order.phone}\n\n${lines.join("\n")}`;
      window.location.href = `mailto:${C.ORDER_EMAIL}?subject=${encodeURIComponent("Apparel order - " + order.last)}&body=${encodeURIComponent(body)}`;
      msg.textContent = "Your email app should open with the order filled in — just hit send.";
      return;
    }

    $("#submitBtn").disabled = true; msg.className = "msg"; msg.textContent = "Sending your order…";
    try {
      // text/plain avoids a CORS preflight, which Apps Script doesn't answer.
      await fetch(C.ORDER_ENDPOINT, { method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(order) });
      cart = []; saveCart(); renderCart(); f.reset();
      msg.className = "msg ok"; msg.textContent = "Order placed! It's been added to the unit order sheet.";
    } catch (err) {
      msg.className = "msg err"; msg.textContent = "Couldn't send the order. Check your connection and try again.";
      $("#submitBtn").disabled = false;
    }
  }

  // ---- Drawer ----
  const drawer = $("#drawer");
  const openCart = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); };
  const closeCart = () => { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); };
  $("#cartBtn").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  drawer.addEventListener("click", (e) => { if (e.target === drawer) closeCart(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCart(); });
  $("#checkout").addEventListener("submit", onCheckout);

  renderCart();
  loadCatalog()
    .then((p) => {
      products = p;
      $("#status").style.display = products.length ? "none" : "block";
      if (!products.length) $("#status").textContent = "No items in the catalog yet.";
      renderProducts();
    })
    .catch(() => {
      $("#status").textContent = "Couldn't load the catalog. Make sure the Google Sheet is shared as “Anyone with the link can view.”";
    });
})();
