---
name: langchainjs-full
description: >
  Comprehensive guide for LangChain.js, LangGraph.js, and DeepAgents.js.
  Invoke when user asks about LLM app development, agent workflows, or needs
  to build AI applications with these frameworks.
---

# LangChain.js Ecosystem

Comprehensive guide for building AI applications with LangChain.js, LangGraph.js, and DeepAgents.js.

## Table of Contents

- [Overview](#overview)
- [When to Use](#when-to-use)
- [LangChain.js](#langchainjs)
- [LangGraph.js](#langgraphjs)
- [DeepAgents](#deepagents)
- [Comparison](#comparison-frameworks-runtimes-and-harnesses)
- [Best Practices](#best-practices)

---

## Overview

LangChain.js ecosystem provides three levels of abstraction for building LLM-powered applications:

- **LangChain.js**: High-level pre-built agent architecture, quick to get started
- **LangGraph.js**: Low-level orchestration framework for custom workflows
- **DeepAgents**: "Agent harness" with built-in capabilities for complex tasks

---

## When to Use

| Scenario | Recommended Framework |
|----------|----------------------|
| Quick prototyping, simple agents | LangChain.js |
| Custom agent architectures | LangGraph.js |
| Complex multi-step tasks with planning | DeepAgents |
| Long-running stateful workflows | LangGraph.js |
| Production deployment with scaling | LangGraph.js or DeepAgents |

---

## LangChain.js

LangChain is the easy way to start building completely custom agents and applications powered by LLMs. With under 10 lines of code, you can connect to OpenAI, Anthropic, Google, and more.

LangChain provides a pre-built agent architecture and model integrations to help you get started quickly and seamlessly incorporate LLMs into your agents and applications.

### Core Benefits

- **Pre-built agent architecture**: Get started quickly with common patterns
- **Multi-model support**: OpenAI, Anthropic, Google, and more
- **Built on LangGraph**: Durable execution, streaming, human-in-the-loop, persistence
- **No LangGraph knowledge required** for basic usage

### Installation

```bash
npm install langchain @langchain/core
```

### Quick Start

```typescript
import * as z from "zod";
import { createAgent, tool } from "langchain";

const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createAgent({
  model: "claude-sonnet-4-6",
  tools: [getWeather],
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

### Key APIs

#### createAgent

```typescript
import { createAgent, tool } from "langchain";
import { z } from "zod";

const myTool = tool(
  (input) => {
    // Tool implementation
    return "result";
  },
  {
    name: "tool_name",
    description: "What the tool does",
    schema: z.object({
      param: z.string(),
    }),
  }
);

const agent = createAgent({
  model: "claude-sonnet-4-6", // or "gpt-4o", etc.
  tools: [myTool],
  system: "Optional system message",
});
```

#### tool

```typescript
import { tool } from "langchain";
import { z } from "zod";

const tool = tool(
  (input) => {
    // Synchronous function
    return result;
  },
  {
    name: "tool_name",
    description: "Clear description of what the tool does",
    schema: z.object({
      paramName: z.string().description("Parameter description"),
    }),
  }
);
```

---

## LangGraph.js

LangGraph is a low-level orchestration framework and runtime for building, managing, and deploying long-running, stateful agents.

LangGraph is very low-level and focused entirely on agent orchestration. Before using LangGraph, we recommend familiarizing yourself with some of the components used to build agents, starting with models and tools.

> **Note**: You don't need to use LangChain to use LangGraph. LangGraph can be used standalone or with any LangChain product.

### Core Benefits

1. **Durable execution**: Build agents that persist through failures and can run for extended periods, resuming from where they left off
2. **Human-in-the-loop**: Incorporate human oversight by inspecting and modifying agent state at any point
3. **Comprehensive memory**: Create stateful agents with both short-term working memory for ongoing reasoning and long-term memory across sessions
4. **Debugging with LangSmith**: Gain deep visibility into complex agent behavior with visualization tools
5. **Production-ready deployment**: Deploy sophisticated agent systems confidently with scalable infrastructure

### Installation

```bash
npm install @langchain/langgraph
```

### Quick Start

```typescript
import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const mockLlm: GraphNode<typeof State> = (state) => {
  return { messages: [{ role: "ai", content: "hello world" }] };
};

const graph = new StateGraph(State)
  .addNode("mock_llm", mockLlm)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();

await graph.invoke({ messages: [{ role: "user", content: "hi!" }] });
```

### Key Concepts

#### StateSchema

```typescript
import { StateSchema, MessagesValue } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
  // Custom state fields
  context: "",
  step: 0,
});
```

#### GraphNode

```typescript
import { GraphNode } from "@langchain/langgraph";

const myNode: GraphNode<typeof State> = async (state) => {
  // Process state and return updates
  return {
    messages: [...state.messages, newMessage],
  };
};
```

#### StateGraph

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

const graph = new StateGraph(State)
  .addNode("node_name", nodeFunction)
  .addEdge(START, "node_name")
  .addEdge("node_name", END)
  .compile();
```

#### Conditional Edges

```typescript
const graph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addConditionalEdges(
    "agent",
    (state) => {
      if (shouldFinish(state)) return END;
      return "continue";
    }
  )
  .compile();
```

### Ecosystem Integration

LangGraph integrates seamlessly with LangChain products:

- Use LangChain models and tools within LangGraph nodes
- Combine with LangChain's memory implementations
- Deploy with LangChain's infrastructure tools

---

## DeepAgents

Deep agents are the easiest way to start building agents and applications powered by LLMs—with built-in capabilities for task planning, file systems for context management, subagent-spawning, and long-term memory.

Think of deepagents as an "agent harness". It is the same core tool calling loop as other agent frameworks, but with built-in tools and capabilities.

deepagents is a standalone library built on top of LangChain's core building blocks for agents and using LangGraph's tooling for running agents in production.

### Components

- **Deep Agents SDK**: A package for building agents that can handle any task
- **Deep Agents CLI**: A terminal coding agent built on top of the deepagents package

### Installation

```bash
npm install deepagents langchain @langchain/core
```

### Quick Start

```typescript
import * as z from "zod";
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";

const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createDeepAgent({
  tools: [getWeather],
  system: "You are a helpful assistant",
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

### Core Capabilities

Use the Deep Agents SDK when you want to build agents that can:

- **Handle complex, multi-step tasks** that require planning and decomposition
- **Manage large amounts of context** through file system tools
- **Swap filesystem backends** to use in-memory state, local disk, durable stores, sandboxes, or custom backend
- **Delegate work to specialized subagents** for context isolation
- **Persist memory** across conversations and threads

### Deep Agents CLI

Use the Deep Agents CLI when you want an interactive deep agent on the command-line:

- Customize agents with skills and memory
- Teach agents about your preferences, common patterns, and custom project knowledge
- Execute code on your machine or in sandboxes

---

## Comparison: Frameworks, Runtimes, and Harnesses

| Layer | Purpose | Example |
|-------|---------|---------|
| **Framework** | Core building blocks | LangChain (models, tools, prompts, output parsers) |
| **Runtime** | Execution engine | LangGraph (durable execution, state management) |
| **Harness** | Pre-built capabilities | DeepAgents (task planning, memory, subagents) |

### When to Use Each

- **LangChain**: When you want to quickly build agents and autonomous applications
- **LangGraph**: When you need low-level control over agent orchestration
- **DeepAgents**: When building complex agents that need planning, memory, and subagent delegation

---

## Best Practices

### ✅ DO

- Use the appropriate abstraction level for your needs
- Implement proper error handling for LLM calls and tool execution
- Use streaming for better UX when applicable
- Handle rate limits and retries
- Validate user inputs before processing
- Keep API keys secure (use environment variables)
- Use LangSmith for debugging and monitoring in production
- Leverage built-in persistence for long-running agents
- Implement human-in-the-loop for critical decisions

### ❌ DON'T

- Hardcode API keys in source code
- Ignore rate limits
- Trust LLM outputs without validation
- Skip error handling for tool failures
- Use sync calls in production (use async/await)
- Forget to handle empty/null responses
- Build complex workflows when LangChain's pre-built agents suffice
- Ignore token limits and context windows

---

## Reference Links

- [LangChain Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [DeepAgents Documentation](https://docs.langchain.com/oss/javascript/deepagents/overview)
- [LangChain GitHub](https://github.com/langchain-ai/langchainjs)
