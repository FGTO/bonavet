import type { MetadataRoute } from "next";

/** Lets the Dashboard be added to a tablet's home screen as a full-screen app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BoNavet",
    short_name: "BoNavet",
    description: "Familjens tavla – kalender, att göra och hemmet.",
    start_url: "/",
    display: "standalone",
    orientation: "landscape",
    background_color: "#f2f2f2",
    theme_color: "#f2f2f2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
