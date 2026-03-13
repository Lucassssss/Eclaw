"use client";

import { useState, memo } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ReasoningContent } from "./reasoning-content";
import { ToolResultContent } from "./tool-result-content";

function formatMessageTime(timestamp: number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export type MessageBlockType = "reasoning" | "text" | "tool-call" | "tool-result";

export interface MessageBlock {
  id: string;
  type: MessageBlockType;
  content?: string;
  name?: string;
  input?: string;
  output?: string;
  status?: "running" | "completed" | "error";
  isCollapsed?: boolean;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number | Date;
  isComplete?: boolean;
  blocks?: MessageBlock[];
  reasoning?: string;
  toolCalls?: any[];
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const inline = !match;

  if (inline) {
    return (
      <code className="px-1 py-0.5 bg-muted rounded text-sm font-mono text-foreground max-w-full overflow-x-auto">
        {children}
      </code>
    );
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <SyntaxHighlighter
      style={oneDark as any}
      language={match?.[1] || "text"}
      PreTag="div"
      className="rounded text-sm my-3 overflow-x-scroll w-full max-w-full"
      customStyle={{
        margin: 0,
        padding: "1rem",
        borderRadius: "4px",
      }}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
}

export const ChatMessage = memo(function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start w-full"}>
      <div className={`chat-message-wrapper flex gap-2 sm:gap-3 max-w-full min-w-0 ${isUser ? "flex-row-reverse max-w-[90%] sm:max-w-[85%]" : "w-full"}`}>
        {/* 头像 - 使用响应式类和容器查询在窄宽度时自动隐藏 */}
        <div className="chat-avatar hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center shrink-0">
          {isUser ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
          )}
        </div>
        <div className={`flex flex-col min-w-0 flex-1 ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`group relative min-w-0 max-w-full ${
              isUser
                ? "bg-primary text-primary-foreground px-4 py-3"
                : "bg-background w-full"
            }`}
            style={{ borderRadius: "4px" }}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap leading-relaxed break-words overflow-hidden">
                {message.content}
              </div>
            ) : (
              <div className="space-y-3 min-w-0 w-full [overflow-wrap:break-word] [word-break:break-word]">
                {message.blocks && message.blocks.length > 0 ? (
                  message.blocks.map((block) => {
                    if (block.type === "reasoning") {
                      return (
                        <ReasoningContent
                          key={block.id}
                          reasoning={block.content || ""}
                          isComplete={message.isComplete ?? true}
                          isCollapsed={block.isCollapsed}
                        />
                      );
                    }
                    if (block.type === "text") {
                      return (
                        <div key={block.id} className="markdown-content leading-relaxed min-w-0 w-full overflow-x-hidden overflow-y-visible [overflow-wrap:break-word] [word-break:break-word]">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code(props) {
                                const { className, children } = props;
                                return <CodeBlock className={className}>{children}</CodeBlock>;
                              },
                              p({ children }) {
                                return <p className="mb-2 last:mb-0">{children}</p>;
                              },
                              ul({ children }) {
                                return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                              },
                              ol({ children }) {
                                return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                              },
                              li({ children }) {
                                return <li className="mb-0.5">{children}</li>;
                              },
                              h1({ children }) {
                                return <h1 className="text-lg font-semibold mb-2 mt-3">{children}</h1>;
                              },
                              h2({ children }) {
                                return <h2 className="text-base font-semibold mb-2 mt-2">{children}</h2>;
                              },
                              h3({ children }) {
                                return <h3 className="font-semibold mb-1 mt-2">{children}</h3>;
                              },
                              a({ href, children }) {
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 text-foreground"
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              blockquote({ children }) {
                                return (
                                  <blockquote className="border-l-2 border-muted-foreground pl-3 italic text-muted-foreground my-2">
                                    {children}
                                  </blockquote>
                                );
                              },
                              hr() {
                                return <hr className="my-3 border-border" />;
                              },
                              table({ children }) {
                                return (
                                  <div className="overflow-x-auto my-3">
                                    <table className="min-w-full border border-border rounded text-sm">
                                      {children}
                                    </table>
                                  </div>
                                );
                              },
                              th({ children }) {
                                return (
                                  <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">
                                    {children}
                                  </th>
                                );
                              },
                              td({ children }) {
                                return <td className="border border-border px-3 py-1.5">{children}</td>;
                              },
                            }}
                          >
                            {block.content || ""}
                          </ReactMarkdown>
                        </div>
                      );
                    }
                    if (block.type === "tool-call" || block.type === "tool-result") {
                      return (
                        <ToolResultContent
                          key={block.id}
                          name={block.name}
                          input={block.input}
                          output={block.output}
                          status={block.status}
                          isCollapsed={block.isCollapsed}
                        />
                      );
                    }
                    return null;
                  })
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code(props) {
                        const { className, children } = props;
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="mb-0.5">{children}</li>;
                      },
                      h1({ children }) {
                        return <h1 className="text-lg font-semibold mb-2 mt-3">{children}</h1>;
                      },
                      h2({ children }) {
                        return <h2 className="text-base font-semibold mb-2 mt-2">{children}</h2>;
                      },
                      h3({ children }) {
                        return <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>;
                      },
                      a({ href, children }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 text-foreground"
                          >
                            {children}
                          </a>
                        );
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-2 border-muted-foreground pl-3 italic text-muted-foreground my-2">
                            {children}
                          </blockquote>
                        );
                      },
                      hr() {
                        return <hr className="my-3 border-border" />;
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-3">
                            <table className="min-w-full border border-border rounded text-sm">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className="border border-border bg-muted px-3 py-1.5 text-left font-medium">
                            {children}
                          </th>
                        );
                      },
                      td({ children }) {
                        return <td className="border border-border px-3 py-1.5">{children}</td>;
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            )}
            {!isUser && (
              <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-muted ${isStreaming ? 'pointer-events-none' : ''}`}
                title="复制"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <span className="text-xs text-muted-foreground/70">
              {formatMessageTime(message.timestamp)}
            </span>
            {!isUser && copied && (
              <span className="text-xs text-muted-foreground">已复制</span>
            )}
            {!isUser && isStreaming && (
              <span className="text-xs text-primary animate-pulse">正在输入...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
