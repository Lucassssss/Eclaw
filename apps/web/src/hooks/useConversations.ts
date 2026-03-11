import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  isComplete?: boolean;
  blocks?: any[];
  reasoning?: string;
  toolCalls?: any[];
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  mode: string;
  createdAt: number;
  updatedAt: number;
}

interface ConversationStore {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  error: string | null;

  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  clearCurrentMessages: () => Promise<void>;

  sendMessage: (content: string) => Promise<void>;
}

const API_BASE = "http://localhost:3001";

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      set({ conversations: data.conversations || [], loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createConversation: async (title?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      const conversation = data.conversation;
      
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        messages: [],
        loading: false,
      }));
      
      return conversation;
    } catch (error) {
      set({ error: String(error), loading: false });
      throw error;
    }
  },

  selectConversation: async (id: string) => {
    set({ loading: true, error: null });
    
    try {
      const convRes = await fetch(`${API_BASE}/conversations/${id}`);
      const convData = await convRes.json();
      
      set({ currentConversation: convData.conversation });
      
      const msgRes = await fetch(`${API_BASE}/conversations/${id}/messages`);
      const msgData = await msgRes.json();
      
      set({
        messages: (msgData.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
        })),
        loading: false,
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
      
      const { currentConversation, conversations } = get();
      set({
        conversations: conversations.filter((c) => c.id !== id),
        currentConversation: currentConversation?.id === id ? null : currentConversation,
        messages: currentConversation?.id === id ? [] : get().messages,
      });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  updateConversationTitle: async (id: string, title: string) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
        currentConversation: state.currentConversation?.id === id
          ? { ...state.currentConversation, title }
          : state.currentConversation,
      }));
    } catch (error) {
      set({ error: String(error) });
    }
  },

  clearCurrentMessages: async () => {
    const { currentConversation } = get();
    if (!currentConversation) return;
    
    try {
      await fetch(`${API_BASE}/conversations/${currentConversation.id}/messages`, {
        method: "DELETE",
      });
      set({ messages: [] });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  sendMessage: async (content: string) => {
    const { currentConversation, messages, sending } = get();
    if (sending) return;
    
    set({ sending: true, error: null });

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const assistantMessage: Message = {
      id: `temp-${Date.now()}-assistant`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      blocks: [],
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
    }));

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentConversation?.id,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content },
          ],
          mode: currentConversation?.mode || "agent",
          model: currentConversation?.model || "deepseek/deepseek-chat",
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let currentConversationId = currentConversation?.id;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            set((state) => ({
              sending: false,
              messages: state.messages.map((m) =>
                m.id === assistantMessage.id ? { ...m, isComplete: true } : m
              ),
            }));
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "conversation_created") {
              currentConversationId = parsed.id;
              const conv = await fetch(`${API_BASE}/conversations/${parsed.id}`).then(r => r.json());
              set((state) => ({
                currentConversation: conv.conversation,
                conversations: [conv.conversation, ...state.conversations],
              }));
              continue;
            }

            if (parsed.type === "title_generated") {
              const { currentConversation } = get();
              if (currentConversation) {
                set((state) => ({
                  conversations: state.conversations.map((c) =>
                    c.id === currentConversation.id ? { ...c, title: parsed.title } : c
                  ),
                  currentConversation: { ...state.currentConversation!, title: parsed.title },
                }));
              }
              continue;
            }

            if (parsed.type === "text" || parsed.type === "reasoning") {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? {
                        ...m,
                        content: m.content + (parsed.content || ""),
                        reasoning:
                          parsed.type === "reasoning"
                            ? (m.reasoning || "") + parsed.content
                            : m.reasoning,
                      }
                    : m
                ),
              }));
            }

            if (parsed.type === "tool_call") {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls || []),
                          {
                            id: parsed.id,
                            name: parsed.name,
                            input: parsed.input,
                            status: "running" as const,
                          },
                        ],
                      }
                    : m
                ),
              }));
            }

            if (parsed.type === "tool_result") {
              set((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map((tc) =>
                          tc.name === parsed.toolName
                            ? { ...tc, output: parsed.output, status: "completed" as const }
                            : tc
                        ),
                      }
                    : m
                ),
              }));
            }

            if (parsed.error) {
              set((state) => ({
                sending: false,
                error: parsed.error,
              }));
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (error) {
      set({ sending: false, error: String(error) });
    }
  },
}));
