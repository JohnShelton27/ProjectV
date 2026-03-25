"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker({ listingSlug }: { listingSlug?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        listingSlug,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [pathname, listingSlug]);

  return null;
}
