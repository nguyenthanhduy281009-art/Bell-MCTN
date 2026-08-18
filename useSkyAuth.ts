/** Flight Deck Tactile: consistent authenticated loading, presence, and return paths on every game screen. */
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { useLocation } from "wouter";
import { auth, db } from "@/lib/firebase";

export function useSkyAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (requireAuth && !nextUser) navigate("/auth", { replace: true });
      if (!requireAuth && nextUser) navigate("/", { replace: true });
    });
  }, [navigate, requireAuth]);

  useEffect(() => {
    if (!user) return;
    const connected = ref(db, ".info/connected");
    const status = ref(db, `status/${user.uid}`);
    const unsubscribe = onValue(connected, async (snapshot) => {
      if (snapshot.val() !== true) return;
      await onDisconnect(status).set({ state: "offline", last_changed: serverTimestamp() });
      await set(status, { state: "online", last_changed: serverTimestamp() });
    });
    return () => unsubscribe();
  }, [user]);

  return { user, loading };
}

