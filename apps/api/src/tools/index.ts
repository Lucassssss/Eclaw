import { tool, ToolSet } from "ai";
import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";
import { stagehandTool, navigateTool, extractTool, observeTool } from "./stagehand.js";
import { bash, readFile, writeFile } from "./bash.js";

const calculatorTool = tool({
  description: "计算数学表达式的值",
  inputSchema: z.object({
    expression: z.string().describe("需要计算的数学表达式，例如: 2+3*4"),
  }),
  execute: async ({ expression }) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
      const result = Function(`"use strict"; return (${sanitized})`)();
      return String(result);
    } catch {
      return "计算错误";
    }
  },
});

const getCurrentTimeTool = tool({
  description: 'Get the current time',
  inputSchema: z.object({}),
  execute: async () => {
    return new Date().toLocaleString();
  },
});

const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => {
    return { temperature: 72, conditions: 'sunny', location };
  },
});

export const tools: ToolSet = {
  getCurrentTimeTool,
  weatherTool,
  calculatorTool,
  stagehandTool,
  navigateTool,
  extractTool,
  observeTool,
  bash: bash as any,
  readFile: readFile as any,
  writeFile: writeFile as any,
};

// export function getToolDefinitions(): ToolDefinition[] {
//   return Object.entries(tools).map(([name, t]) => ({
//     name,
//     description: t.description,
//     schema: {},
//   }));
// }
