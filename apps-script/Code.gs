/**
 * Archer Store order receiver.
 * Paste into the sheet via Extensions > Apps Script, then Deploy > New deployment
 * > Web app (Execute as: Me, Who has access: Anyone). Copy the /exec URL into
 * config.js as ORDER_ENDPOINT.
 *
 * Writes each cart item as a row in "Orders List", columns A–J:
 * Apparel # | Apparel Name | Qty | Size | Logo Color | Color | Last | First | Phone # | Apparel link
 * Rows go into the first empty row under the header (row 4), so the totals
 * block lower in the sheet is never overwritten.
 */
const ORDERS_TAB = "Orders List";
const HEADER_ROW = 4;

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const order = JSON.parse(e.postData.contents);
    if (!order.last || !order.first || !Array.isArray(order.items) || !order.items.length) {
      return json({ ok: false, error: "Missing name or items" });
    }
    const sheet = SpreadsheetApp.getActive().getSheetByName(ORDERS_TAB);
    const clean = (v) => String(v == null ? "" : v).slice(0, 200);
    const rows = order.items.map((i) => [
      clean(i.number), clean(i.name), Math.max(1, Math.min(20, parseInt(i.qty, 10) || 1)),
      clean(i.size), clean(i.logo), clean(i.color),
      clean(order.last), clean(order.first), clean(order.phone).replace(/\D/g, ""), clean(i.link)
    ]);

    // Find the first row below the header where columns A–J are all empty.
    const block = sheet.getRange(HEADER_ROW + 1, 1, sheet.getMaxRows() - HEADER_ROW, 10).getValues();
    const isEmpty = (r) => r.every((c) => c === "" || c === null);
    let start = block.findIndex(isEmpty);
    if (start < 0) start = block.length;
    const firstRow = HEADER_ROW + 1 + start;

    // If the next used row (e.g. the totals block) is too close, insert space above it.
    const nextUsed = block.slice(start).findIndex((r) => !isEmpty(r));
    if (nextUsed >= 0 && nextUsed < rows.length) {
      sheet.insertRowsBefore(firstRow + nextUsed, rows.length - nextUsed);
    }
    sheet.getRange(firstRow, 1, rows.length, 10).setValues(rows);
    return json({ ok: true, rows: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
