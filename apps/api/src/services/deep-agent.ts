import { ChatDeepSeek } from "@langchain/deepseek";
import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const llm = new ChatDeepSeek({
  model: "deepseek-chat",
  temperature: 0.7,
});

const getWeatherForecast = tool(
  async ({ location, days }: { location: string; days?: number }) => {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();

    if (!geoData.results?.length) {
      return JSON.stringify({ error: `Could not find location: ${location}` });
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=${days || 7}`
    );
    const weatherData = await weatherResponse.json();

    const weatherCodes: Record<number, string> = {
      0: "☀️ Clear",
      1: "🌤️ Mainly clear",
      2: "⛅ Partly cloudy",
      3: "☁️ Overcast",
      45: "🌫️ Foggy",
      51: "🌧️ Light drizzle",
      61: "🌧️ Rain",
      71: "❄️ Snow",
      80: "🌦️ Showers",
      95: "⛈️ Thunderstorm",
    };

    const forecast = weatherData.daily.time.map((date: string, i: number) => ({
      date,
      high: `${weatherData.daily.temperature_2m_max[i]}°C`,
      low: `${weatherData.daily.temperature_2m_min[i]}°C`,
      precipitation: `${weatherData.daily.precipitation_probability_max[i]}%`,
      condition: weatherCodes[weatherData.daily.weather_code[i]] || "Unknown",
    }));

    return JSON.stringify({
      location: `${name}, ${country}`,
      forecast,
      summary: `Weather forecast for ${name}: ${forecast[0].condition}, highs around ${forecast[0].high}`,
    });
  },
  {
    name: "get_weather_forecast",
    description: "Get weather forecast for a location for the next N days",
    schema: z.object({
      location: z.string().describe("City or location name"),
      days: z.number().min(1).max(14).default(7).describe("Number of forecast days"),
    }),
  }
);

const getBestTravelSeason = tool(
  async ({ destination }: { destination: string }) => {
    await new Promise((r) => setTimeout(r, 500));
    return JSON.stringify({
      destination,
      best: "Spring (Apr-May) and Fall (Sep-Oct)",
      avoid: "Peak summer crowds",
      tip: "Book 2-3 months in advance for best rates",
    });
  },
  {
    name: "get_best_travel_season",
    description: "Get the best time of year to visit a destination",
    schema: z.object({
      destination: z.string().describe("The destination to check"),
    }),
  }
);

const searchAttractions = tool(
  async ({ location, category }: { location: string; category?: string }) => {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();
    const name = geoData.results?.[0]?.name || location;

    const attractions = [
      { name: `${name} Historical Center`, type: "cultural", rating: "4.5" },
      { name: `${name} Art Museum`, type: "museums", rating: "4.3" },
      { name: `Local Market of ${name}`, type: "shopping", rating: "4.7" },
      { name: `${name} Gardens`, type: "nature", rating: "4.4" },
      { name: `${name} Food Tour`, type: "gastronomy", rating: "4.8" },
    ].filter((a) => category === "all" || a.type === category);

    return JSON.stringify({
      location: name,
      category,
      attractions,
      tip: `Pro tip: Book popular attractions in ${name} at least 1 week in advance!`,
    });
  },
  {
    name: "search_attractions",
    description: "Search for attractions, activities, and points of interest",
    schema: z.object({
      location: z.string().describe("City or destination"),
      category: z.string().default("all").describe("Category of attractions"),
    }),
  }
);

const getLocalEvents = tool(
  async ({ location, month }: { location: string; month?: string }) => {
    await new Promise((r) => setTimeout(r, 500));
    const events = [
      { name: "Local Festival", type: "cultural", price: "Free" },
      { name: "Food & Wine Expo", type: "gastronomy", price: "$25" },
      { name: "Art Walk", type: "cultural", price: "Free" },
    ];
    return JSON.stringify({ location, month: month || "current", events });
  },
  {
    name: "get_local_events",
    description: "Get local events happening at a destination",
    schema: z.object({
      location: z.string().describe("City or destination"),
      month: z.string().optional().describe("Month to check events for"),
    }),
  }
);

const estimateFlightCost = tool(
  async ({ from, to, date }: { from: string; to: string; date?: string }) => {
    await new Promise((r) => setTimeout(r, 500));
    return JSON.stringify({
      from,
      to,
      date: date || "current",
      estimate: "$800-1200",
      tip: "Prices vary; booking 2-3 months ahead typically offers the best rates.",
    });
  },
  {
    name: "estimate_flight_cost",
    description: "Estimate the cost of a flight",
    schema: z.object({
      from: z.string().describe("Departure city"),
      to: z.string().describe("Destination city"),
      date: z.string().optional().describe("Travel date"),
    }),
  }
);

const estimateAccommodation = tool(
  async ({ location, nights, type }: { location: string; nights?: number; type?: string }) => {
    await new Promise((r) => setTimeout(r, 500));
    const prices: Record<string, string> = {
      hostel: "$30-50",
      hotel: "$100-200",
      resort: "$200-400",
    };
    return JSON.stringify({
      location,
      nights: nights || 3,
      type: type || "hotel",
      estimate: prices[type || "hotel"] || "$100-200",
    });
  },
  {
    name: "estimate_accommodation",
    description: "Estimate accommodation costs",
    schema: z.object({
      location: z.string().describe("Destination city"),
      nights: z.number().default(3).describe("Number of nights"),
      type: z.string().default("hotel").describe("Type: hostel, hotel, or resort"),
    }),
  }
);

const calculateTotalBudget = tool(
  async ({ flights, accommodation, daily }: { flights: string; accommodation: string; daily?: number }) => {
    const parseEstimate = (est: string) => {
      const match = est.match(/\$(\d+)-(\d+)/);
      if (match) return (parseInt(match[1]) + parseInt(match[2])) / 2;
      return 100;
    };
    const flightCost = parseEstimate(flights);
    const hotelCost = parseEstimate(accommodation);
    const dailyCost = daily || 100;
    const total = flightCost + hotelCost + dailyCost * 3;
    return JSON.stringify({
      flights: flightCost,
      accommodation: hotelCost,
      daily: dailyCost,
      total: `$${Math.round(total)}`,
      breakdown: `Flights: $${Math.round(flightCost)}, Accommodation: $${Math.round(hotelCost)}, Daily expenses: $${dailyCost * 3}`,
    });
  },
  {
    name: "calculate_total_budget",
    description: "Calculate total trip budget",
    schema: z.object({
      flights: z.string().describe("Flight cost estimate"),
      accommodation: z.string().describe("Accommodation cost estimate"),
      daily: z.number().optional().describe("Daily spending budget"),
    }),
  }
);

const checkpointer = new MemorySaver();

async function createDeepAgentWithLLM() {
  return createDeepAgent({
    model: llm as any,
    checkpointer,
    subagents: [
      {
        name: "weather-scout",
        description: "Weather and climate specialist",
        systemPrompt: `You are a weather and climate specialist for travel planning. Your job is to:
1. Check weather forecasts for the destination
2. Recommend the best time to visit
3. Provide packing suggestions based on expected conditions

Always provide specific, actionable weather information.`,
        tools: [getWeatherForecast, getBestTravelSeason],
      },
      {
        name: "experience-curator",
        description: "Local experiences expert",
        systemPrompt: `You are a local experiences curator and travel insider. Your job is to:
1. Find the best attractions and activities
2. Discover local events happening during the visit
3. Recommend hidden gems and unique experiences

Focus on creating memorable, authentic experiences.`,
        tools: [searchAttractions, getLocalEvents],
      },
      {
        name: "budget-optimizer",
        description: "Travel budget specialist",
        systemPrompt: `You are a travel budget optimizer. Your job is to:
1. Estimate flight and accommodation costs
2. Calculate total trip budgets
3. Find cost-saving opportunities
4. Provide realistic price expectations

Always provide specific numbers and money-saving tips.`,
        tools: [estimateFlightCost, estimateAccommodation, calculateTotalBudget],
      },
    ],
    systemPrompt: `You are a Dream Vacation Planner - an AI travel coordinator that orchestrates specialized agents to create perfect trip plans.

When a user asks about planning a trip, you MUST launch ALL THREE subagents in PARALLEL:

1. **weather-scout** - Check weather and best travel times
2. **experience-curator** - Find attractions, activities, and local events
3. **budget-optimizer** - Calculate costs and find deals

IMPORTANT: Launch all three agents at the same time using parallel tool calls! This gives the user real-time visibility into each specialist working on their trip.

After all agents complete, synthesize their findings into a cohesive vacation plan that includes:
- Weather summary and packing suggestions
- Top recommended experiences and activities
- Detailed budget breakdown

Make the final plan exciting and actionable!`,
  });
}

let deepAgentPromise: ReturnType<typeof createDeepAgentWithLLM> | null = null;

async function getDeepAgent() {
  if (!deepAgentPromise) {
    deepAgentPromise = createDeepAgentWithLLM();
  }
  return deepAgentPromise;
}

export { getDeepAgent };

export async function streamDeepAgent(
  input: { messages: { role: string; content: string }[] },
  res: any
) {
  const messageHistory = input.messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const deepAgent = await getDeepAgent();
  const config = { configurable: { thread_id: "default" } };
  const streamIterable = await deepAgent.stream(
    { messages: messageHistory },
    { ...config, streamMode: ["values", "updates"] as any }
  );

  for await (const [chunk, metadata] of streamIterable) {
    if (metadata && "namespace" in metadata) {
      const namespace = (metadata as any).namespace;
      const isSubagent = namespace && namespace.length > 0;

      const eventData = {
        type: isSubagent ? "subagent" : "main",
        namespace: namespace,
        chunk: chunk,
        timestamp: new Date().toISOString(),
      };

      res.write(`data: ${JSON.stringify(eventData)}\n\n`);

      if (isSubagent && namespace) {
        const subagentId = namespace[0] || "unknown";
        const step = Object.keys(chunk)[0] || "unknown";

        res.write(
          `data: ${JSON.stringify({
            type: "subagent_progress",
            subagentId,
            step,
            namespace: namespace.join(" > "),
          })}\n\n`
        );
      }
    } else if (chunk && typeof chunk === "object" && "messages" in chunk) {
      const lastMessage = (chunk as any).messages[(chunk as any).messages.length - 1];
      if (lastMessage?.content) {
        res.write(
          `data: ${JSON.stringify({
            type: "content",
            content: lastMessage.content,
            source: "main",
          })}\n\n`
        );
      }
    }

    await new Promise((resolve) => setImmediate(resolve));
  }

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
}

export async function streamDeepAgentUpdates(
  input: { messages: { role: string; content: string }[] },
  res: any
) {
  const messageHistory = input.messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const deepAgent = await getDeepAgent();
  const config = { configurable: { thread_id: "default" } };
  const streamIterable = await deepAgent.stream(
    { messages: messageHistory },
    { ...config, streamMode: "updates" as any, subgraphs: true }
  );

  for await (const [namespace, chunk] of streamIterable as any) {
    const isSubagent = namespace?.some((n: string) => n && n.length > 0);

    if (isSubagent) {
      const subagentName = namespace[0] || "unknown";
      
      res.write(
        `data: ${JSON.stringify({
          type: "subagent_update",
          subagentName,
          namespace: namespace.join(" > "),
          data: chunk,
        })}\n\n`
      );

      for (const [nodeName, data] of Object.entries(chunk as object)) {
        if (nodeName === "tools" || nodeName === "agent") {
          const toolData = data as any;
          if (toolData?.messages) {
            for (const msg of toolData.messages) {
              if (msg.type === "tool") {
                res.write(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    toolName: msg.name,
                    result: msg.content,
                  })}\n\n`
                );
              }
            }
          }
        } else {
          res.write(
            `data: ${JSON.stringify({
              type: "step",
              source: namespace.join(" > "),
              step: nodeName,
            })}\n\n`
          );
        }
      }
    } else {
      for (const [nodeName, data] of Object.entries(chunk as object)) {
        if (nodeName === "tools" || nodeName === "agent") {
          const toolData = data as any;
          if (toolData?.messages) {
            for (const msg of toolData.messages) {
              if (msg.type === "tool") {
                res.write(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    toolName: msg.name,
                    result: msg.content,
                  })}\n\n`
                );
              }
            }
          }
        } else {
          res.write(
            `data: ${JSON.stringify({
              type: "step",
              source: "main",
              step: nodeName,
            })}\n\n`
          );
        }
      }
    }

    await new Promise((resolve) => setImmediate(resolve));
  }

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
}
