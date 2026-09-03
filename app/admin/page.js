"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { listenQueueToday, setStatus, skipAndReinsert, bookToken } from "../../lib/queue";

const SERVICES = ["Hair Cut", "Shave", "Hair Colour", "Facial", "Hair Wash"];
const AVERAGE_SERVICE_MINUTES = 20;

export default function AdminPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualService, setManualService] = useState(SERVICES[0]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || (role !== "admin" && role !== "super-admin")) {
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

  const waiting = queue.filter((t) => t.status === "waiting");
  const serving = queue.find((t) => t.status === "serving");
  const skippedTokens = queue.filter((t) => t.status === "skipped");
  const cancelledTokens = queue.filter((t) => t.status === "cancelled");
  const doneTokens = queue.filter((t) => t.status === "done");

  const totalToday = queue.length;
  const completedToday = doneTokens.length;
  const remainingToday = waiting.length + (serving ? 1 : 0);

  const serviceStats = SERVICES.map((svc) => {
    const count = queue.filter((t) => t.service === svc).length;
    return { service: svc, count };
  });

  async function handleServeNext() {
    const next = waiting[0];
    if (!next) return;
    setBusyId(next.id);
    await setStatus(next.id, "serving");
    setBusyId(null);
  }

  async function handleDone(token) {
    setBusyId(token.id);
    await setStatus(token.id, "done");
    setBusyId(null);
  }

  async function handleSkip(token) {
    setBusyId(token.id);
    await setStatus(token.id, "skipped");
    // ivara wenkota me token eka "waiting" list eken bahi yanawa - eyata passe
    // ilanga kena serve karala ivara unaata passe, "Ayeth Queue Ekata Danna" button
    // eken thamai ithuru wenne
    setBusyId(null);
  }

  async function handleReinsert(token) {
    setBusyId(token.id);
    const currentOrdered = queue.filter((t) => t.status === "waiting" || t.status === "serving");
    await skipAndReinsert(token.id, currentOrdered.length ? currentOrdered : queue);
    setBusyId(null);
  }

  async function handleManualBooking(e) {
    e.preventDefault();
    setManualError("");
    if (!manualName.trim()) {
      setManualError("Please enter customer name.");
      return;
    }
    setManualLoading(true);
    try {
      await bookToken({
        uid: "walk-in-" + Date.now(),
        customerName: manualName.trim(),
        service: manualService,
      });
      setManualName("");
      setManualPhone("");
    } catch (err) {
      setManualError("Failed to add walk-in customer. Please try again.");
    }
    setManualLoading(false);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          salon<span>queue</span>
        </div>
        <div className="who">
          Admin · <strong>{user.displayName || user.email}</strong> ·{" "}
          <a href="#" onClick={logout} style={{ color: "#e4ddc7" }}>
            Log out
          </a>
        </div>
      </div>

      <div className="content">
        <div className="form-row" style={{ background: "#1e293b", color: "#f8fafc", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ width: "100%", marginBottom: "10px", fontWeight: "bold", fontSize: "16px" }}>Today's Statistics & Summary</div>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", width: "100%" }}>
            <div>Total: <strong>{totalToday}</strong></div>
            <div>Completed: <strong>{completedToday}</strong></div>
            <div>Remaining: <strong>{remainingToday}</strong></div>
          </div>
          <div style={{ marginTop: "10px", fontSize: "13px", opacity: 0.8, width: "100%" }}>
            Service Breakdown: {serviceStats.map(s => `${s.service}: ${s.count}`).join(" | ")}
          </div>
        </div>

        <div className="form-row" style={{ background: "#f1e9d8", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ width: "100%", marginBottom: "10px", fontWeight: "bold" }}>Manual Walk-in Booking</div>
          <form onSubmit={handleManualBooking} style={{ display: "flex", gap: "12px", flexWrap: "wrap", width: "100%" }}>
            <input
              type="text"
              placeholder="Customer Name"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              style={{ flex: 1, minWidth: "150px", padding: "8px" }}
              required
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              style={{ flex: 1, minWidth: "130px", padding: "8px" }}
            />
            <select value={manualService} onChange={(e) => setManualService(e.target.value)} style={{ padding: "8px" }}>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn brass" type="submit" disabled={manualLoading} style={{ padding: "8px 16px" }}>
              {manualLoading ? "Adding..." : "Add to Queue"}
            </button>
          </form>
          {manualError && <div className="error-msg" style={{ marginTop: "8px" }}>{manualError}</div>}
        </div>

        {serving ? (
          <div className="ticket-hero">
            <div className="label">Dan Serve Karanne</div>
            <div className="num">#{serving.tokenNumber}</div>
            <div className="status">
              {serving.service} — {serving.customerName}
            </div>
            <div className="actions-row" style={{ marginTop: 18 }}>
              <button className="btn brass" onClick={() => handleDone(serving)} disabled={busyId === serving.id}>
                Ivara Unaa (Done)
              </button>
              <button className="btn rust" onClick={() => handleSkip(serving)} disabled={busyId === serving.id}>
                Skip Karanna
              </button>
            </div>
          </div>
        ) : (
          <div className="form-row">
            <div style={{ flex: 1 }}>
              {waiting.length > 0 ? (
                <>
                  <strong>Next token: #{waiting[0].tokenNumber}</strong> ({waiting[0].service})
                </>
              ) : (
                <span className="empty-note" style={{ padding: 0 }}>No one in the queue.</span>
              )}
            </div>
            {waiting.length > 0 && (
              <button className="btn brass" style={{ width: "auto", padding: "11px 22px" }} onClick={handleServeNext}>
                Start Serving
              </button>
            )}
          </div>
        )}

        {skippedTokens.length > 0 && (
          <>
            <div className="section-title">Skip Unu Kena</div>
            <div className="queue-list">
              {skippedTokens.map((t) => (
                <div className="queue-row" key={t.id}>
                  <div className="n">#{t.tokenNumber}</div>
                  <div className="info">
                    <div className="svc">{t.service}</div>
                    <div className="meta">{t.customerName}</div>
                  </div>
                  <button className="btn small ghost" onClick={() => handleReinsert(t)} disabled={busyId === t.id}>
                    Ayeth Queue Ekata Danna
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="section-title">Balaporottu Waguwa</div>
        <div className="queue-list">
          {waiting.length === 0 && <div className="empty-note">Balaporottu wena kisiveku naha.</div>}
          {waiting.map((t, i) => (
            <div className="queue-row" key={t.id}>
              <div className="n">#{t.tokenNumber}</div>
              <div className="info">
                <div className="svc">{t.service}</div>
                <div className="meta">{t.customerName}</div>
              </div>
              <span className="tag waiting">{i === 0 ? "Ilanga" : `Tana ${i + 1}`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}