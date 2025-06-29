import { ChatGoogle } from "@langchain/google-gauth";

const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
  maxReasoningTokens: 0,
});

const result = await model.invoke(question);
console.log("Answer: ", result.content);
console.log("Reasoning tokens: ", result?.response_metadata?.usage_metadata?.output_token_details?.reasoning ?? 0);
