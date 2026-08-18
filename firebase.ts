/** Flight Deck Tactile: client-side Firebase bridge; keep all existing Sky Dodge database paths intact. */
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBbdRgcZmqt5-ywPyssZ1C2CDoj11slDQs",
  authDomain: "sky-dodge-8f537.firebaseapp.com",
  databaseURL: "https://sky-dodge-8f537-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sky-dodge-8f537",
  storageBucket: "sky-dodge-8f537.firebasestorage.app",
  messagingSenderId: "169224412363",
  appId: "1:169224412363:web:de0d018158d8b34e854f4e",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const coinImage = "https://drive.google.com/thumbnail?id=13GfXHlWxw_dlc3eWxlO4p5D5HY1n361H&sz=w100";

