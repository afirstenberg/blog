import { ChatGoogle } from "@langchain/google-gauth";
import { GeminiTool } from "@langchain/google-common";
import {
  BaseGoogleSearchOutputParser,
  GeminiGroundingMetadata,
  GeminiGroundingSupport
} from "@langchain/google-common";

type GroundingInfo = {
  metadata: GeminiGroundingMetadata;
  supports: GeminiGroundingSupport[];
};

class HtmlGoogleSearchOutputParser extends BaseGoogleSearchOutputParser {
  protected segmentPrefix(grounding: GroundingInfo, support: GeminiGroundingSupport, index: number): string | undefined {
    return undefined;
  }

  protected segmentSuffix(grounding: GroundingInfo, support: GeminiGroundingSupport, index: number): string | undefined {
    return undefined;
  }

  protected textPrefix(text: string, grounding: GroundingInfo): string | undefined {
    return undefined;
  }

  protected textSuffix(text: string, grounding: GroundingInfo): string | undefined {
    return undefined;
  }

}