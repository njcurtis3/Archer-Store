// Archer Store receipt mailer — a Google Apps Script web app.
//
// Deployed from the store owner's Google account (Execute as: Me, Who has access:
// Anyone). After a customer places an order, the store posts {"id": "<order id>"}
// here. The script reads that order straight from Firestore and emails the receipt
// to the address saved on the order. It never takes an address from the request,
// only emails orders placed in the last 30 minutes, and only once per order, so the
// endpoint can't be used to send mail anywhere else.
//
// Setup and redeploy steps are in the repo README under "Receipt emails".

const PROJECT = "archer-store";
const STORE_URL = "https://njcurtis3.github.io/Archer-Store/";
const VENMO_USER = "Nathan-Curtis-14";
const MAX_AGE_MINUTES = 30;
const TIME_ZONE = "America/Chicago";

function doPost(e) {
  let id = "";
  try { id = String(JSON.parse(e.postData.contents).id || ""); } catch (err) { /* bad body */ }
  if (!/^[A-Za-z0-9]{20}$/.test(id)) return reply("bad request");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return reply(sendReceipt(id));
  } finally {
    lock.releaseLock();
  }
}

function sendReceipt(id) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/orders/${id}`;
  const res = UrlFetchApp.fetch(url, { headers: authHeaders(), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return "not found";
  const o = decode({ mapValue: JSON.parse(res.getContentText()) });

  if (!o.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) return "no email";
  if (o.emailedAt) return "already sent";
  if (!(o.createdAt instanceof Date) || Date.now() - o.createdAt.getTime() > MAX_AGE_MINUTES * 60000) return "too old";

  const code = id.slice(0, 6).toUpperCase();
  MailApp.sendEmail({
    to: o.email,
    subject: `Archer Store receipt — order #${code}`,
    name: "Archer Store",
    htmlBody: receiptHtml(o, code),
    body: receiptText(o, code)
  });

  UrlFetchApp.fetch(`${url}?updateMask.fieldPaths=emailedAt`, {
    method: "patch",
    contentType: "application/json",
    headers: authHeaders(),
    payload: JSON.stringify({ fields: { emailedAt: { timestampValue: new Date().toISOString() } } }),
    muteHttpExceptions: true
  });
  return "sent";
}

function receiptHtml(o, code) {
  const tbd = (o.items || []).some((i) => i.price == null);
  const rows = (o.items || []).map((i) => `
    <tr>
      <td style="padding:8px 0;border-top:1px solid #dedbd0">${i.qty} × ${esc(i.name)}<br>
        <span style="color:#62665a;font-size:13px">${esc(i.color)} · Size ${esc(i.size)} · ${esc(i.logo)} logo · ${esc(i.number)}</span></td>
      <td style="padding:8px 0;border-top:1px solid #dedbd0;text-align:right;white-space:nowrap">${i.price == null ? "TBD" : money(i.price * i.qty)}</td>
    </tr>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f221c;max-width:560px">
    <div style="background:#4b5320;color:#f4f2ec;padding:14px 18px;font-size:20px;font-weight:bold;letter-spacing:.04em">ARCHER STORE</div>
    <div style="padding:18px;border:1px solid #dedbd0;border-top:0">
      <p style="margin:0 0 4px;font-size:18px"><strong>Thanks for your order, ${esc(o.first)}!</strong></p>
      <p style="margin:0 0 14px;color:#62665a">Order #${code} · ${Utilities.formatDate(o.createdAt, TIME_ZONE, "MMM d, yyyy h:mm a")}</p>
      <p style="margin:0 0 10px;color:#62665a;font-size:14px">${esc(o.first)} ${esc(o.last)} · ${esc(phone(o.phone))}</p>
      <table style="width:100%;border-collapse:collapse;font-size:15px">${rows}
        <tr><td style="padding:8px 0 2px;border-top:1px solid #dedbd0">Subtotal</td><td style="padding:8px 0 2px;border-top:1px solid #dedbd0;text-align:right">${money(o.subtotal)}</td></tr>
        <tr><td style="padding:2px 0">Tax</td><td style="padding:2px 0;text-align:right">${money(o.tax)}</td></tr>
        <tr><td style="padding:8px 0;border-top:1px solid #dedbd0;font-size:17px"><strong>Total${tbd ? " so far" : ""}</strong></td>
            <td style="padding:8px 0;border-top:1px solid #dedbd0;text-align:right;font-size:17px"><strong>${money(o.total)}</strong></td></tr>
      </table>
      ${tbd ? `<p style="color:#62665a;font-size:13px">Plus the price of any “TBD” items once it's set. You can pay this part now and the rest when the POC confirms it.</p>` : ""}
      <p style="margin:18px 0"><a href="${venmoLink(o, code)}" style="background:#008cff;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px;display:inline-block">Pay ${money(o.total)} with Venmo</a></p>
      <p style="color:#62665a;font-size:13px;margin:0">Pays @${VENMO_USER} with the amount and order number filled in. Questions? Reply to this email or contact your unit apparel POC.</p>
      <p style="color:#62665a;font-size:13px"><a href="${STORE_URL}" style="color:#4b5320">Archer Store</a> · A CO 440th Civil Affairs</p>
    </div>
  </div>`;
}

function receiptText(o, code) {
  const lines = (o.items || []).map((i) =>
    `${i.qty} x ${i.name} (${i.color}, ${i.size}, ${i.logo} logo) ... ${i.price == null ? "TBD" : money(i.price * i.qty)}`);
  return [
    `Thanks for your order, ${o.first}!`,
    `Order #${code}`,
    "",
    ...lines,
    "",
    `Subtotal: ${money(o.subtotal)}`,
    `Tax: ${money(o.tax)}`,
    `Total: ${money(o.total)}`,
    "",
    `Pay with Venmo: ${venmoLink(o, code)}`,
    `Questions? Reply to this email or contact your unit apparel POC.`
  ].join("\n");
}

function venmoLink(o, code) {
  const note = `Archer Store #${code} - ${o.first} ${o.last}`;
  return `https://venmo.com/${VENMO_USER}?txn=pay&audience=private&amount=${Number(o.total).toFixed(2)}&note=${encodeURIComponent(note)}`;
}

// Firestore REST values -> plain JS values.
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) {
    const out = {};
    const fields = v.mapValue.fields || {};
    Object.keys(fields).forEach((k) => (out[k] = decode(fields[k])));
    return out;
  }
  return null;
}

// The owner's token bypasses Firestore rules; the header bills the call to the store's project.
function authHeaders() {
  return { Authorization: "Bearer " + ScriptApp.getOAuthToken(), "x-goog-user-project": PROJECT };
}

function money(n) { return "$" + (Number(n) || 0).toFixed(2); }
function phone(p) {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d;
}
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function reply(s) { return ContentService.createTextOutput(s); }
