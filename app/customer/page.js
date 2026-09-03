"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";
import { bookToken, listenQueueToday, cancelToken } from "../../lib/queue";
import { db, auth } from "../../lib/firebase";
import { doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function CustomerPage() {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();

  const [queue, setQueue] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [booking, setBooking] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState("");

  // Profile Edit Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || role !== "customer") {
      router.replace("/login");
    }
  }, [user, role, loading, router]);

  // Firestore වෙතින් Customer Details Load කිරීම
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
        console.error("Error loading user data:", e);
      }
    }
    loadUserData();
  }, [user]);

  // Services Listeners
  useEffect(() => {
    const unsubServices = onSnapshot(doc(db, "settings", "services"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().items) {
        setServicesList(docSnap.data().items);
      } else {
        setServicesList([
          { name: "Hair Cut", price: 1000 },
          { name: "Shave", price: 500 },
          { name: "Hair Colour", price: 2500 },
          { name: "Facial", price: 3000 },
          { name: "Hair Wash", price: 800 },
        ]);
      }
    });

    return () => unsubServices();
  }, []);

  // Queue Listeners
  useEffect(() => {
    const unsub = listenQueueToday(setQueue);
    return () => unsub();
  }, []);

  // File එක Base64 Text එකක් බවට හරවන Function එක
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  if (loading || !user) {
    return (
      <div className="page">
        <p style={{ color: "#cdd8cf" }}>Loading...</p>
      </div>
    );
  }

  const waitingOrServingQueue = queue.filter(
    (t) => t.status === "waiting" || t.status === "serving" || t.status === "skipped"
  );

  const myTokensToday = queue.filter((t) => t.customerUid === user.uid);
  const myActiveToken = myTokensToday.find(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ) || null;

  const myPosition = myActiveToken
    ? waitingOrServingQueue.findIndex((t) => t.id === myActiveToken.id) + 1
    : null;
  const servingToken = waitingOrServingQueue.find((t) => t.status === "serving");

  const handleServiceChange = (serviceName) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter((item) => item !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const totalPrice = selectedServices.reduce((total, serviceName) => {
    const item = servicesList.find((s) => s.name === serviceName);
    return total + (item ? item.price : 0);
  }, 0);

  async function handleBook(e) {
    e.preventDefault();
    setError("");

    const existingValidToken = myTokensToday.find((t) => t.status !== "cancelled");
    if (existingValidToken) {
      setError("You have already booked an appointment for today. Only 1 appointment per day is allowed.");
      return;
    }

    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setBooking(true);
    try {
      await bookToken({
        uid: user.uid,
        customerName: name || user.displayName || user.email,
        customerPhotoURL: photoURL || "", // Booking එක කරන අවස්ථාවේ Profile Pic එක යවයි
        service: selectedServices.join(", "),
        totalPrice: totalPrice,
      });
      setSelectedServices([]);
    } catch (err) {
      setError("Could not book the appointment. Please try again.");
    }
    setBooking(false);
  }

  async function handleCancel() {
    if (!myActiveToken) return;

    const confirmed = window.confirm("Are you sure you want to cancel this appointment?");
    if (!confirmed) return;

    setCanceling(true);
    setError("");
    try {
      await cancelToken(myActiveToken.id);
    } catch (err) {
      setError("Could not cancel appointment. Please try again.");
    }
    setCanceling(false);
  }

  // Base64 හරහා Profile Update කිරීම
  async function handleProfileUpdate(e) {
    e.preventDefault();
    setUpdatingProfile(true);
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

      // 1. Firestore update
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: name,
        phone: phone,
        photoURL: updatedPhotoURL,
      });

      // 2. Firebase Auth update
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: name,
        });
      }

      // 3. Password Update (Optional)
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
    setUpdatingProfile(false);
  }

  return (
    <div className="shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="brand" style={{ marginBottom: 0 }}>
          salon<span>queue</span>
        </div>
        <div className="who" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile"
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ccc" }} />
          )}
          <strong>{name || user.displayName || user.email}</strong>
          <button
            onClick={() => setShowProfileModal(true)}
            style={{ background: "#4a5568", color: "#fff", border: "none", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
          >
            Edit Profile
          </button>
          ·{" "}
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

            <div className="status" style={{ marginBottom: 10 }}>
              <strong>Services:</strong> {myActiveToken.service} <br />
              <strong>Total Cost:</strong> Rs. {myActiveToken.totalPrice || 0}
            </div>

            <div className="status">
              {myActiveToken.status === "serving"
                ? "It's your turn - please go to the counter"
                : myActiveToken.status === "skipped"
                  ? "You were skipped, but you've been placed back in the queue right after the next person"
                  : servingToken
                    ? `Now serving #${servingToken.tokenNumber}. Your position in queue: ${myPosition}`
                    : `Your position in queue: ${myPosition}`}
            </div>

            <button
              onClick={handleCancel}
              disabled={canceling}
              className="btn"
              style={{
                marginTop: 15,
                backgroundColor: "#d9534f",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {canceling ? "Cancelling..." : "Cancel Appointment"}
            </button>
          </div>
        ) : (
          <div className="form-row" style={{ background: "#f1e9d8", padding: 20, borderRadius: 8 }}>
            <form onSubmit={handleBook} style={{ display: "flex", flexDirection: "column", gap: 15, width: "100%" }}>
              <label style={{ fontWeight: "bold" }}>Select Services:</label>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {servicesList.map((s) => (
                  <label key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.name)}
                      onChange={() => handleServiceChange(s.name)}
                    />
                    <span>{s.name} - <strong>Rs. {s.price}</strong></span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 5, fontSize: "1.1em", fontWeight: "bold" }}>
                Total Price: <span style={{ color: "#2b5329" }}>Rs. {totalPrice}</span>
              </div>

              <button className="btn brass" type="submit" disabled={booking} style={{ width: "fit-content", padding: "11px 22px" }}>
                {booking ? "Booking..." : "Book Appointment"}
              </button>
            </form>
          </div>
        )}

        {error && <div className="error-msg" style={{ marginTop: 14 }}>{error}</div>}

        <div className="section-title" style={{ marginTop: 25 }}>Today&apos;s Queue</div>
        <div className="queue-list">
          {queue.length === 0 && <div className="empty-note">No one in the queue yet.</div>}
          {queue.map((t) => (
            <div
              className={`queue-row ${t.customerUid === user.uid ? "me" : ""}`}
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 12, opacity: t.status === "cancelled" ? 0.85 : 1 }}
            >
              {/* Profile Picture (First Position) */}
              {t.customerPhotoURL ? (
                <img
                  src={t.customerPhotoURL}
                  alt={t.customerName}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#cbd5e1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  {t.customerName ? t.customerName.charAt(0).toUpperCase() : "U"}
                </div>
              )}

              {/* Token Number (Second Position) */}
              <div className="n">#{t.tokenNumber}</div>

              {/* Info Section */}
              <div className="info" style={{ flex: 1 }}>
                <div className="svc" style={t.status === "cancelled" ? { textDecoration: "line-through", color: "#888" } : {}}>
                  {t.service}
                </div>
                <div className="meta">
                  {t.customerName} {t.totalPrice ? `(Rs. ${t.totalPrice})` : ""}
                </div>
              </div>

              {/* Status Tag */}
              {t.status === "cancelled" ? (
                <span
                  style={{
                    backgroundColor: "#d9534f",
                    color: "#ffffff",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  Cancelled
                </span>
              ) : (
                <span className={`tag ${t.status}`}>
                  {t.status === "waiting" && "Waiting"}
                  {t.status === "serving" && "Now Serving"}
                  {t.status === "skipped" && "Skipped"}
                  {t.status === "done" && "Done"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: 25, borderRadius: 8, maxWidth: 450, width: "90%", maxHeight: "90vh", overflowY: "auto", color: "#333" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h3 style={{ margin: 0 }}>Edit Profile</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {profileMsg && <p style={{ color: "green", fontSize: 14 }}>{profileMsg}</p>}
            {profileError && <p style={{ color: "red", fontSize: 14 }}>{profileError}</p>}

            <form onSubmit={handleProfileUpdate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                {photoURL ? (
                  <img src={photoURL} alt="Profile" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", margin: "0 auto" }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#ccc", margin: "0 auto" }} />
                )}
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginTop: 8, fontSize: 12 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: "bold" }}>Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%", padding: 8, marginTop: 2 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: "bold" }}>Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: "100%", padding: 8, marginTop: 2 }} />
              </div>

              <hr style={{ margin: "10px 0" }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: "bold" }}>Change Password (Optional)</p>

              <div>
                <label style={{ fontSize: 12 }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 2 }} />
              </div>

              <div>
                <label style={{ fontSize: 12 }}>New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 2 }} />
              </div>

              <button type="submit" disabled={updatingProfile} style={{ padding: 10, backgroundColor: "#2b5329", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", marginTop: 10 }}>
                {updatingProfile ? "Updating..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}