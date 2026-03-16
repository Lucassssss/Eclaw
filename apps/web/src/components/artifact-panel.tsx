"use client";

import * as React from "react";
import { 
  Sparkles, 
  FileText, 
  Code, 
  Database, 
  FileJson, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  Play,
  ExternalLink,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Artifact 类型定义
export interface Artifact {
  id: string;
  type: "code" | "document" | "data" | "chart" | "html" | "react" | string;
  title: string;
  content: string;
  language?: string;
  status?: "idle" | "streaming" | "complete" | "error";
  progress?: number;
  metadata?: Record<string, unknown>;
}

// 使用 zustand store 管理 artifact 状态（模拟 @ai-sdk-tools/store 的模式）
import { create } from "zustand";

interface ArtifactStore {
  artifacts: Map<string, Artifact>;
  activeArtifactId: string | null;
  addArtifact: (artifact: Artifact) => void;
  updateArtifact: (id: string, updates: Partial<Artifact>) => void;
  removeArtifact: (id: string) => void;
  setActiveArtifact: (id: string | null) => void;
  clearArtifacts: () => void;
}

export const useArtifactStore = create<ArtifactStore>((set) => ({
  artifacts: new Map(),
  activeArtifactId: null,
  addArtifact: (artifact) =>
    set((state) => {
      const newArtifacts = new Map(state.artifacts);
      newArtifacts.set(artifact.id, artifact);
      return { artifacts: newArtifacts, activeArtifactId: artifact.id };
    }),
  updateArtifact: (id, updates) =>
    set((state) => {
      const newArtifacts = new Map(state.artifacts);
      const existing = newArtifacts.get(id);
      if (existing) {
        newArtifacts.set(id, { ...existing, ...updates });
      }
      return { artifacts: newArtifacts };
    }),
  removeArtifact: (id) =>
    set((state) => {
      const newArtifacts = new Map(state.artifacts);
      newArtifacts.delete(id);
      return { 
        artifacts: newArtifacts,
        activeArtifactId: state.activeArtifactId === id ? null : state.activeArtifactId
      };
    }),
  setActiveArtifact: (id) => set({ activeArtifactId: id }),
  clearArtifacts: () => set({ artifacts: new Map(), activeArtifactId: null }),
}));

// 获取类型图标
function getTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case "code":
    case "javascript":
    case "typescript":
    case "python":
    case "react":
      return <Code className="w-4 h-4" />;
    case "json":
    case "data":
      return <FileJson className="w-4 h-4" />;
    case "database":
    case "sql":
      return <Database className="w-4 h-4" />;
    case "html":
      return <ExternalLink className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

// Artifact 卡片组件
function ArtifactCard({ 
  artifact, 
  isActive,
  isExpanded, 
  onToggle,
  onSelect,
}: { 
  artifact: Artifact;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStreaming = artifact.status === "streaming";
  const progress = artifact.progress ?? 0;

  return (
    <div 
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all duration-200",
        isActive 
          ? "border-primary/50 shadow-sm" 
          : "border-border/50 hover:border-border"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors",
          isActive ? "bg-[#1456f0]/5" : "hover:bg-muted/30"
        )}
        onClick={onSelect}
      >
        <div className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          isActive ? "bg-[#1456f0]/15 text-[#1456f0]" : "bg-muted/50 text-muted-foreground"
        )}>
          {isStreaming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            getTypeIcon(artifact.type)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{artifact.title}</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="capitalize">{artifact.type}</span>
            {artifact.language && (
              <>
                <span className="text-border">|</span>
                <span>{artifact.language}</span>
              </>
            )}
          </div>
        </div>
        <button 
          className="p-1 hover:bg-accent rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isStreaming && (
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-[#4e83fd] to-[#3370ff] transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      
      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border/50 animate-fade-in">
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
            <span className="text-xs text-muted-foreground">
              {artifact.content.length} 字符
            </span>
            <div className="flex items-center gap-1">
              {artifact.type === "html" && (
                <button
                  className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                  title="预览"
                >
                  <Play className="w-3 h-3" />
                  预览
                </button>
              )}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    复制
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-3 max-h-64 overflow-auto">
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">
              {artifact.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Artifact 面板主组件
export function ArtifactPanel() {
  const { artifacts, activeArtifactId, setActiveArtifact } = useArtifactStore();
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const artifactList = Array.from(artifacts.values());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between shrink-0 bg-card/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4e83fd] to-[#3370ff] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Artifacts</h2>
        </div>
        {artifactList.length > 0 && (
          <span className="text-xs text-muted-foreground">{artifactList.length}</span>
        )}
      </div>
      
      {/* Content */}
      {artifactList.length > 0 ? (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {artifactList.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                isActive={activeArtifactId === artifact.id}
                isExpanded={expandedIds.has(artifact.id)}
                onToggle={() => toggleExpand(artifact.id)}
                onSelect={() => setActiveArtifact(artifact.id)}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground mb-1">暂无 Artifact</p>
          <p className="text-xs text-muted-foreground/60 max-w-[200px]">
            AI 生成的代码、文档和数据将显示在这里
          </p>
        </div>
      )}
    </div>
  );
}
