import { useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1
    }
  }
};

export function SettingsPage() {
  const client = useSdkStore((s) => s.client);
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const lock = useSdkStore((s) => s.lock);
  const resetVault = useSdkStore((s) => s.resetVault);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = async () => {
    if (!client) return;
    try {
      const noteManager = client.getNoteManager();
      const data = await noteManager.exportEncrypted();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zylith-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      localStorage.setItem("zylith_last_backup", Date.now().toString());
      toast("Backup exported successfully.", "success");
    } catch (err) {
      toast(`Export failed: ${(err as Error).message}`, "error");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Validate it's valid JSON
      JSON.parse(text);
      // Store in localStorage and reload
      localStorage.setItem("zylith_notes", text);
      toast("Backup imported. Please unlock your vault to verify.", "success");
      lock();
    } catch (err) {
      toast(`Import failed: ${(err as Error).message}`, "error");
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <PageContainer size="narrow">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold tracking-tight text-text-display">Settings</h1>
          <p className="mt-2 text-text-caption leading-relaxed">
            Manage your vault, notes backup, and preferences.
          </p>
        </motion.div>

        <div className="mt-8 space-y-4">
          {/* Export */}
          <motion.div variants={itemVariants}>
            <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5 w-full">
              <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#c9a84c_100%)] pointer-events-none" />
              <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

              <div className="relative z-10 bg-[#0a0a0c] backdrop-blur-xl p-6 sm:p-8 rounded-[23px] w-full h-full flex flex-col gap-4">
                <h2 className="text-xl font-bold tracking-tight text-text-display pb-4 border-b border-white/5">Export Backup</h2>
                <div className="rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5">
                  <p className="text-sm text-text-caption leading-relaxed">
                    Download your encrypted notes as a backup file. You will need your
                    vault password to restore them.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  disabled={!isInitialized}
                  className="w-full sm:w-auto mt-2"
                >
                  Export Encrypted Backup
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Import */}
          <motion.div variants={itemVariants}>
            <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5 w-full">
              <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#c9a84c_100%)] pointer-events-none" />
              <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

              <div className="relative z-10 bg-[#0a0a0c] backdrop-blur-xl p-6 sm:p-8 rounded-[23px] w-full h-full flex flex-col gap-4">
                <h2 className="text-xl font-bold tracking-tight text-text-display pb-4 border-b border-white/5">Import Backup</h2>
                <div className="rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5">
                  <p className="text-sm text-text-caption leading-relaxed">
                    Restore notes from a previously exported backup file. This will
                    replace your current notes.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto mt-2"
                >
                  Import Backup File
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Lock */}
          <motion.div variants={itemVariants}>
            <div className="relative group overflow-hidden rounded-[24px] p-[1px] transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/5 w-full">
              <span className="absolute inset-[-1000%] animate-[spin_4s_linear_infinite] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,#c9a84c_100%)] pointer-events-none" />
              <span className="absolute inset-0 rounded-[24px] border border-white/5 transition-opacity duration-300 pointer-events-none group-hover:opacity-0" />

              <div className="relative z-10 bg-[#0a0a0c] backdrop-blur-xl p-6 sm:p-8 rounded-[23px] w-full h-full flex flex-col gap-4">
                <h2 className="text-xl font-bold tracking-tight text-text-display pb-4 border-b border-white/5">Lock Vault</h2>
                <div className="rounded-xl border border-white/5 bg-gradient-to-r from-surface-elevated/80 to-surface/30 p-5">
                  <p className="text-sm text-text-caption leading-relaxed">
                    Lock your vault to require password re-entry. Your encrypted notes
                    remain in local storage.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={lock}
                  disabled={!isInitialized}
                  className="w-full sm:w-auto mt-2"
                >
                  Lock Vault
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Reset Vault */}
          <motion.div variants={itemVariants}>
            <Card className="space-y-4 bg-gradient-to-br from-[#1a0f0f]/80 to-[#0a0a0c]/80 backdrop-blur-3xl border border-red-500/10 hover:border-red-500/30 p-6 sm:p-8 rounded-[24px] shadow-2xl transition-all duration-300">
              <h2 className="text-xl font-bold tracking-tight text-red-500 pb-4 border-b border-red-500/10">Danger Zone</h2>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                <h3 className="text-sm font-bold tracking-widest uppercase text-red-400 mb-2">
                  Reset Vault
                </h3>
                <p className="text-sm text-text-caption leading-relaxed mb-4">
                  Permanently delete all encrypted notes and positions from your
                  vault. This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Reset Vault
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Reset confirmation modal */}
        <Modal
          open={showResetConfirm}
          onClose={() => setShowResetConfirm(false)}
          title="Reset Vault"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-caption">
              Are you absolutely sure you want to reset your vault?
            </p>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm">
              <p className="font-bold tracking-widest uppercase text-red-500 mb-3">This will:</p>
              <ul className="list-disc list-inside space-y-2 text-text-body/80 ml-2">
                <li>Delete all encrypted notes</li>
                <li>Delete all shielded positions</li>
                <li>Clear your vault password</li>
                <li>Reload the page</li>
              </ul>
            </div>
            <p className="text-xs text-text-disabled text-center mt-4">
              You will need to create a new vault and make new deposits to continue
              using Zylith.
            </p>
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={resetVault}
              >
                Reset Vault
              </Button>
            </div>
          </div>
        </Modal>
      </motion.div>
    </PageContainer>
  );
}
