"use client";

import { useState } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: string;
    output?: string;
    status: "running" | "completed" | "error";
  }>;
  reasoning?: string;
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
      <code className="px-1 py-0.5 bg-muted rounded text-sm font-mono text-foreground">
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
      className="rounded text-sm my-3"
      customStyle={{
        margin: 0,
        padding: "1rem",
        backgroundColor: "hsl(var(--secondary))",
        borderRadius: "4px",
      }}
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  );
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          {isUser ? (
            <User className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Bot className="w-5 h-5 text-foreground" />
          )}
        </div>
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          <div
            className={`group relative px-4 py-3 ${
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border"
            }`}
            style={{ borderRadius: "4px" }}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>
            ) : (
              <div className="markdown-content text-sm leading-relaxed">
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
              </div>
            )}
            {message.reasoning && message.reasoning.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <span>🤔</span>
                  <span>思考过程</span>
                </div>
                <div className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-wrap font-mono">
                  {message.reasoning}
                </div>
              </div>
            )}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-muted-foreground font-medium">调用工具:</div>
                {message.toolCalls.map((tool) => (
                  <div
                    key={tool.id}
                    className={`text-xs rounded p-2 ${
                      tool.status === "running"
                        ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        : tool.status === "error"
                        ? "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                        : "bg-muted border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{tool.name}</span>
                      {tool.status === "running" && (
                        <span className="text-blue-600 dark:text-blue-400">运行中...</span>
                      )}
                      {tool.status === "completed" && (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      )}
                      {tool.status === "error" && (
                        <span className="text-red-600 dark:text-red-400">✗</span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-muted-foreground">
                      输入: {tool.input}
                    </div>
                    {tool.output && (
                      <div className="mt-1 font-mono">
                        输出: {tool.output}
                      </div>
                    )}
                  </div>
                ))}
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
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {!isUser && copied && (
              <span className="text-xs text-muted-foreground">已复制</span>
            )}
            {!isUser && isStreaming && (
              <span className="text-xs text-muted-foreground">正在输入...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
