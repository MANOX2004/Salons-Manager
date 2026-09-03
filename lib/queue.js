import { db } from "./firebase";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

// වර්තමාන දිනය YYYY-MM-DD ආකෘතියට ගැනීම
export function todayKey() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// අද දිනයේ Queue එක Realtime Listen කිරීම
export function listenQueueToday(callback) {
  const dateKey = todayKey();
  const q = query(
    collection(db, "tokens"),
    where("queueDate", "==", dateKey)
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Order එක අනුව පිළිවෙලට සැකසීම
    list.sort((a, b) => (a.order || 0) - (b.order || 0));

    callback(list);
  });
}

// Token එකක් Book කිරීම (Firestore Users වෙතින් කෙලින්ම Photo එක ලබා ගනී)
export async function bookToken({ uid, service, totalPrice }) {
  const dateKey = todayKey();

  // 1. අද දිනට Active Appointment එකක් තිබේදැයි පරීක්ෂා කිරීම
  const q = query(
    collection(db, "tokens"),
    where("queueDate", "==", dateKey),
    where("customerUid", "==", uid)
  );
  const snap = await getDocs(q);

  const hasExistingAppointment = snap.docs.some((docSnap) => {
    const data = docSnap.data();
    return data.status !== "cancelled";
  });

  if (hasExistingAppointment) {
    throw new Error("You already have an active appointment for today.");
  }

  // 2. Users Collection එකෙන් Direct PhotoURL සහ Name ලබා ගැනීම
  let fetchedName = "Customer";
  let fetchedPhotoURL = "";

  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      fetchedName = userData.displayName || "Customer";
      fetchedPhotoURL = userData.photoURL || "";
    }
  } catch (err) {
    console.error("Error fetching user data before booking:", err);
  }

  const counterRef = doc(db, "counters", dateKey);
  const tokenRef = doc(collection(db, "tokens"));

  // 3. Transaction එක මගින් Token එක Save කිරීම
  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const nextNumber = counterSnap.exists() ? counterSnap.data().lastNumber + 1 : 1;

    tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
    tx.set(tokenRef, {
      tokenNumber: nextNumber,
      order: Date.now(),
      customerUid: uid,
      customerName: fetchedName,
      customerPhotoURL: fetchedPhotoURL,
      service: service || "",
      totalPrice: totalPrice || 0,
      status: "waiting",
      queueDate: dateKey,
      createdAt: serverTimestamp(),
    });
  });

  return tokenRef.id;
}

// Token එක Cancel කිරීම
export async function cancelToken(tokenId) {
  const tokenRef = doc(db, "tokens", tokenId);
  await updateDoc(tokenRef, {
    status: "cancelled",
    updatedAt: serverTimestamp(),
  });
}

// Token Status එක Update කිරීම (Admin / Staff සඳහා)
export async function updateTokenStatus(tokenId, newStatus) {
  const tokenRef = doc(db, "tokens", tokenId);
  await updateDoc(tokenRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}