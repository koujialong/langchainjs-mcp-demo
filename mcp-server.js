#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { JSDOM } from "jsdom";
const server = new Server(
  {
    name: "example-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
const WEATHER_TOOL = {
  name: "weather_search",
  description: "Can be used to query the weather",
  inputSchema: {
    type: "object",
    properties: {
      province: {
        type: "string",
        description: "Check the weather in the province",
      },
      city: {
        type: "string",
        description: "Check the weather for city",
      },
    },
    required: ["query"],
  },
};

const WIKI_TOOL = {
  name: "wiki_search",
  description: "It can be used to query the knowledge of a single keyword",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Query information",
      },
    },
    required: ["query"],
  },
};

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [WEATHER_TOOL, WIKI_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let res;
  switch (name) {
    case "weather_search":
      const { province, city } = args;
      res = await fetch(`https://uapis.cn/api/weather?name=${city}`);
      const data = await res.json();
      if (data.code !== 200) {
        return {
          content: [
            { type: "text", text: `查询天气失败，错误码：${data.code}` },
          ],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: `查询到天气：${JSON.toString(data)}` }],
        isError: false,
      };
    case "wiki_search":
      if (!args.query) {
        return {
          content: [
            { type: "text", text: "The query parameter query is missing" },
          ],
          isError: true,
        };
      }
      const { query } = args;
      res = await fetch(`https://baike.baidu.com/item/${query}`);
      const info = await res.text();
      return {
        content: [{ type: "text", text: extractTextFromClasses(info) }],
        isError: false,
      };
  }
});

function extractTextFromClasses(htmlStr) {
  const classPrefix = "mainContent_";
  // 创建一个新的 JSDOM 实例
  const dom = new JSDOM(htmlStr);
  // 获取 window 对象，以便访问 document
  const { window } = dom;
  // 使用 document.querySelectorAll 来选择所有匹配的元素
  const elements = window.document.querySelectorAll(
    `[class^="${classPrefix}"]`
  );
  let allText = "";

  elements.forEach((element) => {
    // 使用 element.textContent 来获取元素及其所有子节点的文本内容
    allText += element.textContent.trim() + "\n";
  });

  return allText.trim(); // 返回所有文本内容，并去除末尾的换行符
}

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
