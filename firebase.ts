
// Access the global firebase object loaded via scripts in index.html
const firebase = (window as any).firebase;

const firebaseConfig = {
  apiKey: "AIzaSyBTF5M7HcFIvF_TbFqpG7zMjh29AXP1zzM",
  authDomain: "lotacao-753a1.firebaseapp.com",
  databaseURL: "https://lotacao-753a1-default-rtdb.firebaseio.com",
  projectId: "lotacao-753a1",
  storageBucket: "lotacao-753a1.firebasestorage.app",
  messagingSenderId: "755549088369",
  appId: "1:755549088369:web:6182fc39adbd73ea4789d0",
  measurementId: "G-3KWB2PQMCN"
};

let db: any;
let auth: any;

if (firebase) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    // Safety check: ensure database module is attached
    if (firebase.database) {
        db = firebase.database();
    } else {
        console.error("Firebase Database module not found.");
    }

    if (firebase.auth) {
        auth = firebase.auth();
    }
} else {
    console.error("Firebase SDK not loaded");
}

export { db, auth, firebase };
