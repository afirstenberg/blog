# Text-to-Speech with Gemini and LangChainJS

One of the hottest features of Google's NotebookLM tool 
is the ability to turn a notes summary into a podcast,
with two speakers chatting back and forth about the subject. 
What is particularly notable about these
conversations is how natural they sound - 
not just because of the voices, but also some of the other
disfluences and noises that the two "hosts" make.

The same technology that backs NotebookLM's audio feature 
is now available through Gemini. Currently in
preview, this lets you use current LLM tools, such as 
LangChainJS, to get Gemini to create high-quality
audio output.

We'll take a look at how LangChainJS can be used to 
generate audio with a single voice, a conversation between
two voices, and what additional tools are needed to
use this audio.

## Talking to myself

Gemini can be accessed on two different
platforms, AI Studio and Vertex AI, with several different auth
methods involved. If you're not familiar with developing for
Gemini with LangChainJS, you should check out 
[LangChain.js and Gemini: Getting Started](https://code.iaflw.com/2024/06/langchainjs-and-gemini-getting-started.html).

For simplicity, we'll be using the `ChatGoogle`
class from the `google-gauth` package, but you can use one
that meets your need. We do need to make sure we're configured
to use the AI Studio API, since the preview models aren't available
on Vertex AI yet, but this just involves us setting the
"GOOGLE_API_KEY" environment variable be fore we test our code.

We'll get to the code shortly, but first 
there are a few things about configuration with the speech
models that are different from how we'll use traditional
models that we need to keep in mind.

### Configuring for speech

First is that, at least currently, Gemini only supports two preview models:
* gemini-2.5-flash-preview-tts
* gemini-2.5-pro-preview-tts
These models don't have all the features
that are in the generally available Gemini 2.5 models, such as
tools and function calling or the large context window, and they can only 
accept text input and generate audio output.
While these features may eventually be folded into the general model, they
currently are stand-alone only. We'll explore some ways to handle this later.

Next is that, during the model setup, we will need to specify both that we
expect audio output (despite it being the only allowed output) and specify the
[name of the voice](https://ai.google.dev/gemini-api/docs/speech-generation#voices)
that we will use. Although Google has a large data structure that is necessary
to specify the voice, and we _can_ pass this in the configuration for the
model, LangChainJS also allows just the name of the voice to be passed
as a string.

With this, we can create and configure our model with something like this:

```typescript
const modelName = "gemini-2.5-flash-preview-tts";
const responseModalities = ["AUDIO"];
const speechConfig = "Zubenelgenubi";  // The name of the voice to use

const model = new ChatGoogle({
  modelName,
  responseModalities,
  speechConfig,
})
```

Once we've configured the model - we need to know a little bit about how
to prompt the model to create our audio.

### A simple prompt

Im some ways, this part is the easiest. The prompt consists of directions
to the model about what to do. This should include what we want the model
to say, and possibly how we want it to say it.

Although the speech models are built on top of an LLM, 
so they do have some foundational
knowledge, we shouldn't expect it to do this terribly well. The model has
been trained to do audio output, so it may not act well for other
instructions.

_Tip:_ If you're familiar with older text-to-speech
models that used the Speech Synthesis Markup Language (SSML),
this isn't available with the Gemini TTS models. Instead,
you can just use a more human language to describe what
you want to hear.

So creating the prompt and having the model
run it can look something like this:

```typescript
const prompt = "Say cheerfully: Have a wonderful day!";
const result = await model.invoke( prompt );
```

Simple, right?

Getting the audio out of the result, however, does take a bit more work.

### Listening to the results

When we have the model evaluate a prompt typically in LangChainJS, we
get an `AIMessage` object back that has the result as a string in
the "content" field. Because we are getting back audio, and not text,
however, we will get a more complicated array of generated output,
including a `Record` with "media" information.

This media `Record` contains a "data" attribute, whose value is the
audio in PCM format that has been base64 encoded.

The question now becomes - how can you actually hear this audio?

If you're writing a node server, you might wrap it in a WAV file
container and send this as a "data:" URI for the browser to play
in an `<audio>` tag.

We're going to use the "audio-buffer-from" and "audio-play"
packages to create an audio buffer, with the correct formats,
and then play it in a (relatively) device independent way.
The audio buffer needs to be built using 16-bit big endian
format with a sample rate of 24000.

With this, we can use code like this to get the base64 data from
the content, create the audio buffer with this data and the format, 
and then play the audio buffer:

```typescript
const audioContent = result?.content?.[0] as Record<string, any>;
const audioData64 = audioContent.data;
const audioDataBuffer = Buffer.from( audioData64, "base64" );
const audioFormat = {
  format: {
    endianness: "be", // Big-Endian / network format
    type: "int16", // 16 bit
    sampleRate: 24000,
  },
};
const audioBuffer = createBuffer( audioDataBuffer, audioFormat );
await play( audioBuffer );
```

## A Gemini duet

Having Gemini generate audio is pretty neat, but it isn't quite the
studio host conversation experience that NotebookLM offers. While we
could certainly setup two models, each with a different voice, and
pass them the text to generate the audio - fortunately, Gemini offers
a simpler solution that just requires some changes to the audio
configuration and our prompt.

### Configuring the cast of characters

As with the simpler audio, we need to configure the voices that will
be used when Gemini generates the output. In this case, however, we
need to specify not just the voices available, but also the name
of the speaker that is attached to that voice. When we create our
prompt later, we will use these speaker names to indicate which
voice is used for each utterance.

Again, although you can use Google's speech configuration object
definition, LangChainJS provides a simplified version. So we might
define our two speakers, "Brian" and "Sarah", with something like
this:

```typescript
const speechConfig = [
  {
    speaker: "Brian",
    name: "Puck",
  },
  {
    speaker: "Sarah",
    name: "Kore",
  },
];
```

### Scripting the audio

As usual, we'll invoke our model with a prompt. What is slight different
in this case is that the prompt should be formated as a script, including
the lines each role ("Sarah" and "Brian" in our example) will read, along
with any instructions about how to read them, and some overall guidance
about what we expect.

For example, we might have a prompt with this conversation:

```typescript
const prompt = `
        TTS the following conversation between Brian and Sarah.
        Pay attention to instructions about how each each person speaks,
        and other sounds they may make.  
        Brian: Hows it going today, Sarah?
        Sarah Not too bad, how about you?
        Brian: [Sighs and sounds tired] It has been a rough day. 
        Brian: [Perks up] But the week should improve!
      `;
```

### Roll the audio

The other parts of the example, creating the model, running it, and getting
the audio from it, are the same as with our single-speaker example.

For completeness, here is the full example:

```typescript
import { ChatGoogle } from "@langchain/google-gauth";
import createBuffer from "audio-buffer-from";
import play from "audio-play";

const modelName = "gemini-2.5-flash-preview-tts";
const responseModalities = ["AUDIO"];
const speechConfig = [
  {
    speaker: "Brian",
    name: "Kore",
  },
  {
    speaker: "Sarah",
    name: "Puck",
  },
];

const model = new ChatGoogle({
  modelName,
  responseModalities,
  speechConfig,
})

const prompt = `
        TTS the following conversation between Brian and Sarah.
        Pay attention to instructions about how each each person speaks,
        and other sounds they may make.  
        Brian: Hows it going today, Sarah?
        Sarah Not too bad, how about you?
        Brian: [Sighs and sounds tired] It has been a rough day. 
        Brian: [Perks up] But the week should improve!
      `;
const result = await model.invoke( prompt );

const audioContent = result?.content?.[0] as Record<string, any>;
const audioData64 = audioContent.data;
const audioDataBuffer = Buffer.from( audioData64, "base64" );
const audioFormat = {
  format: {
    endianness: "be", // Big-Endian / network format
    type: "int16", // 16 bit
    sampleRate: 24000,
  },
};
const audioBuffer = createBuffer( audioDataBuffer, audioFormat );
await play( audioBuffer );
```

## Combining with other LangChainJS components

One thing to keep in mind is that the TTS model, at least in this
preview version, isn't a fully capable model. It does not provide,
for example, access to function calls, Grounding with Google Search,
or other useful tools.

How can we use components like these to create a nice audio segment,
such as what NotebookLM provides?

The broad solution would be to use more traditional models, such
as Gemini 2.0 Pro or Gemini 2.5 Flash, to research the topic and
create the script, and then pass this script over to the TTS model
to create the audio output. Remember - there is no need to use a
single model or a single model call to do all the work.

One straightforward way to do this might be with a couple of
functions - one that creates the script and another that turns
that script into the audio.

The first of these might be written with something like this:

```typescript
async function makeScript(
  topic: string,
  name1: string = "Brian",
  name2: string = "Sarah"
): Promise<string> {
  const modelName = "gemini-2.5-flash";
  const model = new ChatGoogle({
    modelName,
  });
  const history = [];

  const prompt1 = `
    Provide me a short, one paragraph, summary on the following topic: 
    ${topic}
  `;
  history.push( new HumanMessage( prompt1 ) );

  const result1 = await model.invoke( history );
  history.push( result1 );

  const prompt2 = `
    Now turn this paragraph into a conversation between two people
    named ${name1} and ${name2}. It should be written as a script with
    the two people as the speakers and any optional notes about how they
    are responding (for example, their tone of voice) in square brackets
    at the beginning of the line.
    Each line in the script should be short and brief.
    
    Example script:
    ${name1}: Hello ${name2}. [Excited] It is good to see you!
    ${name2}: [Surprised] Oh! Hi there. Good to see you too.
    
    Script:
  `;
  history.push( new HumanMessage( prompt2 ) );

  const result2 = await model.invoke( history );
  return result2.content as string;
}
```

This is a fairly straightforward LangChainJS function, although it
has prompts and models hard-coded in, so it wouldn't be very good
in production. We have two prompts that we use in our conversation,
the first asks about information on a topic, and the second prompts
the model to turn it into the script. This is a good division of
tasks - using one prompt to collect information, and then another
to format it the way we need it.

Once we have the script, we'll pass it to another function:

```typescript
async function readScript(
  script: string,
  name1: string = "Brian",
  name2: string = "Sarah"
): Promise<void> {
  const modelName = "gemini-2.5-pro-preview-tts";
  const responseModalities = ["AUDIO"];
  const speechConfig = [
    {
      speaker: name1,
      name: "Puck",
    },
    {
      speaker: name2,
      name: "Kore",
    },
  ];

  const model = new ChatGoogle({
    modelName,
    responseModalities,
    speechConfig,
  })

  const prompt = `
        TTS the following conversation between Brian and Sarah.
        Pay attention to instructions about how each each person speaks,
        and other sounds they may make.  
        ${script}
      `;
  const result = await model.invoke( prompt );

  const audioContent = result?.content?.[0] as Record<string, any>;
  const audioData64 = audioContent.data;
  const audioDataBuffer = Buffer.from( audioData64, "base64" );
  const audioFormat = {
    format: {
      endianness: "be", // Big-Endian / network format
      type: "int16", // 16 bit
      sampleRate: 24000,
    },
  };
  const audioBuffer = createBuffer( audioDataBuffer, audioFormat );
  await play( audioBuffer );
}
```

This function should look fairly familiar by now. The biggest difference
is that the script comes in as a raw script and this function adds some
additional instructions before sending it to the model to read the prompt.

We combine them together and call them with a topic:

```typescript
async function talkAbout( topic: string): Promise<void> {
  const script = await makeScript( topic );
  console.log( script );
  await readScript( script );
}

await talkAbout("Sharks");
```

This is a farily simple example. It won't work for very long topics
or conversations, for example, but is meant to illustrate the concept.

A more robust implementation would make use of something like
LangGraph to handle the various phases of this task (generating
the conversation vs playing the audio) and include portions that
validate the output at each step. Done correctly, it could also break
up each part to allow for a larger generated script and still
play back each audio segment more quickly.

## Conclusion

## Acknowledgements

The development of LangChainJS support for Gemini 2.5 TTS models
and this documentation were all supported
by Google Cloud Platform Credits provided by Google.
My thanks to the teams at Google for their support.

Special thanks to Linda Lawton, Denis V., Steven Gray, and Noble Ackerson
for their support and friendship.