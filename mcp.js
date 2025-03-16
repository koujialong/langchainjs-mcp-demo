import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { config } from "dotenv";

// 加载环境变量
config();

// 确保设置了API密钥
if (!process.env.DASHSCOPE_API_KEY) {
  console.error("错误: 请在.env文件中设置DASHSCOPE_API_KEY环境变量");
  process.exit(1);
}

// 创建阿里通义千问模型实例
const llm = new ChatOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  modelName: "qwen-plus", // 可以根据需要选择不同的模型
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // other params...
  },
});

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-server.js"],
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function main() {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log("工具集", tools);
  const mTools = tools.tools.map((tl) =>
    tool(
      async (toolInput) => {
        const result = await client.callTool({
          name: tl.name,
          arguments: toolInput,
        });
        return result.content;
      },
      {
        ...tl,
        schema: tl.inputSchema,
      }
    )
  );

  const toolMap = new Map(mTools.map((t) => [t.name, t]));
  const llmWithTools = llm.bind({
    tools: mTools,
  });
  const messages = [new HumanMessage("介绍下银川")];
  let response = await llmWithTools.invoke(messages);
  messages.push(response);

  while (response.tool_calls && response.tool_calls.length > 0) {
    console.log("工具被调用:", JSON.stringify(response.tool_calls, null, 2));

    for (const toolCall of response.tool_calls) {
      const toolResult = await toolMap.get(toolCall.name).call(toolCall.args);
      console.log("工具结果: ", toolResult);
      messages.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id,
        })
      );
    }

    console.log("将工具结果发送回模型...");
    response = await llmWithTools.invoke(messages);
    messages.push(response);
  }
  console.log("最终模型回答:", response.content);
}

main();
