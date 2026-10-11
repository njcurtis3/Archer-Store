// Store settings — edit these, then commit.
window.STORE_CONFIG = {
  // The Google Sheet that holds the catalog and receives orders.
  SHEET_ID: "1Hs-CNpfRY1c0BYejrvRRMmDq5RMRtnVdRbLY6CUB-gQ",

  // Tab the site reads products from. Only this tab is read by the site.
  // Columns: Catalog (link) | type | Apparel # | Apparel Name | price (optional) | image (optional)
  CATALOG_TAB: "catalog",

  // Paste the Google Apps Script web app URL here (see README) so checkout
  // writes orders into the "Orders List" tab. Leave empty and checkout will
  // fall back to an email with the order details.
  ORDER_ENDPOINT: "",

  // Fallback email for orders when ORDER_ENDPOINT is empty.
  ORDER_EMAIL: "nathanjcurtis3@gmail.com",

  // Used when a catalog row has no price column. Keyed by the "type" text.
  DEFAULT_PRICES: {
    "black short sleeve": 23.68,
    "coyote short sleeve": 21.42
  },

  SIZES: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  LOGO_COLORS: ["Black", "White"]
};
