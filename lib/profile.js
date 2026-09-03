import { db, storage, auth } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

// Profile Info (Name, Phone, PhotoURL) update කිරීම
export async function updateUserProfile(uid, { name, phone, photoURL }) {
    const user = auth.currentUser;

    // Firebase Auth Profile update කිරීම
    if (user) {
        await updateProfile(user, {
            displayName: name,
            photoURL: photoURL || user.photoURL,
        });
    }

    // Firestore Customer document එක update කිරීම
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        displayName: name,
        phone: phone,
        photoURL: photoURL || "",
    });
}

// Profile Picture එක Firebase Storage එකට Upload කිරීම
export async function uploadProfilePicture(file, uid) {
    const fileRef = ref(storage, `profile_pictures/${uid}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    return downloadURL;
}

// Password එක වෙනස් කිරීම
export async function changeUserPassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("User not found");

    // ආරක්ෂාව සඳහා කලින් තිබූ පස්වර්ඩ් එක තහවුරු කරගැනීම (Re-authenticate)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // නව පස්වර්ඩ් එක ලබා දීම
    await updatePassword(user, newPassword);
}