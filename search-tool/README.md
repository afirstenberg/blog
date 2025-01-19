# Grounding Results with Google Search, Gemini, and LangChainJS

Have you ever used a Large Language Model (LLM) to help answer factual
questions, only to seem like it is making up, or hallucinating, the
results? Retrieval Augmented Generation (RAG) is a frequent solution
for this problem, and modern LLMs can use tool and function calling
with LangChainJS to make RAG solutions even easier.

Gemini takes this
several steps further by providing tools that are well integrated
into Gemini, and Gemini 2.0 improves this even more. One tool in
particular, Grounding with Google Search, helps you bring factual
and current information from Google Search into your results. It
even provides you references for the results!

We'll take a look at how Grounding with Google Search works, how
you can enable this tool in your calls to Gemini, the differences
between how it works in Gemini 1.5 and Gemini 2.0 (and how LangChainJS)
hides the differences between the two, and how you can easily format
the results using the Lang Chain Extension Language.

## The beginning. And the problem.

As you may remember, Gemini can be accessed on two different
platforms, AI Studio and Vertex AI, with several different auth
methods involved. If you're not familiar with developing for
Gemini with LangChainJS, you should check out 
[article name here](https://example.com/).

For simplicity, we'll be using the `ChatGoogle`
class from the `google-gauth` package, but you can use one
that meets your need.

Our code to ask a question and print the results might look 
something like this:

```typescript
import { ChatGoogle } from "@langchain/google-gauth";

const question = "Who won the Nobel Prize in physics in 2024?"
const modelName = "gemini-1.5-flash-002";

const model = new ChatGoogle({
  modelName,
  temperature: 0,
});

const result = model.invoke(question);
console.log(result.content);
```

Since Gemini 1.5 Flash has a knowledge cutoff date before the Nobel Prizes
were awarded in 2024, the answer might be something like this:

```text
I don't know, since the Nobel Prizes are usually awarded in October.
```

Not terribly useful, eh? What can we do about it?

## Getting answers with Google Search

If we had done a normal Google Search, or even used Google's Gemini chatbot,
to ask this question we'd have gotten the names of the recipients along 
with other information. But when calling the Gemini API, we will need
some other tools to help us ground our query.

Gemini 1.5 provides this using a tool named `googleSearchRetrieval`,
while Gemini 2.0 has a similar tool called `googleSearch`. While there
are some differences between the two, LangChainJS lets you use either,
no matter which model you choose.

We can import the tool to serve as a reference in typescript:
```typescript
import { GeminiTool } from "@langchain/google-common";
```

Then we'll configure the tool and create a model object that is aware
of the tool thusly:

```typescript
const searchTool: GeminiTool = {
  googleSearch: {},
};
const tools = [searchTool];
const model = new ChatGoogle({
  modelName,
  temperature: 0,
}).bindTools(tools);
```

With this, we can invoke the model with our question as we did in the previous section:

```typescript
const result = model.invoke(question);
console.log(result.content);
```

and get a significantly different answer. Perhaps something like this:

```text
The 2024 Nobel Prize in Physics was awarded jointly to 
Geoffrey E. Hinton and John J. Hopfield.
```

One difference between this result and what a typical search can provide,
is that we can follow links to help verify the information we get. Calling
the Gemini API this way doesn't give us access to this information.

Or does it?

## Getting references

Gemini's Google Search Tool provides much of the same reference information
that we could have gotten through Google Search itself, although it is
in a slightly different form. LangChainJS provides this as part of
the `result` object tht we get in the 

## Formatting the response and understanding the source

## Acknowledgements 