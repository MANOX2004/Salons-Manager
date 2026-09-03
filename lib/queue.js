import { db } from "./firebase";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
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

// අද දිනයේ Queue එක Realtime Listen කිරීම (Composite Index නැතිව වැඩ කරන ලෙස sort කර ඇත)
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

    // JavaScript array sort මගින් order අගය අනුව පිලිවෙල සකසයි
    list.sort((a, b) => (a.order || 0) - (b.order || 0));

    callback(list);
  });
}

// Token එකක් Book කිරීම (Customer Photo URL එක සමග)
export async function bookToken({ uid, customerName, customerPhotoURL, service, totalPrice }) {
  const dateKey = todayKey();

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

  const counterRef = doc(db, "counters", dateKey);
  const tokenRef = doc(collection(db, "tokens"));

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const nextNumber = counterSnap.exists() ? counterSnap.data().lastNumber + 1 : 1;

    tx.set(counterRef, { lastNumber: nextNumber }, { merge: true });
    tx.set(tokenRef, {
      tokenNumber: nextNumber,
      order: Date.now(),
      customerUid: uid,
      customerName: customerName || "Customer",
      customerPhotoURL: customerPhotoURL || "",
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

// Token Status එක Update කිරීම (Admin/Staff සඳහා)
export async function updateTokenStatus(tokenId, newStatus) {
  const tokenRef = doc(db, "tokens", tokenId);
  await updateDoc(tokenRef, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}