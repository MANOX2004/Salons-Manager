"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, roleHomePath } from "../lib/AuthContext";

export default function Home() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else {
      router.replace(roleHomePath(role));
    }
  }, [user, role, loading, router]);

  return (
    <div className="page">
      <div className="brand">
        salon<span>queue</span>
      </div>
      <p style={{ color: "#cdd8cf" }}>Loading...</p>
    </div>
  );
}
