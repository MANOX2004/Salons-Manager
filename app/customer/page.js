"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { bookToken, listenQueueToday } from "../../lib/queue";

const SERVICES = ["Hair Cut", "Shave", "Hair Colour", "Facial", "Hair Wash"];

export default function CustomerPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState([]);
  const [service, setService] = useState(SERVICES[0]);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "customer") {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

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

  const myTokens = queue.filter((t) => t.customerUid === user.uid);
  const myActiveToken = myTokens.find((t) => t.status !== "done") || null;
  const myPosition = myActiveToken
    ? queue.findIndex((t) => t.id === myActiveToken.id) + 1
    : null;
  const servingToken = queue.find((t) => t.status === "serving");

  async function handleBook(e) {
    e.preventDefault();
    setError("");
    if (myActiveToken) {
      setError("You already have an active token. Wait for it to finish before booking again.");
      return;
    }
    setBooking(true);
    try {
      await bookToken({
        uid: user.uid,
        customerName: user.displayName || user.email,
        service,
      });
    } catch (err) {
      setError("Could not book the appointment. Please try again.");
    }
    setBooking(false);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          salon<span>queue</span>
        </div>
        <div className="who">
          <strong>{user.displayName || user.email}</strong> ·{" "}
          <a href="#" onClick={logout} style={{ color: "#e4ddc7" }}>
            Log out
          </a>
        </div>
      </div>

      <div className="content">
        {myActiveToken ? (
          <div className="ticket-hero">
            <div className="label">Your Token Number</div>
            <div className="num">#{myActiveToken.tokenNumber}</div>
            <div className="status">
              {myActiveToken.status === "serving"
                ? "It's your turn - please go to the counter"
                : myActiveToken.status === "skipped"
                ? "You were skipped, but you've been placed back in the queue right after the next person"
                : servingToken
                ? `Now serving #${servingToken.tokenNumber}. Your position in queue: ${myPosition}`
                : `Your position in queue: ${myPosition}`}
            </div>
          </div>
        ) : (
          <div className="form-row" style={{ background: "#f1e9d8" }}>
            <form onSubmit={handleBook} style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1 }}>
              <div className="field" style={{ flex: 1, minWidth: 180 }}>
                <label>Service</label>
                <select value={service} onChange={(e) => setService(e.target.value)}>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn brass" type="submit" disabled={booking} style={{ width: "auto", padding: "11px 22px" }}>
                {booking ? "Booking..." : "Book Appointment"}
              </button>
            </form>
          </div>
        )}
        {error && <div className="error-msg" style={{ marginTop: 14 }}>{error}</div>}

        <div className="section-title">Today&apos;s Queue</div>
        <div className="queue-list">
          {queue.length === 0 && <div className="empty-note">No one in the queue yet.</div>}
          {queue.map((t) => (
            <div className={`queue-row ${t.customerUid === user.uid ? "me" : ""}`} key={t.id}>
              <div className="n">#{t.tokenNumber}</div>
              <div className="info">
                <div className="svc">{t.service}</div>
                <div className="meta">{t.customerName}</div>
              </div>
              <span className={`tag ${t.status}`}>
                {t.status === "waiting" && "Waiting"}
                {t.status === "serving" && "Now Serving"}
                {t.status === "skipped" && "Skipped"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
