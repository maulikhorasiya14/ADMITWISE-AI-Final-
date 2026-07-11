"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bot, Loader2, Send } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { loadProfileFromStorage } from "@/features/profile/profileStorageCore";
import { counsellorQuestionMaxLength, type CounsellorResponse } from "./counsellorTypes";
import { getCounsellorUiState, isQuestionTooLong } from "./counsellorCore";

type ApiResponse =
  | { success: true; data: CounsellorResponse }
  | { success: false; error: { code: string; message: string } };

const suggestedQuestions = [
  "Which of my recommended options is more affordable?",
  "Why is this branch classified as ambitious?",
  "Compare the published fee and placement data for these two options.",
  "Which published scholarships may apply to my profile?",
  "What information is missing for this college?"
] as const;

export function CounsellorClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<CounsellorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const uiState = getCounsellorUiState({ isLoading, answer, error, question });
  const tooLong = isQuestionTooLong(question);
  const remaining = counsellorQuestionMaxLength - question.length;

  const profile = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return loadProfileFromStorage(window.localStorage);
  }, []);

  async function submitQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || isLoading || trimmed.length > counsellorQuestionMaxLength) {
      return;
    }

    setQuestion(trimmed);
    setIsLoading(true);
    setError(null);
    setAnswer(null);

    const response = await fetch("/api/counsellor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: trimmed, profile: profile ?? undefined })
    });
    const payload = (await response.json().catch(() => null)) as ApiResponse | null;

    if (!response.ok || !payload) {
      setError("The counsellor could not answer right now.");
      setIsLoading(false);
      return;
    }

    if (!payload.success) {
      setError(payload.error.message);
      setIsLoading(false);
      return;
    }

    setAnswer(payload.data);
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitQuestion();
        }}
        className="space-y-4 rounded-lg border bg-card p-5 shadow-sm"
      >
        <label className="block">
          <span className="text-sm font-medium">Ask a question</span>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            maxLength={counsellorQuestionMaxLength + 100}
            placeholder="Ask about published recommendations, cutoffs, fees, placements or scholarships"
            className="mt-2 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className={tooLong ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}>
            {tooLong ? "Question is too long." : `${remaining} characters remaining`}
          </p>
          <button
            type="submit"
            disabled={isLoading || !question.trim() || tooLong}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? "Asking..." : "Ask counsellor"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suggested questions</h2>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((item) => (
            <button
              key={item}
              type="button"
              disabled={isLoading}
              onClick={() => void submitQuestion(item)}
              className="rounded-md border px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {uiState === "empty" ? (
        <EmptyState
          title="Ask from published evidence"
          message="The counsellor will answer only from published AdmitWise data and will say when information is missing."
        />
      ) : null}

      {uiState === "loading" ? (
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Building published evidence and asking the provider...
          </p>
        </div>
      ) : null}

      {uiState === "error" ? <ErrorState title="Counsellor error" message={error ?? "Try again."} /> : null}

      {answer ? <AnswerPanel answer={answer} /> : null}
    </div>
  );
}

function AnswerPanel({ answer }: { answer: CounsellorResponse }) {
  const tone =
    answer.status === "configuration_error"
      ? "border-warning/60"
      : answer.status === "insufficient_data"
        ? "border-warning/60"
        : "border-positive/50";

  return (
    <article className={`space-y-5 rounded-lg border ${tone} bg-card p-5 shadow-sm`}>
      <div className="flex items-start gap-3">
        {answer.status === "grounded" ? (
          <Bot className="mt-1 h-5 w-5 text-positive" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-1 h-5 w-5 text-warning" aria-hidden="true" />
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{answer.status.replace("_", " ")}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6">{answer.answer}</p>
        </div>
      </div>

      {answer.evidence.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold">Evidence used</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {answer.evidence.map((item) => (
              <li key={item.sourceId} className="rounded-md border p-3">
                <p className="font-medium">{item.sourceLabel}</p>
                <p className="text-muted-foreground">
                  {item.sourceType}
                  {item.recordYear ? `, ${item.recordYear}` : ""}
                  {item.officialUrl ? `, ${item.officialUrl}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {answer.warnings.length > 0 ? <MessageList title="Warnings" items={answer.warnings} /> : null}
      {answer.missingData.length > 0 ? <MessageList title="Missing data" items={answer.missingData} /> : null}
    </article>
  );
}

function MessageList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
