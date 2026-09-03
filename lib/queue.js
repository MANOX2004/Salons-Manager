import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
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

// Books a new appointment. The tokenNumber is generated per day (1, 2, 3...)
// inside a transaction, so two customers booking at the same time never get
// the same number.
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

// Live listener for today's queue (waiting / serving / skipped tokens).
// Note: we only filter by queueDate here, then filter status and sort by
// "order" on the client. This avoids needing a Firestore composite index
// (where + orderBy together on different fields requires one, and it has
// to be created manually the first time in the Firebase console).
export function listenQueueToday(callback) {
  const dateKey = todayKey();
  const q = query(collection(db, "tokens"), where("queueDate", "==", dateKey));

  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const visible = all.filter((t) =>
      ["waiting", "serving", "skipped"].includes(t.status)
    );
    visible.sort((a, b) => a.order - b.order);
    callback(visible);
  });
}

export async function setStatus(tokenId, status) {
  await updateDoc(doc(db, "tokens", tokenId), { status });
}

// Re-inserts a skipped customer right after the next person in line,
// instead of sending them all the way to the back of the queue.
export async function skipAndReinsert(skippedTokenId, currentQueueOrdered) {
  const idx = currentQueueOrdered.findIndex((t) => t.id === skippedTokenId);
  if (idx === -1) return;

  const rest = currentQueueOrdered.filter((t) => t.id !== skippedTokenId);
  const nextToken = rest[0]; // whoever is up next
  const afterNext = rest[1]; // the person after that (if any)

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
