"use client";

import { useEffect } from "react";
import { useConversationStore } from "@/hooks/useConversations";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Link2, 
  Bot, 
  Settings,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ConversationsSidebarProps {
  onOpenSettings?: (tab: string) => void;
}

export function ConversationsSidebar({ onOpenSettings }: ConversationsSidebarProps) {
  const {
    conversations,
    currentConversation,
    loading,
    fetchConversations,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useConversationStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = async () => {
    await createConversation("新对话");
  };

  const handleSelect = async (id: string) => {
    await selectConversation(id);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这个对话吗？")) {
      await deleteConversation(id);
    }
  };

  // 按时间分组对话
  const groupConversations = () => {
    const today: typeof conversations = [];
    const yesterday: typeof conversations = [];
    const thisWeek: typeof conversations = [];
    const older: typeof conversations = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;

    conversations.forEach((conv) => {
      const timestamp = conv.updatedAt;
      if (timestamp >= todayStart) {
        today.push(conv);
      } else if (timestamp >= yesterdayStart) {
        yesterday.push(conv);
      } else if (timestamp >= weekStart) {
        thisWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, thisWeek, older };
  };

  const groups = groupConversations();

  // 简化的对话项 - 无图标无时间
  const renderConversationItem = (conv: typeof conversations[0]) => (
    <div
      key={conv.id}
      onClick={() => handleSelect(conv.id)}
      className={cn(
        "group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all duration-150",
        currentConversation?.id === conv.id
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted/60 text-foreground/70 hover:text-foreground"
      )}
    >
      <span className={cn(
        "flex-1 text-sm truncate",
        currentConversation?.id === conv.id && "font-medium"
      )}>
        {conv.title}
      </span>
      <button
        onClick={(e) => handleDelete(e, conv.id)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all shrink-0"
        aria-label="删除对话"
      >
        <Trash2 className="w-3 h-3 text-muted-foreground/70 hover:text-destructive" />
      </button>
    </div>
  );

  const renderGroup = (title: string, items: typeof conversations) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-2">
        <div className="px-3 py-1 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map(renderConversationItem)}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card/50">
      {/* Logo + New Chat Button (合并为顶部区域) */}
      <div className="p-2 border-b border-border/30">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <h1 className="text-sm font-semibold text-foreground truncate">AI Assistant</h1>
        </div>
        
        {/* New Chat - 强调按钮放在最顶部 */}
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200 font-medium text-sm shadow-sm hover:shadow active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>新对话</span>
        </button>
      </div>

      {/* Function Menu - 紧凑样式 */}
      <div className="p-2 border-b border-border/30 space-y-0.5">
        <button
          onClick={() => onOpenSettings?.("agents")}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/60 transition-colors group text-left"
        >
          <Bot className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground" />
          <span className="flex-1 text-sm text-foreground/80 group-hover:text-foreground">Agent 配置</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </button>
        <button
          onClick={() => onOpenSettings?.("webhooks")}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/60 transition-colors group text-left"
        >
          <Link2 className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground" />
          <span className="flex-1 text-sm text-foreground/80 group-hover:text-foreground">外部链接</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </button>
        <button
          onClick={() => onOpenSettings?.("system")}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted/60 transition-colors group text-left"
        >
          <Settings className="w-4 h-4 text-muted-foreground/70 group-hover:text-foreground" />
          <span className="flex-1 text-sm text-foreground/80 group-hover:text-foreground">系统设置</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
        </button>
      </div>

      {/* Conversation History Header */}
      <div className="px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          历史对话
        </span>
        <span className="text-[10px] text-muted-foreground/50 bg-muted/30 px-1 py-0.5 rounded">
          {conversations.length}
        </span>
      </div>

      {/* Conversation List - Takes remaining space */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2">
          {loading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-primary mb-1" />
              <p className="text-[11px] text-muted-foreground/70">加载中...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center px-4">
              <p className="text-[11px] text-muted-foreground/60">暂无对话</p>
            </div>
          ) : (
            <>
              {renderGroup("今天", groups.today)}
              {renderGroup("昨天", groups.yesterday)}
              {renderGroup("近 7 天", groups.thisWeek)}
              {renderGroup("更早", groups.older)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
