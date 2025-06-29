# LangChainJS and Gemini 2.5 "Thinking" Mode

With Gemini 2.5 Flash, Google is introducing "Reasoning" models, and allowing developers
to control how much the model can "think" about each prompt sent to it. Google refers
to this control as the "thinking budget". This "reasoning" or "thinking" allows the model
to explore more complicated problems, often by breaking it down into smaller
step-by-step tasks and presenting us with the final conclusion.

In this article, we'll explore how developers can use the Gemini 2.5 models with
LangChainJS, how to adjust the "thinking budget", why we might want to do so, and the 
implications and impacts of doing this adjustment.

## The "what" and "why" of reasoning models

Reasoning models are based on research done for Large Language Models around
better prompting techniques. One technique that was uncovered was known as
"Chain of Thought" prompting, where the base prompt includes a few examples of a problem 
and a step-by-step "thought process" that leads to the solution. 
From these examples, the model sets up patterns that tend to break down complex problems 
into smaller, manageable steps, mimicking a human-like reasoning process. 
This often leads to more accurate and reliable results, especially for tasks requiring 
logical deduction or multi-step calculations.

### When to use reasoning models:

*   **Complex Problem-Solving:** 
  For tasks that require multiple steps, like solving a math word problem or a logic puzzle. 
  The model can break down the problem and arrive at a more accurate solution.
*   **Transparency:** 
  When you need to understand *how* the model arrived at its answer. 
  The "chain of thought" that reasoning provides can be invaluable for debugging, understanding, 
  and building trust in the model's output.
*   **Improved Accuracy:** 
  For certain types of questions, allowing the model to "think" can lead to more accurate and 
  nuanced answers.

### When **not** to use reasoning models:

*   **Simple, Factual Recall:** 
  If you're just asking for a simple fact (e.g., "What is the capital of France?"), 
  reasoning doesn't add anything.
*   **Cost-Sensitive Applications:** 
  Reasoning tokens are billed as output tokens, which are more expensive than input tokens.
*   **Low-Latency Requirements:** 
  The "thinking" process takes time. If your application requires rapid or "near real time"
  responses, you'll want to disable reasoning.

## Using the Gemini 2.5 models

If you're not interested in the "thinking" elements of Gemini 2.5, but still want to
take advantage of the reasoning abilities, you can use the Gemini 2.5 models
just like you would any previous models.
If you're not familiar with developing for
Gemini with LangChainJS, you should check out 
[LangChain.js and Gemini: Getting Started](https://code.iaflw.com/2024/06/langchainjs-and-gemini-getting-started.html) 
which goes over the various available options for platforms, authentication,
and what LangChainJS classes to use.

For simplicity, we'll be using the `ChatGoogle`
class from the `google-gauth` package, but you can use one
that meets your need.

A simple example might look something like this:
```typescript
import { ChatGoogle } from "@langchain/google-gauth";

const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
});

const result = await model.invoke(question);
console.log("Answer: ", result.content);
console.log("Reasoning tokens: ", result?.response_metadata?.usage_metadata?.output_token_details?.reasoning ?? 0);
```

As expected, this looks a lot like previous examples that used earlier Gemini models. 
The only difference is that we're also going to look at the usage metadata to
get details about the output token counts and, in particular, how many reasoning
tokens were used.

This example illustrates a couple of important points up front:
* Reasoning tokens are a special kind of output token. This means that we're also
  billed at the output token rate for them.
* The Gemini 2.5 Flash and Pro models default to doing reasoning, but don't give us
  the details of this reasoning. So we don't see the steps it used to get to the answer.

But it does lead to a few questions:
* How can we limit how many reasoning tokens are used, or how can we turn this off
  completely?
* How do we get the details of the reasoning steps?

## Setting reasoning tokens

For problems that we anticipate are difficult, we can increase the maximum number
of reasoning tokens that may be used. This is done using the
"maxReasoningTokens"  configuration parameter. This is also how we can disable
reasoning - by setting "maxReasoningTokens" to 0:

```typescript
import { ChatGoogle } from "@langchain/google-gauth";

const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
  maxReasoningTokens: 0
});

const result = await model.invoke(question);
console.log("Answer: ", result.content);
console.log("Reasoning tokens: ", result?.response_metadata?.usage_metadata?.output_token_details?.reasoning ?? 0);
```

In this case, the question isn't tricky enough to require the reasoning steps, 
so we can save a few tokens. If we feel it needs to use something besides the default,
however, we can set it to another value. The maximum value for this parameter depends
on the model - Gemini 2.5 Pro has a max value of 32k, while Flash and Flash Lite can
be set to 24k at the most.

```typescript
import { ChatGoogle } from "@langchain/google-gauth";

const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
  maxReasoningTokens: 24*1024,
});

const result = await model.invoke(question);
console.log("Answer: ", result.content);
console.log("Reasoning tokens: ", result?.response_metadata?.usage_metadata?.output_token_details?.reasoning ?? 0);
```

In this case, the extra reasoning won't get a better answer, so it didn't make sense
to increase it. But other prompts might benefit from using more tokens. You'll need
to experiment what works best for your uses.

_Tip:_ By default, 2.5 Pro and 2.5 Flash allocate the maxiumum number of
reasoning tokens dynamically. They adjust based on the complexity of the
query. If you want this for 2.5 Flash Lite, or you want the other side-effects,
then you can set this to `-1`.

What kind of side effects?
One other thing you might see, when we set the "maxReasoningTokens"
is that our output has changed. Instead of a simple string, we now get an array that
includes both the answer along with the reasoning stages that went into it. Let's look
at what this means and how we work with it.

## Looking at the reasoning "summary"

When we explicitly set the "maxReasoningTokens" (even if we set it to `-1`), 
we get back result content that consists
of multiple types. LangChainJS typically uses different types for input, allowing you
to submit both text and images, for example. But it is also valid for output - especially
when you want to see both the text result and the reasoning that may have gone into it.

Gemini, however, doesn't provide the exact reasoning steps it uses. Instead, it provides
what Google calls a "summary" of the reasoning. Regardless, this appears in content
of type "reasoning", while the actual result (what we got before as a single string)
is in an object of type "text".

So the result might have looked something like this:

```
[
  {
    type: 'reasoning',
    reasoning: `Alright, let's get this done efficiently. I need the probability of a sum of 7 when rolling two standard dice. Right, simple enough. First, the sample space – two dice, each with six sides, meaning 6 times 6, or 36 possible outcomes. Then, the favorable outcomes, the combinations that yield a 7.  Quick mental check: (1,6), (2,5), (3,4), (4,3), (5,2), and (6,1). Six of them. Probability is favorable outcomes over the total.  6 over 36.  Simplify.  One-sixth.  And the instructions are, "just the answer." Fine. \n`
  },
  { type: 'text', text: '1/6' }
]
```

We can certainly write some code that loops over the contents if it is an array and
turns it into a string based on what we want to present and, perhaps, how we are
displaying it. But LangChainJS offers another approach to formatting results from models
known as Output Parsers. 

Output Parsers are classes that extend the `BaseLLMOutputParser`
class and implement the `parseResult()` method. We then build a chain that takes the 
results of a model, sends it to the Output Parser, which gives us a string.

So an Output Parser that might format results that might (or might not)
include reasoning tokens as markdown could look something like this:

```typescript
import { Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";
import { Generation, ChatGeneration } from "@langchain/core/outputs";

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
```

This handles the case where we aren't using reasoning tokens, so the AIMessage
returned by the model has `string` content, as well as when reasoning tokens
_are_ returned, where the content has complex message types which can include
reasoning types.

We use this very similarly to how we just use the model by itself, but 
we'll use it as part of a chain that the model pipes its output to:

```typescript
const question = "You roll two 6-sided dice. What is the probability they add up to 7? Give me just the answer - do not explain.";
const modelName = "gemini-2.5-flash";

const model = new ChatGoogle({
  modelName,
  maxReasoningTokens: -1,
});

const formatter = new ReasoningFormatter();
const chain = model.pipe(formatter);

const result = await chain.invoke(question);
console.log(result);
```

Running this could give us something like:

```markdown
## Reasoning
Alright, let's get this done efficiently. I need the probability of rolling a sum of 7 with two six-sided dice. Standard probability calculation here. First, I have to figure out the total number of possibilities, then count the successful outcomes, and finally, divide. Two dice, each with six faces, means 6 times 6, or 36 total outcomes. Now, let's get the combinations that equal 7: (1,6), (2,5), (3,4), (4,3), (5,2), and (6,1). That's six favorable outcomes. The probability, therefore, is 6 out of 36. Simplify that, and we're at 1/6. But the user wants *just* the answer. So that's what I will output.

## Text
1/6
```

## Conclusions

Gemini 2.5's "thinking" mode offers a powerful new capability for developers. 
We've seen how to use LangChainJS and the `maxReasoningTokens` parameter, allowing us 
to either disable it for simple queries to save on cost and latency, or increase the 
budget for more complex problems where a step-by-step thought process can 
lead to more accurate results.

While enabling reasoning provides valuable insight into the model's process, 
it also changes the structure of the output so we can see that reasoning. 
By creating a custom OutputParser we can elegantly handle this new format, 
separating the reasoning summary from the final answer and presenting it in a clear, 
structured way.

## Acknowledgements

The development of LangChainJS support for Gemini 2.5 "thinking" 
and this documentation were supported 
by Google Cloud Platform Credits provided by Google. 
My thanks to the teams at Google for their support.

Special thanks to Linda Lawton, Denis V., Steven Gray, Noble Ackerson,
and Xavier Portilla Edo for their help and feedback.