import { get_encoding, encoding_for_model, type Tiktoken } from "tiktoken";
import {
  oaiEncodings, oaiModels,
} from ".";
import type { z } from "zod";
import {
  getHuggingfaceSegments,
  getTiktokenSegments,
  type Segment,
} from "~/utils/segments";

export interface TokenizerResult {
  name: string;
  tokens: number[];
  segments?: Segment[];
  count: number;
}

export interface Tokenizer {
  name: string;
  tokenize(text: string): TokenizerResult;
  free?(): void;
}

export class TiktokenTokenizer implements Tokenizer {
  private enc: Tiktoken;
  name: string;
  constructor(model: z.infer<typeof oaiModels> | z.infer<typeof oaiEncodings>) {
    const isModel = oaiModels.safeParse(model);
    const isEncoding = oaiEncodings.safeParse(model);
    console.log(isModel.success, isEncoding.success, model)
    if (isModel.success) {

      if (
        model === "text-embedding-3-small" ||
        model === "text-embedding-3-large"
      ) {
        throw new Error("Model may be too new");
      }

      const enc =
        model === "gpt-3.5-turbo" || model === "gpt-4" || model === "gpt-4-32k"
          ? get_encoding("cl100k_base", {
              "<|im_start|>": 100264,
              "<|im_end|>": 100265,
              "<|im_sep|>": 100266,
            })
          : model === "gpt-4o"
          ? get_encoding("o200k_base", {
              "<|im_start|>": 200264,
              "<|im_end|>": 200265,
              "<|im_sep|>": 200266,
            })
          : // @ts-expect-error r50k broken?
            encoding_for_model(model);
      this.name = enc.name ?? model;
      this.enc = enc;
    } else if (isEncoding.success) {
      this.enc = get_encoding(isEncoding.data);
      this.name = isEncoding.data;
    } else {
      throw new Error("Invalid model or encoding");
    }
  }

  tokenize(text: string): TokenizerResult {
    const tokens = [...(this.enc?.encode(text, "all") ?? [])];
    return {
      name: this.name,
      tokens,
      segments: getTiktokenSegments(this.enc, text),
      count: tokens.length,
    };
  }

  free(): void {
    this.enc.free();
  }
}

export async function createTokenizer(name: string): Promise<Tokenizer> {
  console.log("createTokenizer", name);
  const oaiEncoding = oaiEncodings.safeParse(name);
  if (oaiEncoding.success) {
    console.log("oaiEncoding", oaiEncoding.data);
    return new TiktokenTokenizer(oaiEncoding.data);
  }
  const oaiModel = oaiModels.safeParse(name);
  if (oaiModel.success) {
    console.log("oaiModel", oaiModel.data);
    return new TiktokenTokenizer(oaiModel.data);
  }
  throw new Error("Invalid model or encoding");
}
