import { ToolLoopAgent } from "ai6";
import { tools } from "../tools";
import Model from "./model";

// 模块级缓存：存储 Agent 实例
const agentCache = new Map<string, ToolLoopAgent>();

export default class Agent {
  private constructor() {} // 禁止外部 new

  /**
   * 获取全局唯一的 Agent 实例
   */
  static get(modelFull: string): ToolLoopAgent {
    // 1. 命中缓存直接返回
    if (agentCache.has(modelFull)) {
      return agentCache.get(modelFull)!;
    }

    // 2. 获取（或创建）底层模型实例
    const modelInstance = Model.create(modelFull);

    // 3. 创建 Agent 实例（只在第一次调用时执行）
    const newAgent = new ToolLoopAgent({
      model: modelInstance,
      tools: tools,
    });

    // 4. 存入缓存
    agentCache.set(modelFull, newAgent);
    return newAgent;
  }
}
