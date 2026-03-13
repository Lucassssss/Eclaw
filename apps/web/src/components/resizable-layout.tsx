"use client";

import * as React from "react";
import { ConversationsSidebar } from "@/components/conversations-sidebar";
import { ChatPanel } from "@/components/chat-panel";
import { ArtifactViewer } from "@/components/artifact-viewer";
import { PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizableLayoutProps {
  defaultSidebarWidth?: number;
  defaultArtifactWidth?: number;
  minSidebarWidth?: number;
  minArtifactWidth?: number;
}

export function ResizableLayout({
  defaultSidebarWidth = 220,
  defaultArtifactWidth = 700,
  minSidebarWidth = 200,
  minArtifactWidth = 640,
}: ResizableLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = React.useState(defaultSidebarWidth);
  const [artifactWidth, setArtifactWidth] = React.useState(defaultArtifactWidth);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isArtifactCollapsed, setIsArtifactCollapsed] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isDraggingSidebar = React.useRef(false);
  const isDraggingArtifact = React.useRef(false);

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

      {/* Sidebar Drag Handle & Collapse Button */}
      {!isSidebarCollapsed && (
        <div className="relative flex items-center group">
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/30 transition-colors duration-200"
            onMouseDown={startDraggingSidebar}
            title="拖拽调整宽度"
          />
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="relative flex items-center justify-center w-4 h-12 bg-card hover:bg-accent transition-colors duration-200 z-20 rounded-r-sm"
            aria-label="收起侧边栏"
          >
            <PanelLeftClose className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Chat Area */}
      <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <ChatPanel />
      </section>

      {/* Artifact Panel Drag Handle */}
      {!isArtifactCollapsed && (
        <div className="relative flex items-center group">
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/30 transition-colors duration-200"
            onMouseDown={startDraggingArtifact}
            title="拖拽调整宽度"
          />
          <button
            onClick={() => setIsArtifactCollapsed(true)}
            className="relative flex items-center justify-center w-4 h-12 bg-card hover:bg-accent transition-colors duration-200 z-20 rounded-l-sm"
            aria-label="收起 Artifact 面板"
          >
            <PanelRightClose className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Artifact Panel */}
      <aside 
        className={cn(
          "shrink-0 bg-card bg-zinc-50 border-l border-border/50 flex flex-col transition-all duration-300 ease-out",
          isArtifactCollapsed ? "w-0 overflow-hidden" : ""
        )}
        style={{ width: isArtifactCollapsed ? 0 : artifactWidth }}
      >
        <ArtifactViewer artifacts={[]} />
      </aside>

      {/* Sidebar Expand Button (when collapsed) */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-12 bg-card hover:bg-accent transition-colors duration-200 z-20 rounded-r-lg shadow-md"
          aria-label="展开侧边栏"
        >
          <PanelRight className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Artifact Expand Button (when collapsed) */}
      {isArtifactCollapsed && (
        <button
          onClick={() => setIsArtifactCollapsed(false)}
          className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-12 bg-card hover:bg-accent transition-colors duration-200 z-20 rounded-l-lg shadow-md"
          aria-label="展开 Artifact 面板"
        >
          <PanelLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </main>
  );
}
