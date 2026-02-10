import { NavLink } from "react-router";
import { cn } from "@/lib/cn";
import { ConnectButton } from "@/components/features/wallet/ConnectButton";

const navLinks = [
  { to: "/app", label: "Dashboard", end: true },
  { to: "/app/swap", label: "Swap" },
  { to: "/app/shield", label: "Shield" },
  { to: "/app/pool", label: "Pool" },
  { to: "/app/positions", label: "Positions" },
];

export function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <NavLink to="/" className="text-lg font-semibold text-text-display tracking-tight">
          Zylith
        </NavLink>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "text-text-display"
                    : "text-text-caption hover:text-text-body"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gold rounded-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
