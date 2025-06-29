import { Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { Generation, ChatGeneration } from "@langchain/core/outputs";
import { ChatGoogle } from "@langchain/google-gauth";

export class ReasoningFormatter extends BaseLLMOutputParser<string> {
  lc_namespace = ["langchain", "output_parsers"];

  async parseResult(generations: Generation[] | ChatGeneration[], _callbacks?: Callbacks): Promise<string> {
    const reasoning: string[] = [];
    const text: string[] = [];
    for (const generation of generations) {
      if ('message' in generation) { 
        // This is a ChatGeneration
        const content = generation.message.content;
        if (typeof content === 'string') {
          text.push(content);
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === 'text') {
              text.push(part.text);
            } else if (part.type === 'reasoning') {
              reasoning.push(part.reasoning);
            }
            // Add other content types, such as images
          }
        }
      } else { 
        // This is a Generation
        text.push(generation.text);
      }
    }

    let markdown = "";
    if (reasoning.length) {
      // If there are any reasoning messages, add them to the markdown after a header
      markdown += "## Reasoning\n" + reasoning.join("\n");
    }
    if (text.length) {
      // If there are any text messages, we'll be adding them to the markdown
      if (reasoning.length) {
        // If there were reasoning messages (and thus a reasoning header),
        // add the text header
        markdown += "\n## Text\n";
      }
      markdown += text.join("\n");
    }
    return markdown;
  }
}

const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
  maxReasoningTokens: 1024,
});

const formatter = new ReasoningFormatter();
const chain = model.pipe(formatter);

const result = await chain.invoke(question);
console.log(result);
