import {HumanMessage} from "@langchain/core/messages";
import {ChatGoogle} from "@langchain/google-gauth";
import createBuffer from "audio-buffer-from";
import play from "audio-play";

/**
 * Given a topic, have a model get information and turn it
 * into a script.
 * @param topic - The topic to research
 * @param name1 - The name of one of the first host
 * @param name2 - The name of the second host
 */
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

/**
 * Given the script, read it out loud.
 * @param script
 * @param name1
 * @param name2
 */
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
  // @ts-ignore
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

async function talkAbout( topic: string): Promise<void> {
  const script = await makeScript( topic );
  console.log( script );
  await readScript( script );
}

await talkAbout("Sharks");
