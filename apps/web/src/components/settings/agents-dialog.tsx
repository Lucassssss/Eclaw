"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Save, 
  Loader2,
  CheckCircle2,
  Bot,
  Plus,
  Trash2,
  Play,
  Settings2,
  MessageSquare,
  Puzzle,
  Search,
  FileText,
  Code,
  ExternalLink,
  Copy,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// 设置存储 key
const AGENTS_STORAGE_KEY = "app-agents";

// Agent 配置类型
interface SkillDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  skills: SkillDefinition[];
  enabled: boolean;
  createdAt: number;
}

// 可用模型列表
const availableModels = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek" },
  { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner", provider: "DeepSeek" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
];

// Skills 市场示例
const skillsMarket: SkillDefinition[] = [
  {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "城市名称" },
        unit: { type: "string", description: "温度单位", enum: ["celsius", "fahrenheit"] }
      },
      required: ["city"]
    }
  },
  {
    name: "search_web",
    description: "搜索互联网获取最新信息",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        limit: { type: "number", description: "返回结果数量" }
      },
      required: ["query"]
    }
  },
  {
    name: "send_email",
    description: "发送电子邮件",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "收件人邮箱" },
        subject: { type: "string", description: "邮件主题" },
        body: { type: "string", description: "邮件内容" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "create_calendar_event",
    description: "创建日历事件",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "事件标题" },
        start_time: { type: "string", description: "开始时间 (ISO 8601)" },
        end_time: { type: "string", description: "结束时间 (ISO 8601)" },
        description: { type: "string", description: "事件描述" }
      },
      required: ["title", "start_time"]
    }
  },
  {
    name: "translate_text",
    description: "翻译文本到指定语言",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "要翻译的文本" },
        target_language: { type: "string", description: "目标语言代码" },
        source_language: { type: "string", description: "源语言代码（可选）" }
      },
      required: ["text", "target_language"]
    }
  },
];

const defaultAgent: AgentConfig = {
  id: "default",
  name: "默认助手",
  description: "通用 AI 助手",
  model: "deepseek/deepseek-chat",
  systemPrompt: "你是一个有帮助的 AI 助手，请用中文回答用户的问题。",
  skills: [],
  enabled: true,
  createdAt: Date.now(),
};

// 加载设置
function loadAgents(): AgentConfig[] {
  if (typeof window === "undefined") return [defaultAgent];
  try {
    const saved = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (saved) {
      const agents = JSON.parse(saved);
      return agents.length > 0 ? agents : [defaultAgent];
    }
  } catch (e) {
    console.error("Failed to load agents:", e);
  }
  return [defaultAgent];
}

// 保存设置
function saveAgents(agents: AgentConfig[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error("Failed to save agents:", e);
  }
}

interface AgentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRunAgent?: (agent: AgentConfig) => void;
}

export function AgentsDialog({ isOpen, onClose, onRunAgent }: AgentsDialogProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([defaultAgent]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("default");
  const [activeTab, setActiveTab] = useState<"basic" | "prompt" | "skills">("basic");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [showSkillsMarket, setShowSkillsMarket] = useState(false);
  const [newSkillJson, setNewSkillJson] = useState("");
  const [skillJsonError, setSkillJsonError] = useState("");

  useEffect(() => {
    if (isOpen) {
      const loaded = loadAgents();
      setAgents(loaded);
      if (loaded.length > 0 && !loaded.find(a => a.id === selectedAgentId)) {
        setSelectedAgentId(loaded[0].id);
      }
    }
  }, [isOpen]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  const handleSave = async () => {
    setSaving(true);
    try {
      saveAgents(agents);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } finally {
      setSaving(false);
    }
  };

  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: `agent-${Date.now()}`,
      name: "新 Agent",
      description: "",
      model: "deepseek/deepseek-chat",
      systemPrompt: "",
      skills: [],
      enabled: true,
      createdAt: Date.now(),
    };
    setAgents(prev => [...prev, newAgent]);
    setSelectedAgentId(newAgent.id);
    setActiveTab("basic");
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAgent = (id: string) => {
    if (agents.length <= 1) return;
    setAgents(prev => prev.filter(a => a.id !== id));
    if (selectedAgentId === id) {
      setSelectedAgentId(agents.find(a => a.id !== id)?.id || "");
    }
  };

  const addSkillFromMarket = (skill: SkillDefinition) => {
    if (!selectedAgent) return;
    if (selectedAgent.skills.find(s => s.name === skill.name)) return;
    updateAgent(selectedAgentId, {
      skills: [...selectedAgent.skills, skill]
    });
  };

  const removeSkill = (skillName: string) => {
    if (!selectedAgent) return;
    updateAgent(selectedAgentId, {
      skills: selectedAgent.skills.filter(s => s.name !== skillName)
    });
  };

  const addCustomSkill = () => {
    if (!selectedAgent || !newSkillJson.trim()) return;
    try {
      const skill = JSON.parse(newSkillJson) as SkillDefinition;
      if (!skill.name || !skill.description || !skill.parameters) {
        setSkillJsonError("缺少必要字段: name, description, parameters");
        return;
      }
      if (selectedAgent.skills.find(s => s.name === skill.name)) {
        setSkillJsonError("该 Skill 名称已存在");
        return;
      }
      updateAgent(selectedAgentId, {
        skills: [...selectedAgent.skills, skill]
      });
      setNewSkillJson("");
      setSkillJsonError("");
    } catch {
      setSkillJsonError("JSON 格式错误");
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "basic", label: "基础配置", icon: <Settings2 className="w-3.5 h-3.5" /> },
    { id: "prompt", label: "系统提示词", icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: "skills", label: "Skills", icon: <Puzzle className="w-3.5 h-3.5" /> },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - 不可点击关闭 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Dialog */}
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-5xl h-[650px] flex flex-col overflow-hidden border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Agent 配置</h2>
              <p className="text-xs text-muted-foreground">创建和管理智能代理</p>
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
          {/* 左侧 Agent 列表 */}
          <div className="w-56 border-r border-border/50 flex flex-col">
            <div className="p-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2">
                Agent 列表
              </span>
              <button
                onClick={addAgent}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="新建 Agent"
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={cn(
                      "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
                      selectedAgentId === agent.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                      selectedAgentId === agent.id ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Bot className={cn(
                        "w-3.5 h-3.5",
                        selectedAgentId === agent.id ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm truncate",
                        selectedAgentId === agent.id ? "text-primary font-medium" : "text-foreground"
                      )}>
                        {agent.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 truncate">
                        {agent.skills.length} skills
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRunAgent?.(agent);
                          onClose();
                        }}
                        className="p-1 hover:bg-primary/10 rounded transition-colors"
                        title="运行"
                      >
                        <Play className="w-3 h-3 text-primary" />
                      </button>
                      {agents.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAgent(agent.id);
                          }}
                          className="p-1 hover:bg-destructive/10 rounded transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧配置内容 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Tabs */}
            <div className="border-b border-border/30 px-4">
              <div className="flex gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-[1px]",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <ScrollArea className="flex-1">
              <div className="p-5">
                {selectedAgent && activeTab === "basic" && (
                  <div className="space-y-5 max-w-xl">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">名称</label>
                      <input
                        type="text"
                        value={selectedAgent.name}
                        onChange={(e) => updateAgent(selectedAgentId, { name: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="Agent 名称"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">描述</label>
                      <input
                        type="text"
                        value={selectedAgent.description}
                        onChange={(e) => updateAgent(selectedAgentId, { description: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                        placeholder="简短描述这个 Agent 的用途"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">模型</label>
                      <select
                        value={selectedAgent.model}
                        onChange={(e) => updateAgent(selectedAgentId, { model: e.target.value })}
                        className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                      >
                        {availableModels.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAgent.enabled}
                          onChange={(e) => updateAgent(selectedAgentId, { enabled: e.target.checked })}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-muted-foreground">启用此 Agent</span>
                      </label>
                    </div>
                  </div>
                )}

                {selectedAgent && activeTab === "prompt" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">系统提示词</label>
                      <p className="text-[11px] text-muted-foreground/60 mb-2">
                        定义 Agent 的角色、行为和限制
                      </p>
                      <textarea
                        value={selectedAgent.systemPrompt}
                        onChange={(e) => updateAgent(selectedAgentId, { systemPrompt: e.target.value })}
                        className="w-full h-[400px] px-4 py-3 bg-muted/30 border border-border/50 rounded-lg text-sm font-mono resize-none"
                        placeholder="你是一个..."
                      />
                    </div>
                  </div>
                )}

                {selectedAgent && activeTab === "skills" && (
                  <div className="space-y-5">
                    {/* 当前 Skills */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-foreground">已配置 Skills</h4>
                          <p className="text-[11px] text-muted-foreground/60">
                            Agent 可调用的工具函数
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowSkillsMarket(!showSkillsMarket)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                              showSkillsMarket 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <Search className="w-3.5 h-3.5" />
                            Skills 市场
                          </button>
                        </div>
                      </div>

                      {selectedAgent.skills.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-lg">
                          <Puzzle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">暂无 Skills</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            从市场添加或手动编写
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {selectedAgent.skills.map((skill) => (
                            <div
                              key={skill.name}
                              className="flex items-start gap-3 p-3 border border-border/50 rounded-lg bg-muted/20"
                            >
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                <Code className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium font-mono">{skill.name}</span>
                                  <button
                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(skill, null, 2))}
                                    className="p-0.5 hover:bg-muted rounded"
                                    title="复制 JSON"
                                  >
                                    <Copy className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {Object.keys(skill.parameters.properties || {}).map((param) => (
                                    <span
                                      key={param}
                                      className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono"
                                    >
                                      {param}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => removeSkill(skill.name)}
                                className="p-1 hover:bg-destructive/10 rounded transition-colors shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Skills 市场 */}
                    {showSkillsMarket && (
                      <div className="border-t border-border/30 pt-5">
                        <h4 className="text-sm font-medium text-foreground mb-3">Skills 市场</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {skillsMarket.map((skill) => {
                            const isAdded = selectedAgent.skills.find(s => s.name === skill.name);
                            return (
                              <button
                                key={skill.name}
                                onClick={() => !isAdded && addSkillFromMarket(skill)}
                                disabled={!!isAdded}
                                className={cn(
                                  "flex items-start gap-2.5 p-3 border rounded-lg text-left transition-colors",
                                  isAdded 
                                    ? "border-primary/30 bg-primary/5 opacity-60"
                                    : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                                )}
                              >
                                <Code className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium font-mono truncate">{skill.name}</div>
                                  <p className="text-[11px] text-muted-foreground line-clamp-2">{skill.description}</p>
                                </div>
                                {isAdded && (
                                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 手动添加 Skill */}
                    <div className="border-t border-border/30 pt-5">
                      <h4 className="text-sm font-medium text-foreground mb-1">手动添加 Skill</h4>
                      <p className="text-[11px] text-muted-foreground/60 mb-3">
                        按照 OpenAI Function Calling 格式编写 Skill 定义
                      </p>
                      <textarea
                        value={newSkillJson}
                        onChange={(e) => {
                          setNewSkillJson(e.target.value);
                          setSkillJsonError("");
                        }}
                        className={cn(
                          "w-full h-40 px-3 py-2 bg-muted/30 border rounded-lg text-xs font-mono resize-none",
                          skillJsonError ? "border-destructive" : "border-border/50"
                        )}
                        placeholder={`{
  "name": "my_function",
  "description": "函数描述",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "参数描述" }
    },
    "required": ["param1"]
  }
}`}
                      />
                      {skillJsonError && (
                        <p className="text-xs text-destructive mt-1">{skillJsonError}</p>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <a
                          href="https://platform.openai.com/docs/guides/function-calling"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          查看格式文档
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          onClick={addCustomSkill}
                          disabled={!newSkillJson.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          添加
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
