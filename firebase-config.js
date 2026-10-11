// Paste your Firebase web app config here (Firebase console → Project settings
// → Your apps → SDK setup and configuration → Config). These values are not
// secret; access to orders is controlled by firestore.rules.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
