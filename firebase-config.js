// Paste your Firebase web app config here (Firebase console → Project settings
// → Your apps → SDK setup and configuration → Config). These values are not
// secret; access to orders is controlled by firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyAu1pPaB4RieUGelbQdTO3OzT68Ze_MvTM",
  authDomain: "archer-store.firebaseapp.com",
  projectId: "archer-store",
  storageBucket: "archer-store.firebasestorage.app",
  messagingSenderId: "876007659289",
  appId: "1:876007659289:web:8f6d3cfa6e4e276c131788"
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
