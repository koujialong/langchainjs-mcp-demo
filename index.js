// import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Note that the descriptions here are crucial, as they will be passed along
 * to the model along with the class name.
 */
const calculatorSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The type of operation to execute."),
  number1: z.number().describe("The first number to operate on."),
  number2: z.number().describe("The second number to operate on."),
});

const llm = new ChatOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  modelName: "qwen-max", // 可以根据需要选择不同的模型
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // other params...
  },
});
const calculatorTool = tool(
  async ({ operation, number1, number2 }) => {
    // Functions must return strings
    if (operation === "add") {
      return `${number1 + number2}`;
    } else if (operation === "subtract") {
      return `${number1 - number2}`;
    } else if (operation === "multiply") {
      return `${number1 * number2}`;
    } else if (operation === "divide") {
      return `${number1 / number2}`;
    } else {
      throw new Error("Invalid operation.");
    }
  },
  {
    name: "calculator",
    description: "Can perform mathematical operations.",
    schema: calculatorSchema,
  }
);

const llmWithTools = llm.bind({ tools: [calculatorTool] });

async function main() {
  const res = await llmWithTools.invoke("What is 3 * 12");
  console.log(res);
}

main().catch(console.error);
