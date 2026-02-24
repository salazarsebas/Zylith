import { Outlet } from "react-router";
import { NavBar } from "./NavBar";
import { SdkInitializer } from "./SdkInitializer";
import { useWalletSync } from "@/hooks/useWalletSync";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

export function AppLayout() {
  useWalletSync();

  return (
    <div className="relative min-h-screen bg-canvas">
      <InteractiveBackground />
      <div className="relative z-10">
        <NavBar />
        <SdkInitializer />
        <main className="pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
