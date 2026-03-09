import { deepseek, DeepSeekLanguageModelOptions } from '@ai-sdk/deepseek';
import { ModelMessage, stepCountIs, streamText, ToolSet } from 'ai';
import { tools } from '../tools/index.js';

// const toolMap = Object.fromEntries(tools.map((t: any) => [t.name, t]));

export const runChat = async (
  messages: ModelMessage[],
  modelName: string = "reasoner",
  res,
) => {
  const isReasoner = modelName === "reasoner";
  
  const result = streamText({
    model: deepseek(isReasoner ? 'deepseek-reasoner' : 'deepseek-chat'),
    messages: messages,
    ...(isReasoner ? {
      providerOptions: {
        deepseek: {
          thinking: { type: 'enabled' },
        } satisfies DeepSeekLanguageModelOptions,
      },
    } : {}),
    tools: tools,
    stopWhen: stepCountIs(100),
  });

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      res.write(`data: ${JSON.stringify({ type: "reasoning", content: part.text })}\n\n`);
    } else if (part.type === 'text-delta') {
      res.write(`data: ${JSON.stringify({ type: "text", content: part.text })}\n\n`);
    } else if (part.type === 'tool-result') {
      res.write(`data: ${JSON.stringify({ type: "tool-result", content: JSON.stringify(part) })}\n\n`);
    }
  }
}
