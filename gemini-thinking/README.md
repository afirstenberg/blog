# LangChainJS and Gemini 2.5 "Thinking" Mode

With Gemini 2.5 Flash, Google is introducing "Reasoning" models, and allowing developers
to control how much the model can "think" about each prompt sent to it. Google refers
to this control as the "thinking budget". This "reasoning" or "thinking" allows the model
to explore more complicated problems, often by breaking it down into smaller
step-by-step tasks and presenting us with the final conclusion.

In this article, we'll explore how developers can use the Gemini 2.5 models with
LangChainJS, how to adjust the "thinking budget", why we might want to do so, and the 
implications and impacts of doing this adjustment.

## Using the Gemini 2.5 models

If you're not interested in the "thinking" elements of Gemini 2.5, you can use them
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

One other thing you might see, however, when we set the "maxReasoningTokens", however,
is that our output has changed. Instead of a simple string, we now get an array that
includes both the answer along with the reasoning stages that went into it. Let's look
at what this means and how we work with it.

## Looking at the reasoning "summary"

When we explicitly set the "maxReasoningTokens", we get back result content that consists
of multiple types. LangChainJS typically uses different types for input, allowing you
to submit both text and images, for example. But it is also valid for output - especially
when you want to see both the text result and the reasoning that may have gone into it.

Gemini, however, doesn't provide the exact reasoning steps it uses. Instead, it provides
what Google calls a "summary" of the reasoning. Regardless, this appears in content
of type "reasoning", while the actual result (what we got before as a single string)
is in an object of type "text".

So the result might have looked something like this:

```json
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
known as Output Parsers. Output Parsers are classes that extend the `BaseLLMOutputParser`
class and implement the `parseResult()` method.