// agent.ts - 完整Deep Agents示例
import { createDeepAgent } from "deepagents";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

// ===== 自定义Tools（动态调用）=====
const weatherTool = tool(
  async ({ cities }: { cities: string[] }) => {
    const results = cities.map(city => 
      `${city}: 晴天25°C (实时API模拟)`
    ).join("\n");
    return results;
  },
  {
    name: "multi_weather",
    description: "批量查询多城市天气",
    schema: z.object({ cities: z.array(z.string()) })
  }
);

const codeAnalyzer = tool(
  async ({ code }: { code: string }) => {
    const lines = code.split('\n').length;
    const perfScore = Math.random() * 100;
    return `代码分析：${lines}行，性能分${perfScore.toFixed(1)}/100`;
  },
  {
    name: "code_analyzer",
    schema: z.object({ code: z.string() })
  }
);

// ===== 创建主代理（任务分配器）=====
const mainAgent = await createDeepAgent({
  model: "deepseek-chat",     // 主代理：任务规划
  tools: [weatherTool],       // 天气专用
  memory: true,               // 跨会话记忆
  skills: "./skills/",        // 可选技能目录
  
  // Human-in-loop：文件操作需确认
  interrupt_on: ["write_file", "edit_file", "shell"],
  
  // 自定义显示hook
  middleware: [{
    name: "DisplayMiddleware",
    afterAgent: async (state) => {
      console.clear();
      console.log("🧠 思考:", state.slice(-1)[0]?.content?.slice(0, 200) + "...");
      console.log("📋 Todo:", state.todos?.join(" | ") || "无");
      console.log("🔧 Tools:", state.toolCalls?.map(t => t.name).join(", ") || "无");
      console.log("📄 文件变更:", Object.keys(state.files || {}).join(", "));
      return state;
    }
  }]
});

// ===== 子代理：代码专家 =====
const codeSubAgent = await createDeepAgent({
  model: "deepseek-coder",    // 代码专用模型
  tools: [codeAnalyzer],
  interrupt_on: ["write_file"],  // 写文件需确认
});

// ===== 运行复杂任务：主→子代理协作 =====
async function runComplexTask() {
  console.log("🚀 启动Deep Agents：主代理+子代理+动态tools\n");
  
  const task = `请完成以下任务：
  1. 查询北京、上海天气 (用multi_weather)
  2. 分析这段代码性能 (用code_analyzer)
     const slowLoop = () => {
       for(let i=0; i<1000000; i++) { /* ... */ }
     };
  3. 生成优化建议并写文件
  `;
  
  // 主代理流式执行（自动多轮）
  for await (const chunk of await mainAgent.stream(task)) {
    // 实时显示思考、tools、todo、文件
    // chunk包含：text, todos, toolCalls, files, subAgents状态
    
    if (chunk.subAgents?.length) {
      console.log("\n🤖 子代理激活:", chunk.subAgents.map(s => s.name));
      
      // 主代理调用子代理（自动）
      const subResult = await codeSubAgent.stream(chunk.subAgents[0].task!);
      for await (const subChunk of subResult) {
        console.log("  📱 子代理:", subChunk.text.slice(0, 100));
      }
    }
    
    if (chunk.tools) {
      console.log("🔧 Tool执行中:", chunk.tools.map(t => t.name).join(", "));
    }
    
    if (chunk.done) {
      console.log("\n✅ 任务完成！最终结果：");
      console.log(chunk.text);
      break;
    }
  }
}

runComplexTask().catch(console.error);