import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { openai, createLLMConfig } from "./llm.js";
import { getToolsSchema, executeTool } from "../tools/index.js";
import type { ModelConfig, ChatMessage } from "../types/index.js";

export async function runAgentWithTools(
  messages: any[],
  modelConfig: ModelConfig,
  res: any,
  isReasoner: boolean
): Promise<string> {
  const openaiMessages: any[] = messages.map((msg: any) => {
    if (msg instanceof HumanMessage) {
      return { role: "user", content: msg.content };
    } else if (msg instanceof AIMessage) {
      const result: any = { role: "assistant", content: msg.content || "" };
      if ((msg as any).tool_calls) {
        result.tool_calls = (msg as any).tool_calls.map((tc: any) => ({
          id: tc.id || "default",
          type: "function",
          function: {
            name: tc.name,
            arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args),
          },
        }));
      }
      return result;
    } else if (msg instanceof ToolMessage) {
      return { role: "tool", tool_call_id: msg.tool_call_id, content: msg.content };
    }
    return { role: "user", content: String(msg) };
  });

  let maxIterations = 10;

  while (maxIterations > 0) {
    maxIterations--;

    const response = await openai.chat.completions.create({
      ...modelConfig,
      messages: openaiMessages,
      tools: getToolsSchema(),
      stream: false,
    });

    const choice = response.choices[0];
    const message = choice.message;

    const reasoningContent = (message as any).reasoning_content;
    if (isReasoner && reasoningContent) {
      res.write(`data: ${JSON.stringify({ type: "reasoning", content: reasoningContent })}\n\n`);
    }

    if (message.content) {
      res.write(`data: ${JSON.stringify({ type: "content", content: message.content })}\n\n`);
    }

    const toolCalls = (message.tool_calls || []) as any[];
    const validToolCalls = toolCalls.filter((tc: any) => tc.function?.name);

    if (validToolCalls.length === 0) {
      return message.content || "";
    }

    for (const toolCall of validToolCalls) {
      const toolName = toolCall.function.name;
      let toolInput: any = {};

      try {
        const args = toolCall.function.arguments;
        if (typeof args === 'string' && args) {
          toolInput = JSON.parse(args);
        }
      } catch {
        toolInput = {};
      }

      res.write(`data: ${JSON.stringify({
        type: "tool_call",
        name: toolName,
        input: toolCall.function.arguments || "{}",
        toolId: toolCall.id
      })}\n\n`);

      const toolResult = await executeTool(toolName, toolInput);

      res.write(`data: ${JSON.stringify({ type: "tool_result", output: String(toolResult), toolId: toolCall.id })}\n\n`);

      const assistantMsg: any = {
        role: "assistant",
        content: message.content || "",
        tool_calls: [toolCall],
      };

      if (isReasoner && reasoningContent) {
        assistantMsg.reasoning_content = reasoningContent;
      }

      openaiMessages.push(assistantMsg);
      openaiMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: String(toolResult),
      });
    }
  }

  return "达到最大迭代次数";
}

export async function runChatStream(
  messages: ChatMessage[],
  modelConfig: ModelConfig,
  res: any,
  isReasoner: boolean
): Promise<void> {
  const openaiMessages = messages.map((msg) => {
    if (msg.role === "user") {
      return { role: "user", content: msg.content };
    } else if (msg.role === "assistant") {
      return { role: "assistant", content: msg.content || "" };
    }
    return { role: "user", content: String(msg) };
  });

  const stream = await openai.chat.completions.create({
    ...modelConfig,
    messages: openaiMessages as any,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (delta?.content) {
      res.write(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`);
    }
    if (isReasoner && (delta as any)?.reasoning_content) {
      res.write(`data: ${JSON.stringify({ type: "reasoning", content: (delta as any).reasoning_content })}\n\n`);
    }
  }

  res.write("data: [DONE]\n\n");
}

export function createModelConfig(model: string): ModelConfig {
  return createLLMConfig(model);
}
