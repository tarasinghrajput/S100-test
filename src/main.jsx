import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./routes/AppLayout.jsx";
import BuilderPage from "./routes/BuilderPage.jsx";
import PortfolioPage from "./routes/PortfolioPage.jsx";
import AccountPage from "./routes/AccountPage.jsx";
import NotFoundPage from "./routes/NotFoundPage.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<BuilderPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/portfolio/:handle" element={<PortfolioPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
