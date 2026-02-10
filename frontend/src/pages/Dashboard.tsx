import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldIcon } from "@/components/ui/ShieldIcon";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { useSdkStore } from "@/stores/sdkStore";
import { getTokenSymbol, TESTNET_TOKENS } from "@/config/tokens";
import { formatTokenAmount } from "@/lib/format";

export function Dashboard() {
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const balances = useSdkStore((s) => s.balances);
  const unspentPositions = useSdkStore((s) => s.unspentPositions);

  const tokenEntries = Object.entries(balances).filter(([, amt]) => amt > 0n);

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold text-text-display">Dashboard</h1>
      <p className="mt-2 text-text-caption">Portfolio overview and shielded balances.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {/* Shielded Balance */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <ShieldIcon size={16} className="text-gold" />
            <p className="text-sm font-medium text-text-caption">Shielded Balance</p>
          </div>
          {!isInitialized ? (
            <p className="text-sm text-text-disabled">Unlock vault to view balances.</p>
          ) : tokenEntries.length === 0 ? (
            <p className="text-sm text-text-disabled">No shielded tokens yet.</p>
          ) : (
            <div className="space-y-3">
              {tokenEntries.map(([token, amount]) => {
                const decimals = TESTNET_TOKENS.find(
                  (t) => t.address.toLowerCase() === token.toLowerCase()
                )?.decimals ?? 18;
                return (
                  <div key={token} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon address={token} size="sm" />
                      <span className="text-sm text-text-heading">
                        {getTokenSymbol(token)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-text-display">
                      {formatTokenAmount(amount, decimals)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Positions */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text-caption">Shielded Positions</p>
            <Badge variant={unspentPositions.length > 0 ? "gold" : "default"}>
              {unspentPositions.length}
            </Badge>
          </div>
          {!isInitialized ? (
            <p className="text-sm text-text-disabled">Unlock vault to view positions.</p>
          ) : unspentPositions.length === 0 ? (
            <p className="text-sm text-text-disabled">No active positions.</p>
          ) : (
            <div className="space-y-2">
              {unspentPositions.map((pos) => (
                <div
                  key={pos.commitment}
                  className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-text-caption">
                      Range: [{pos.tickLower}, {pos.tickUpper}]
                    </p>
                  </div>
                  <span className="text-xs font-medium text-text-body">
                    Liq: {pos.liquidity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
