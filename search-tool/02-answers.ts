import { ChatGoogle } from "@langchain/google-gauth";
import { GeminiTool } from "@langchain/google-common";

const question = "Who won the Nobel Prize in physics in 2024?"
const modelName = "gemini-2.0-flash-001";

const searchTool: GeminiTool = {
  googleSearch: {},
};
const tools = [searchTool];
const model = new ChatGoogle({
  modelName,
  temperature: 0,
}).bindTools(tools);

const result = await model.invoke(question);
console.log(result.content);
