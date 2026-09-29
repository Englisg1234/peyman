import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Favicon / app icon from the supplied emblem (no scales variant), on navy.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default async function Icon() {
  const emblem = await readFile(path.join(process.cwd(), "assets/emblem/peyman-emblem.png"));
  const src = `data:image/png;base64,${emblem.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#040e23" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={140} height={160} alt="" />
      </div>
    ),
    size,
  );
}
