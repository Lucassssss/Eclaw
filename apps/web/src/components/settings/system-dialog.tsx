"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  Loader2,
  CheckCircle2,
  Settings,
  Mail,
  Database,
  Shield,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// 设置存储 key
const SYSTEM_STORAGE_KEY = "app-system-settings";

// 系统配置类型
interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  from: string;
  fromName: string;
  secure: boolean;
}

interface SystemSettings {
  smtp: SMTPConfig;
}

const defaultSettings: SystemSettings = {
  smtp: {
    host: "",
    port: 587,
    username: "",
    password: "",
    from: "",
    fromName: "",
    secure: true,
  },
};

// 配置项列表
const configItems = [
  { 
    id: "smtp", 
    name: "SMTP 邮件", 
    icon: <Mail className="w-4 h-4" />,
    description: "配置邮件发送服务"
  },
  { 
    id: "database", 
    name: "数据库", 
    icon: <Database className="w-4 h-4" />,
    description: "数据库连接配置",
    disabled: true
  },
  { 
    id: "security", 
    name: "安全设置", 
    icon: <Shield className="w-4 h-4" />,
    description: "安全与权限配置",
    disabled: true
  },
  { 
    id: "notification", 
    name: "通知设置", 
    icon: <Bell className="w-4 h-4" />,
    description: "系统通知配置",
    disabled: true
  },
];

// 加载设置
function loadSettings(): SystemSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const saved = localStorage.getItem(SYSTEM_STORAGE_KEY);
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
  } catch (e) {
    console.error("Failed to load system settings:", e);
  }
  return defaultSettings;
}

// 保存设置
function saveSettings(settings: SystemSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYSTEM_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save system settings:", e);
  }
}

interface SystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemDialog({ isOpen, onClose }: SystemDialogProps) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [selectedConfig, setSelectedConfig] = useState<string>("smtp");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      saveSettings(settings);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateSMTP = (updates: Partial<SMTPConfig>) => {
    setSettings(prev => ({
      ...prev,
      smtp: { ...prev.smtp, ...updates }
    }));
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
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">系统设置</h2>
              <p className="text-xs text-muted-foreground">配置系统参数</p>
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
          {/* 左侧配置项列表 */}
          <div className="w-56 border-r border-border/50 flex flex-col">
            <div className="p-2 border-b border-border/30">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2">
                配置项
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {configItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => !item.disabled && setSelectedConfig(item.id)}
                    disabled={item.disabled}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                      item.disabled && "opacity-50 cursor-not-allowed",
                      selectedConfig === item.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground/60 truncate">
                        {item.description}
                      </div>
                    </div>
                    {item.disabled && (
                      <span className="text-[9px] text-muted-foreground/50 bg-muted px-1 py-0.5 rounded">
                        即将推出
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧配置内容 */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {selectedConfig === "smtp" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">SMTP 邮件服务配置</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      配置 SMTP 服务器，用于发送系统通知邮件
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">SMTP 服务器</label>
                      <input
                        type="text"
                        value={settings.smtp.host}
                        onChange={(e) => updateSMTP({ host: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="smtp.example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">端口</label>
                      <input
                        type="number"
                        value={settings.smtp.port}
                        onChange={(e) => updateSMTP({ port: parseInt(e.target.value) || 587 })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="587"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">用户名</label>
                      <input
                        type="text"
                        value={settings.smtp.username}
                        onChange={(e) => updateSMTP({ username: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">密码</label>
                      <input
                        type="password"
                        value={settings.smtp.password}
                        onChange={(e) => updateSMTP({ password: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">发件人地址</label>
                      <input
                        type="email"
                        value={settings.smtp.from}
                        onChange={(e) => updateSMTP({ from: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="noreply@example.com"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">发件人名称</label>
                      <input
                        type="text"
                        value={settings.smtp.fromName}
                        onChange={(e) => updateSMTP({ fromName: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="AI Assistant"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.smtp.secure}
                          onChange={(e) => updateSMTP({ secure: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">使用 SSL/TLS 加密连接</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                      <Mail className="w-4 h-4" />
                      发送测试邮件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
