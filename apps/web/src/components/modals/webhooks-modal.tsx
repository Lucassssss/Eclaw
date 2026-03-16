"use client";

import { useState } from "react";
import { X, Plus, Trash2, Link2, Settings, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const PLATFORMS = [
  { id: "feishu", name: "飞书", icon: "🔗", description: "飞书机器人 Webhook", docUrl: "https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN" },
  { id: "dingtalk", name: "钉钉", icon: "📌", description: "钉钉机器人 Webhook", docUrl: "https://open.dingtalk.com/document/robots/custom-robot-access" },
  { id: "wechat", name: "企业微信", icon: "💬", description: "企业微信客服消息", docUrl: "https://developer.work.weixin.qq.com/document/path/91770" },
  { id: "slack", name: "Slack", icon: "💼", description: "Slack Incoming Webhooks", docUrl: "https://api.slack.com/messaging/webhooks" },
  { id: "discord", name: "Discord", icon: "🎮", description: "Discord Webhook", docUrl: "https://discord.com/developers/docs/resources/webhook" },
  { id: "custom", name: "自定义", icon: "🔧", description: "自定义 HTTP Webhook", docUrl: "" },
];

interface Webhook {
  id: string;
  name: string;
  url: string;
  secret?: string;
  platform: string;
  enabled: boolean;
}

interface WebhooksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebhooksModal({ isOpen, onClose }: WebhooksModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: "1", name: "测试Webhook", url: "", platform: "feishu", enabled: true },
  ]);
  const [saving, setSaving] = useState(false);

  const filteredWebhooks = selectedPlatform
    ? webhooks.filter((w) => w.platform === selectedPlatform)
    : webhooks;

  const handleAddWebhook = () => {
    const newWebhook: Webhook = {
      id: Date.now().toString(),
      name: "新链接",
      url: "",
      platform: selectedPlatform || "feishu",
      enabled: true,
    };
    setWebhooks([...webhooks, newWebhook]);
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== id));
  };

  const handleUpdateWebhook = (id: string, field: keyof Webhook, value: string | boolean) => {
    setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, [field]: value } : w)));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] min-h-[500px] flex flex-col overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4e83fd] to-[#3370ff] flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">外部链接配置</h2>
              <p className="text-xs text-muted-foreground">配置飞书、钉钉等外部 Webhook，实现消息同步</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-48 border-r border-border/50 p-3 space-y-1">
            <button
              onClick={() => setSelectedPlatform(null)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                selectedPlatform === null
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>全部</span>
              <span className="ml-auto text-xs text-muted-foreground">{webhooks.length}</span>
            </button>
            {PLATFORMS.map((platform) => {
              const count = webhooks.filter((w) => w.platform === platform.id).length;
              return (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    selectedPlatform === platform.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{platform.icon}</span>
                  <span>{platform.name}</span>
                  {count > 0 && <span className="ml-auto text-xs text-muted-foreground">{count}</span>}
                </button>
              );
            })}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-medium text-foreground">
                    {selectedPlatform ? PLATFORMS.find((p) => p.id === selectedPlatform)?.name : "全部链接"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPlatform ? PLATFORMS.find((p) => p.id === selectedPlatform)?.description : "管理所有外部 Webhook 链接"}
                  </p>
                </div>
                <button
                  onClick={handleAddWebhook}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </div>

              {filteredWebhooks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Link2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">暂无配置</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">点击上方按钮添加外部链接</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredWebhooks.map((webhook) => (
                    <div key={webhook.id} className="border border-border/50 rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <select
                            value={webhook.platform}
                            onChange={(e) => handleUpdateWebhook(webhook.id, "platform", e.target.value)}
                            className="px-3 py-1.5 bg-muted/50 border border-border/50 rounded-lg text-sm"
                          >
                            {PLATFORMS.map((p) => (
                              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={webhook.name}
                            onChange={(e) => handleUpdateWebhook(webhook.id, "name", e.target.value)}
                            className="px-3 py-1.5 bg-transparent border border-border/50 rounded-lg text-sm font-medium w-40"
                            placeholder="链接名称"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={webhook.enabled}
                              onChange={(e) => handleUpdateWebhook(webhook.id, "enabled", e.target.checked)}
                              className="rounded border-border"
                            />
                            <span className="text-xs text-muted-foreground">启用</span>
                          </label>
                          <button
                            onClick={() => handleDeleteWebhook(webhook.id)}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={webhook.url}
                        onChange={(e) => handleUpdateWebhook(webhook.id, "url", e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm font-mono"
                        placeholder="Webhook URL"
                      />
                      <input
                        type="password"
                        value={webhook.secret || ""}
                        onChange={(e) => handleUpdateWebhook(webhook.id, "secret", e.target.value)}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm font-mono"
                        placeholder="密钥 (可选)"
                      />
                    </div>
                  ))}
                </div>
              )}

              {filteredWebhooks.length > 0 && (
                <div className="flex justify-end mt-6 pt-4 border-t border-border/50">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    保存配置
                  </button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
