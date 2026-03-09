import { useCallback, useMemo, useState } from "react";
import type { Message } from "@langchain/langgraph-sdk";

export interface DeepSubagent {
  id: string;
  toolCall: {
    subagent_type: string;
    description: string;
  };
  status: "pending" | "running" | "complete" | "error";
  startedAt: Date | null;
  completedAt: Date | null;
  messages: Message[];
  result: string | null;
  error: string | null;
}

interface UseDeepAgentOptions {
  apiUrl?: string;
}

interface UseDeepAgentReturn {
  messages: Message[];
  isLoading: boolean;
  error: Error | null;
  subagents: Map<string, DeepSubagent>;
  activeSubagents: DeepSubagent[];
  submit: (
    input: { messages: { content: string; type: string }[] },
    options?: { streamSubgraphs?: boolean }
  ) => Promise<void>;
  getSubagentsByMessage: (messageId: string) => DeepSubagent[];
}

export function useDeepAgent(options: UseDeepAgentOptions = {}): UseDeepAgentReturn {
  const apiUrl = options.apiUrl || "http://localhost:3001";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [subagents, setSubagents] = useState<Map<string, DeepSubagent>>(new Map());

  const activeSubagents = Array.from(subagents.values()).filter(
    (s) => s.status === "pending" || s.status === "running"
  );

  const getSubagentsByMessage = useCallback((messageId: string): DeepSubagent[] => {
    return Array.from(subagents.values());
  }, [subagents]);

  const submit = useCallback(async (
    input: { messages: { content: string; type: string }[] },
    _submitOptions?: { streamSubgraphs?: boolean }
  ) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: `human-${Date.now()}`,
      type: "human",
      content: input.messages[input.messages.length - 1].content,
    };

    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      type: "ai",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);

    try {
      const response = await fetch(`${apiUrl}/api/deep-agent/stream?mode=updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: input.messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to create reader");
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]" || data === "{}" || !data) continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content") {
                let content = "";
                if (typeof parsed.content === "string") {
                  content = parsed.content;
                } else if (parsed.content?.messages?.[0]?.content) {
                  content = parsed.content.messages[0].content;
                }

                if (content) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMessageId
                        ? { ...m, content: m.content + content }
                        : m
                    )
                  );
                }
              } else if (parsed.type === "tool_result") {
                const toolCallId = parsed.toolCallId || `tool-${Date.now()}`;
                
                setSubagents((prev) => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(toolCallId);
                  if (existing) {
                    newMap.set(toolCallId, {
                      ...existing,
                      status: "complete",
                      result: parsed.result,
                      completedAt: new Date(),
                    });
                  }
                  return newMap;
                });
              } else if (parsed.type === "step") {
                if (parsed.source !== "main") {
                  const subagentId = parsed.source || `subagent-${Date.now()}`;
                  
                  setSubagents((prev) => {
                    const newMap = new Map(prev);
                    if (!newMap.has(subagentId)) {
                      newMap.set(subagentId, {
                        id: subagentId,
                        toolCall: {
                          subagent_type: "specialist",
                          description: parsed.step || "Working on task...",
                        },
                        status: "running",
                        startedAt: new Date(),
                        completedAt: null,
                        messages: [],
                        result: null,
                        error: null,
                      });
                    }
                    return newMap;
                  });
                }
              } else if (parsed.type === "subagent_update") {
                const toolCallId = parsed.toolCallId || `tool-${Date.now()}`;
                
                setSubagents((prev) => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(toolCallId);
                  
                  if (existing) {
                    newMap.set(toolCallId, {
                      ...existing,
                      status: "running",
                    });
                  } else {
                    newMap.set(toolCallId, {
                      id: toolCallId,
                      toolCall: {
                        subagent_type: "specialist",
                        description: parsed.namespace || "Subagent",
                      },
                      status: "running",
                      startedAt: new Date(),
                      completedAt: null,
                      messages: [],
                      result: null,
                      error: null,
                    });
                  }
                  return newMap;
                });
              } else if (parsed.type === "subagent_complete") {
                const toolCallId = parsed.toolName || `tool-${Date.now()}`;
                
                setSubagents((prev) => {
                  const newMap = new Map(prev);
                  const existing = newMap.get(toolCallId);
                  if (existing) {
                    newMap.set(toolCallId, {
                      ...existing,
                      status: "complete",
                      completedAt: new Date(),
                      result: parsed.result,
                    });
                  }
                  return newMap;
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId ? { ...m, content: m.content } : m
        )
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  const result = useMemo(() => ({
    messages,
    isLoading,
    error,
    subagents,
    activeSubagents,
    submit,
    getSubagentsByMessage,
  }), [messages, isLoading, error, subagents, activeSubagents, submit, getSubagentsByMessage]);

  return result;
}
