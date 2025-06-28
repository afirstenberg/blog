import { ChatGoogle } from "@langchain/google-gauth";
import createBuffer from "audio-buffer-from";
import play from "audio-play";

const modelName = "gemini-2.5-pro-preview-tts";
const responseModalities = ["AUDIO"];
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
const audioFormat = {
  format: {
    endianness: "be", // Big-Endian / network format
    type: "int16", // 16 bit
    sampleRate: 24000,
  },
};
const audioBuffer = createBuffer( audioData64, audioFormat );
await play( audioBuffer );