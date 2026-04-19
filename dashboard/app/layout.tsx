import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, sans-serif", margin: 0, background: "#f5f7fb", color: "#111827" }}>
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 80px" }}>{children}</main>
      </body>
    </html>
  );
}
