import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "@/index.css";

const Control = lazy(() => import("@/routes/Control"));
const Display = lazy(() => import("@/routes/Display"));

const router = createBrowserRouter(
  [
    { path: "/", element: <Control /> },
    { path: "/projecao", element: <Display /> },
    { path: "*", element: <Control /> },
  ],
  // Sob um base path (ex: GitHub Pages em /repo/), as rotas continuam "/" e "/projecao".
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <RouterProvider router={router} />
    </Suspense>
  </StrictMode>,
);
