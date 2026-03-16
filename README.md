# simple-mcp-playground

A conversational AI agent powered by GPT-4o and the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). The agent connects to multiple MCP servers at startup, discovers their tools, and autonomously decides when and which tools to call based on your input — looping until it has everything it needs to give a full answer.

## How it works

1. The client spawns the MCP servers as child processes and fetches their available tools
2. Your message + all tools are sent to GPT-4o
3. If the model wants to call a tool, the client executes it via the MCP server and sends the result back
4. This loops until the model has enough information to give a final answer
5. Persistent conversation history is maintained across turns (last 20 messages)

## Agent behaviour

- **Weather questions** — answers are framed around motorcycle riding, including whether conditions are suitable for riding
- **GitHub questions** — responses are professional, concise, and technical
- **Off-topic messages** — replies with `NO_TOOLS_NEEDED` if no tool is required - this is where a simpler/cheaper AI model could be plugged in
- **Toxic messages** — replies with `OFFENSIVE_LANGUAGE` - this could be handled differently, for example ban the user after a number of offensive queries

## Project Structure

```
simple-mcp-playground/
├── client/             # MCP client + GPT-4o agentic chat loop
├── weather-server/     # MCP server — weather tools (Open-Meteo API)
├── github-server/      # MCP server — GitHub tools (Octokit)
├── .env                # Your secrets (not committed)
└── .env.example        # Template for required env vars
```

## Setup

### 1. Clone and install dependencies

```bash
npm install
```

This installs dependencies for all packages at once using npm workspaces.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key — [platform.openai.com](https://platform.openai.com/api-keys) |
| `GITHUB_TOKEN` | GitHub personal access token — [github.com/settings/tokens](https://github.com/settings/tokens) |

The GitHub token needs the following scopes: `repo`, `read:user`.

### 3. Run

```bash
npm start
```

Type `exit` or `q` to quit.

## Available Tools

### Weather (via [Open-Meteo](https://open-meteo.com))
| Tool | Description |
|---|---|
| `get_current_weather` | Current temperature, humidity, wind, and precipitation for a city |
| `get_forecast` | Weather forecast for a city over a given number of days |

### GitHub (via [Octokit](https://github.com/octokit/rest.js))
| Tool | Description |
|---|---|
| `get_my_profile` | Authenticated user's GitHub profile and stats |
| `list_my_repos` | Your repositories, sorted by stars |
| `get_recent_commits` | Recent commits by you on a specific repo |
| `search_repos` | Search GitHub repositories by keyword |
| `get_open_issues` | Open issues or pull requests for a repository |

## Example Usage

```
You: Should I ride my motorcycle in Barcelona this week?
You: Give me a 3-day forecast for Berlin
You: What are my github stats?
You: What are the open pull requests in microsoft/vscode?
```
