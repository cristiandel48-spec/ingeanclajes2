import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import SupabaseGate from "./SupabaseGate.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SupabaseGate>
      <App />
    </SupabaseGate>
  </StrictMode>
);
