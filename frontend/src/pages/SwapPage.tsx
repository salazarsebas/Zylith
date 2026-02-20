import { PageContainer } from "@/components/layout/PageContainer";
import { SwapCard } from "@/components/features/swap/SwapCard";

export function SwapPage() {
  return (
    <PageContainer size="narrow">
      <h1 className="text-2xl font-semibold text-text-display">Swap</h1>
      <p className="mt-2 text-text-caption">
        Trade tokens on Zylith's CLMM pools. Use shielded mode for private swaps
        or public mode for standard on-chain swaps.
      </p>

      <div className="mt-8">
        <SwapCard />
      </div>
    </PageContainer>
  );
}
