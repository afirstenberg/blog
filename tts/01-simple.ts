import { ChatGoogle } from "@langchain/google-gauth";
import createBuffer from "audio-buffer-from";
import play from "audio-play";

const modelName = "gemini-2.5-flash-preview-tts";
const responseModalities = ["AUDIO"];
const speechConfig = "Zubenelgenubi";  // The name of the voice to use

const model = new ChatGoogle({
  modelName,
  responseModalities,
  speechConfig,
})

const prompt = "Say cheerfully: Have a wonderful day!";
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