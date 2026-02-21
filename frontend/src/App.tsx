import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/LandingPage";
import { Dashboard } from "@/pages/Dashboard";
import { SwapPage } from "@/pages/SwapPage";
import { ShieldPage } from "@/pages/ShieldPage";
import { PoolBrowser } from "@/pages/PoolBrowser";
import { LiquidityPage } from "@/pages/LiquidityPage";
import { PositionsPage } from "@/pages/PositionsPage";
import { SettingsPage } from "@/pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "swap", element: <SwapPage /> },
      { path: "shield", element: <ShieldPage /> },
      { path: "liquidity", element: <LiquidityPage /> },
      { path: "pool", element: <PoolBrowser /> },
      { path: "positions", element: <PositionsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
