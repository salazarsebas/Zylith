import { PageContainer } from "@/components/layout/PageContainer";
import { SwapCard } from "@/components/features/swap/SwapCard";

export function SwapPage() {
  return (
    <PageContainer size="narrow">
      <h1 className="text-2xl font-semibold text-text-display">Shielded Swap</h1>
      <p className="mt-2 text-text-caption">
        Swap tokens privately with zero-knowledge proofs.
      </p>

      <div className="mt-8">
        <SwapCard />
      </div>
    </PageContainer>
  );
}
