import { ChatDeepSeek } from "@langchain/deepseek";

const model = new ChatDeepSeek({
  model: "deepseek-reasoner",
  temperature: 0,
  streaming: true  // 启用流式
});

export default model;
// const stream = await model.stream("证明勾股定理的简单方法");
// for await (const chunk of stream) {
//   // chunk.content 包含思考过程和最终答案
//   if (chunk.content) {
//     console.log(chunk.content);
//   }
  
//   // 检查 reasoning blocks
//   if (chunk.contentBlocks) {
//     const reasoning = chunk.contentBlocks.find(block => block.type === "reasoning");
//     if (reasoning) {
//       console.log("思考:", reasoning.reasoning);
//     }
//   }
// }


// import OpenAI from "openai";
// import type { ModelConfig, ModelInfo } from "../types/index.js";

// const deepseekKey = process.env.DEEPSEEK_API_KEY;
// const deepseekBaseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

// export const openai = new OpenAI({
//   apiKey: deepseekKey,
//   baseURL: deepseekBaseUrl,
// });

// export function createLLMConfig(modelId: string): ModelConfig {
//   return {
//     model: modelId === "reasoner" ? "deepseek-reasoner" : "deepseek-chat",
//     temperature: modelId === "reasoner" ? 0 : 0.7,
//   };
// }

// export function getAvailableModels(): ModelInfo[] {
//   return [
//     { id: "chat", name: "DeepSeek Chat", description: "通用对话模型" },
//     { id: "reasoner", name: "DeepSeek Reasoner", description: "深度思考模式" },
//   ];
// }

// export function isLLMConfigured(): boolean {
//   return !!deepseekKey;
// }

// export function getLLMErrorMessage(): string {
//   if (!deepseekKey) {
//     return "DEEPSEEK_API_KEY is not set";
//   }
//   return "LLM configuration error";
// }
