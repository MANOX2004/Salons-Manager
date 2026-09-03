"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });

      // Accounts created through this signup form always get role="customer" -
      // admin/super-admin accounts are never created through public signup.
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
        setError("This email is already registered. Try logging in instead.");
      } else {
        setError("Could not create the account. Please try again.");
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
        <p className="sub">Create an account to book an appointment.</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Name</label>
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
          Already have an account? <Link href="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
