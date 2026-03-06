"use client";

import { useEffect, useRef } from "react";
import { Settings, X, Moon, Sun, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "./theme-provider";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClearChat: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  onClearChat,
}: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const isDark = theme === "dark";

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="fixed inset-0 bg-background/80" />
      <div
        ref={panelRef}
        className="relative w-full max-w-sm mx-4 bg-card border border-border shadow-sm"
        style={{ borderRadius: "4px" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">
            设置
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-2">
          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent rounded-sm transition-colors"
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span>{isDark ? "浅色模式" : "深色模式"}</span>
          </button>

          <button
            onClick={onClearChat}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-accent rounded-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>清除对话</span>
          </button>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            AI Assistant v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}

interface SettingsButtonProps {
  onClick: () => void;
  className?: string;
}

export function SettingsButton({ onClick, className }: SettingsButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`h-9 w-9 ${className}`}
    >
      <Settings className="w-4 h-4" />
    </Button>
  );
}
