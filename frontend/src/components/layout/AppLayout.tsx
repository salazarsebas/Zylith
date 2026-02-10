import { Outlet } from "react-router";
import { NavBar } from "./NavBar";
import { SdkInitializer } from "./SdkInitializer";
import { useWalletSync } from "@/hooks/useWalletSync";

export function AppLayout() {
  useWalletSync();

  return (
    <div className="min-h-screen bg-canvas">
      <NavBar />
      <SdkInitializer />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
