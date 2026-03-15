import { deepseek } from '@ai-sdk/deepseek';
import { createMinimax } from 'vercel-minimax-ai-provider';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import "dotenv/config";

// 模块级缓存：存储原生模型实例
const modelCache = new Map<string, any>();

export default class Model {
  private constructor() {} // 禁止外部 new

  static create(modelFull: string) {
    // 1. 命中缓存直接返回
    if (modelCache.has(modelFull)) {
      return modelCache.get(modelFull);
    }

    // 2. 解析 provider 和 modelId
    const [provider, ...rest] = modelFull.split('/');
    const modelId = rest.join('/');
    let instance;

    switch (provider) {
      case 'deepseek':
        instance = deepseek(modelId);
        break;
      case 'minimax':
        const minimax = createMinimax({
          apiKey: process.env.MINIMAX_API_KEY,
          baseURL: process.env.MINIMAX_API_BASE_URL,
        });
        instance = minimax(modelId);
        break;
      case 'openrouter:x-ai':
        instance = createOpenRouter({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: process.env.OPENROUTER_API_BASE_URL,
        })(`x-ai/${modelId}`);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // 3. 存入缓存
    modelCache.set(modelFull, instance);
    return instance;
  }
}
