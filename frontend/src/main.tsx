import "@/polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StarknetProvider } from "@/providers/StarknetProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { App } from "@/App";
import "@/styles/fonts.css";
import "@/styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StarknetProvider>
      <QueryProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryProvider>
    </StarknetProvider>
  </StrictMode>
);
