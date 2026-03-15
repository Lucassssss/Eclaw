"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Link2, 
  Mail, 
  Bot, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  MessageSquare,
  Webhook,
  Settings,
  Play,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// 设置存储 key
const SETTINGS_STORAGE_KEY = "app-settings";

// 类型定义
interface WebhookConfig {
  id: string;
  name: string;
  type: "feishu" | "wechat" | "dingtalk" | "custom";
  url: string;
  secret?: string;
  enabled: boolean;
}

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  secure: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  skills: string[];
  model: string;
  enabled: boolean;
}

interface AppSettings {
  webhooks: WebhookConfig[];
  smtp: SMTPConfig;
  agents: AgentConfig[];
}

const defaultSettings: AppSettings = {
  webhooks: [],
  smtp: {
    host: "",
    port: 587,
    username: "",
    password: "",
    from: "",
    secure: true,
  },
  agents: [
    {
      id: "default",
      name: "默认助手",
      description: "通用 AI 助手",
      systemPrompt: "你是一个有帮助的AI助手。",
      skills: [],
      model: "deepseek/deepseek-chat",
      enabled: true,
    },
  ],
};

// 加载设置
function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return defaultSettings;
}

// 保存设置
function saveSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

// Webhook 类型选项
const webhookTypes = [
  { id: "feishu", name: "飞书", icon: "🔗" },
  { id: "wechat", name: "微信客服", icon: "💬" },
  { id: "dingtalk", name: "钉钉", icon: "📌" },
  { id: "custom", name: "自定义", icon: "🔧" },
] as const;

// 可用技能列表
const availableSkills = [
  { id: "web-search", name: "网页搜索", description: "搜索互联网信息" },
  { id: "code-execution", name: "代码执行", description: "运行代码片段" },
  { id: "file-analysis", name: "文件分析", description: "分析上传的文件" },
  { id: "image-generation", name: "图像生成", description: "生成图像" },
  { id: "data-analysis", name: "数据分析", description: "分析和可视化数据" },
];

// 可用模型列表
const availableModels = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
  { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner" },
  { id: "minimax/MiniMax-M2.5", name: "MiniMax M2.5" },
];

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export function SettingsDialog({ isOpen, onClose, initialTab = "webhooks" }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // 初始化加载设置
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // 设置初始 tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 保存设置
  const handleSave = async () => {
    setSaving(true);
    try {
      saveSettings(settings);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Webhook 操作
  const addWebhook = () => {
    const newWebhook: WebhookConfig = {
      id: `webhook-${Date.now()}`,
      name: "新链接",
      type: "feishu",
      url: "",
      enabled: false,
    };
    setSettings(prev => ({
      ...prev,
      webhooks: [...prev.webhooks, newWebhook],
    }));
  };

  const updateWebhook = (id: string, updates: Partial<WebhookConfig>) => {
    setSettings(prev => ({
      ...prev,
      webhooks: prev.webhooks.map(w => w.id === id ? { ...w, ...updates } : w),
    }));
  };

  const deleteWebhook = (id: string) => {
    setSettings(prev => ({
      ...prev,
      webhooks: prev.webhooks.filter(w => w.id !== id),
    }));
  };

  // Agent 操作
  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: "新 Agent",
      description: "",
      systemPrompt: "",
      skills: [],
      model: "deepseek/deepseek-chat",
      enabled: true,
    };
    setSettings(prev => ({
      ...prev,
      agents: [...prev.agents, newAgent],
    }));
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setSettings(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  };

  const deleteAgent = (id: string) => {
    if (id === "default") return; // 不能删除默认 agent
    setSettings(prev => ({
      ...prev,
      agents: prev.agents.filter(a => a.id !== id),
    }));
  };

  const toggleSkill = (agentId: string, skillId: string) => {
    const agent = settings.agents.find(a => a.id === agentId);
    if (!agent) return;
    
    const hasSkill = agent.skills.includes(skillId);
    updateAgent(agentId, {
      skills: hasSkill 
        ? agent.skills.filter(s => s !== skillId)
        : [...agent.skills, skillId],
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "webhooks", label: "外部链接", icon: <Link2 className="w-4 h-4" /> },
    { id: "system", label: "系统设置", icon: <Mail className="w-4 h-4" /> },
    { id: "agents", label: "Agent 配置", icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">设置</h2>
              <p className="text-xs text-muted-foreground">配置系统参数和功能</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-border/50 p-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Webhooks Tab */}
              {activeTab === "webhooks" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-foreground">外部链接配置</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        配置飞书、微信客服等外部 Webhook，实现消息同步
                      </p>
                    </div>
                    <button
                      onClick={addWebhook}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      添加
                    </button>
                  </div>

                  {settings.webhooks.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                      <Webhook className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">暂无配置</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">点击上方按钮添加外部链接</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {settings.webhooks.map((webhook) => (
                        <div key={webhook.id} className="border border-border/50 rounded-lg p-4 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <select
                                value={webhook.type}
                                onChange={(e) => updateWebhook(webhook.id, { type: e.target.value as WebhookConfig["type"] })}
                                className="px-3 py-1.5 bg-muted/50 border border-border/50 rounded-lg text-sm"
                              >
                                {webhookTypes.map((t) => (
                                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={webhook.name}
                                onChange={(e) => updateWebhook(webhook.id, { name: e.target.value })}
                                className="px-3 py-1.5 bg-transparent border border-border/50 rounded-lg text-sm font-medium"
                                placeholder="链接名称"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={webhook.enabled}
                                  onChange={(e) => updateWebhook(webhook.id, { enabled: e.target.checked })}
                                  className="rounded border-border"
                                />
                                <span className="text-xs text-muted-foreground">启用</span>
                              </label>
                              <button
                                onClick={() => deleteWebhook(webhook.id)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Webhook URL</label>
                              <input
                                type="url"
                                value={webhook.url}
                                onChange={(e) => updateWebhook(webhook.id, { url: e.target.value })}
                                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Secret (可选)</label>
                              <input
                                type="password"
                                value={webhook.secret || ""}
                                onChange={(e) => updateWebhook(webhook.id, { secret: e.target.value })}
                                className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                                placeholder="签名密钥"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* System Tab */}
              {activeTab === "system" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-medium text-foreground">SMTP 邮件配置</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      配置邮件服务器，用于发送通知邮件
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">SMTP 服务器</label>
                      <input
                        type="text"
                        value={settings.smtp.host}
                        onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">端口</label>
                      <input
                        type="number"
                        value={settings.smtp.port}
                        onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, port: parseInt(e.target.value) || 587 } }))}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">用户名</label>
                      <input
                        type="text"
                        value={settings.smtp.username}
                        onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, username: e.target.value } }))}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">密码</label>
                      <input
                        type="password"
                        value={settings.smtp.password}
                        onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, password: e.target.value } }))}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">发件人地址</label>
                      <input
                        type="email"
                        value={settings.smtp.from}
                        onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, from: e.target.value } }))}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="noreply@example.com"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={settings.smtp.secure}
                          onChange={(e) => setSettings(prev => ({ ...prev, smtp: { ...prev.smtp, secure: e.target.checked } }))}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">使用 SSL/TLS</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Agents Tab */}
              {activeTab === "agents" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-foreground">Agent 配置</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        创建和管理智能代理，自定义系统提示词和技能
                      </p>
                    </div>
                    <button
                      onClick={addAgent}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新建 Agent
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settings.agents.map((agent) => (
                      <div key={agent.id} className="border border-border/50 rounded-lg overflow-hidden">
                        {/* Agent Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={agent.name}
                                onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                                className="bg-transparent font-medium text-sm border-none outline-none"
                                placeholder="Agent 名称"
                              />
                              <input
                                type="text"
                                value={agent.description}
                                onChange={(e) => updateAgent(agent.id, { description: e.target.value })}
                                className="bg-transparent text-xs text-muted-foreground border-none outline-none w-full"
                                placeholder="描述"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium hover:bg-primary/20 transition-colors"
                              title="运行此 Agent"
                            >
                              <Play className="w-3 h-3" />
                              运行
                            </button>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={agent.enabled}
                                onChange={(e) => updateAgent(agent.id, { enabled: e.target.checked })}
                                className="rounded border-border"
                              />
                              <span className="text-xs text-muted-foreground">启用</span>
                            </label>
                            {agent.id !== "default" && (
                              <button
                                onClick={() => deleteAgent(agent.id)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Agent Content */}
                        <div className="p-4 space-y-4">
                          {/* Model Selection */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">模型</label>
                            <select
                              value={agent.model}
                              onChange={(e) => updateAgent(agent.id, { model: e.target.value })}
                              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                            >
                              {availableModels.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* System Prompt */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">系统提示词</label>
                            <textarea
                              value={agent.systemPrompt}
                              onChange={(e) => updateAgent(agent.id, { systemPrompt: e.target.value })}
                              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm min-h-[100px] resize-none"
                              placeholder="定义 Agent 的角色和行为..."
                            />
                          </div>

                          {/* Skills */}
                          <div>
                            <label className="text-xs text-muted-foreground mb-2 block">技能</label>
                            <div className="flex flex-wrap gap-2">
                              {availableSkills.map((skill) => (
                                <button
                                  key={skill.id}
                                  onClick={() => toggleSkill(agent.id, skill.id)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                    agent.skills.includes(skill.id)
                                      ? "bg-primary/10 text-primary border border-primary/30"
                                      : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                                  )}
                                  title={skill.description}
                                >
                                  {skill.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            {saveStatus === "success" && (
              <span className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4" />
                保存失败
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
