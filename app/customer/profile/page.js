"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { updateUserProfile, uploadProfilePicture, changeUserPassword } from "../../../lib/profile";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ProfilePage() {
    const { user } = useAuth();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [imageFile, setImageFile] = useState(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    // Firestore එකෙන් දැනට පවතින Customer details ලබා ගැනීම
    useEffect(() => {
        async function loadUserData() {
            if (!user) return;
            setName(user.displayName || "");
            setPhotoURL(user.photoURL || "");

            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                setPhone(userDoc.data().phone || "");
            }
        }
        loadUserData();
    }, [user]);

    // Profile Info & Picture Update Handler
    async function handleProfileUpdate(e) {
        e.preventDefault();
        setLoading(true);
        setMsg("");
        setError("");

        try {
            let updatedPhotoURL = photoURL;

            // පින්තූරයක් තෝරා ඇත්නම් Upload කිරීම
            if (imageFile) {
                updatedPhotoURL = await uploadProfilePicture(imageFile, user.uid);
                setPhotoURL(updatedPhotoURL);
            }

            await updateUserProfile(user.uid, {
                name,
                phone,
                photoURL: updatedPhotoURL,
            });

            setMsg("Profile updated successfully!");
        } catch (err) {
            setError("Failed to update profile: " + err.message);
        }
        setLoading(false);
    }

    // Password Change Handler
    async function handlePasswordChange(e) {
        e.preventDefault();
        setLoading(true);
        setMsg("");
        setError("");

        try {
            await changeUserPassword(currentPassword, newPassword);
            setMsg("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            setError("Failed to change password: " + err.message);
        }
        setLoading(false);
    }

    return (
        <div style={{ maxWidth: 500, margin: "20px auto", padding: 20, background: "#f1e9d8", borderRadius: 8 }}>
            <h2>Edit Profile</h2>

            {msg && <p style={{ color: "green", fontWeight: "bold" }}>{msg}</p>}
            {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}

            {/* Profile Details Form */}
            <form onSubmit={handleProfileUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ textAlign: "center" }}>
                    {photoURL ? (
                        <img
                            src={photoURL}
                            alt="Profile"
                            style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }}
                        />
                    ) : (
                        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#ccc", margin: "0 auto 10px auto" }} />
                    )}
                    <br />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontWeight: "bold" }}>Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontWeight: "bold" }}>Phone Number:</label>
                    <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </div>

                <button type="submit" disabled={loading} style={{ padding: "10px 15px", cursor: "pointer" }}>
                    {loading ? "Saving..." : "Save Profile"}
                </button>
            </form>

            <hr style={{ margin: "25px 0" }} />

            {/* Password Change Form */}
            <h3>Change Password</h3>
            <form onSubmit={handlePasswordChange} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                    <label style={{ display: "block", fontWeight: "bold" }}>Current Password:</label>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </div>

                <div>
                    <label style={{ display: "block", fontWeight: "bold" }}>New Password:</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </div>

                <button type="submit" disabled={loading} style={{ padding: "10px 15px", cursor: "pointer", backgroundColor: "#333", color: "#fff" }}>
                    {loading ? "Updating..." : "Change Password"}
                </button>
            </form>
        </div>
    );
}