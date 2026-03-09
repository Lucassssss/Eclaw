export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp: number;
}

export interface ConversationHistory {
  messages: ConversationMessage[];
  lastUpdated: number;
}

export interface ModelConfig {
  model: string;
  temperature: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  mode?: "auto" | "agent";
  model?: "chat" | "reasoner";
  sessionId?: string;
}

export interface ChatResponse {
  type: "content" | "reasoning" | "tool_call" | "tool_result" | "error" | "done";
  content?: string;
  name?: string;
  input?: string;
  output?: string;
  toolId?: string;
  error?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}
