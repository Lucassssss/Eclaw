import { tool } from "ai";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";
import "dotenv/config";

let stagehandInstance: Stagehand | null = null;

async function getStagehand() {
  if (!stagehandInstance) {
    stagehandInstance = new Stagehand({
      env: "LOCAL",
      model: "deepseek/deepseek-chat",
      verbose: 1,
    });
    await stagehandInstance.init();
  }
  return stagehandInstance;
}

const stagehandTool = tool({
  description: "使用 AI 控制浏览器执行操作，例如点击、输入、导航等网页交互操作",
  inputSchema: z.object({
    action: z.string().describe("用自然语言描述要执行的浏览器操作，例如：'点击登录按钮'、'在搜索框输入 hello'、'打开 google.com'"),
  }),
  execute: async ({ action }) => {
    try {
      const stagehand = await getStagehand();
      const result = await stagehand.act(action);
      return JSON.stringify({
        success: true,
        action: action,
        result: result,
        message: `成功执行: ${action}`,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        action: action,
        error: error.message || String(error),
        message: `执行失败: ${action}`,
      });
    }
  },
});

const navigateTool = tool({
  description: "导航到指定的 URL",
  inputSchema: z.object({
    url: z.string().describe("要访问的网址 URL"),
  }),
  execute: async ({ url }) => {
    try {
      const stagehand = await getStagehand();
      const page = stagehand.context.pages()[0] || await stagehand.context.newPage();
      await page.goto(url);
      return JSON.stringify({
        success: true,
        action: `导航到 ${url}`,
        message: `成功打开: ${url}`,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        action: `导航到 ${url}`,
        error: error.message || String(error),
        message: `打开失败: ${url}`,
      });
    }
  },
});

const extractTool = tool({
  description: "从当前页面提取数据",
  inputSchema: z.object({
    instruction: z.string().describe("要提取什么数据，例如：'获取所有产品名称'"),
  }),
  execute: async ({ instruction }) => {
    try {
      const stagehand = await getStagehand();
      const data = await stagehand.extract(instruction);
      return JSON.stringify({
        success: true,
        instruction: instruction,
        data: data,
        message: `成功提取数据`,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        instruction: instruction,
        error: error.message || String(error),
        message: `提取失败`,
      });
    }
  },
});

const observeTool = tool({
  description: "发现页面上可用的操作",
  inputSchema: z.object({
    instruction: z.string().describe("要查找什么，例如：'查找登录按钮'"),
  }),
  execute: async ({ instruction }) => {
    try {
      const stagehand = await getStagehand();
      const result = await stagehand.observe(instruction);
      return JSON.stringify({
        success: true,
        instruction: instruction,
        actions: result,
        message: `发现 ${result.length} 个可执行操作`,
      });
    } catch (error: any) {
      console.error("观察失败:", error);
      return JSON.stringify({
        success: false,
        instruction: instruction,
        error: error.message || String(error),
        message: `观察失败`,
      });
    }
  },
});

export const agentTools = tool({
  description: "AI自动操作浏览器",
  inputSchema: z.object({
    action: z.string().describe("要执行的浏览器操作，如打开百度并查看今天有什么新闻"),
  }),
  execute: async ({ action }) => {
    try {
      const stagehand = await getStagehand();
      const agent = stagehand.agent({
        mode: 'dom',
        model: "deepseek/deepseek-chat",
        systemPrompt: "你是一个操作浏览器的专家",
        stream: true,
      });
      const result = await agent.execute(action);
      return JSON.stringify({
        success: true,
        action: action,
        result: result,
        message: `成功执行: ${action}`,
      });
    } catch (error: any) {
      return JSON.stringify({
        success: false,
        action: action,
        error: error.message || String(error),
        message: `执行失败: ${action}`,
      });
    }
  },
})

export { stagehandTool, navigateTool, extractTool, observeTool };
