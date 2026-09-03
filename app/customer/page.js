"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { bookToken, listenQueueToday, cancelToken } from "../../lib/queue";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

export default function CustomerPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [queue, setQueue] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [booking, setBooking] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "customer") {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().photoURL) {
          setPhotoURL(userDoc.data().photoURL);
        }
      } catch (e) {
        console.error("Error loading user data:", e);
      }
    }
    loadUserData();
  }, [user]);

  useEffect(() => {
    const unsubServices = onSnapshot(doc(db, "settings", "services"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setServicesList(docSnap.data().items);
      } else {
        setServicesList([
          { name: "Hair Cut", price: 1000 },
          { name: "Shave", price: 500 },
          { name: "Hair Colour", price: 2500 },
          { name: "Facial", price: 3000 },
          { name: "Hair Wash", price: 800 },
        ]);
      }
    });

    return () => unsubServices();
  }, []);

  useEffect(() => {
    const unsub = listenQueueToday(setQueue);
    return () => unsub();
  }, []);

  if (loading || !user) {
    return (
      <div className="page">
        <p style={{ color: "#cdd8cf" }}>Loading...</p>
      </div>
    );
  }

  const waitingOrServingQueue = queue.filter(
    (t) => t.status === "waiting" || t.status === "serving" || t.status === "skipped"
  );

  const myTokensToday = queue.filter((t) => t.customerUid === user.uid);
  const myActiveToken = myTokensToday.find(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ) || null;

  const myPosition = myActiveToken
    ? waitingOrServingQueue.findIndex((t) => t.id === myActiveToken.id) + 1
    : null;
  const servingToken = waitingOrServingQueue.find((t) => t.status === "serving");

  const handleServiceChange = (serviceName) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter((item) => item !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const totalPrice = selectedServices.reduce((total, serviceName) => {
    const item = servicesList.find((s) => s.name === serviceName);
    return total + (item ? item.price : 0);
  }, 0);

  async function handleBook(e) {
    e.preventDefault();
    setError("");

    const existingValidToken = myTokensToday.find((t) => t.status !== "cancelled");
    if (existingValidToken) {
      setError("You have already booked an appointment for today.");
      return;
    }

    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setBooking(true);
    try {
      await bookToken({
        uid: user.uid,
        service: selectedServices.join(", "),
        totalPrice: totalPrice,
      });
      setSelectedServices([]);
    } catch (err) {
      setError("Could not book the appointment. Please try again.");
    }
    setBooking(false);
  }

  async function handleCancel() {
    if (!myActiveToken) return;

    const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
    if (!confirmed) return;

    setCanceling(true);
    setError("");
    try {
      await cancelToken(myActiveToken.id);
    } catch (err) {
      setError("Could not cancel appointment. Please try again.");
    }
    setCanceling(false);
  }

  return (
    <div className="shell">
      {/* Topbar with Avatar Linking to Profile Page */}
      <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          Salon<span>Yasi</span>
        </div>

        {/* Profile Avatar Button */}
        <div
          onClick={() => router.push("/customer/profile")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          title="Go to Profile Settings"
        >
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid #e4ddc7",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#4a5568",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: 16,
                border: "2px solid #e4ddc7",
              }}
            >
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>
      </div>

      <div className="content">
        {myActiveToken ? (
          <div className="ticket-hero">
            <div className="label">Your Token Number</div>
            <div className="num">#{myActiveToken.tokenNumber}</div>

            <div className="status" style={{ marginBottom: 10 }}>
              <strong>Services:</strong> {myActiveToken.service} <br />
              <strong>Total Cost:</strong> Rs. {myActiveToken.totalPrice || 0}
            </div>

            <div className="status">
              {myActiveToken.status === "serving"
                ? "It's your turn - please go to the counter"
                : myActiveToken.status === "skipped"
                  ? "You were skipped, but you've been placed back in the queue right after the next person"
                  : servingToken
                    ? `Now serving #${servingToken.tokenNumber}. Your position in queue: ${myPosition}`
                    : `Your position in queue: ${myPosition}`}
            </div>

            <button
              onClick={handleCancel}
              disabled={canceling}
              className="btn"
              style={{
                marginTop: 15,
                backgroundColor: "#d9534f",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {canceling ? "Cancelling..." : "Cancel Appointment"}
            </button>
          </div>
        ) : (
          <div className="form-row" style={{ background: "#f1e9d8", padding: 20, borderRadius: 8 }}>
            <form onSubmit={handleBook} style={{ display: "flex", flexDirection: "column", gap: 15, width: "100%" }}>
              <label style={{ fontWeight: "bold" }}>Select Services:</label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {servicesList.map((s) => (
                  <label key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.name)}
                      onChange={() => handleServiceChange(s.name)}
                    />
                    <span>{s.name} - <strong>Rs. {s.price}</strong></span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 5, fontSize: "1.1em", fontWeight: "bold" }}>
                Total Price: <span style={{ color: "#2b5329" }}>Rs. {totalPrice}</span>
              </div>

              <button className="btn brass" type="submit" disabled={booking} style={{ width: "fit-content", padding: "11px 22px" }}>
                {booking ? "Booking..." : "Book Appointment"}
              </button>
            </form>
          </div>
        )}

        {error && <div className="error-msg" style={{ marginTop: 14 }}>{error}</div>}

        <div className="section-title" style={{ marginTop: 25 }}>Today&apos;s Queue</div>
        <div className="queue-list">
          {queue.length === 0 && <div className="empty-note">No one in the queue yet.</div>}
          {queue.map((t) => (
            <div
              className={`queue-row ${t.customerUid === user.uid ? "me" : ""}`}
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 12, opacity: t.status === "cancelled" ? 0.85 : 1 }}
            >
              {t.customerPhotoURL ? (
                <img
                  src={t.customerPhotoURL}
                  alt={t.customerName}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  {t.customerName ? t.customerName.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              <div className="n">#{t.tokenNumber}</div>

              <div className="info" style={{ flex: 1 }}>
                <div className="svc" style={t.status === "cancelled" ? { textDecoration: "line-through", color: "#888" } : {}}>
                  {t.service}
                </div>
                <div className="meta">
                  {t.customerName} {t.totalPrice ? `(Rs. ${t.totalPrice})` : ""}
                </div>
              </div>

              {t.status === "cancelled" ? (
                <span
                  style={{
                    backgroundColor: "#d9534f",
                    color: "#ffffff",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  Cancelled
                </span>
              ) : (
                <span className={`tag ${t.status}`}>
                  {t.status === "waiting" && "Waiting"}
                  {t.status === "serving" && "Now Serving"}
                  {t.status === "skipped" && "Skipped"}
                  {t.status === "done" && "Done"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}