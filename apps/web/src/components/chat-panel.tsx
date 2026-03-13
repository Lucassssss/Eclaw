"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type Message, type MessageBlock, type MessageBlockType } from "./chat-message";
import { 
  Bot, 
  Sparkles, 
  Send, 
  Loader2, 
  ChevronDown,
  Paperclip,
  Zap,
  Globe,
  Cpu,
  Sparkles as SparklesIcon,
  ArrowUp
} from "lucide-react";
import { useConversationStore } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3001";

type ChatMode = "auto" | "agent" | "manual" | "deep-agent";

interface StreamingMessage extends Message {
  isComplete: boolean;
  blocks?: MessageBlock[];
  timestamp: number;
}

const MODELS = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek" },
  { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner", provider: "DeepSeek" },
  { id: "minimax/MiniMax-M2.5", name: "MiniMax-M2.5", provider: "Minimax" },
  { id: "minimax/MiniMax-M2.5-highspeed", name: "MiniMax-M2.5-HighSpeed", provider: "Minimax" },
  { id: "minimax/MiniMax-M2.1-highspeed", name: "MiniMax-M2.1-HighSpeed", provider: "Minimax" },
];



const AGENT_TYPES: { id: ChatMode; name: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "agent", 
    name: "智能代理", 
    icon: <Bot className="w-4 h-4" />,
    description: "单代理自动决策" 
  },
  { 
    id: "auto", 
    name: "自动模式", 
    icon: <Globe className="w-4 h-4" />,
    description: "自动选择最佳方案" 
  },
];

export function ChatPanel() {
  const { 
    messages: storeMessages, 
    currentConversation,
    loading: storeLoading,
  } = useConversationStore();
  
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(52);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>("agent");
  const [model, setModel] = useState<string>("deepseek/deepseek-chat");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showDeepAgentUI = true;

  useEffect(() => {
    if (storeLoading) return;
    
    if (storeMessages && storeMessages.length > 0) {
      setMessages(storeMessages.map(m => ({
        ...m,
        isComplete: true
      })));
    } else {
      setMessages([]);
    }
  }, [storeMessages, storeLoading]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const adjustTextareaHeight = useCallback(() => {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      textarea.style.height = 'auto';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 52), 320);
      textarea.style.height = `${newHeight}px`;
      setInputHeight(newHeight);
    });
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      adjustTextareaHeight();
    }, 150);
    return () => clearTimeout(timeoutId);
  }, [input, adjustTextareaHeight]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: StreamingMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input.trim(),
      isComplete: true,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      setInputHeight(52);
    }
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userMessage.content }],
          conversationId: currentConversation?.id,
          mode,
          model,
        }),
      });

      if (!response.ok) throw new Error("请求失败");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const assistantMessage: StreamingMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        isComplete: false,
        timestamp: Date.now(),
        blocks: [],
      };
      
      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let currentReasoning = "";
      let currentTextContent = "";
      let currentToolCallId = "";
      let currentToolInput = "";
      let currentToolName = "";
      let currentToolOutput = "";
      let currentBlockType: MessageBlockType | null = null;

      const collapsePreviousBlock = (blocks: MessageBlock[]): MessageBlock[] => {
        if (blocks.length === 0) return blocks;
        return blocks.map((b, i) => 
          i < blocks.length - 1 ? { ...b, isCollapsed: true } : { ...b, isCollapsed: false }
        );
      };

      while (true) {
        const { value, done: doneReading } = await reader.read();
        
        if (doneReading) break;
        
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]" || data === "{}") continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === "reasoning") {
                  const newType: MessageBlockType = "reasoning";
                  if (currentBlockType !== newType) {
                    currentBlockType = newType;
                    currentReasoning = parsed.content || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const collapsedBlocks = collapsePreviousBlock(m.blocks || []);
                        return {
                          ...m,
                          blocks: [
                            ...collapsedBlocks,
                            {
                              id: `reasoning-${Date.now()}`,
                              type: newType,
                              content: currentReasoning,
                              isCollapsed: false
                            }
                          ]
                        };
                      })
                    );
                  } else {
                    currentReasoning += parsed.content || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const blocks = m.blocks || [];
                        const lastBlock = blocks[blocks.length - 1];
                        if (lastBlock && lastBlock.type === "reasoning") {
                          return {
                            ...m,
                            blocks: [
                              ...blocks.slice(0, -1),
                              { ...lastBlock, content: currentReasoning }
                            ]
                          };
                        }
                        return m;
                      })
                    );
                  }
                } else if (parsed.type === "text") {
                  const newType: MessageBlockType = "text";
                  if (currentBlockType !== newType) {
                    currentBlockType = newType;
                    currentTextContent = parsed.content || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const collapsedBlocks = collapsePreviousBlock(m.blocks || []);
                        return {
                          ...m,
                          content: currentTextContent,
                          blocks: [
                            ...collapsedBlocks,
                            {
                              id: `text-${Date.now()}`,
                              type: newType,
                              content: currentTextContent,
                              isCollapsed: false
                            }
                          ]
                        };
                      })
                    );
                  } else {
                    currentTextContent += parsed.content || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const blocks = m.blocks || [];
                        const lastBlock = blocks[blocks.length - 1];
                        if (lastBlock && lastBlock.type === "text") {
                          return {
                            ...m,
                            content: currentTextContent,
                            blocks: [
                              ...blocks.slice(0, -1),
                              { ...lastBlock, content: currentTextContent }
                            ]
                          };
                        }
                        return m;
                      })
                    );
                  }
                } else if (parsed.type === "tool_call") {
                  const newType: MessageBlockType = "tool-call";
                  if (currentBlockType !== newType) {
                    currentBlockType = newType;
                    currentToolCallId = parsed.id || "";
                    currentToolName = parsed.name || "";
                    currentToolInput = parsed.input || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const collapsedBlocks = collapsePreviousBlock(m.blocks || []);
                        return {
                          ...m,
                          blocks: [
                            ...collapsedBlocks,
                            {
                              id: `tool-call-${Date.now()}`,
                              type: newType,
                              name: currentToolName,
                              input: currentToolInput,
                              status: "running",
                              isCollapsed: false
                            }
                          ]
                        };
                      })
                    );
                  } else {
                    currentToolCallId = parsed.id || "";
                    currentToolName = parsed.name || "";
                    currentToolInput = parsed.input || "";
                    setMessages((prev) =>
                      prev.map((m) => {
                        if (m.id !== assistantMessage.id) return m;
                        const blocks = m.blocks || [];
                        const lastBlock = blocks[blocks.length - 1];
                        if (lastBlock && lastBlock.type === "tool-call") {
                          return {
                            ...m,
                            blocks: [
                              ...blocks.slice(0, -1),
                              {
                                ...lastBlock,
                                name: currentToolName,
                                input: currentToolInput
                              }
                            ]
                          };
                        }
                        return m;
                      })
                    );
                  }
                } else if (parsed.type === "tool_result") {
                  const newType: MessageBlockType = "tool-result";
                  currentBlockType = newType;
                  currentToolOutput = parsed.output || "";
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMessage.id) return m;
                      const blocks = m.blocks || [];
                      const lastBlock = blocks[blocks.length - 1];
                      if (lastBlock && (lastBlock.type === "tool-call" || lastBlock.type === "tool-result")) {
                        return {
                          ...m,
                          blocks: [
                            ...blocks.slice(0, -1),
                            {
                              ...lastBlock,
                              type: newType,
                              output: currentToolOutput,
                              status: "completed",
                              isCollapsed: false
                            }
                          ]
                        };
                      }
                      return m;
                    })
                  );
                } else if (parsed.type === "tool_error") {
                  const newType: MessageBlockType = "tool-result";
                  currentBlockType = newType;
                  const errorMsg = parsed.error || "";
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMessage.id) return m;
                      const blocks = m.blocks || [];
                      const lastBlock = blocks[blocks.length - 1];
                      if (lastBlock && (lastBlock.type === "tool-call" || lastBlock.type === "tool-result")) {
                        return {
                          ...m,
                          blocks: [
                            ...blocks.slice(0, -1),
                            {
                              ...lastBlock,
                              type: newType,
                              output: errorMsg,
                              status: "error",
                              isCollapsed: false
                            }
                          ]
                        };
                      }
                      return m;
                    })
                  );
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, isComplete: true } : m
        )
      );
    } catch (error) {
      console.error("发送消息失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentModel = MODELS.find(m => m.id === model);
  const currentAgent = AGENT_TYPES.find(a => a.id === mode);

  const handleClickOutside = () => {
    setShowModelSelector(false);
    setShowAgentSelector(false);
  };

  return (
    <div className="h-full flex flex-col bg-background" onClick={handleClickOutside}>
      {/* Header */}
      <header className="px-6 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div> */}
          <div>
            <h1 className="text-lg font-semibold text-foreground">Aratifact</h1>
            {/* <p className="text-xs text-muted-foreground">AI 智能助手</p> */}
          </div>
        </div>
      </header>

      {/* 聊天内容区域 - 独立滚动 */}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <ScrollArea className="h-full w-full" ref={scrollRef}>
          <div className="px-4 sm:px-6 py-8 w-full max-w-full min-w-0">
            {showDeepAgentUI ? (
              <>
                {(messages.length === 0 && !storeLoading) ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                      <SparklesIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">旅行规划助手</h2>
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                      告诉我你想去哪里旅行，我会派三个专业代理同时为你规划：天气、景点和预算！
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 min-w-0 w-full">
                    {messages.map((message, index) => (
                      <div 
                        key={message.id} 
                        className="animate-slide-up min-w-0 w-full"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ChatMessage 
                          message={message}
                          isStreaming={!message.isComplete && message.role === "assistant"}
                        />
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        </div>
                        <p className="text-sm text-muted-foreground">AI 正在思考...</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {(messages.length === 0 && !storeLoading) ? (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                      <Bot className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-3">你好，我是 Aratifact</h2>
                    <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                      有什么我可以帮助你的吗？
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 min-w-0 w-full">
                    {messages.map((message, index) => (
                      <div 
                        key={message.id} 
                        className="animate-slide-up min-w-0 w-full"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ChatMessage 
                          message={message}
                          isStreaming={!message.isComplete && message.role === "assistant"}
                        />
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        </div>
                        <p className="text-sm text-muted-foreground">AI 正在思考...</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* 输入框区域 - 固定底部 */}
      <div className="p-4 shrink-0 min-w-0">
        <div className="max-w-4xl mx-auto min-w-0 w-full">
          <div 
            className="bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:shadow-md focus-within:border-primary/30"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 输入区域 - 在上面 */}
            <div className="relative flex items-center" style={{ minHeight: inputHeight }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={showDeepAgentUI ? "请输入你想去的旅行目的地..." : "输入你的问题..."}
                disabled={isLoading}
                rows={1}
                className="w-full px-4 py-3 pr-14 resize-none bg-transparent border-none outline-none text-base leading-relaxed"
                style={{ 
                  minHeight: '52px',
                  maxHeight: '320px',
                  height: 'auto'
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-4 bottom-2 p-1 rounded-full transition-all duration-200",
                  input.trim() && !isLoading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* 分隔线 */}
            <div className="h-px " />

            {/* 工具栏 - 在下面 */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              {/* 附件上传 */}
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="上传附件"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-border/50" />
              {/* 模型选择 */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModelSelector(!showModelSelector);
                    setShowAgentSelector(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted transition-colors text-sm"
                >
                  <span className="text-muted-foreground">{currentModel?.provider}</span>
                  <span className="font-medium">{currentModel?.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                
                {showModelSelector && (
                  <div className="absolute bottom-full left-0 mb-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-[100]">
                    <div className="p-2">
                      <p className="text-sm font-medium text-muted-foreground px-2 py-1">选择模型</p>
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModel(m.id); 
                            setShowModelSelector(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                            model === m.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <span className="text-sm text-muted-foreground">{m.provider}</span>
                          <span className="flex-1 text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 分隔线 */}
              <div className="w-px h-4 bg-border/50" />

              {/* Agent 类型选择 */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAgentSelector(!showAgentSelector);
                    setShowModelSelector(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                    "hover:bg-muted"
                  )}
                >
                  {currentAgent?.icon}
                  <span>{currentAgent?.name}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                
                {showAgentSelector && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-[100]">
                    <div className="p-2">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1">选择模式</p>
                      {AGENT_TYPES.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMode(agent.id);
                            setShowAgentSelector(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            mode === agent.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            mode === agent.id ? "bg-primary/20" : "bg-muted"
                          )}>
                            {agent.icon}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">{agent.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1" />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
