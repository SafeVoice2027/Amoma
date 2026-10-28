"use client";

import { useEffect } from "react";

// The service worker only helps in production, where build files have
// content-hashed names. In development those names never change, so a
// cache-first worker keeps serving old code — there it is removed (along with
// anything it cached) instead of registered.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      if ("caches" in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
  }, []);

  return null;
}
