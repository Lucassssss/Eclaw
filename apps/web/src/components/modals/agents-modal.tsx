"use client";

import { useState } from "react";
import { X, Plus, Trash2, Play, Square, Settings, FileText, Sparkles, Bot, Save, Loader2, CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  skills: AgentSkill[];
  status: "idle" | "running" | "stopped";
  enabled: boolean;
}

interface AgentSkill {
  id: string;
  name: string;
  description: string;
  content: string;
}

type AgentTab = "basic" | "prompt" | "skills";

const TABS: { id: AgentTab; name: string; icon: React.ReactNode }[] = [
  { id: "basic", name: "基础配置", icon: <Settings className="w-4 h-4" /> },
  { id: "prompt", name: "系统提示词", icon: <FileText className="w-4 h-4" /> },
  { id: "skills", name: "技能 SKILLS", icon: <Sparkles className="w-4 h-4" /> },
];

const MODELS = [
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat" },
  { id: "deepseek/deepseek-reasoner", name: "DeepSeek Reasoner" },
  { id: "minimax/MiniMax-M2.5", name: "MiniMax-M2.5" },
  { id: "minimax/MiniMax-M2.5-highspeed", name: "MiniMax-M2.5-HighSpeed" },
];

interface AgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentsModal({ isOpen, onClose }: AgentsModalProps) {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "默认助手",
      description: "通用的 AI 助手",
      model: "deepseek/deepseek-chat",
      systemPrompt: "你是一个有帮助的 AI 助手。",
      skills: [],
      status: "idle",
      enabled: true,
    },
  ]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("1");
  const [activeTab, setActiveTab] = useState<AgentTab>("basic");
  const [showSkillEditor, setShowSkillEditor] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AgentSkill | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleAddAgent = () => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: "新 Agent",
      description: "",
      model: "deepseek/deepseek-chat",
      systemPrompt: "",
      skills: [],
      status: "idle",
      enabled: true,
    };
    setAgents([...agents, newAgent]);
    setSelectedAgentId(newAgent.id);
  };

  const handleDeleteAgent = (id: string) => {
    setAgents(agents.filter((a) => a.id !== id));
    if (selectedAgentId === id && agents.length > 1) {
      setSelectedAgentId(agents.find((a) => a.id !== id)?.id || "");
    }
  };

  const handleUpdateAgent = (field: keyof Agent, value: string | boolean) => {
    setAgents(agents.map((a) => (a.id === selectedAgentId ? { ...a, [field]: value } : a)));
  };

  const handleAddSkill = () => {
    const newSkill: AgentSkill = {
      id: Date.now().toString(),
      name: "新技能",
      description: "",
      content: "",
    };
    setAgents(
      agents.map((a) =>
        a.id === selectedAgentId ? { ...a, skills: [...a.skills, newSkill] } : a
      )
    );
    setEditingSkill(newSkill);
    setShowSkillEditor(true);
  };

  const handleSaveSkill = () => {
    if (!editingSkill) return;
    setAgents(
      agents.map((a) =>
        a.id === selectedAgentId
          ? {
              ...a,
              skills: a.skills.some((s) => s.id === editingSkill.id)
                ? a.skills.map((s) => (s.id === editingSkill.id ? editingSkill : s))
                : [...a.skills, editingSkill],
            }
          : a
      )
    );
    setShowSkillEditor(false);
    setEditingSkill(null);
  };

  const handleDeleteSkill = (skillId: string) => {
    setAgents(
      agents.map((a) =>
        a.id === selectedAgentId ? { ...a, skills: a.skills.filter((s) => s.id !== skillId) } : a
      )
    );
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] min-h-[550px] flex flex-col overflow-hidden border border-border/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4e83fd] to-[#3370ff] flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Agent 配置</h2>
              <p className="text-xs text-muted-foreground">配置和管理 AI 员工</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-64 border-r border-border/50 flex flex-col shrink-0">
            <div className="p-3 border-b border-border/50">
              <button
                onClick={handleAddAgent}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加 Agent
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`group flex items-center gap-2 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAgentId === agent.id
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      agent.enabled ? "bg-primary/20" : "bg-muted"
                    }`}>
                      <Bot className={`w-4 h-4 ${agent.enabled ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{agent.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{agent.description || "暂无描述"}</div>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      {agent.status === "idle" ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgents(agents.map((a) => (a.id === agent.id ? { ...a, status: "running" as const } : a)));
                          }}
                          className="p-1.5 hover:bg-primary/20 rounded transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-primary" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgents(agents.map((a) => (a.id === agent.id ? { ...a, status: "idle" as const } : a)));
                          }}
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                        >
                          <Square className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgent(agent.id);
                        }}
                        className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            {selectedAgent ? (
              <>
                <div className="border-b border-border/50 shrink-0">
                  <div className="flex">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-colors ${
                          activeTab === tab.id
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.icon}
                        {tab.name}
                      </button>
                    ))}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    {activeTab === "basic" && (
                      <div className="space-y-4 max-w-lg">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">启用状态</label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAgent.enabled}
                              onChange={(e) => handleUpdateAgent("enabled", e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-3 items-center">
                          <label className="text-sm text-muted-foreground">名称</label>
                          <input
                            type="text"
                            value={selectedAgent.name}
                            onChange={(e) => handleUpdateAgent("name", e.target.value)}
                            placeholder="Agent 名称"
                            className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 items-center">
                          <label className="text-sm text-muted-foreground">描述</label>
                          <input
                            type="text"
                            value={selectedAgent.description}
                            onChange={(e) => handleUpdateAgent("description", e.target.value)}
                            placeholder="简短描述"
                            className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 items-center">
                          <label className="text-sm text-muted-foreground">模型</label>
                          <select
                            value={selectedAgent.model}
                            onChange={(e) => handleUpdateAgent("model", e.target.value)}
                            className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                          >
                            {MODELS.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {activeTab === "prompt" && (
                      <div className="h-full">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="text-sm font-medium">系统提示词</label>
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            保存
                          </button>
                        </div>
                        <textarea
                          value={selectedAgent.systemPrompt}
                          onChange={(e) => handleUpdateAgent("systemPrompt", e.target.value)}
                          placeholder="在这里输入系统提示词，定义 Agent 的行为和能力..."
                          className="w-full h-[calc(100%-50px)] min-h-[300px] px-4 py-3 bg-muted/30 border border-border/50 rounded-lg font-mono text-sm resize-none"
                        />
                      </div>
                    )}

                    {activeTab === "skills" && (
                      <div className="h-full">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-medium">技能列表</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              管理 Agent 的技能，每个技能包含执行指令和逻辑
                            </p>
                          </div>
                          <button
                            onClick={handleAddSkill}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            添加技能
                          </button>
                        </div>

                        {selectedAgent.skills.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-lg">
                            <Sparkles className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">暂无技能</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">点击上方按钮添加技能</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedAgent.skills.map((skill) => (
                              <div
                                key={skill.id}
                                className="border border-border/50 rounded-lg p-4 hover:border-primary/50 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <span className="font-medium text-sm">{skill.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingSkill(skill);
                                        setShowSkillEditor(true);
                                      }}
                                      className="p-1.5 hover:bg-muted rounded transition-colors"
                                    >
                                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSkill(skill.id)}
                                      className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {skill.description || "暂无描述"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">选择一个 Agent 进行配置</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSkillEditor && editingSkill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-2xl mx-4 h-[80vh] min-h-[450px] bg-card border border-border/50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
              <h3 className="text-lg font-semibold">编辑技能</h3>
              <button
                onClick={() => { setShowSkillEditor(false); setEditingSkill(null); }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-sm text-muted-foreground">技能名称</label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  placeholder="技能名称"
                  className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <label className="text-sm text-muted-foreground">描述</label>
                <input
                  type="text"
                  value={editingSkill.description}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  placeholder="简短描述这个技能的用途"
                  className="col-span-2 px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 items-start">
                <label className="text-sm text-muted-foreground pt-2">技能指令</label>
                <textarea
                  value={editingSkill.content}
                  onChange={(e) => setEditingSkill({ ...editingSkill, content: e.target.value })}
                  placeholder="定义这个技能的执行逻辑和指令..."
                  className="col-span-2 min-h-[300px] px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm font-mono resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border/50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => { setShowSkillEditor(false); setEditingSkill(null); }}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSkill}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                保存技能
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
