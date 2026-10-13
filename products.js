// Store catalog. Prices and tax rate are set on the admin page; the prices
// here are only used until you save your own.
export const PRODUCTS = [
  {
    id: "st350-black",
    number: "ST350",
    name: "Sport-Tek PosiCharge Competitor Tee",
    style: "Short Sleeve Tee",
    color: "Black",
    link: "https://www.sanmar.com/p/4349_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/hf9/h1b/28963219472414/1200W_4349_Black-0-ST350BlackModelFront5/1200W-4349-Black-0-ST350BlackModelFront5.jpg",
    // Printer's proof mockups; shown instead of `image` when present.
    gallery: [
      { src: "img/tee-black-front.jpg?v=dev", view: "front" },
      { src: "img/tee-black-back.jpg?v=dev", view: "back" },
      { src: "img/tee-black-side.jpg?v=dev", view: "side" }
    ],
    defaultPrice: 23.68
  },
  {
    id: "st350-coyote",
    number: "ST350",
    name: "Sport-Tek PosiCharge Competitor Tee",
    style: "Short Sleeve Tee",
    color: "Coyote Brown",
    link: "https://www.sanmar.com/p/4349_CoyoteBrn",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/h15/h0e/28963222683678/1200W_4349_CoyoteBrn-0-ST350CoyoteBrnModelFront3/1200W-4349-CoyoteBrn-0-ST350CoyoteBrnModelFront3.jpg",
    gallery: [
      { src: "img/tee-coyote-front.jpg?v=dev", view: "front" },
      { src: "img/tee-coyote-back.jpg?v=dev", view: "back" },
      { src: "img/tee-coyote-side.jpg?v=dev", view: "side" }
    ],
    defaultPrice: 21.42
  },
  {
    id: "st580-black",
    number: "ST580",
    name: "Sport-Tek Pro Perform Pullover Hoodie",
    style: "Pullover Hoodie",
    color: "Black",
    link: "https://www.sanmar.com/p/75477_Black",
    // SanMar model photo with the back print added from the printer's proof.
    image: "img/hoodie-st580-back.jpg?v=dev",
    defaultPrice: null
  },
  {
    id: "ct100615-black",
    number: "CT100615",
    name: "Carhartt Rain Defender Paxton Heavyweight Hooded Sweatshirt",
    style: "Hooded Sweatshirt",
    color: "Black",
    link: "https://www.sanmar.com/p/9604_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/hd6/h91/33039512502302/1200W_9604_Black-0-CT100615BlackModelFront4/1200W-9604-Black-0-CT100615BlackModelFront4.jpg",
    // Front is the printer's proof mockup; back is a SanMar flat with the back print added,
    // since the printer's black back mockups leave the back print off.
    gallery: [
      { src: "img/carhartt-ct100615-front.jpg?v=dev", view: "front" },
      { src: "img/carhartt-ct100615-back.jpg?v=dev", view: "back" },
      { src: "https://cdnp.sanmar.com/medias/sys_master/images/hd6/h91/33039512502302/1200W_9604_Black-0-CT100615BlackModelFront4/1200W-9604-Black-0-CT100615BlackModelFront4.jpg", view: "on a model, unprinted" }
    ],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    defaultPrice: null
  },
  {
    id: "nl9307-tan",
    number: "NL9307",
    name: "Next Level Apparel Heavyweight Hoodie",
    style: "Pullover Hoodie",
    color: "Tan",
    link: "https://www.sanmar.com/p/63784_Tan",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/h91/h3b/28446928863262/1200W_63784_Tan-0-NL9307TanModelFront/1200W-63784-Tan-0-NL9307TanModelFront.jpg",
    // Printer's proof mockups.
    gallery: [
      { src: "img/nextlevel-nl9307-tan-front.jpg?v=dev", view: "front" },
      { src: "img/nextlevel-nl9307-tan-back.jpg?v=dev", view: "back" },
      { src: "img/nextlevel-nl9307-tan-side.jpg?v=dev", view: "side" }
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    defaultPrice: null
  },
  {
    id: "nl9307-black",
    number: "NL9307",
    name: "Next Level Apparel Heavyweight Hoodie",
    style: "Pullover Hoodie",
    color: "Black",
    link: "https://www.sanmar.com/p/63784_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/hb8/h04/28446911234078/1200W_63784_Black-0-NL9307BlackModelFront/1200W-63784-Black-0-NL9307BlackModelFront.jpg",
    // Front is the printer's proof mockup; back is a SanMar flat with the back print added,
    // since the printer's black back mockups leave the back print off.
    gallery: [
      { src: "img/nextlevel-nl9307-black-front.jpg?v=dev", view: "front" },
      { src: "img/nextlevel-nl9307-black-back.jpg?v=dev", view: "back" },
      { src: "https://cdnp.sanmar.com/medias/sys_master/images/hb8/h04/28446911234078/1200W_63784_Black-0-NL9307BlackModelFront/1200W-63784-Black-0-NL9307BlackModelFront.jpg", view: "on a model, unprinted" }
    ],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    defaultPrice: null
  },
  {
    id: "st485-black",
    number: "ST485",
    name: "Sport-Tek Repeat 7\" Short",
    style: "Short",
    color: "Black",
    link: "https://www.sanmar.com/p/38573_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/h36/h6c/28276550434846/1200W_38573_Black-0-ST485BlackModelFront3/1200W-38573-Black-0-ST485BlackModelFront3.jpg",
    // Printer's proof flat, plus a SanMar model photo with the leg logo added.
    gallery: [
      { src: "img/shorts-st485-front.jpg?v=dev", view: "front" },
      { src: "img/shorts-st485-model.jpg?v=dev", view: "on a model" }
    ],
    // Only the leg logo, which has no wave, so no blue-wave option.
    logos: ["White"],
    defaultPrice: null
  },
  {
    id: "lst447-black",
    number: "LST447",
    name: "Sport-Tek Women's Club 3\" Track Short",
    style: "Women's Short",
    color: "Black",
    link: "https://www.sanmar.com/p/68976_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/h1d/h4b/30952573075486/1200W_68976_Black-0-LST447BlackModelFront/1200W-68976-Black-0-LST447BlackModelFront.jpg",
    gallery: [
      { src: "img/shorts-lst447-front.jpg?v=dev", view: "front" },
      { src: "img/shorts-lst447-model.jpg?v=dev", view: "on a model" }
    ],
    logos: ["White"],
    defaultPrice: null
  }
];

// Every size any product comes in, in display order. A product with its own
// `sizes` list offers only those; the rest offer all of these.
export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
export const LOGO_COLORS = ["Black", "White"];
// Logo choices follow the garment color unless a product lists its own `logos`;
// colors not listed offer LOGO_COLORS.
export const LOGOS_BY_COLOR = {
  "Black": ["White", "White w/ Blue Wave"],
  "Tan": ["Black"],
  "Coyote Brown": ["Black"]
};
export const logosFor = (p) => p.logos || LOGOS_BY_COLOR[p.color] || LOGO_COLORS;
export const sizesFor = (p) => p.sizes || SIZES;
export const DEFAULT_TAX_RATE = 0.0825;

// The only account allowed into the admin page. Must match firestore.rules.
export const ADMIN_EMAIL = "nathanjcurtis3@gmail.com";

// Google Apps Script web app that emails receipts (see apps-script/). Empty turns it off.
export const RECEIPT_MAILER_URL = "https://script.google.com/macros/s/AKfycbxmOBvP_g95v3wPjIE5gzUsOZ9LTv8WNXvKhPzzJKSn8vRlvWKRlC5LNvhjPtyFT1Sw/exec";
// Loose email check; the receipt mailer re-checks before sending.
export const cleanEmail = (v) => {
  const e = String(v || "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 100 ? e : null;
};

// Where customers pay. Venmo username without the @.
export const VENMO_USER = "Nathan-Curtis-14";
// Opens Venmo (app on phones, website on computers) with the payment filled in.
export const venmoPayLink = (amount, note) => `https://venmo.com/${VENMO_USER}?` + new URLSearchParams({
  txn: "pay", audience: "private", ...(amount > 0 ? { amount: amount.toFixed(2) } : {}), note
}).toString();

// Short order number shown to customers and in the admin page, from the order's database id.
export const orderCode = (id) => String(id || "").slice(0, 6).toUpperCase();
// SanMar's measurements page for a product link.
export const sizeChartLink = (p) => `${p.link}/specSheetMeasurements`;
// US phone numbers only: 10 digits, or 11 with a leading 1. Returns the 10 digits or null.
export const cleanPhone = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return d.length === 10 ? d : null;
};
export const fmtPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : d;
};

export const money = (n) => "$" + (Number(n) || 0).toFixed(2);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
