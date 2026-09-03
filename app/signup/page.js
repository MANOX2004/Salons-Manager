"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password eke akuru 6 ho eyata wada thiyenna one.");
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });

      // Signup form eken hadana account ekata role="customer" widiyata thamai
      // auto set wenne - admin/super-admin account public signup eken hadanne nathi nisa
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        phone,
        email: email.trim(),
        role: "customer",
        createdAt: serverTimestamp(),
      });

      router.replace("/customer");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Me email eka dan register wela thiyenawa. Login karanna try karanna.");
      } else {
        setError("Account eka hadanna baruna. Ayeth try karanna.");
      }
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="brand">
        salon<span>queue</span>
      </div>
      <div className="card">
        <h1>Sign up</h1>
        <p className="sub">Appointment book karanna account ekak hadaganna.</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nama</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Phone number</label>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating..." : "Sign up"}
          </button>
        </form>
        <div className="link-row">
          Account eka dan thiyenawa nam <a href="/login">Login karanna</a>
        </div>
      </div>
    </div>
  );
}
