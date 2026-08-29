import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amoma",
    short_name: "Amoma",
    description: "A safe, confidential way to report bullying and conflict.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f9fb",
    theme_color: "#6c4fe0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
