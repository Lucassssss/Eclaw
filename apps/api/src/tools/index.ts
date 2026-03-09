import { tool } from "langchain";
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

const calculatorTool = tool(
  ({ expression }: { expression: string }) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      return String(result);
    } catch {
      return "计算错误";
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式的值",
    schema: z.object({
      expression: z.string().describe("需要计算的数学表达式"),
    }),
  }
);

const searchTool = tool(
  ({ query }: { query: string }) => {
    return `搜索结果 for "${query}": 模拟搜索结果`;
  },
  {
    name: "search",
    description: "搜索信息",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

const getCurrentTimeTool = tool(
  () => {
    return new Date().toLocaleString("zh-CN");
  },
  {
    name: "get_current_time",
    description: "获取当前时间",
  }
);

export const tools = [calculatorTool, searchTool, getCurrentTimeTool] as const;

export const toolMap: Record<string, typeof calculatorTool | typeof searchTool | typeof getCurrentTimeTool> = tools.reduce((acc, t) => {
  acc[t.name] = t;
  return acc;
}, {} as Record<string, typeof calculatorTool | typeof searchTool | typeof getCurrentTimeTool>);

export function getToolsSchema() {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: (t.schema as any).jsonSchema || {
        type: "object",
        properties: {},
      },
    },
  }));
}

export function getToolDefinitions(): ToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    schema: (t.schema as any).jsonSchema || {},
  }));
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  const toolFn = (toolMap as any)[toolName];
  if (!toolFn) {
    return `工具 ${toolName} 不存在`;
  }

  try {
    const result = await toolFn.invoke(toolInput);
    return String(result);
  } catch (error) {
    console.error(`Tool error:`, error);
    return `工具执行错误: ${error}`;
  }
}
