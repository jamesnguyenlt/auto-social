import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import type { PostDraft } from "@/lib/types";

export function SidePanel() {
  const [drafts, setDrafts] = useState<PostDraft[]>([]);

  useEffect(() => {
    storage.listDrafts().then(setDrafts);
    const onChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ("drafts" in changes) storage.listDrafts().then(setDrafts);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return (
    <main style={{ padding: 12, fontFamily: "system-ui" }}>
      <h2 style={{ margin: "0 0 12px" }}>Queue</h2>
      {drafts.length === 0 ? (
        <p style={{ color: "#888" }}>No drafts yet. Create one from the popup.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {drafts.map((d) => (
            <li key={d.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 8 }}>
              <div style={{ fontSize: 12, color: "#888" }}>
                {new Date(d.createdAt).toLocaleString()} · {d.targets.join(", ")} · {d.status}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{d.text}</div>
              <button
                type="button"
                style={{ marginTop: 6 }}
                onClick={() => storage.deleteDraft(d.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
