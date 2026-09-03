"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { roleHomePath } from "../../lib/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const role = snap.exists() ? snap.data().role : null;
      if (!role) {
        setError("This account has no role set yet. Please contact a super-admin.");
        setBusy(false);
        return;
      }
      router.replace(roleHomePath(role));
    } catch (err) {
      setError("Incorrect email or password. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">
        Salon<span>Yasi</span>
      </div>
      <div className="card">
        <h1>Log in</h1>
        <p className="sub">Enter your email and password to continue.</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Logging in..." : "Log in"}
          </button>
        </form>
        <div className="link-row">
          Don&apos;t have an account? <Link href="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
