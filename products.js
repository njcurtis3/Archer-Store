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
    defaultPrice: 21.42
  },
  {
    id: "st580-black",
    number: "ST580",
    name: "Sport-Tek Pro Perform Pullover Hoodie",
    style: "Pullover Hoodie",
    color: "Black",
    link: "https://www.sanmar.com/p/75477_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/hff/h85/33039535898654/1200W_75477_Black-2-ST580BlackModelBack/1200W-75477-Black-2-ST580BlackModelBack.jpg",
    defaultPrice: null
  }
];

export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
export const LOGO_COLORS = ["Black", "White"];
export const DEFAULT_TAX_RATE = 0.0825;

// The only account allowed into the admin page. Must match firestore.rules.
export const ADMIN_EMAIL = "nathanjcurtis3@gmail.com";

export const money = (n) => "$" + (Number(n) || 0).toFixed(2);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
