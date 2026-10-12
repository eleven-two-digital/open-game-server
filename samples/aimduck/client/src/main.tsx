// SPDX-License-Identifier: Apache-2.0

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./components/design-system/foundation/tokens.css";
import "./styles.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("Client application root is missing from index.html.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
