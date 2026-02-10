import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface CreatePasswordModalProps {
  open: boolean;
  onSubmit: (password: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function CreatePasswordModal({ open, onSubmit, loading, error }: CreatePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const passwordError =
    password.length > 0 && password.length < 8
      ? "Minimum 8 characters"
      : undefined;

  const confirmError =
    confirm.length > 0 && confirm !== password
      ? "Passwords do not match"
      : undefined;

  const canSubmit =
    password.length >= 8 && password === confirm && agreed && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) onSubmit(password);
  };

  return (
    <Modal open={open} onClose={() => {}} title="Create Your Vault">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-text-caption leading-relaxed">
          This password encrypts your shielded notes locally. It never leaves
          your browser. If you lose it and have no backup, your shielded funds
          cannot be recovered.
        </p>

        <Input
          label="Password"
          type="password"
          placeholder="Enter a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          autoFocus
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirmError}
        />

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-gold"
          />
          <span className="text-xs text-text-caption leading-relaxed">
            I understand that Zylith cannot recover this password. I am
            responsible for backing up my encrypted notes.
          </span>
        </label>

        {error && (
          <p className="text-xs text-signal-error">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={!canSubmit}
          loading={loading}
        >
          Create Vault
        </Button>
      </form>
    </Modal>
  );
}
