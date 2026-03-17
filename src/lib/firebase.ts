import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCCqQLzYjdH1NEIjznrNe43oaVka3KtOWY",
  authDomain: "nusanest-b4544.firebaseapp.com",
  databaseURL: "https://nusanest-b4544-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nusanest-b4544",
  storageBucket: "nusanest-b4544.firebasestorage.app",
  messagingSenderId: "529471198075",
  appId: "1:529471198075:web:220094d612f8fec94063de",
  measurementId: "G-X5W9YMSLK4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

export default app;
