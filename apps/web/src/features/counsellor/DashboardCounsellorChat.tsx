"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AlertTriangle, Bot, Loader2, Send, Trash2, ChevronRight, X, ExternalLink, Sparkles } from "lucide-react";
import { loadChat, saveChat, clearChat } from "./chatStore";
import { counsellorQuestionMaxLength, type ChatMessage, type StreamChunk, type EvidenceReference } from "./counsellorTypes";
import { isQuestionTooLong } from "./counsellorCore";
import type { SavedStudentProfile } from "@/features/profile/profileSchema";
import type { RecommendationViewModel } from "@/features/recommendations/recommendationTypes";

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

        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

type DashboardCounsellorChatProps = {
  profile: SavedStudentProfile;
  recommendations: RecommendationViewModel[];
};

export function DashboardCounsellorChat({ profile, recommendations }: DashboardCounsellorChatProps) {
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

  const handleClear = () => {
    clearChat();
    setMessages([]);
    setSelectedEvidence(null);
  };

  const tooLong = isQuestionTooLong(question);
  const remaining = counsellorQuestionMaxLength - question.length;

  const topRecs = useMemo(() => recommendations.slice(0, 5), [recommendations]);
  const recommendationCollegeIds = useMemo(() => {
    const ids = new Set<string>();
    topRecs.forEach(r => {
      if (r.collegeId) ids.add(r.collegeId);
    });
    return Array.from(ids);
  }, [topRecs]);

  const suggestedQuestions = useMemo(() => {
    if (topRecs.length >= 2) {
      return [
        `Compare ${topRecs[0]?.collegeName} and ${topRecs[1]?.collegeName}`,
        `What is the campus life like at ${topRecs[0]?.collegeName}?`,
        `Which of my options has the best placement record?`,
        `Am I eligible for any scholarships at these colleges?`
      ];
    }
    return [
      "Which of my recommended options is more affordable?",
      "Why is this branch classified as ambitious?",
      "Compare the published fee and placement data for my options.",
      "What information is missing for this college?"
    ];
  }, [topRecs]);

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
      const historyToSend = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/counsellor/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: trimmed, 
          profile, 
          history: historyToSend,
          recommendationCollegeIds 
        })
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

  function renderEvidenceBadge(item: EvidenceReference) {
    if (item.sourceCategory === "web_search" || item.sourceType === "web_search") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
          <ExternalLink className="h-3 w-3" /> Web Source
        </span>
      );
    }
    if (item.sourceCategory === "recommendation" || item.sourceType === "deterministic_recommendation") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
          <Sparkles className="h-3 w-3" /> Recommendation
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
        Published Data
      </span>
    );
  }

  return (
    <div className="flex h-[800px] max-h-[80vh] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {}
      <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-3 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium leading-none text-foreground">AI Counsellor</h3>
            <p className="text-[11px] text-muted-foreground mt-1">Grounded in your profile</p>
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={!hasMessages || isStreaming}
          className="inline-flex items-center gap-1.5 rounded-full bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          title="Clear Chat"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      {}
      {topRecs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-b bg-muted/10 px-4 py-2 scrollbar-hide">
          {topRecs.map((rec, idx) => (
            <button
              key={idx}
              onClick={() => submitQuestion(`Tell me about ${rec.collegeName}`)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <div className={`h-2 w-2 rounded-full ${rec.classification === "SAFE" ? "bg-emerald-500" : rec.classification === "SMART" ? "bg-blue-500" : "bg-purple-500"}`} />
              {rec.collegeName}
            </button>
          ))}
        </div>
      )}

      {}
      <div className="relative flex flex-1 overflow-hidden">
        {}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center space-y-5 text-center text-muted-foreground animate-in fade-in duration-700">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-2">
                <Bot className="h-10 w-10 text-primary animate-pulse" />
                <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-foreground">Ask about your options</h3>
                <p className="max-w-[280px] text-sm mt-2">
                  I can compare colleges, provide placement insights, or search the web for missing details.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`relative max-w-[88%] rounded-2xl px-5 py-4 text-sm shadow-sm transition-all duration-300 ${
                    m.role === "user" 
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-sm" 
                      : "bg-muted/50 border rounded-tl-sm"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="mb-3 flex items-center justify-between border-b border-border/50 pb-3">
                      <div className="flex items-center gap-2">
                        {m.status === "error" || m.status === "configuration_error" || m.status === "insufficient_data" ? (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {m.status === "streaming" ? "Typing..." : m.status?.replace("_", " ")}
                        </span>
                      </div>
                      {m.evidence && m.evidence.length > 0 && (
                        <button
                          onClick={() => setSelectedEvidence(m.evidence)}
                          className="flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          {m.evidence.length} Sources <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-line leading-relaxed">
                    {m.content}
                    {m.status === "streaming" && (
                      <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-current opacity-70 align-middle" />
                    )}
                  </div>

                  {(m.warnings?.length > 0 || m.missingData?.length > 0) && (
                    <div className="mt-4 space-y-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                      {m.warnings?.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1.5">
                          {m.warnings.map((w, i) => <li key={i} className="text-warning">{w}</li>)}
                        </ul>
                      )}
                      {m.missingData?.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1.5">
                          {m.missingData.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-2" />
        </div>

        {}
        {selectedEvidence && (
          <div className="absolute inset-y-0 right-0 z-10 w-full sm:w-80 border-l border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-full duration-300 flex flex-col">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-4 bg-muted/10">
              <h3 className="font-semibold text-sm">Evidence Sources</h3>
              <button 
                onClick={() => setSelectedEvidence(null)} 
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedEvidence.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-border/50 bg-background/50 p-3.5 text-sm shadow-sm">
                  <p className="font-medium text-foreground">{item.sourceLabel}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {renderEvidenceBadge(item)}
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
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View Source
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {}
      <div className="border-t bg-card p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {suggestedQuestions.map((sq) => (
            <button
              key={sq}
              onClick={() => submitQuestion(sq)}
              disabled={isStreaming}
              className="shrink-0 whitespace-nowrap rounded-full border border-border/50 bg-background/50 px-3.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-all hover:scale-[1.02]"
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
          className="flex items-end gap-3"
        >
          <div className="relative flex-1 group">
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/30 to-blue-500/30 opacity-0 blur transition duration-500 group-focus-within:opacity-100" />
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitQuestion(question);
                }
              }}
              placeholder="Ask about these colleges..."
              className="relative w-full resize-none rounded-xl border bg-background px-4 py-3.5 pr-12 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              rows={Math.min(4, Math.max(1, question.split('\n').length))}
              disabled={isStreaming}
            />
            <p className={`absolute bottom-2.5 right-4 text-[10px] font-medium ${tooLong ? "text-destructive" : "text-muted-foreground/50"}`}>
              {remaining}
            </p>
          </div>
          <button
            type="submit"
            disabled={!question.trim() || isStreaming || tooLong}
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
