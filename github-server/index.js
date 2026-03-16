import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';
import { config } from 'dotenv';

config({ path: '../.env' });

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const { data: authUser } = await octokit.rest.users.getAuthenticated();

const server = new McpServer({
  name: 'github-server',
  version: '1.0.0',
});

// get user profile
server.registerTool(
  'get_my_profile',
  {
    title: 'Get My Profile',
    description: 'Get the authenticated GitHub user profile and stats',
  },
  async () => {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          username: authUser.login,
          name: authUser.name,
          bio: authUser.bio,
          public_repos: authUser.public_repos,
          followers: authUser.followers,
          following: authUser.following,
          created_at: authUser.created_at,
        }, null, 2),
      }],
    };
  }
);

// list user repos
server.registerTool(
  'list_my_repos',
  {
    title: 'List My Repos',
    description: 'List the authenticated user\'s repositories, sorted by stars',
    inputSchema: {
      limit: z.number().optional().describe('Max number of repos to return (default 10)'),
    },
  },
  async ({ limit = 10 }) => {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 50,
    });

    const repos = data
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, limit)
      .map(r => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      url: r.html_url,
      updated_at: r.updated_at,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(repos, null, 2) }],
    };
  }
);

// get recent commits on a repo
server.registerTool(
  'get_recent_commits',
  {
    title: 'Get Recent Commits',
    description: 'Get recent commits by the authenticated user on a specific repo',
    inputSchema: {
      owner: z.string().describe(`Repository owner (default ${authUser.login})`),
      repo: z.string().describe('Repository name'),
      limit: z.number().optional().describe('Number of commits to fetch (default 10)'),
    },
  },
  async ({ owner, repo, limit = 10 }) => {
    const { data } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      author: authUser.login,
      per_page: limit,
    });

    const commits = data.map(c => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      date: c.commit.author?.date,
      url: c.html_url,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(commits, null, 2) }],
    };
  }
);

// search repos
server.registerTool(
  'search_repos',
  {
    title: 'Search Repos',
    description: 'Search GitHub repositories by keyword',
    inputSchema: {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Number of results (default 5)'),
    },
  },
  async ({ query, limit = 5 }) => {
    const { data } = await octokit.rest.search.repos({
      q: query,
      per_page: limit,
      sort: 'stars',
    });

    const repos = data.items.map(r => ({
      name: r.full_name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      url: r.html_url,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(repos, null, 2) }],
    };
  }
);

// get open issues or PRs
server.registerTool(
  'get_open_issues',
  {
    title: 'Get Open Issues',
    description: 'Get open issues or pull requests for a repository',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      type: z.enum(['issues', 'pulls']).optional().describe('Filter by issues or pulls (default: issues)'),
      limit: z.number().optional().describe('Number of results to return (default 10)'),
    },
  },
  async ({ owner, repo, type = 'issues', limit = 10 }) => {
    if (type === 'pulls') {
      const { data } = await octokit.rest.pulls.list({ owner, repo, state: 'open', per_page: limit });
      const prs = data.map(p => ({
        number: p.number,
        title: p.title,
        author: p.user?.login,
        created_at: p.created_at,
        url: p.html_url,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(prs, null, 2) }] };
    } else {
      const { data } = await octokit.rest.issues.listForRepo({ owner, repo, state: 'open', per_page: limit });
      const issues = data.filter(i => !i.pull_request).map(i => ({
        number: i.number,
        title: i.title,
        author: i.user?.login,
        created_at: i.created_at,
        url: i.html_url,
      }));
      return { content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);