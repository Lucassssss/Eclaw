import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";
import {
  getWeatherForecast,
  getBestTravelSeason,
  estimateFlightCost,
  estimateAccommodation,
  calculateTotalBudget,
  searchAttractions,
  getLocalEvents,
} from "./apps/web/src/deepagent/tools";

const checkpointer = new MemorySaver();

export const deepAgentGraph = createDeepAgent({
  model: "deepseek-chat",
  checkpointer,
  subagents: [
    {
      name: "weather-scout",
      description:
        "Weather and climate specialist. Checks forecasts, finds the best travel seasons.",
      systemPrompt: `You are a weather and climate specialist for travel planning.`,
      tools: [getWeatherForecast, getBestTravelSeason],
    },
    {
      name: "experience-curator",
      description:
        "Local experiences expert. Discovers attractions, events, and unique activities.",
      systemPrompt: `You are a local experiences curator and travel insider.`,
      tools: [searchAttractions, getLocalEvents],
    },
    {
      name: "budget-optimizer",
      description:
        "Travel budget specialist. Estimates costs and creates budget breakdowns.",
      systemPrompt: `You are a travel budget optimizer.`,
      tools: [estimateFlightCost, estimateAccommodation, calculateTotalBudget],
    },
  ],
  systemPrompt: `You are a Dream Vacation Planner. When a user asks about planning a trip, launch all subagents in parallel.`,
});
