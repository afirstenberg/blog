import { ChatGoogle } from "@langchain/google-gauth";

const question = "What is the answer to life, the universe, and everything?";
const modelName = "gemini-2.0-flash-001";
const apiKey = "Your API Key Here";

const model = new ChatGoogle({
  modelName,
  apiKey,
  platformType: "gcp",
});

const result = await model.invoke(question);
console.log(result.content);