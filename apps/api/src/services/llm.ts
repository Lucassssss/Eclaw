import { deepseek, DeepSeekLanguageModelOptions } from '@ai-sdk/deepseek';
import { createMinimax } from 'vercel-minimax-ai-provider';
import { ModelMessage, stepCountIs, streamText, ToolLoopAgent, ToolSet } from 'ai6';
import { tools } from '../tools/index.js';
import { theStartupFoundersLastStandPrompt } from '../prompts/index.js';
import "dotenv/config";
import Model from './model.js';
import Agent from './agent.js';
import { streamDeepAgentUpdates } from './deep-agent.js';

export interface ArtifactEvent {
  type: 'artifact';
  name: string;
  data: any;
  status: 'loading' | 'streaming' | 'complete' | 'error';
  progress?: number;
}

export interface RunChatOptions {
  onArtifact?: (event: ArtifactEvent) => void;
}

export const runChat = async (
  messages: ModelMessage[],
  modelName: string = "reasoner",
  res,
  sessionId: string,
  mode: string = "auto",
  onAssistantMessage?: (content: string, isComplete: boolean) => void,
  options?: RunChatOptions,
) => {
  const { onArtifact } = options || {};
  let result: any = null;
  let assistantContent = "";
  
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
  } else if(mode === "deep-agent") {
    await streamDeepAgentUpdates({ messages: messages as any }, res);
    onAssistantMessage?.("", true);
    return;
  }

  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'reasoning-delta':
        res.write(`data: ${JSON.stringify({ type: "reasoning", content: part.text })}\n\n`);
        break;
      case 'text-delta':
        assistantContent += part.text;
        onAssistantMessage?.(assistantContent, false);
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
        
        if (part.toolName && (
          part.toolName === 'createCodeArtifact' || 
          part.toolName === 'createDocumentArtifact' || 
          part.toolName === 'createDataArtifact' || 
          part.toolName === 'createTableArtifact'
        )) {
          try {
            const outputData = typeof part.output === 'object' ? part.output : JSON.parse(String(part.output));
            if (outputData && outputData.type === 'artifact') {
              res.write(`data: ${JSON.stringify({ 
                type: "artifact", 
                artifactType: outputData.artifactType,
                id: outputData.id,
                title: outputData.title,
                content: outputData.code || outputData.content || JSON.stringify(outputData.data || outputData.rows || ''),
                language: outputData.language,
                format: outputData.format,
                data: outputData.data,
                columns: outputData.columns,
                rows: outputData.rows,
                status: outputData.status || 'complete',
                progress: outputData.progress || 1
              })}\n\n`);
              break;
            }
          } catch (e) {
            console.error('Error parsing artifact output:', e);
          }
        }
        
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

  onAssistantMessage?.(assistantContent, true);
}
