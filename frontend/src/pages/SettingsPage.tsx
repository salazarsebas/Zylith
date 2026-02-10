import { useRef } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSdkStore } from "@/stores/sdkStore";
import { useToast } from "@/components/ui/Toast";

export function SettingsPage() {
  const client = useSdkStore((s) => s.client);
  const isInitialized = useSdkStore((s) => s.isInitialized);
  const lock = useSdkStore((s) => s.lock);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <h1 className="text-2xl font-semibold text-text-display">Settings</h1>
      <p className="mt-2 text-text-caption">
        Manage your vault, notes backup, and preferences.
      </p>

      <div className="mt-8 space-y-4">
        {/* Export */}
        <Card className="space-y-3">
          <h2 className="text-base font-medium text-text-heading">Export Backup</h2>
          <p className="text-sm text-text-caption leading-relaxed">
            Download your encrypted notes as a backup file. You will need your
            vault password to restore them.
          </p>
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!isInitialized}
          >
            Export Encrypted Backup
          </Button>
        </Card>

        {/* Import */}
        <Card className="space-y-3">
          <h2 className="text-base font-medium text-text-heading">Import Backup</h2>
          <p className="text-sm text-text-caption leading-relaxed">
            Restore notes from a previously exported backup file. This will
            replace your current notes.
          </p>
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
          >
            Import Backup File
          </Button>
        </Card>

        {/* Lock */}
        <Card className="space-y-3">
          <h2 className="text-base font-medium text-text-heading">Lock Vault</h2>
          <p className="text-sm text-text-caption leading-relaxed">
            Lock your vault to require password re-entry. Your encrypted notes
            remain in local storage.
          </p>
          <Button
            variant="destructive"
            onClick={lock}
            disabled={!isInitialized}
          >
            Lock Vault
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
