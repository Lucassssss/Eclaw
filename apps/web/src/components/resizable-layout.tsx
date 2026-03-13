"use client";

import * as React from "react";
import { ConversationsSidebar } from "@/components/conversations-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { ArtifactPanel } from "@/components/artifact-panel";
import { cn } from "@/lib/utils";

// 布局状态缓存 key
const LAYOUT_STORAGE_KEY = "resizable-layout-state";

interface LayoutState {
  sidebarWidth: number;
  artifactWidth: number;
  isSidebarCollapsed: boolean;
  isArtifactCollapsed: boolean;
}

// 从 localStorage 读取布局状态
function loadLayoutState(): LayoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load layout state:", e);
  }
  return null;
}

// 保存布局状态到 localStorage
function saveLayoutState(state: LayoutState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save layout state:", e);
  }
}

interface ResizableLayoutProps {
  defaultSidebarWidth?: number;
  defaultArtifactWidth?: number;
  minSidebarWidth?: number;
  minArtifactWidth?: number;
  minChatWidth?: number;
  maxChatWidth?: number;
}

export function ResizableLayout({
  defaultSidebarWidth = 220,
  defaultArtifactWidth = 800,
  minSidebarWidth = 200,
  minArtifactWidth = 420,
}: ResizableLayoutProps) {
  // 初始化时尝试从缓存加载
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(defaultSidebarWidth);
  const [artifactWidth, setArtifactWidth] = React.useState(defaultArtifactWidth);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isArtifactCollapsed, setIsArtifactCollapsed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingSidebar = React.useRef(false);
  const isDraggingArtifact = React.useRef(false);

  // 首次加载时从缓存恢复状态
  React.useEffect(() => {
    const saved = loadLayoutState();
    if (saved) {
      setSidebarWidth(saved.sidebarWidth);
      setArtifactWidth(saved.artifactWidth);
      setIsSidebarCollapsed(saved.isSidebarCollapsed);
      setIsArtifactCollapsed(saved.isArtifactCollapsed);
    }
    setIsInitialized(true);
  }, []);

  // 当状态变化时保存到缓存
  React.useEffect(() => {
    if (!isInitialized) return;
    saveLayoutState({
      sidebarWidth,
      artifactWidth,
      isSidebarCollapsed,
      isArtifactCollapsed,
    });
  }, [sidebarWidth, artifactWidth, isSidebarCollapsed, isArtifactCollapsed, isInitialized]);

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDraggingSidebar.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(minSidebarWidth, Math.min(e.clientX - rect.left, 400));
      setSidebarWidth(newWidth);
    }
    if (isDraggingArtifact.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(minArtifactWidth, Math.min(rect.right - e.clientX, 800));
      setArtifactWidth(newWidth);
    }
  }, [minSidebarWidth, minArtifactWidth]);

  const handleMouseUp = React.useCallback(() => {
    isDraggingSidebar.current = false;
    isDraggingArtifact.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  React.useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDraggingSidebar = () => {
    isDraggingSidebar.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const startDraggingArtifact = () => {
    isDraggingArtifact.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <main className="h-screen flex bg-background overflow-hidden" ref={containerRef}>
      {/* Sidebar */}
      <aside 
        className={cn(
          "shrink-0 bg-card bg-zinc-50 border-r border-border/50 flex flex-col transition-all duration-300 ease-out",
          isSidebarCollapsed ? "w-0 overflow-hidden" : ""
        )}
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <ConversationsSidebar />
      </aside>

      {/* Sidebar Drag Handle */}
      {!isSidebarCollapsed && (
        <div className="relative flex items-center group">
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/30 transition-colors duration-200"
            onMouseDown={startDraggingSidebar}
            title="拖拽调整宽度"
          />
        </div>
      )}

      {/* Chat Area - 带最小和最大宽度限制 */}
      <section 
        className="flex-1 flex flex-col overflow-hidden"
        style={{ 
          minWidth: minChatWidth,
          maxWidth: isArtifactCollapsed && isSidebarCollapsed ? '100%' : maxChatWidth 
        }}
      >
        <ChatPanel 
          isSidebarCollapsed={isSidebarCollapsed}
          isArtifactCollapsed={isArtifactCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleArtifact={() => setIsArtifactCollapsed(!isArtifactCollapsed)}
        />
      </section>

      {/* Artifact Panel Drag Handle - 只在展开时显示 */}
      {!isArtifactCollapsed && (
        <div className="relative flex items-center group">
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/30 transition-colors duration-200"
            onMouseDown={startDraggingArtifact}
            title="拖拽调整宽度"
          />
        </div>
      )}

      {/* Artifact Panel - 完全隐藏时不渲染 */}
      {!isArtifactCollapsed && (
        <aside 
          className="shrink-0 bg-card bg-zinc-50 border-l border-border/50 flex flex-col transition-all duration-300 ease-out"
          style={{ width: artifactWidth }}
        >
          <ArtifactPanel />
        </aside>
      )}
    </main>
  );
}
