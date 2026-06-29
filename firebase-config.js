// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 PASTE YOUR FIREBASE CONFIG OBJECT HERE ONCE
const firebaseConfig = {
    apiKey: "AIzaSyDF7ZRK2T5NqxuzCd1Y52TUDBQfBm_ZnO0",
    authDomain: "juni-karask.firebaseapp.com",
    databaseURL: "https://juni-karask-default-rtdb.firebaseio.com",
    projectId: "juni-karask",
    storageBucket: "juni-karask.firebasestorage.app",
    messagingSenderId: "224099493730",
    appId: "1:224099493730:web:1a3c42a07010dc59ceae3b"
};

// Initialize the App and both databases
const app = initializeApp(firebaseConfig);
const realtimeDb = getDatabase(app);
const firestoreDb = getFirestore(app);

// Export them so other files can grab them
export { app, realtimeDb, firestoreDb };