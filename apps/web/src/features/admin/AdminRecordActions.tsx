"use client";

import { useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";

type AdminRecordActionsProps = {
  recordId: string;
  canApprove: boolean;
  canPublish: boolean;
  isAdmin: boolean;
  status: string;
};

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

export function AdminRecordActions({ recordId, canApprove, canPublish, isAdmin, status }: AdminRecordActionsProps) {
  const [state, setState] = useState<ActionState>({ message: "", tone: "idle" });
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function runAction(action: "approve" | "reject" | "publish") {
    if (action === "publish" && !window.confirm("Publish this approved staged record to public data?")) {
      return;
    }

    setIsSubmitting(true);
    setState({ message: "", tone: "idle" });

    const response = await fetch(`/api/admin/review/${recordId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "reject" ? { reason } : {})
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      setState({
        message: payload?.error?.message ?? "The action could not be completed.",
        tone: "error"
      });
      setIsSubmitting(false);
      return;
    }

    setState({ message: "Action completed. Refreshing status...", tone: "success" });
    window.location.reload();
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-sm" aria-labelledby="review-actions">
      <div>
        <h2 id="review-actions" className="text-lg font-semibold">
          Review actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Approval and publishing are separate actions. Current status: {status}.</p>
      </div>

      {state.message ? (
        <p className={state.tone === "error" ? "text-sm font-medium text-destructive" : "text-sm font-medium text-positive"}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canApprove || isSubmitting}
          onClick={() => void runAction("approve")}
          className="inline-flex items-center gap-2 rounded-md bg-positive px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Approve
        </button>
        <button
          type="button"
          disabled={!isAdmin || !canPublish || isSubmitting}
          onClick={() => void runAction("publish")}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Publish
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label>
          <span className="text-sm font-medium">Rejection reason</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Required before rejecting"
          />
        </label>
        <button
          type="button"
          disabled={!reason.trim() || isSubmitting}
          onClick={() => void runAction("reject")}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
        >
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Reject
        </button>
      </div>
    </section>
  );
}
