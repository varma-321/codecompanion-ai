import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("Vite main.tsx is executing!");

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js")
    .then((reg) => console.log("SW registered:", reg))
    .catch((err) => console.error("SW registration failed:", err));
}
