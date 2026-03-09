import type { ConversationHistory, ConversationMessage } from "../types/index.js";

const conversationHistories: Map<string, ConversationHistory> = new Map();
const DEFAULT_SESSION_ID = "default";
const MAX_HISTORY_LENGTH = 20;

export function getHistory(sessionId: string): ConversationMessage[] {
  const history = conversationHistories.get(sessionId);
  if (!history) return [];
  return history.messages;
}

export function addToHistory(
  sessionId: string,
  role: string,
  content: string
): void {
  let history = conversationHistories.get(sessionId);
  if (!history) {
    history = { messages: [], lastUpdated: Date.now() };
    conversationHistories.set(sessionId, history);
  }
  history.messages.push({ role, content, timestamp: Date.now() });
  if (history.messages.length > MAX_HISTORY_LENGTH) {
    history.messages = history.messages.slice(-MAX_HISTORY_LENGTH);
  }
}

export function clearHistory(sessionId: string): void {
  conversationHistories.delete(sessionId || DEFAULT_SESSION_ID);
}

export function getDefaultSessionId(): string {
  return DEFAULT_SESSION_ID;
}
