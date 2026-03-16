"use client";

import { useState, useEffect } from "react";
import { X, Mail, Server, Key, Globe, Settings, Loader2, CheckCircle2, Palette, Sun, Moon, Monitor } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "next-themes";

const SYSTEM_CONFIGS = [
  { id: "appearance", name: "界面设置", icon: Palette, description: "主题和显示配置" },
  { id: "smtp", name: "SMTP 邮件", icon: Mail, description: "配置邮件发送服务器" },
  { id: "sms", name: "短信服务", icon: Globe, description: "配置短信发送服务" },
  { id: "storage", name: "存储服务", icon: Server, description: "配置文件存储服务" },
  { id: "api", name: "API 密钥", icon: Key, description: "管理第三方 API 密钥" },
];

const THEMES = [
  { id: "system", name: "跟随系统", icon: Monitor, description: "根据系统设置自动切换" },
  { id: "light", name: "亮色模式", icon: Sun, description: "浅色主题" },
  { id: "dark", name: "暗色模式", icon: Moon, description: "深色主题" },
];

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemModal({ isOpen, onClose }: SystemModalProps) {
  const [selectedConfig, setSelectedConfig] = useState("appearance");
  const [saving, setSaving] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState({
    host: "",
    port: "587",
    username: "",
    password: "",
    fromEmail: "",
    fromName: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme && selectedConfig === "appearance") {
      localStorage.setItem("theme", theme);
    }
  }, [theme, selectedConfig]);

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  if (!isOpen) return null;

  const currentConfig = SYSTEM_CONFIGS.find((c) => c.id === selectedConfig);
  const Icon = currentConfig?.icon || Settings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] min-h-[500px] flex flex-col overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4e83fd] to-[#3370ff] flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">设置</h2>
              <p className="text-xs text-muted-foreground">设置系统各项服务和功能</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-56 border-r border-border/50 p-3 space-y-1">
            {SYSTEM_CONFIGS.map((config) => {
              const ConfigIcon = config.icon;
              return (
                <button
                  key={config.id}
                  onClick={() => setSelectedConfig(config.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-sm transition-colors text-left ${
                    selectedConfig === config.id
                      ? "bg-[#4e83fd]/10 text-[#4e83fd] font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ConfigIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm">{config.name}</div>
                    <div className={`text-xs mt-0.5 ${selectedConfig === config.id ? "text-[#4e83fd]/70" : "text-muted-foreground/70"}`}>
                      {config.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-base font-medium text-foreground flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  {currentConfig?.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{currentConfig?.description}</p>
              </div>

              {selectedConfig === "appearance" && (
                <div className="space-y-6 max-w-lg">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-3 block">主题模式</label>
                    <div className="grid grid-cols-3 gap-3">
                      {THEMES.map((t) => {
                        const ThemeIcon = t.icon;
                        const isActive = mounted && theme === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleThemeChange(t.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                              isActive
                                ? "border-[#4e83fd] bg-[#4e83fd]/5 shadow-sm"
                                : "border-border/50 hover:border-[#4e83fd]/50 hover:bg-muted/50"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isActive ? "bg-[#4e83fd] text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              <ThemeIcon className="w-5 h-5" />
                            </div>
                            <span className={`text-sm font-medium ${isActive ? "text-[#4e83fd]" : "text-foreground"}`}>
                              {t.name}
                            </span>
                            <span className="text-xs text-muted-foreground text-center">
                              {t.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">当前主题</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mounted ? (
                            resolvedTheme === "dark" ? "暗色模式" : resolvedTheme === "light" ? "亮色模式" : "跟随系统"
                          ) : "加载中..."}
                        </p>
                      </div>
                      {mounted && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          resolvedTheme === "dark" 
                            ? "bg-zinc-800 text-zinc-200" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {resolvedTheme === "dark" ? "🌙 暗色" : "☀️ 亮色"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedConfig === "smtp" && (
                <div className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">SMTP 服务器</label>
                    <input
                      type="text"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp.example.com"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">端口</label>
                    <input
                      type="text"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                      placeholder="587"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">用户名</label>
                    <input
                      type="text"
                      value={smtpConfig.username}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                      placeholder="your-email@example.com"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">密码</label>
                    <input
                      type="password"
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      placeholder="••••••••"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">发件人邮箱</label>
                    <input
                      type="text"
                      value={smtpConfig.fromEmail}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                      placeholder="noreply@example.com"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3 items-center">
                    <label className="text-sm text-muted-foreground">发件人名称</label>
                    <input
                      type="text"
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                      placeholder="Eclaw AI"
                      className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      保存配置
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                      测试连接
                    </button>
                  </div>
                </div>
              )}

              {selectedConfig !== "appearance" && selectedConfig !== "smtp" && (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Icon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{currentConfig?.name} 配置开发中...</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">即将支持，敬请期待</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
