// Instagram has no public web compose URL. Listen for OPEN_COMPOSE messages
// and surface a non-blocking nudge — the user clicks the native "Create" button
// themselves. No automated submit.
import type { PostDraft } from "@/lib/types";

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "OPEN_COMPOSE") nudgeUser(msg.draft as PostDraft);
});

function nudgeUser(draft: PostDraft) {
  console.debug("[auto-social] instagram nudge", draft.id);
  // TODO: render a small floating panel showing draft text + "Copy caption" button.
}

export {};
