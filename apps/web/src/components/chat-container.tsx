"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChatMessage, type Message } from "./chat-message";
import { SettingsPanel, SettingsButton } from "./settings-panel";
import { Bot, Plus, ArrowUp, Sparkles } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatMode = "auto" | "agent" | "manual" | "deep-agent";
type ModelType = "chat" | "reasoner";

const SESSION_ID = "default";

export interface ToolCall {
  id: string;
  name: string;
  input: string;
  output?: string;
  status: "running" | "completed" | "error";
}

export interface Subagent {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "complete" | "error";
  result?: string;
}

interface StreamingMessage extends Message {
  isComplete: boolean;
  toolCalls?: ToolCall[];
  mode?: ChatMode;
  reasoning?: string;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("agent");
  const [model, setModel] = useState<ModelType>("reasoner");
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: StreamingMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      isComplete: true,
    };

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: StreamingMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isComplete: false,
      toolCalls: mode === "agent" ? [] : undefined,
      mode,
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    if (mode === "deep-agent") {
      setSubagents([
        { id: "weather", name: "Weather Scout", description: "Checking weather forecast...", status: "running" },
        { id: "experience", name: "Experience Curator", description: "Finding attractions and activities...", status: "running" },
        { id: "budget", name: "Budget Optimizer", description: "Calculating costs...", status: "running" },
      ]);
      await handleDeepAgentChat(aiMessageId, input);
    } else {
      await handleNormalChat(aiMessageId, input);
    }
  };

  const handleDeepAgentChat = async (aiMessageId: string, userInput: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/deep-agent/stream?mode=updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userInput }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]" || data === "{}") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "content") {
                  const content = typeof parsed.content === "string" 
                    ? parsed.content 
                    : parsed.content?.messages?.[0]?.content || "";
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
                  setSubagents((prev) => {
                    const name = parsed.toolName?.toLowerCase() || "";
                    let id = "budget";
                    if (name.includes("weather")) id = "weather";
                    else if (name.includes("attraction") || name.includes("event")) id = "experience";
                    
                    return prev.map((s) =>
                      s.id === id
                        ? { ...s, status: "complete", result: parsed.result }
                        : s
                    );
                  });
                } else if (parsed.type === "step") {
                  console.log(`[${parsed.source}] Step: ${parsed.step}`);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        setSubagents((prev) => prev.map((s) => ({ ...s, status: "complete" })));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, isComplete: true } : m
          )
        );
      }
    } catch (error) {
      console.error("Deep Agent error:", error);
      setSubagents((prev) => prev.map((s) => ({ ...s, status: "error" })));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? { ...m, content: "抱歉，Deep Agent 发生了错误。", isComplete: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNormalChat = async (aiMessageId: string, userInput: string) => {
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userInput }],
          mode,
          model,
          sessionId: SESSION_ID,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let currentToolCallId = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (mode === "agent") {
                  if (parsed.type === "tool_call") {
                    const toolId = `tool-${currentToolCallId++}`;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId
                          ? {
                              ...m,
                              toolCalls: [
                                ...(m.toolCalls || []),
                                { id: toolId, name: parsed.name, input: parsed.input, status: "running" },
                              ],
                            }
                          : m
                      )
                    );
                  } else if (parsed.type === "tool_result") {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId
                          ? {
                              ...m,
                              toolCalls: (m.toolCalls || []).map((tc, idx) =>
                                idx === (m.toolCalls?.length || 1) - 1
                                  ? { ...tc, output: parsed.output, status: "completed" }
                                  : tc
                              ),
                            }
                          : m
                      )
                    );
                  } else if (parsed.content) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId ? { ...m, content: m.content + parsed.content } : m
                      )
                    );
                  } else if (parsed.type === "reasoning") {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId ? { ...m, reasoning: (m.reasoning || "") + parsed.content } : m
                      )
                    );
                  }
                } else {
                  if (parsed.content) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId ? { ...m, content: m.content + parsed.content } : m
                      )
                    );
                  } else if (parsed.type === "reasoning") {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === aiMessageId ? { ...m, reasoning: (m.reasoning || "") + parsed.content } : m
                      )
                    );
                  }
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) => m.id === aiMessageId ? { ...m, isComplete: true } : m)
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: StreamingMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，发生了错误，请稍后重试。",
        timestamp: new Date(),
        isComplete: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSubagents([]);
    setSettingsOpen(false);
  };

  const getModeLabel = (m: ChatMode) => {
    switch (m) {
      case "auto": return "Auto";
      case "agent": return "Agent";
      case "manual": return "Manual";
      case "deep-agent": return "Deep";
    }
  };

  const lastMessage = messages[messages.length - 1];
  const isTyping = isLoading || (lastMessage?.role === "assistant" && !lastMessage?.isComplete);

  const showDeepAgentUI = mode === "deep-agent";
  const completedSubagents = subagents.filter((s) => s.status === "complete").length;
  const allSubagentsDone = subagents.length > 0 && completedSubagents === subagents.length;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Bot className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-base font-medium text-foreground">AI Assistant</h1>
                <p className="text-xs text-muted-foreground">Powered by DeepSeek</p>
              </div>
            </div>
            <SettingsButton onClick={() => setSettingsOpen(true)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea ref={scrollRef} className="h-[65vh]">
            <div className="p-6">
              {showDeepAgentUI ? (
                <>
                  {messages.length === 0 && subagents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                      <div className="w-12 h-12 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-medium text-foreground mb-2">旅行规划助手</h2>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        告诉我你想去哪里旅行，我会派三个专业代理同时为你规划：天气、景点和预算！
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <ChatMessage 
                          key={message.id} 
                          message={message}
                          isStreaming={!message.isComplete && message.role === "assistant"}
                        />
                      ))}

                      {subagents.length > 0 && (
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-medium text-neutral-200">专业代理正在工作</h3>
                                <p className="text-xs text-neutral-500">
                                  {completedSubagents}/{subagents.length} 已完成
                                </p>
                              </div>
                            </div>
                            {isLoading && (
                              <div className="flex items-center gap-2 text-blue-400 text-sm">
                                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <span>代理工作中...</span>
                              </div>
                            )}
                          </div>

                          <div className="h-1.5 bg-neutral-800 rounded-full mb-4 overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-sky-500 via-amber-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${(completedSubagents / subagents.length) * 100}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {subagents.map((subagent) => (
                              <div
                                key={subagent.id}
                                className={`
                                  relative flex flex-col h-full rounded-2xl border-2 transition-all duration-300
                                  ${subagent.status === "complete" ? "border-emerald-500/40 bg-emerald-950/30" : ""}
                                  ${subagent.status === "running" ? "border-amber-500/40 bg-amber-950/30" : ""}
                                  ${subagent.status === "error" ? "border-red-500/40 bg-red-950/30" : ""}
                                  ${subagent.status === "pending" ? "border-neutral-700 bg-neutral-900/30" : ""}
                                `}
                              >
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800/50">
                                  <div className={`
                                    w-10 h-10 rounded-xl flex items-center justify-center
                                    ${subagent.status === "complete" ? "bg-emerald-500/20 text-emerald-400" : ""}
                                    ${subagent.status === "running" ? "bg-amber-500/20 text-amber-400 animate-pulse" : ""}
                                    ${subagent.status === "error" ? "bg-red-500/20 text-red-400" : ""}
                                    ${subagent.status === "pending" ? "bg-neutral-700/20 text-neutral-500" : ""}
                                  `}>
                                    {subagent.status === "complete" ? "✓" : subagent.status === "running" ? "⚙️" : subagent.status === "error" ? "✗" : "⏳"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold ${subagent.status === "complete" ? "text-emerald-400" : subagent.status === "running" ? "text-amber-400" : "text-neutral-400"}`}>
                                      {subagent.name}
                                    </h3>
                                    <p className="text-xs text-neutral-500 truncate">{subagent.description}</p>
                                  </div>
                                </div>
                                <div className="flex-1 px-4 py-4 min-h-0 max-h-32 overflow-y-auto">
                                  {subagent.result ? (
                                    <div className="text-sm text-neutral-300 whitespace-pre-wrap">
                                      {subagent.result.slice(0, 300)}
                                      {subagent.result.length > 300 && "..."}
                                    </div>
                                  ) : subagent.status === "running" ? (
                                    <div className="flex items-center gap-2 text-neutral-500 animate-pulse">
                                      <span>工作中...</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isLoading && allSubagentsDone && (
                        <div className="flex items-center gap-3 text-blue-400 animate-pulse">
                          <Sparkles className="w-5 h-5" />
                          <span className="text-sm">正在整合你的旅行计划...</span>
                        </div>
                      )}

                      {isTyping && !allSubagentsDone && (
                        <div className="flex justify-start">
                          <div className="flex items-start gap-3 max-w-[85%]">
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              <Bot className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="pt-1">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                      <div className="w-12 h-12 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h2 className="text-lg font-medium text-foreground mb-2">欢迎使用 AI 助手</h2>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        我可以帮你回答问题，写代码，分析数据等。请在下方输入你的问题开始对话。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {messages.map((message) => (
                        <ChatMessage 
                          key={message.id} 
                          message={message}
                          isStreaming={!message.isComplete && message.role === "assistant"}
                        />
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="flex items-start gap-3 max-w-[85%]">
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              <Bot className="w-5 h-5 text-foreground" />
                            </div>
                            <div className="pt-1">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="w-full">
            <InputGroup className="border-input">
              <InputGroupTextarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={showDeepAgentUI ? "请输入你想去的旅行目的地..." : "输入你的问题..."}
                disabled={isLoading}
                rows={1}
                className="min-h-[44px] max-h-[200px] resize-none"
              />
              <InputGroupAddon align="block-end" className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <InputGroupButton 
                    variant="ghost" 
                    size="icon-xs" 
                    disabled={isLoading}
                    className="h-7 w-7 rounded-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </InputGroupButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton variant="ghost" className="text-xs h-7 px-2 font-normal rounded-full">
                        {getModeLabel(mode)}
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="min-w-[80px]">
                      <DropdownMenuItem onClick={() => { setMode("auto"); setSubagents([]); }}>
                        Auto
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMode("agent"); setSubagents([]); }}>
                        Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMode("manual"); setSubagents([]); }}>
                        Manual
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setMode("deep-agent"); setSubagents([]); }}>
                        Deep Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {!showDeepAgentUI && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <InputGroupButton variant="ghost" className="text-xs h-7 px-2 font-normal rounded-full bg-muted">
                          {model === "reasoner" ? "🤔 深度思考" : "⚡ 快速"}
                        </InputGroupButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="start" className="min-w-[120px]">
                        <DropdownMenuItem onClick={() => setModel("chat")}>⚡ 快速回答</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setModel("reasoner")}>🤔 深度思考</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <InputGroupButton 
                  variant="default" 
                  size="icon-xs"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="h-8 w-8 rounded-full"
                >
                  <ArrowUp className="w-4 h-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </CardFooter>
      </Card>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onClearChat={handleClearChat}
      />
    </div>
  );
}
