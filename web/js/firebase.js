// Importamos las dependencias necesarias.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-analytics.js";


// configuración de conexión a firebase
const firebaseConfig = {
  apiKey: "AIzaSyB_0yehy8ZaXcl3UY22PmlNpB7wIV4HpAs",
  authDomain: "gestorgtx.firebaseapp.com",
  projectId: "gestorgtx",
  storageBucket: "gestorgtx.firebasestorage.app",
  messagingSenderId: "155430917151",
  appId: "1:155430917151:web:ecf5d9c6f086963654312a",
  measurementId: "G-W04SS3Y4RP"
};

// guardamos datos de firebase en variables que exportaremos para usar en los scripts futuros
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { firebaseConfig, db, auth, analytics };