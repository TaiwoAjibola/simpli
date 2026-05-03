
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { FirebaseProvider } from "./firebase/provider";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <FirebaseProvider>
    <App />
  </FirebaseProvider>
);
  