import { ChatGoogle } from "@langchain/google-gauth";

const question = "Who won the Nobel Prize in physics in 2024?"
const modelName = "gemini-2.0-flash-001";

const model = new ChatGoogle({
  modelName,
  temperature: 0,
});

const result = await model.invoke(question);
console.log(result.content);
