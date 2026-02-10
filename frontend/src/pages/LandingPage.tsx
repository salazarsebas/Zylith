import { Link } from "react-router";
import { ShieldIcon } from "@/components/ui/ShieldIcon";

const features = [
  {
    title: "Shielded Swaps",
    description:
      "Swap tokens privately using zero-knowledge proofs. No one can see what you trade or how much.",
  },
  {
    title: "Concentrated Liquidity",
    description:
      "Provide liquidity in custom price ranges for maximum capital efficiency, all within the privacy pool.",
  },
  {
    title: "Zero-Knowledge Proofs",
    description:
      "Groth16 proofs verified on-chain via Garaga BN254 pairing. Your transactions are mathematically private.",
  },
  {
    title: "Built on Starknet",
    description:
      "Cairo smart contracts with Poseidon commitments, Merkle trees, and battle-tested cryptographic primitives.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold text-text-display tracking-tight">
          Zylith
        </span>
        <Link
          to="/app"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-body transition-colors hover:border-gold/30 hover:text-text-heading"
        >
          Launch App
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-20 text-center">
        <div className="mb-6 flex justify-center">
          <ShieldIcon size={40} className="text-gold" />
        </div>
        <h1 className="text-5xl font-semibold text-text-display tracking-tight leading-[1.15] md:text-6xl">
          Shielded Liquidity
          <br />
          <span className="text-gold">for Bitcoin on Starknet</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg text-text-body leading-relaxed">
          The first concentrated liquidity market maker with zero-knowledge
          privacy. Swap, provide liquidity, and earn fees — all shielded.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/app"
            className="inline-flex items-center rounded-lg bg-gold px-6 py-3 text-sm font-semibold text-canvas transition-colors hover:bg-gold-muted"
          >
            Launch App
          </Link>
          <a
            href="https://github.com/zylith-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-body transition-colors hover:border-text-caption hover:text-text-heading"
          >
            GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-surface p-6"
            >
              <h3 className="text-base font-medium text-text-heading">{f.title}</h3>
              <p className="mt-2 text-sm text-text-caption leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-text-caption">
        Zylith Protocol — Shielded CLMM for Bitcoin on Starknet
      </footer>
    </div>
  );
}
