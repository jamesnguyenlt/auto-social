import { allPlatforms } from "@/lib/platforms";

export function Options() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 720 }}>
      <h1>Auto-Social — Options</h1>
      <p>Manage default targets, signatures, and per-platform preferences.</p>

      <h2>Connected Platforms</h2>
      <ul>
        {allPlatforms.map((p) => (
          <li key={p.meta.id}>
            <strong>{p.meta.label}</strong>
            <span style={{ color: "#888", marginLeft: 8 }}>
              {p.meta.supportsText ? "text" : "no-text"}, {p.meta.supportsImage ? "image" : "no-image"}, {p.meta.supportsVideo ? "video" : "no-video"}
            </span>
          </li>
        ))}
      </ul>

      <p style={{ color: "#888", fontSize: 13 }}>
        This extension does not auto-submit on any platform. It pre-fills compose UIs only.
      </p>
    </main>
  );
}
