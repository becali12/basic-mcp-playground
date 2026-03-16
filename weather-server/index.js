import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'weather-server',
  version: '1.0.0',
});

// associate a city name to lat/lon using Open-Meteo's geocoding API
async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results?.length) throw new Error(`City not found: ${city}`);
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// tool for fetching current weather in a given city
server.registerTool(
  'get_current_weather',
  {
    title: 'Get Current Weather',
    description: 'Get current weather conditions for a city',
    inputSchema: {
      city: z.string().describe('City name, e.g. "London" or "New York"'),
    },
  },
  async ({ city }) => {
    const { latitude, longitude, name, country } = await geocode(city);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation` +
      `&wind_speed_unit=mph&temperature_unit=celsius`;

    const res = await fetch(url);
    const data = await res.json();
    const currentWeather = data.current;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          location: `${name}, ${country}`,
          temperature_c: currentWeather.temperature_2m,
          humidity_percent: currentWeather.relative_humidity_2m,
          wind_mph: currentWeather.wind_speed_10m,
          precipitation_mm: currentWeather.precipitation,
          weather_code: currentWeather.weather_code,
        }, null, 2),
      }],
    };
  }
);

// tool for 7 days forecast
server.registerTool(
  'get_forecast',
  {
    title: 'Get 7-Day Forecast',
    description: 'Get a 7-day weather forecast for a city',
    inputSchema: {
      city: z.string().describe('City name'),
    },
  },
  async ({ city }) => {
    const { latitude, longitude, name, country } = await geocode(city);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
      `&temperature_unit=celsius&timezone=auto&forecast_days=7`;

    const res = await fetch(url);
    const data = await res.json();
    const days = data.daily.time.map((date, i) => ({
      date,
      max_c: data.daily.temperature_2m_max[i],
      min_c: data.daily.temperature_2m_min[i],
      precipitation_mm: data.daily.precipitation_sum[i],
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ location: `${name}, ${country}`, forecast: days }, null, 2),
      }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);