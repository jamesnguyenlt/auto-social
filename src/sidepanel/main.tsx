import React from "react";
import { createRoot } from "react-dom/client";
import { AutoSocialDock } from "@/ui/components/AutoSocialDock";
import "@/ui/styles/tokens.css";
import "@/ui/styles/glassmorphism.css";
import "@/ui/styles/animations.css";
import "@/ui/components/AutoSocialDock.css";
import "@/ui/components/PlatformDock.css";

// Load Google Font
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
document.head.appendChild(link);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AutoSocialDock />
  </React.StrictMode>,
);