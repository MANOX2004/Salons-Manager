"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, onSnapshot, query, setDoc, serverTimestamp, where } from "firebase/firestore";
import { useAuth } from "../../lib/AuthContext";
import { db, getSecondaryAuth } from "../../lib/firebase";

export default function SuperAdminPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "super-admin") {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const unsub = onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (loading || !user) {
    return (
      <div className="page">
        <p style={{ color: "#cdd8cf" }}>Loading...</p>
      </div>
    );
  }

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setError("");
    setOkMsg("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      // Uses a secondary Firebase app instance to create the new admin
      // account, so your own (super-admin) login session isn't replaced.
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);

      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email: email.trim(),
        role: "admin",
        createdAt: serverTimestamp(),
      });

      await signOut(secondaryAuth);

      setOkMsg(`Admin account created (${email}). Share the login details with the salon owner.`);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use.");
      } else {
        setError("Could not create the admin account.");
      }
    }
    setBusy(false);
  }

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          salon<span>queue</span>
        </div>
        <div className="who">
          Super-admin · <strong>{user.displayName || user.email}</strong> ·{" "}
          <a href="#" onClick={logout} style={{ color: "#e4ddc7" }}>
            Log out
          </a>
        </div>
      </div>

      <div className="content">
        <div className="section-title">Create a New Admin (Salon Owner)</div>
        {error && <div className="error-msg">{error}</div>}
        {okMsg && (
          <div className="error-msg" style={{ background: "#dcecdf", color: "#1f3a2e", borderColor: "#b6d6bc" }}>
            {okMsg}
          </div>
        )}
        <form onSubmit={handleCreateAdmin} className="form-row" style={{ flexWrap: "wrap" }}>
          <div className="field">
            <label>Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Password (temporary)</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn brass" type="submit" disabled={busy} style={{ width: "auto", padding: "11px 22px" }}>
            {busy ? "Creating..." : "Create Admin"}
          </button>
        </form>

        <div className="section-title">Current Admins</div>
        <div className="queue-list">
          {admins.length === 0 && <div className="empty-note">No admins yet.</div>}
          {admins.map((a) => (
            <div className="queue-row" key={a.id}>
              <div className="info">
                <div className="svc">{a.name}</div>
                <div className="meta">{a.email}</div>
              </div>
              <span className="tag serving">Admin</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
