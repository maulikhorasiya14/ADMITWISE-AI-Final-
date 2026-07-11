"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { AlertTriangle, Bot, Loader2, Send, Trash2, ChevronRight, X } from "lucide-react";
import { loadProfileFromStorage } from "@/features/profile/profileStorageCore";
import { loadChat, saveChat, clearChat } from "./chatStore";
import { counsellorQuestionMaxLength, type ChatMessage, type StreamChunk, type EvidenceReference } from "./counsellorTypes";
import { isQuestionTooLong } from "./counsellorCore";

const suggestedQuestions = [
  "Which of my recommended options is more affordable?",
  "Why is this branch classified as ambitious?",
  "Compare the published fee and placement data for these two options.",
  "Which published scholarships may apply to my profile?",
  "What information is missing for this college?"
];

// Helper to read SSE stream on client side
async function* readCounsellorStream(response: Response): AsyncGenerator<StreamChunk> {
  if (!response.body) {
    yield { type: "error", message: "No response body from server." };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr) as StreamChunk;
          yield chunk;
        } catch {
          // malformed chunk — ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function CounsellorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceReference[] | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadChat());
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      saveChat(messages);
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const [profile, setProfile] = useState<ReturnType<typeof loadProfileFromStorage>>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfileFromStorage(window.localStorage));
    setIsProfileLoaded(true);
  }, []);

  const handleClear = () => {
    clearChat();
    setMessages([]);
    setSelectedEvidence(null);
  };

  const tooLong = isQuestionTooLong(question);
  const remaining = counsellorQuestionMaxLength - question.length;

  async function submitQuestion(q: string) {
    const trimmed = q.trim();
    if (!trimmed || isStreaming || trimmed.length > counsellorQuestionMaxLength) return;

    setQuestion("");
    setIsStreaming(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed,
      evidence: [],
      warnings: [],
      missingData: [],
      timestamp: Date.now()
    };

    const aiMessageId = (Date.now() + 1).toString();
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      evidence: [],
      warnings: [],
      missingData: [],
      status: "streaming",
      timestamp: Date.now() + 1
    };

    const newMessages = [...messages, userMessage, initialAiMessage];
    setMessages(newMessages);

    try {
      // Send last 10 messages as history
      const historyToSend = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/counsellor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, profile: profile ?? undefined, history: historyToSend })
      });

      if (!response.ok) throw new Error("Server response was not ok");

      let currentContent = "";
      let currentEvidence: EvidenceReference[] = [];
      let currentWarnings: string[] = [];
      let currentMissingData: string[] = [];
      let currentStatus: ChatMessage["status"] = "streaming";

      const streamGen = readCounsellorStream(response);
      for await (const chunk of streamGen) {
        if (chunk.type === "text") {
          currentContent += chunk.content;
        } else if (chunk.type === "evidence") {
          currentEvidence = chunk.data;
        } else if (chunk.type === "meta") {
          currentWarnings = chunk.warnings;
          currentMissingData = chunk.missingData;
          currentStatus = chunk.status as ChatMessage["status"];
        } else if (chunk.type === "error") {
          currentStatus = "error";
          currentWarnings = [chunk.message];
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content: currentContent,
                  evidence: currentEvidence,
                  warnings: currentWarnings,
                  missingData: currentMissingData,
                  status: chunk.type === "done" ? currentStatus : "streaming"
                }
              : m
          )
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, status: "error", warnings: ["Connection lost."] }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  const hasMessages = messages.length > 0;

  if (!isProfileLoaded) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-card text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 rounded-lg border bg-card p-6 text-center shadow-sm">
        <Bot className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Profile Required</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The AI Counsellor needs your academic profile to provide personalized and grounded recommendations. 
          Please create your profile first.
        </p>
        <a href="/profile" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
          Create Profile
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-[75vh] flex-col overflow-hidden rounded-lg border bg-card shadow-sm sm:flex-row">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="h-5 w-5 text-primary" />
            <span>AI Counsellor</span>
          </div>
          <button
            onClick={handleClear}
            disabled={!hasMessages || isStreaming}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            title="Clear Chat"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center text-muted-foreground">
              <Bot className="h-12 w-12 text-muted-foreground/30" />
              <p className="max-w-sm text-sm">
                Hi! I'm the AdmitWise counsellor. Ask me anything about engineering admissions, published college data, or your options.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 border"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="mb-2 flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        {m.status === "error" || m.status === "configuration_error" || m.status === "insufficient_data" ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {m.status === "streaming" ? "Typing..." : m.status?.replace("_", " ")}
                        </span>
                      </div>
                      {m.evidence && m.evidence.length > 0 && (
                        <button
                          onClick={() => setSelectedEvidence(m.evidence)}
                          className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-primary shadow-sm hover:bg-primary/10"
                        >
                          {m.evidence.length} Sources <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-line leading-relaxed">
                    {m.content}
                    {m.status === "streaming" && (
                      <span className="ml-1 inline-block h-3 w-1.5 animate-pulse bg-current opacity-70" />
                    )}
                  </div>

                  {(m.warnings?.length > 0 || m.missingData?.length > 0) && (
                    <div className="mt-3 space-y-2 border-t pt-2 text-xs text-muted-foreground">
                      {m.warnings?.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1">
                          {m.warnings.map((w, i) => <li key={i} className="text-warning">{w}</li>)}
                        </ul>
                      )}
                      {m.missingData?.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1">
                          {m.missingData.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-1" />
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestedQuestions.map((sq) => (
              <button
                key={sq}
                onClick={() => submitQuestion(sq)}
                disabled={isStreaming}
                className="shrink-0 whitespace-nowrap rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                {sq}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitQuestion(question);
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitQuestion(question);
                  }
                }}
                placeholder="Ask a question..."
                className="w-full resize-none rounded-xl border bg-background px-4 py-3 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={Math.min(4, Math.max(1, question.split('\n').length))}
                disabled={isStreaming}
              />
              <p className={`absolute bottom-2 right-3 text-[10px] font-medium ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
                {remaining}
              </p>
            </div>
            <button
              type="submit"
              disabled={!question.trim() || isStreaming || tooLong}
              className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-1" />}
            </button>
          </form>
        </div>
      </div>

      {/* Evidence Panel (Sidebar on desktop, overlay/bottom on mobile could be added) */}
      {selectedEvidence && (
        <div className="w-full border-l bg-muted/20 sm:w-80 flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
          <div className="flex items-center justify-between border-b bg-background px-4 py-3">
            <h3 className="font-semibold text-sm">Evidence Sources</h3>
            <button onClick={() => setSelectedEvidence(null)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedEvidence.map((item, idx) => (
              <div key={idx} className="rounded-lg border bg-background p-3 text-sm shadow-sm">
                <p className="font-medium">{item.sourceLabel}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {item.sourceType.replace(/_/g, ' ')}
                  </span>
                  {item.recordYear && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {item.recordYear}
                    </span>
                  )}
                </div>
                {item.officialUrl && (
                  <a
                    href={item.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                  >
                    View Official Source
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
