import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export const initializeFirestore = async () => {
  // Initialize global config
  const configRef = doc(db, "config", "global");
  await setDoc(configRef, {
    auctionsEnabled: false,
    maintenanceMode: false
  }, { merge: true });

  console.log("Firestore initialized with default config.");
};
