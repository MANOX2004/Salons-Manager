"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { listenQueueToday, setStatus, skipAndReinsert } from "../../lib/queue";

export default function AdminPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState([]);
  const [busyId, setBusyId] = useState(null);

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

  const skippedTokens = queue.filter((t) => t.status === "skipped");

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
                  <strong>Ilanga token eka: #{waiting[0].tokenNumber}</strong> ({waiting[0].service})
                </>
              ) : (
                <span className="empty-note" style={{ padding: 0 }}>Queue eke kisiveku naha.</span>
              )}
            </div>
            {waiting.length > 0 && (
              <button className="btn brass" style={{ width: "auto", padding: "11px 22px" }} onClick={handleServeNext}>
                Serve Karanna Patan Ganna
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
