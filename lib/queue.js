import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Aluth appointment ekak book karanawa. tokenNumber eka dawasakata
// serial widiyata (1, 2, 3...) transaction ekakin generate karanawa,
// eka dennekuta ekama number eka gihin race-condition ekak wenne nathi widiyata.
export async function bookToken({ uid, customerName, service }) {
  const dateKey = todayKey();
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
      customerName,
      service,
      status: "waiting",
      queueDate: dateKey,
      createdAt: serverTimestamp(),
    });
  });

  return tokenRef.id;
}

// Adha dawase queue eka - waiting/serving/skipped tokens okkoma, order anuwa
export function listenQueueToday(callback) {
  const dateKey = todayKey();
  const q = query(
    collection(db, "tokens"),
    where("queueDate", "==", dateKey),
    where("status", "in", ["waiting", "serving", "skipped"]),
    orderBy("order", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function setStatus(tokenId, status) {
  await updateDoc(doc(db, "tokens", tokenId), { status });
}

// Skip karapu kenawa "ilanga kenata passe" ayeth queue ekata daanawa -
// anthimata yanne naha, dan serve karana kenata (nextToken) passe witharai
export async function skipAndReinsert(skippedTokenId, currentQueueOrdered) {
  const idx = currentQueueOrdered.findIndex((t) => t.id === skippedTokenId);
  if (idx === -1) return;

  const rest = currentQueueOrdered.filter((t) => t.id !== skippedTokenId);
  const nextToken = rest[0]; // dan first ekata enna one kena
  const afterNext = rest[1]; // ita passe tiyena kena (thiyenawa nam)

  let newOrder;
  if (nextToken && afterNext) {
    newOrder = (nextToken.order + afterNext.order) / 2;
  } else if (nextToken) {
    newOrder = nextToken.order + 1;
  } else {
    newOrder = Date.now();
  }

  await updateDoc(doc(db, "tokens", skippedTokenId), {
    status: "waiting",
    order: newOrder,
  });
}
