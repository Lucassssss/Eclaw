import express from "express";
import cors from "cors";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const app = express();
const PORT = process.env.PORT || 3001;

const deepseekKey = process.env.DEEPSEEK_API_KEY;
const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API server is running" });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!deepseekKey) {
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is not set" });
    }

    const { messages } = req.body;

    const llm = new ChatOpenAI({
      model: "deepseek-chat",
      temperature: 0.7,
      apiKey: deepseekKey,
      configuration: {
        baseURL: deepseekBaseUrl,
      },
      streaming: true,
    });

    const chatMessages = [];
    for (const msg of messages.slice(0, -1)) {
      if (msg.role === "user") {
        chatMessages.push(new HumanMessage(msg.content));
      } else {
        chatMessages.push(new AIMessage(msg.content));
      }
    }

    const currentMessage = messages[messages.length - 1];
    chatMessages.push(new HumanMessage(currentMessage.content));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await llm.stream(chatMessages);

    try {
      for await (const chunk of stream) {
        if (chunk.content) {
          const data = `data: ${JSON.stringify({ content: chunk.content })}\n\n`;
          res.write(data);
        }
      }
      res.write("data: [DONE]\n\n");
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
  } catch (error) {
    console.error("Error in chat API:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
