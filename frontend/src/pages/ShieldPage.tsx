import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Tabs } from "@/components/ui/Tabs";
import { DepositCard } from "@/components/features/shield/DepositCard";
import { WithdrawCard } from "@/components/features/shield/WithdrawCard";

const tabs = [
  { value: "deposit", label: "Shield" },
  { value: "withdraw", label: "Unshield" },
];

export function ShieldPage() {
  const [activeTab, setActiveTab] = useState("deposit");

  return (
    <PageContainer size="narrow">
      <h1 className="text-2xl font-semibold text-text-display">Shield</h1>
      <p className="mt-2 text-text-caption">
        Move tokens between your public wallet and the privacy pool.
      </p>

      <div className="mt-6">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      <div className="mt-6">
        {activeTab === "deposit" ? <DepositCard /> : <WithdrawCard />}
      </div>
    </PageContainer>
  );
}
