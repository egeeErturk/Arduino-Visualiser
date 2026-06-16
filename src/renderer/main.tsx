import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "reactflow/dist/style.css";

const App = React.lazy(() => import("./App"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{ padding: "2rem", fontFamily: "\"Segoe UI\", sans-serif" }}>Loading Arduino Circuit Visualizer...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
);
