import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cockpit — Running Training",
    short_name: "Cockpit",
    description: "Training cockpit for the Amazing Thailand Half Marathon and BYD Singapore Marathon.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0c0f13",
    theme_color: "#e2472a",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
