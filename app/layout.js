import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";

export const metadata = {
  title: "Salon Queue",
  description: "Salon booking & queue token system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
