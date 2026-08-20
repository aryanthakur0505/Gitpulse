"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  ArrowLeft, Send, Loader2, Bot, User, FileCode2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation, type RagSource, type Message } from "@/hooks/useConversations";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// ─── Source Citation Component ────────────────────────────────────────────────

function SourceCitation({ source, index }: { source: RagSource; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 overflow-hidden text-xs">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2 className="h-3 w-3 shrink-0 text-primary" />
          <span className="truncate font-mono text-muted-foreground">{source.filePath}</span>
          <span className="shrink-0 text-muted-foreground/60">
            L{source.startLine}–{source.endLine}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-muted-foreground/50">
            {Math.round(source.score * 100)}%
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/50 max-h-48 overflow-y-auto">
          <SyntaxHighlighter
            style={oneDark}
            language="typescript"
            customStyle={{ margin: 0, fontSize: "11px", background: "transparent" }}
          >
            {source.content}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble Component ─────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message & { streamingSources?: RagSource[] };
  isStreaming?: boolean;
}) {
  const isUser = message.role === "USER";
  const sources = (message.metadata?.sources as RagSource[] | undefined) ??
    message.streamingSources;

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-primary/20" : "bg-violet-600/20"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary" />
        ) : (
          <Bot className="h-4 w-4 text-violet-400" />
        )}
      </div>

      <div className={cn("flex max-w-[80%] flex-col gap-2", isUser && "items-end")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            isUser
              ? "bg-primary/15 text-foreground"
              : "glass text-foreground"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className ?? "");
                    const isBlock = match != null;
                    return isBlock ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="rounded bg-muted/60 px-1 py-0.5 text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {sources && sources.length > 0 && !isUser && (
          <div className="w-full space-y-1.5">
            <p className="text-[10px] text-muted-foreground/60 px-1">
              {sources.length} source{sources.length !== 1 ? "s" : ""} retrieved
            </p>
            {sources.map((s, i) => (
              <SourceCitation key={i} source={s} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function ChatPage() {
  const { id: repositoryId, conversationId } = useParams<{
    id: string;
    conversationId: string;
  }>();
  const { data: session } = useSession();
  const router = useRouter();

  const { data: conversation, isLoading } = useConversation(conversationId);

  // Local message state (combines DB messages + streaming)
  const [messages, setMessages] = useState<(Message & { streamingSources?: RagSource[] })[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Populate messages from DB when conversation loads
  useEffect(() => {
    if (conversation?.messages) {
      setMessages(
        conversation.messages.map((m) => ({
          ...m,
          streamingSources: (m.metadata?.sources as RagSource[] | undefined),
        }))
      );
    }
  }, [conversation?.messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || isStreaming || !session?.apiToken) return;

    // Add user message immediately
    const userMsg: Message = {
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: "USER",
      content,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    // Add placeholder assistant message
    const assistantMsg: Message & { streamingSources?: RagSource[] } = {
      id: `temp-assistant-${Date.now()}`,
      conversationId,
      role: "ASSISTANT",
      content: "",
      metadata: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const assistantIdx = messages.length + 1; // index of the placeholder
    setStreamingIndex(assistantIdx);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.apiToken}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to send message");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if ("token" in parsed) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "ASSISTANT") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.token,
                    };
                  }
                  return updated;
                });
              } else if ("sources" in parsed) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "ASSISTANT") {
                    updated[updated.length - 1] = {
                      ...last,
                      streamingSources: parsed.sources,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      }
    } catch (err) {
      console.error("Send message failed:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "ASSISTANT" && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: "⚠️ Something went wrong. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      setStreamingIndex(null);
    }
  }, [input, isStreaming, session, conversationId, messages.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex-1 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-3/4 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-3">
        <Link
          href={`/repositories/${repositoryId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {conversation?.repository?.fullName ?? "Repository"}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium text-foreground truncate">
          {conversation?.title ?? "Chat"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20">
              <Bot className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Ask anything about this codebase</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Try: "How does authentication work?", "Where are API routes defined?", or
                "Explain the main data flow."
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "ASSISTANT"}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/50 px-6 py-4">
        <div className="flex items-end gap-3">
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the codebase…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/40 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isStreaming}
          />
          <Button
            id="send-message-button"
            variant="gradient"
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
          Answers grounded in {conversation?.repository?.fullName ?? "your code"} · Press Enter to send
        </p>
      </div>
    </div>
  );
}
