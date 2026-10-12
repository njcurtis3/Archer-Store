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
  },
  {
    id: "ct100615-black",
    number: "CT100615",
    name: "Carhartt Rain Defender Paxton Heavyweight Hooded Sweatshirt",
    style: "Hooded Sweatshirt",
    color: "Black",
    link: "https://www.sanmar.com/p/9604_Black",
    image: "https://cdnp.sanmar.com/medias/sys_master/images/hd6/h91/33039512502302/1200W_9604_Black-0-CT100615BlackModelFront4/1200W-9604-Black-0-CT100615BlackModelFront4.jpg",
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
    defaultPrice: null
  }
];

// Every size any product comes in, in display order. A product with its own
// `sizes` list offers only those; the rest offer all of these.
export const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
export const LOGO_COLORS = ["Black", "White"];
// Logo choices follow the garment color; colors not listed offer LOGO_COLORS.
export const LOGOS_BY_COLOR = {
  "Black": ["White", "White w/ Blue Wave"],
  "Tan": ["Black"],
  "Coyote Brown": ["Black"]
};
export const logosFor = (p) => LOGOS_BY_COLOR[p.color] || LOGO_COLORS;
export const sizesFor = (p) => p.sizes || SIZES;
export const DEFAULT_TAX_RATE = 0.0825;

// The only account allowed into the admin page. Must match firestore.rules.
export const ADMIN_EMAIL = "nathanjcurtis3@gmail.com";

export const money = (n) => "$" + (Number(n) || 0).toFixed(2);
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
