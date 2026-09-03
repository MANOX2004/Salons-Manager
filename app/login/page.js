"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        setError("Account ekata role ekak set wela naha. Super-admin kenekuta call karanna.");
        setBusy(false);
        return;
      }
      router.replace(roleHomePath(role));
    } catch (err) {
      setError("Email eka ho password eka wenas wela thiyanawa. Ayeth try karanna.");
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">
        salon<span>queue</span>
      </div>
      <div className="card">
        <h1>Login</h1>
        <p className="sub">Account ekata email saha password eka danna.</p>
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
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>
        <div className="link-row">
          Account ekak nathnam <a href="/signup">Sign up karanna</a>
        </div>
      </div>
    </div>
  );
}
