import express from "express";
import cors from "cors";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { createAgent, tool } from "langchain";
import { z } from "zod";

const app = express();
const PORT = process.env.PORT || 3001;

const deepseekKey = process.env.DEEPSEEK_API_KEY;
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

app.use(cors());
app.use(express.json());

const llm = new ChatOpenAI({
  model: "deepseek-chat",
  temperature: 0.7,
  apiKey: deepseekKey,
  configuration: {
    baseURL: deepseekBaseUrl,
  },
  streaming: true,
});

const calculatorTool = tool(
  ({ expression }: { expression: string }) => {
    console.log(`[Calculator] Input: ${expression}`);
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      console.log(`[Calculator] Result: ${result}`);
      return String(result);
    } catch (e) {
      console.error(`[Calculator] Error: ${e}`);
      return "计算错误";
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式的值。支持: +, -, *, /, **, %, 括号。例如: '(2 + 3) * 4'",
    schema: z.object({
      expression: z.string().describe("需要计算的数学表达式"),
    }),
  }
);

const searchTool = tool(
  ({ query }: { query: string }) => {
    console.log(`[Search] Query: ${query}`);
    return `搜索结果 for "${query}": 这是一个模拟搜索结果。在生产环境中，这里会调用真实的搜索 API。`;
  },
  {
    name: "search",
    description: "搜索信息。当用户询问实时信息或你不知道的内容时使用。",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

const getCurrentTimeTool = tool(
  () => {
    const now = new Date();
    return now.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },
  {
    name: "get_current_time",
    description: "获取当前时间。无需输入参数。",
  }
);

const tools = [calculatorTool, searchTool, getCurrentTimeTool];

const agent = createAgent({
  model: llm,
  tools,
});

interface ConversationHistory {
  messages: { role: string; content: string; timestamp: number }[];
  lastUpdated: number;
}

const conversationHistories: Map<string, ConversationHistory> = new Map();
const DEFAULT_SESSION_ID = "default";
const MAX_HISTORY_LENGTH = 20;
const HISTORY_EXPIRY_MS = 24 * 60 * 60 * 1000;

function getHistory(sessionId: string): { role: string; content: string; timestamp: number }[] {
  const history = conversationHistories.get(sessionId);
  if (!history) return [];
  
  if (Date.now() - history.lastUpdated > HISTORY_EXPIRY_MS) {
    conversationHistories.delete(sessionId);
    return [];
  }
  
  return history.messages;
}

function addToHistory(sessionId: string, role: string, content: string) {
  let history = conversationHistories.get(sessionId);
  if (!history) {
    history = { messages: [], lastUpdated: Date.now() };
    conversationHistories.set(sessionId, history);
  }
  
  history.messages.push({ role, content, timestamp: Date.now() });
  history.lastUpdated = Date.now();
  
  if (history.messages.length > MAX_HISTORY_LENGTH) {
    history.messages = history.messages.slice(-MAX_HISTORY_LENGTH);
  }
}

function clearHistory(sessionId: string) {
  conversationHistories.delete(sessionId);
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API server is running" });
});

app.get("/tools", (req, res) => {
  res.json({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
});

app.get("/history", (req, res) => {
  const sessionId = (req.query.sessionId as string) || DEFAULT_SESSION_ID;
  const history = getHistory(sessionId);
  res.json({ sessionId, messages: history });
});

app.post("/history/clear", (req, res) => {
  const { sessionId } = req.body;
  const targetSessionId = sessionId || DEFAULT_SESSION_ID;
  clearHistory(targetSessionId);
  res.json({ success: true, sessionId: targetSessionId });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!deepseekKey) {
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is not set" });
    }

    const { messages, mode = "auto", sessionId = DEFAULT_SESSION_ID } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const savedHistory = getHistory(sessionId);
    
    const langchainMessages = [
      ...savedHistory.map((msg) => 
        msg.role === "user" ? new HumanMessage(msg.content) : 
        msg.role === "assistant" ? new AIMessage(msg.content) :
        new HumanMessage(msg.content)
      ),
      ...messages.map((msg: { role: string; content: string }) => {
        if (msg.role === "user") {
          return new HumanMessage(msg.content);
        } else if (msg.role === "assistant") {
          return new AIMessage(msg.content);
        }
        return new HumanMessage(msg.content);
      })
    ];

    if (mode === "agent") {
      try {
        let fullResponse = "";
        
        const stream = agent.streamEvents(
          { messages: langchainMessages },
          { version: "v2" }
        );

        for await (const event of stream) {
          if (res.destroyed) break;

          const eventType = event.event;
          
          if (eventType === "on_chat_model_stream") {
            const content = event.data?.chunk?.content;
            if (content) {
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ type: "content", content })}\n\n`);
            }
          } else if (eventType === "on_tool_start") {
            res.write(`data: ${JSON.stringify({ 
              type: "tool_call", 
              name: event.name || "unknown", 
              input: JSON.stringify(event.data?.input || {}),
              toolId: String(event.run_id || "default")
            })}\n\n`);
          } else if (eventType === "on_tool_end") {
            res.write(`data: ${JSON.stringify({ 
              type: "tool_result", 
              output: String(event.data?.output || ""),
              toolId: String(event.run_id || "default")
            })}\n\n`);
          }
        }
        
        res.write("data: [DONE]\n\n");
        
        addToHistory(sessionId, "user", messages[messages.length - 1].content);
        addToHistory(sessionId, "assistant", fullResponse);
      } catch (agentError) {
        console.error("Agent error:", agentError);
        if (!res.destroyed) {
          res.write(`data: ${JSON.stringify({ error: "Agent execution failed" })}\n\n`);
        }
      } finally {
        if (!res.destroyed) {
          res.end();
        }
      }
    } else {
      const currentMessage = langchainMessages[langchainMessages.length - 1];
      const chatHistory = langchainMessages.slice(0, -1);
      let fullResponse = "";

      try {
        const stream = await llm.stream(chatHistory.concat([currentMessage]));

        for await (const chunk of stream) {
          if (chunk.content) {
            fullResponse += chunk.content;
            res.write(`data: ${JSON.stringify({ type: "content", content: chunk.content })}\n\n`);
          }
        }
        res.write("data: [DONE]\n\n");
        
        addToHistory(sessionId, "user", messages[messages.length - 1].content);
        addToHistory(sessionId, "assistant", fullResponse);
      } catch (streamError) {
        console.error("Stream error:", streamError);
        if (!res.destroyed) {
          res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        }
      } finally {
        if (!res.destroyed) {
          res.end();
        }
      }
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Available tools: ${tools.map((t) => t.name).join(", ")}`);
});
