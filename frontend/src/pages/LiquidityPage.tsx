import { PageContainer } from "@/components/layout/PageContainer";
import { AddLiquidityCard } from "@/components/features/liquidity/AddLiquidityCard";
import { BalanceDisplay } from "@/components/features/shared/BalanceDisplay";

export function LiquidityPage() {
  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-text-display">Add Liquidity</h1>
      <p className="mt-2 text-text-caption">
        Become a private liquidity provider. Add liquidity using your shielded notes and earn fees without revealing your position size.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AddLiquidityCard />
        </div>
        <div>
          <BalanceDisplay />
        </div>
      </div>
    </PageContainer>
  );
}
