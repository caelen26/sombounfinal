import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Somboun June",
    short_name: "Somboun June",
    description: "Premium skincare and laser treatments by Somboun June, Winnipeg.",
    start_url: "/",
    display: "browser",
    background_color: "#f4efe7",
    theme_color: "#f4efe7",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
