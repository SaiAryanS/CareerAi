import {genkit} from 'genkit';
import {openAI} from 'genkitx-openai';

export const ai = genkit({
  plugins: [
    openAI({
      apiKey: 'lm-studio', // LM Studio doesn't require a real API key
      baseURL: 'http://192.168.0.105:1234/v1',
    }),
  ],
  model: 'openai/qwen2.5-coder-7b-instruct',
});
