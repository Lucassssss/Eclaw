import { Router } from "express";
import { generateText } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import {
  getHistory,
  addToHistory,
  clearHistory,
  getDefaultSessionId,
} from "../services/history.js";
import { runChat } from "../services/llm.js";
// import { getToolDefinitions } from "../tools/index.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// router.get("/tools", (req, res) => {
//   res.json({ tools: getToolDefinitions() });
// });

router.get("/models", (req, res) => {
  res.json({ models: [] });
});

router.get("/history", (req, res) => {
  const sessionId = (req.query.sessionId as string) || getDefaultSessionId();
  res.json({ sessionId, messages: getHistory(sessionId) });
});

router.post("/history/clear", (req, res) => {
  const { sessionId } = req.body;
  clearHistory(sessionId || getDefaultSessionId());
  res.json({ success: true });
});

router.post("/api/chat", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { messages, mode = "auto", model: modelName = "chat", sessionId = getDefaultSessionId() } = req.body;
    console.log("Received messages:", messages?.length, "mode:", mode, "model:", modelName);

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const savedHistory = getHistory(sessionId);
    const aiMessages = savedHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    for (const msg of messages) {
      if (msg.role === "user" || msg.role === "assistant") {
        aiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

    try {
      await runChat(messages, modelName, res, sessionId, mode);

      res.write("data: [DONE]\n\n");
      addToHistory(sessionId, "user", lastUserMessage);
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.destroyed) {
        res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
      }
    } finally {
      if (!res.destroyed) res.end();
    }
  } catch (error) {
    console.error("Request error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Internal server error" });
    } else if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
