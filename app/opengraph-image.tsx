import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Shared social card (applies to every route without its own). Typographic,
// on the Hero palette, with the supplied emblem. Rendered at build time.
export const alt = "Peyman Consulting: Bridging the Gap Between Innovation and Institutional Capital.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const emblem = await readFile(path.join(process.cwd(), "assets/emblem/peyman-emblem.png"));
  const src = `data:image/png;base64,${emblem.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "72px 80px",
          background: "linear-gradient(180deg, #040e23 0%, #05070c 100%)",
          color: "#f4efe4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: "#b8b2a5" }}>PEYMAN CONSULTING</div>
          <div style={{ display: "flex", width: 64, height: 2, background: "#c59655" }} />
          <div style={{ display: "flex", fontSize: 60, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 760 }}>
            Bridging the Gap Between Innovation and Institutional Capital.
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#b8b2a5" }}>Bengaluru, Karnataka</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={300} height={342} alt="" style={{ marginLeft: 40 }} />
      </div>
    ),
    size,
  );
}
