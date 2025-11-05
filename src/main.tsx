import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import i18n from "./lib/i18n";
import { CurrencyProvider } from "./contexts/CurrencyContext";

// Wait for i18n to initialize before rendering
i18n.on('initialized', () => {
  renderApp();
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

// Set initial lang attribute
document.documentElement.lang = i18n.language || 'en';

// If already initialized, render immediately
if (i18n.isInitialized) {
  renderApp();
}

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <CurrencyProvider>
      <App />
    </CurrencyProvider>
  );
}
