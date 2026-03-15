"use client";

import { useEffect, useState } from "react";
import { useConversationStore } from "@/hooks/useConversations";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Loader2, 
  Clock, 
  Settings, 
  Link2, 
  Bot, 
  Mail,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// 菜单项类型
interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
}

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

  const formatDate = (timestamp: number) => {
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
  };

  // 功能菜单项
  const menuItems: MenuItem[] = [
    {
      id: "agents",
      icon: <Bot className="w-4 h-4" />,
      label: "Agent 配置",
      description: "管理智能代理",
      onClick: () => onOpenSettings?.("agents"),
    },
    {
      id: "webhooks",
      icon: <Link2 className="w-4 h-4" />,
      label: "外部链接",
      description: "飞书、微信等",
      onClick: () => onOpenSettings?.("webhooks"),
    },
    {
      id: "system",
      icon: <Mail className="w-4 h-4" />,
      label: "系统设置",
      description: "SMTP 等配置",
      onClick: () => onOpenSettings?.("system"),
    },
  ];

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

  const renderConversationItem = (conv: typeof conversations[0]) => (
    <div
      key={conv.id}
      onClick={() => handleSelect(conv.id)}
      className={cn(
        "group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
        currentConversation?.id === conv.id
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-muted/60 border border-transparent"
      )}
    >
      <div className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
        currentConversation?.id === conv.id 
          ? "bg-primary/15" 
          : "bg-muted/50 group-hover:bg-muted"
      )}>
        <MessageSquare className={cn(
          "w-3.5 h-3.5",
          currentConversation?.id === conv.id ? "text-primary" : "text-muted-foreground/70"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm truncate",
          currentConversation?.id === conv.id 
            ? "font-medium text-primary" 
            : "text-foreground/80 group-hover:text-foreground"
        )}>
          {conv.title}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground/60">{formatDate(conv.updatedAt)}</span>
        </div>
      </div>
      <button
        onClick={(e) => handleDelete(e, conv.id)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-md transition-all shrink-0"
        aria-label="删除对话"
      >
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-destructive" />
      </button>
    </div>
  );

  const renderGroup = (title: string, items: typeof conversations) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
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
      {/* Logo/Brand Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground truncate">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground/70">智能对话平台</p>
          </div>
        </div>
      </div>

      {/* Function Menu */}
      <div className="p-2 border-b border-border/30">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors group text-left"
            >
              <div className="w-7 h-7 rounded-md bg-muted/50 group-hover:bg-muted flex items-center justify-center shrink-0 transition-colors">
                <span className="text-muted-foreground/70 group-hover:text-foreground transition-colors">
                  {item.icon}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground/80 group-hover:text-foreground truncate">
                  {item.label}
                </div>
                {item.description && (
                  <div className="text-[11px] text-muted-foreground/60 truncate">
                    {item.description}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-2 border-b border-border/30">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-all duration-200 font-medium text-sm shadow-sm hover:shadow active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>新对话</span>
        </button>
      </div>

      {/* Conversation History Header */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
          历史对话
        </span>
        <span className="text-[11px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
          {conversations.length}
        </span>
      </div>

      {/* Conversation List - Takes remaining space */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2">
          {loading && conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground/70">加载中...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground/70">暂无对话</p>
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
