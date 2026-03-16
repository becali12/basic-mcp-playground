import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import OpenAI from 'openai';
import * as readline from 'node:readline';
import { config } from 'dotenv';

config({ path: '../.env' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function connectToServer(name, serverPath) {
  const client = new Client({ name: `client-${name}`, version: '1.0.0' });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
    },
  });

  await client.connect(transport);
  console.log(`✓ Connected to ${name} server`);
  return client;
}


async function getTools(client) {
  const result = await client.listTools();
  return result.tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

async function callTool(clientMap, toolName, toolInput) {
  for (const { client, tools } of clientMap) {
    if (tools.find(t => t.function.name === toolName)) {
      const result = await client.callTool({ name: toolName, arguments: toolInput });
      return result.content[0].text;
    }
  }
  throw new Error(`Tool not found: ${toolName}`);
}


async function main() {

  const weatherClient = await connectToServer(
    'weather-MCP',
    '../weather-server/index.js'
  );

  const githubClient = await connectToServer(
    'github-MCP', 
    '../github-server/index.js'
  );

  const weatherTools = await getTools(weatherClient);
  const githubTools = await getTools(githubClient);

  const allTools = [...weatherTools, ...githubTools];

  const clientMap = [
    { client: weatherClient, tools: weatherTools },
    { client: githubClient, tools: githubTools}
  ];

  console.log(`\n🛠  Available tools: ${allTools.map(t => t.function.name).join(', ')}`);
  console.log('\nChat with GPT-4o (type "exit" to quit)\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const conversationHistory = [{
  role: 'system',
  content: `
    You are an expert AI agent that leverages MCP tools to serve your users. Listen to the user's requests carefully and use the appropriate tool to answer their query.

    Important rules:
    > When answering weather questions: reply in rhymes and end with "Enjoy your day, sirski!"
    > When answering GitHub questions: be professional, concise, and technical.

    If no tool is needed for answering the user query reply with just: NO_TOOLS_NEEDED

    Example:
    **
        User: hi there, how are you?
        Assistant: NO_TOOLS_NEEDED
    **
  `
}];

  const askQuestion = () => {
    rl.question('You: ', async (userInput) => {
      userInput = userInput.trim();
      if (!userInput) return askQuestion();
      if (userInput.toLowerCase() === 'exit') {
        console.log('See ya!');
        rl.close();
        await weatherClient.close();
        await githubClient.close();
        process.exit(0);
      }

      conversationHistory.push({ role: 'user', content: userInput });

      try {
        let response = await openai.chat.completions.create({
          model: 'gpt-4o',
          tools: allTools,
          messages: conversationHistory,
        });

        // while the model keeps calling tools, keep the loop going
        // and exit when finish_reason changes, probably to 'stop'
        while (response.choices[0].finish_reason === 'tool_calls') {
          const assistantMessage = response.choices[0].message;
          conversationHistory.push(assistantMessage);

          // handle all tool calls in parallel
          const toolResults = await Promise.all(
            assistantMessage.tool_calls.map(async (toolCall) => {
              process.stdout.write(`  [calling ${toolCall.function.name}...] `);
              const args = JSON.parse(toolCall.function.arguments);
              const result = await callTool(clientMap, toolCall.function.name, args);
              process.stdout.write('done\n');
              return {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
              };
            })
          );

          // tool results go in as individual messages
          conversationHistory.push(...toolResults);

          response = await openai.chat.completions.create({
            model: 'gpt-4o',
            tools: allTools,
            messages: conversationHistory,
          });
        }

        const reply = response.choices[0].message.content ?? '(no response)';
        conversationHistory.push({ role: 'assistant', content: reply });

        // keep only the last 20 messages to avoid hitting the token limit
        if (conversationHistory.length > 20) {
          conversationHistory.splice(0, conversationHistory.length - 20);
        }

        console.log(`\nAssistant: ${reply}\n`);
      } catch (err) {
        console.error('Error:', err.message);
      }

      askQuestion(); // keep chat going until user types exit
    });
  };

  askQuestion();
}

main();