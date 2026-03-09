import { Router } from "express";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import model from "../services/llm.js";
import { streamDeepAgent, streamDeepAgentUpdates } from "../services/deep-agent.js";
// import {
//   isLLMConfigured,
//   getLLMErrorMessage,
//   getAvailableModels,
// } from "../services/llm.js";
import {
  getHistory,
  addToHistory,
  clearHistory,
  getDefaultSessionId,
} from "../services/history.js";
import { runAgentWithTools, runChatStream, createModelConfig } from "../services/index.js";
import { getToolDefinitions } from "../tools/index.js";
import type { ChatMessage } from "../types/index.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/tools", (req, res) => {
  res.json({ tools: getToolDefinitions() });
});

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
    // if (!isLLMConfigured()) {
    //   return res.status(500).json({ error: getLLMErrorMessage() });
    // }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await model.stream("证明勾股定理的简单方法");
    for await (const chunk of stream) {
      // chunk.content 包含思考过程和最终答案
      if (chunk.content) {
        res.write(`data: ${JSON.stringify({ type: "content", content: chunk.content })}\n\n`);
      }
      
      // 检查 reasoning blocks
      if (chunk.contentBlocks) {
        const reasoning = chunk.contentBlocks.find(block => block.type === "reasoning");
        if (reasoning) {
          res.write(`data: ${JSON.stringify({ type: "reasoning", content: reasoning.reasoning })}\n\n`);
        }
      }
    }
    res.write("data: [DONE]\n\n");
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// router.post("/api/chat", async (req, res) => {
//   try {
//     if (!isLLMConfigured()) {
//       return res.status(500).json({ error: getLLMErrorMessage() });
//     }

//     const { messages, mode = "auto", model = "chat", sessionId = getDefaultSessionId() } = req.body;

//     res.setHeader("Content-Type", "text/event-stream");
//     res.setHeader("Cache-Control", "no-cache");
//     res.setHeader("Connection", "keep-alive");

//     const modelConfig = createModelConfig(model);
//     const isReasoner = model === "reasoner";

//     console.log(`[Chat] Model: ${model}, Mode: ${mode}`);

//     const savedHistory = getHistory(sessionId);
//     const recentHistory = savedHistory;

//     const langchainMessages: any[] = recentHistory.map((msg) =>
//       msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
//     );

//     for (const msg of messages) {
//       if (msg.role === "user") {
//         langchainMessages.push(new HumanMessage(msg.content));
//       } else {
//         langchainMessages.push(new AIMessage(msg.content));
//       }
//     }

//     if (mode === "agent") {
//       try {
//         const fullResponse = await runAgentWithTools(
//           langchainMessages,
//           modelConfig,
//           res,
//           isReasoner
//         );

//         res.write("data: [DONE]\n\n");
//         addToHistory(sessionId, "user", messages[messages.length - 1].content);
//         addToHistory(sessionId, "assistant", fullResponse);
//       } catch (error) {
//         console.error("Agent error:", error);
//         if (!res.destroyed) {
//           res.write(`data: ${JSON.stringify({ error: "Agent execution failed" })}\n\n`);
//         }
//       } finally {
//         if (!res.destroyed) res.end();
//       }
//     } else {
//       try {
//         const chatMessages: ChatMessage[] = langchainMessages.map((msg: any) => {
//           if (msg instanceof HumanMessage) {
//             return { role: "user", content: msg.content };
//           } else if (msg instanceof AIMessage) {
//             return { role: "assistant", content: msg.content || "" };
//           }
//           return { role: "user", content: String(msg) };
//         }) as any;

//         await runChatStream(chatMessages, modelConfig, res, isReasoner);

//         addToHistory(sessionId, "user", messages[messages.length - 1].content);
//       } catch (error) {
//         console.error("Stream error:", error);
//         if (!res.destroyed) {
//           res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
//         }
//       } finally {
//         if (!res.destroyed) res.end();
//       }
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     if (!res.headersSent) {
//       res.status(500).json({ error: "Internal server error" });
//     } else if (!res.destroyed) {
//       res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
//       res.end();
//     }
//   }
// });

router.post("/api/deep-agent/stream", async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const input = { messages };

    const streamMode = req.query.mode || "updates";

    if (streamMode === "updates") {
      await streamDeepAgentUpdates(input, res);
    } else {
      await streamDeepAgent(input, res);
    }

    if (!res.destroyed) {
      res.end();
    }
  } catch (error) {
    console.error("Deep Agent error:", error);
    if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`);
      res.end();
    }
  }
});

export default router;
