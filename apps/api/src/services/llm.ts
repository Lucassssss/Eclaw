import { deepseek, DeepSeekLanguageModelOptions } from '@ai-sdk/deepseek';
import { createMinimax } from 'vercel-minimax-ai-provider';
import { ModelMessage, stepCountIs, streamText, ToolLoopAgent, ToolSet } from 'ai';
import { tools } from '../tools/index.js';
import { theStartupFoundersLastStandPrompt } from '../prompts/index.js';
import "dotenv/config";
import Model from './model.js';
import Agent from './agent.js';

export const runChat = async (
  messages: ModelMessage[],
  modelName: string = "reasoner",
  res,
  sessionId: string,
  mode: string = "auto",
) => {
  let result: any = null;
  
  messages = [{
    role: "system",
    content: theStartupFoundersLastStandPrompt,
  }, ...messages];

  if(mode === "auto") {
    const agent = Agent.get(modelName);
    result = await agent.stream({
      messages: messages,
    });
  } else if(mode === "agent") {
    result = await streamText({
      system: theStartupFoundersLastStandPrompt,
      model: Model.create(modelName),
      messages: messages,
      tools: tools,
      stopWhen: stepCountIs(100),
    });
  }

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'reasoning-delta':
        res.write(`data: ${JSON.stringify({ type: "reasoning", content: part.text })}\n\n`);
        break;
      case 'text-delta':
        res.write(`data: ${JSON.stringify({ type: "text", content: part.text })}\n\n`);
        break;
      case 'tool-call': {
        const inputStr = typeof part.input === 'object' ? JSON.stringify(part.input) : String(part.input || '');
        res.write(`data: ${JSON.stringify({ 
          type: "tool_call", 
          id: part.toolCallId,
          name: part.toolName,
          input: inputStr
        })}\n\n`);
        break;
      }
      case 'tool-result': {
        const outputStr = typeof part.output === 'object' ? JSON.stringify(part.output) : String(part.output || '');
        res.write(`data: ${JSON.stringify({ 
          type: "tool_result", 
          toolName: part.toolName,
          output: outputStr
        })}\n\n`);
        break;
      }
      case 'tool-error': {
        const errorStr = typeof part.error === 'object' ? JSON.stringify(part.error) : String(part.error || '');
        res.write(`data: ${JSON.stringify({ 
          type: "tool_error", 
          error: errorStr
        })}\n\n`);
        break;
      }
    }
  }
}
