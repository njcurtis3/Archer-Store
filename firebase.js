import { firebaseConfig, isConfigured } from "./firebase-config.js?v=dev";

const V = "10.12.2";
let cache = null;

// Loads Firebase only when configured, so the store still renders without it.
export async function getFirebase() {
  if (!isConfigured) return null;
  if (cache) return cache;
  const [app, fs, auth] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`)
  ]);
  const a = app.initializeApp(firebaseConfig);
  cache = { fs, authMod: auth, db: fs.getFirestore(a), auth: auth.getAuth(a) };
  return cache;
}
