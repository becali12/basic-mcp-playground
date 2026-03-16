# github-mcp-app

A conversational AI agent that uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io) to give GPT-4o access to real-time weather data and GitHub information.

## Project Structure

```
github-mcp-app/
├── client/             # MCP client + OpenAI chat loop
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

### 3. Run the client

```bash
npm start
```

## Available Tools

### Weather (via [Open-Meteo](https://open-meteo.com))
| Tool | Description |
|---|---|
| `get_current_weather` | Current temperature, humidity, wind, and precipitation for a city |
| `get_forecast` | 7-day forecast for a city |

### GitHub (via [Octokit](https://github.com/octokit/rest.js))
| Tool | Description |
|---|---|
| `get_my_profile` | Authenticated user's GitHub profile and stats |
| `list_my_repos` | Your repositories, sorted by stars |
| `get_recent_commits` | Recent commits on a specific repo |
| `search_repos` | Search GitHub repositories by keyword |
| `get_open_issues` | Open issues or pull requests for a repository |

## Example Usage

```
You: What's the weather like in Tokyo?
You: Show me my top 5 GitHub repos
You: What are the open issues in microsoft/vscode?
```
