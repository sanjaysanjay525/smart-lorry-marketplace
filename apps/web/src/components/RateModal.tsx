import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface RateModalProps {
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
  label?: string; // e.g. "Rate the lorry owner" or "Rate the mill owner"
}

export function RateModal({ onClose, onSubmit, label = "Rate this trip" }: RateModalProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (score === 0) {
      setError("Please select a rating");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(score, comment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={label} onClose={onClose}>
      <div className="space-y-4">
        {/* Stars */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`text-3xl transition ${
                n <= score ? "text-turmeric" : "text-charcoal/20"
              } hover:text-turmeric/80`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-charcoal/60">
          {score === 0 ? "Tap a star to rate" : `${score}/5`}
        </p>

        {/* Comment */}
        <textarea
          className="w-full rounded-lg border border-charcoal/20 px-3 py-2 text-sm focus:border-sky focus:outline-none focus:ring-1 focus:ring-sky"
          placeholder="Optional comment…"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        {error && (
          <p className="text-sm text-vermilion">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Submit Rating"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
