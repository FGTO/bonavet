import { ImageResponse } from "next/og";

// iOS ignores SVG for home-screen icons, so render a PNG version of icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#151b31" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M14 33 32 17l18 16v15a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z" fill="#86e0c1" />
          <circle cx="32" cy="38" r="5.5" fill="#ff5858" />
        </svg>
      </div>
    ),
    size,
  );
}
