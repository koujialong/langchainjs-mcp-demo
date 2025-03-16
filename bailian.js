import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { z } from "zod";

// 加载环境变量
config();

// 确保设置了API密钥
if (!process.env.DASHSCOPE_API_KEY) {
  console.error("错误: 请在.env文件中设置DASHSCOPE_API_KEY环境变量");
  process.exit(1);
}

// 创建阿里通义千问模型实例
const model = new ChatOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  modelName: "qwen-plus", // 可以根据需要选择不同的模型
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    // other params...
  },
});

const calculatorSchema = z.object({
  operation: z.enum(["+", "-", "*", "/"]).describe("数学计算工具"),
  number1: z.number().describe("需要计算的第一个数"),
  number2: z.number().describe("需要计算的第二个数"),
});
const calculatorTool = tool(
  async ({ operation, number1, number2 }) => {
    console.log("调用工具", operation, number1, number2);
    // Functions must return strings
    if (operation === "+") {
      return `${number1 + number2}`;
    } else if (operation === "-") {
      return `${number1 - number2}`;
    } else if (operation === "*") {
      return `${number1 * number2}`;
    } else if (operation === "/") {
      return `${number1 / number2}`;
    } else {
      throw new Error("Invalid operation.");
    }
  },
  {
    name: "calculator",
    description: "可以进行数学计算的工具，支持加、减、乘、除四种操作",
    schema: calculatorSchema,
  }
);

// 将工具绑定到模型
const modelWithTools = model.bind({
  tools: [calculatorTool],
});

async function main() {
  console.log("\n示例: 使用工具进行计算");
  const calculationQuery = "计算3的三次方等于多少";

  try {
    console.log("发送查询:", calculationQuery);

    const messages = [new HumanMessage(calculationQuery)];
    let response = await modelWithTools.invoke(messages);
    messages.push(response);

    while (response.tool_calls && response.tool_calls.length > 0) {
      console.log("工具被调用:", JSON.stringify(response.tool_calls, null, 2));

      for (const toolCall of response.tool_calls) {
        if (toolCall.name === "calculator") {
          console.log("执行计算器工具，参数:", toolCall.args);
          const toolResult = await calculatorTool.call(toolCall.args);
          console.log("计算器工具结果:", {
            content: toolResult,
            tool_call_id: toolCall.id,
          });
          messages.push(
            new ToolMessage({
              content: toolResult,
              tool_call_id: toolCall.id,
            })
          );
        }
      }

      console.log("将工具结果发送回模型...");
      response = await modelWithTools.invoke(messages);
      messages.push(response);
    }

    console.log("最终模型回答:", response.content);
  } catch (error) {
    console.error("执行过程中出现错误:", error);
    console.error("错误详情:", error.message);
    if (error.stack) {
      console.error("错误堆栈:", error.stack);
    }
  }
}

main();
