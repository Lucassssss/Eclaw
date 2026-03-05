"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ChatMessage, type Message } from "./chat-message";
import { SettingsPanel, SettingsButton } from "./settings-panel";
import { useTheme } from "./theme-provider";
import { Bot, Plus, ArrowUp } from "lucide-react";
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

type ChatMode = "auto" | "agent" | "manual";

interface StreamingMessage extends Message {
  isComplete: boolean;
}

export function ChatContainer() {
  const [messages, setMessages] = useState<StreamingMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("auto");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isDark } = useTheme();

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
    };

    setMessages((prev) => [...prev, userMessage, aiMessage]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: input
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
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
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMessageId
                        ? { ...m, content: m.content + parsed.content }
                        : m
                    )
                  );
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, isComplete: true } : m
          )
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
    setSettingsOpen(false);
  };

  const getModeLabel = (m: ChatMode) => {
    switch (m) {
      case "auto": return "Auto";
      case "agent": return "Agent";
      case "manual": return "Manual";
    }
  };

  const lastMessage = messages[messages.length - 1];
  const isTyping = isLoading || (lastMessage?.role === "assistant" && !lastMessage?.isComplete);

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
                <h1 className="text-base font-medium text-foreground">
                  AI Assistant
                </h1>
                <p className="text-xs text-muted-foreground">
                  Powered by DeepSeek
                </p>
              </div>
            </div>
            <SettingsButton onClick={() => setSettingsOpen(true)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea ref={scrollRef} className="h-[65vh]">
            <div className="p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                  <div className="w-12 h-12 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-medium text-foreground mb-2">
                    欢迎使用 AI 助手
                  </h2>
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
                placeholder="输入你的问题..."
                disabled={isLoading}
                rows={1}
                className="min-h-[44px] max-h-[200px] resize-none"
              />
              <InputGroupAddon align="block-end">
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
                    <DropdownMenuItem onClick={() => setMode("auto")}>
                      Auto
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode("agent")}>
                      Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode("manual")}>
                      Manual
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        isDark={isDark}
        onToggleTheme={() => {}}
        onClearChat={handleClearChat}
      />
    </div>
  );
}
