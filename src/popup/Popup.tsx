import { useState } from "react";
import { allPlatforms } from "@/lib/platforms";
import type { PlatformId, PostDraft } from "@/lib/types";

export function Popup() {
  const [text, setText] = useState("");
  const [targets, setTargets] = useState<Set<PlatformId>>(new Set(["x", "threads"]));
  const [busy, setBusy] = useState(false);

  function toggle(id: PlatformId) {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openCompose() {
    setBusy(true);
    const draft: PostDraft = {
      id: crypto.randomUUID(),
      text: text.trim(),
      mediaDataUrls: [],
      targets: [...targets],
      createdAt: Date.now(),
      status: "draft",
    };
    await chrome.runtime.sendMessage({ type: "OPEN_COMPOSE_ALL", draft }).catch(() => {});
    setBusy(false);
  }

  function openSidePanel() {
    chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" }).catch(() => {});
  }

  return (
    <div className="popup">
      <header>
        <strong>Auto-Social</strong>
        <button type="button" onClick={openSidePanel}>Queue</button>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your post…"
        rows={5}
      />

      <div className="targets">
        {allPlatforms.map((p) => (
          <label key={p.meta.id}>
            <input
              type="checkbox"
              checked={targets.has(p.meta.id)}
              onChange={() => toggle(p.meta.id)}
            />
            {p.meta.label}
          </label>
        ))}
      </div>

      <button
        type="button"
        className="primary"
        disabled={busy || !text.trim() || targets.size === 0}
        onClick={openCompose}
      >
        {busy ? "Opening…" : `Open compose on ${targets.size} platform${targets.size === 1 ? "" : "s"}`}
      </button>

      <p className="hint">
        Each platform opens its native compose window pre-filled. You review and post manually.
      </p>
    </div>
  );
}
