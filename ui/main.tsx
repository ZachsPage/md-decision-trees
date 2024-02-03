import "./styles.css";
import ReactDOM from "react-dom/client";
import App from "./App";

// <React.StrictMode> was causing Canvas :: useEffect to be called twice...
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />
);
