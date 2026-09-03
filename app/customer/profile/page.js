"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/AuthContext";
import { db, auth } from "../../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function ProfilePage() {
    const { user, role, loading, logout } = useAuth();
    const router = useRouter();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [profileMsg, setProfileMsg] = useState("");
    const [profileError, setProfileError] = useState("");
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user || role !== "customer") {
            router.replace("/login");
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        async function loadUserData() {
            if (!user) return;
            setName(user.displayName || "");

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setPhone(data.phone || "");
                    if (data.photoURL) {
                        setPhotoURL(data.photoURL);
                    }
                }
            } catch (e) {
                console.error("Error fetching profile details:", e);
            }
        }
        loadUserData();
    }, [user]);

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    async function handleProfileUpdate(e) {
        e.preventDefault();
        setUpdating(true);
        setProfileMsg("");
        setProfileError("");

        try {
            let updatedPhotoURL = photoURL;

            if (imageFile) {
                if (imageFile.size > 800 * 1024) {
                    throw new Error("Image size is too large. Please select an image under 800KB.");
                }
                updatedPhotoURL = await convertToBase64(imageFile);
                setPhotoURL(updatedPhotoURL);
            }

            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName: name,
                phone: phone,
                photoURL: updatedPhotoURL,
            });

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName: name,
                });
            }

            if (currentPassword && newPassword) {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);
                await updatePassword(auth.currentUser, newPassword);
                setCurrentPassword("");
                setNewPassword("");
            }

            setProfileMsg("Profile updated successfully!");
        } catch (err) {
            setProfileError("Update failed: " + err.message);
        }
        setUpdating(false);
    }

    if (loading || !user) {
        return (
            <div className="shell">
                <p style={{ color: "#cdd8cf", padding: 20 }}>Loading...</p>
            </div>
        );
    }

    return (
        <div className="shell">
            {/* Topbar with exact center alignment */}
            <div
                className="topbar"
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    padding: "12px 16px",
                }}
            >
                {/* Compact Back Button */}
                <button
                    onClick={() => router.push("/customer")}
                    style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(228, 221, 199, 0.3)",
                        color: "#e4ddc7",
                        fontSize: 13,
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        borderRadius: 6,
                        justifySelf: "start",
                        transition: "all 0.2s ease",
                    }}
                >
                    ‹ Back
                </button>

                {/* Centered Brand Title */}
                <div className="brand" style={{ marginBottom: 0, textAlign: "center" }}>
                    Profile <span>Settings</span>
                </div>

                {/* Empty Spacer to balance the grid */}
                <div></div>
            </div>

            <div className="content">
                <div style={{ background: "#f1e9d8", padding: 25, borderRadius: 8, color: "#1a3019" }}>
                    {/* Centered Form Title */}
                    <h2 style={{ marginTop: 0, marginBottom: 20, textAlign: "center" }}>Edit Profile</h2>

                    {profileMsg && <div style={{ color: "green", marginBottom: 10, fontWeight: "bold", textAlign: "center" }}>{profileMsg}</div>}
                    {profileError && <div style={{ color: "red", marginBottom: 10, fontWeight: "bold", textAlign: "center" }}>{profileError}</div>}

                    <form onSubmit={handleProfileUpdate} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                        {/* Avatar Preview */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                            {photoURL ? (
                                <img
                                    src={photoURL}
                                    alt="Profile"
                                    style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "2px solid #2b5329" }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: 90,
                                        height: 90,
                                        borderRadius: "50%",
                                        background: "#4a5568",
                                        color: "#fff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 32,
                                        fontWeight: "bold",
                                        border: "2px solid #2b5329",
                                    }}
                                >
                                    {name ? name.charAt(0).toUpperCase() : "U"}
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ fontSize: 13 }} />
                        </div>

                        <div>
                            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Phone Number</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
                            />
                        </div>

                        <hr style={{ border: "0.5px solid #d1c7b7", margin: "10px 0" }} />
                        <h4 style={{ margin: 0 }}>Change Password (Optional)</h4>

                        <div>
                            <label style={{ fontSize: 13, display: "block", marginBottom: 5 }}>Current Password</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: 13, display: "block", marginBottom: 5 }}>New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc" }}
                            />
                        </div>

                        {/* Save Changes Button */}
                        <button
                            type="submit"
                            disabled={updating}
                            style={{
                                padding: "12px",
                                backgroundColor: "#2b5329",
                                color: "#fff",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: 15,
                                marginTop: 10,
                            }}
                        >
                            {updating ? "Saving..." : "Save Changes"}
                        </button>
                    </form>

                    <hr style={{ border: "0.5px solid #d1c7b7", margin: "25px 0 15px 0" }} />

                    {/* Red Log Out Button */}
                    <button
                        onClick={() => logout()}
                        style={{
                            width: "100%",
                            padding: "12px",
                            backgroundColor: "#d9534f",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: 15,
                        }}
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}