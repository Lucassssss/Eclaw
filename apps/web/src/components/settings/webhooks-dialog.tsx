"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  CheckCircle2,
  Link2,
  MessageSquare,
  Send,
  Webhook,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// 设置存储 key
const WEBHOOKS_STORAGE_KEY = "app-webhooks";

// Webhook 配置类型
interface WebhookConfig {
  id: string;
  name: string;
  type: "feishu" | "wechat" | "dingtalk" | "slack" | "discord" | "custom";
  url: string;
  secret?: string;
  enabled: boolean;
}

// 平台配置
const platforms = [
  { 
    id: "feishu", 
    name: "飞书", 
    icon: "🔗",
    description: "飞书机器人 Webhook",
    docUrl: "https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN"
  },
  { 
    id: "wechat", 
    name: "微信客服", 
    icon: "💬",
    description: "企业微信客服消息",
    docUrl: "https://developer.work.weixin.qq.com/document/path/91770"
  },
  { 
    id: "dingtalk", 
    name: "钉钉", 
    icon: "📌",
    description: "钉钉机器人 Webhook",
    docUrl: "https://open.dingtalk.com/document/robots/custom-robot-access"
  },
  { 
    id: "slack", 
    name: "Slack", 
    icon: "💼",
    description: "Slack Incoming Webhooks",
    docUrl: "https://api.slack.com/messaging/webhooks"
  },
  { 
    id: "discord", 
    name: "Discord", 
    icon: "🎮",
    description: "Discord Webhook",
    docUrl: "https://discord.com/developers/docs/resources/webhook"
  },
  { 
    id: "custom", 
    name: "自定义", 
    icon: "🔧",
    description: "自定义 HTTP Webhook",
    docUrl: ""
  },
] as const;

// 加载设置
function loadWebhooks(): WebhookConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(WEBHOOKS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load webhooks:", e);
  }
  return [];
}

// 保存设置
function saveWebhooks(webhooks: WebhookConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WEBHOOKS_STORAGE_KEY, JSON.stringify(webhooks));
  } catch (e) {
    console.error("Failed to save webhooks:", e);
  }
}

interface WebhooksDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebhooksDialog({ isOpen, onClose }: WebhooksDialogProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("feishu");
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (isOpen) {
      setWebhooks(loadWebhooks());
    }
  }, [isOpen]);

  // 过滤当前平台的 webhooks
  const platformWebhooks = webhooks.filter(w => w.type === selectedPlatform);
  const currentWebhook = webhooks.find(w => w.id === selectedWebhook);
  const currentPlatform = platforms.find(p => p.id === selectedPlatform);

  const handleSave = async () => {
    setSaving(true);
    try {
      saveWebhooks(webhooks);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addWebhook = () => {
    const newWebhook: WebhookConfig = {
      id: `webhook-${Date.now()}`,
      name: `新${currentPlatform?.name || ""}链接`,
      type: selectedPlatform as WebhookConfig["type"],
      url: "",
      enabled: false,
    };
    setWebhooks(prev => [...prev, newWebhook]);
    setSelectedWebhook(newWebhook.id);
  };

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(w => w.id !== id));
    if (selectedWebhook === id) {
      setSelectedWebhook(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - 不可点击关闭 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">外部链接配置</h2>
              <p className="text-xs text-muted-foreground">配置消息同步到外部平台</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content - 左右分栏 */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧平台列表 */}
          <div className="w-56 border-r border-border/50 flex flex-col">
            <div className="p-2 border-b border-border/30">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2">
                平台选择
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {platforms.map((platform) => {
                  const count = webhooks.filter(w => w.type === platform.id).length;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => {
                        setSelectedPlatform(platform.id);
                        setSelectedWebhook(null);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                        selectedPlatform === platform.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="text-base">{platform.icon}</span>
                      <span className="flex-1">{platform.name}</span>
                      {count > 0 && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧配置内容 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 平台描述和添加按钮 */}
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="text-lg">{currentPlatform?.icon}</span>
                  {currentPlatform?.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentPlatform?.description}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentPlatform?.docUrl && (
                  <a
                    href={currentPlatform.docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    文档
                  </a>
                )}
                <button
                  onClick={addWebhook}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>
            </div>

            {/* Webhook 列表和配置 */}
            <div className="flex-1 flex min-h-0">
              {/* Webhook 列表 */}
              <div className="w-48 border-r border-border/30 flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {platformWebhooks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground/60">
                        暂无配置
                      </div>
                    ) : (
                      platformWebhooks.map((webhook) => (
                        <button
                          key={webhook.id}
                          onClick={() => setSelectedWebhook(webhook.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors text-left group",
                            selectedWebhook === webhook.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            webhook.enabled ? "bg-green-500" : "bg-muted-foreground/30"
                          )} />
                          <span className="flex-1 truncate">{webhook.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWebhook(webhook.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* 配置详情 */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {currentWebhook ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">名称</label>
                        <input
                          type="text"
                          value={currentWebhook.name}
                          onChange={(e) => updateWebhook(currentWebhook.id, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                          placeholder="链接名称"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Webhook URL</label>
                        <input
                          type="url"
                          value={currentWebhook.url}
                          onChange={(e) => updateWebhook(currentWebhook.id, { url: e.target.value })}
                          className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm font-mono"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">签名密钥 (可选)</label>
                        <input
                          type="password"
                          value={currentWebhook.secret || ""}
                          onChange={(e) => updateWebhook(currentWebhook.id, { secret: e.target.value })}
                          className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                          placeholder="用于验签"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentWebhook.enabled}
                            onChange={(e) => updateWebhook(currentWebhook.id, { enabled: e.target.checked })}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">启用此链接</span>
                        </label>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          测试
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Webhook className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {platformWebhooks.length === 0 
                          ? "点击上方按钮添加配置" 
                          : "选择左侧配置项进行编辑"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
