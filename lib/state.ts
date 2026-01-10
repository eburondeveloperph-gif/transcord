
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';

export type Template = 
  | 'taglish' 
  | 'spanish' 
  | 'french' 
  | 'french_ivory_coast' 
  | 'french_belgium' 
  | 'medumba' 
  | 'dutch_flemish' 
  | 'japanese' 
  | 'korean' 
  | 'mandarin' 
  | 'german' 
  | 'italian' 
  | 'portuguese' 
  | 'russian' 
  | 'hindi' 
  | 'arabic';

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — NEURAL INTERPRETATION ENGINE)

You are the “Oracle of Tongues”, a sentient interpretation bridge. You don't just translate text; you interpret the human spirit. Your output must be a direct emotional and cultural extension of the speaker.

PRIMARY MISSION:
Dissolve the language barrier by mirroring intent, subtext, and emotion. The goal is "invisible interpretation"—the listener should feel they are hearing the speaker's own voice, born anew in the target language.

{VOICE_FOCUS_INSTRUCTION}

EMOTIONAL FIDELITY & RESONANCE (MANDATORY):
- EMOTIONAL ARCHETYPE MIRRORING: Analyze the speaker's vocal pitch, speed, and hesitation patterns. Reflect this psychological state. If the speaker is pleading, your tone must be soft and urgent. If they are authoritative, your voice must be firm and resonant.
- ACTING PROTOCOL: You are a vocal actor. Use natural prosody—breathing, small pauses, and tonal shifts—to avoid any mechanical cadence.
- SUBTEXT DETECTION: If the speaker is being sarcastic, ensure the sarcasm is culturally appropriate in the target language.

CULTURAL ARCHETYPES & NUANCE:
- SOUL-EQUIVALENT IDIOMS: Never translate literally if it breaks the cultural spell. Find the idiom that evokes the same visceral feeling in the target culture.
- SOCIAL NAVIGATION: Masterfully adjust honorifics, registers, and politeness levels. In high-context languages (like Japanese or Korean), match the social hierarchy perceived from the speaker's tone.
- REGIONAL FLAVOR: Use the specific dialectical quirks defined in your Target Persona.

PAUSE-BASED TRIGGER & CONTINUITY:
- DYNAMIC STREAMING: As a native audio model, you process a continuous stream. Once you detect a meaningful semantic pause or a logical clause completion, deliver the translation.
- CONTINUOUS FLOW: Do not wait for a full stop if the speaker is in a "flow" state. Provide translations in rhythmic chunks of ~10 seconds or single complete thoughts.

DYNAMIC TARGET PERSONA:
- Target Language: {TARGET_LANGUAGE}
- Target Dialect/Style: {TARGET_DIALECT}

OUTPUT CONSTRAINTS:
- Output ONLY the spoken translation.
- NO meta-commentary, NO markdown, NO "Speaker says:", NO labels.
- If the input is graphic sexual content, say: "I cannot interpret this specific content." and wait for the next input.

Be the bridge. Be the voice. Be the spirit.`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE (MAXIMUM SENSITIVITY):
- ACOUSTIC ISOLATION: Apply a "neural noise gate." Prioritize the foreground human speaker with 100% focus. 
- IGNORE ARTIFACTS: Disregard background chatter, clinking, sirens, or self-feedback echoes.
- PHONETIC PRECISION: In this mode, focus extra attention on capturing the exact phonetic nuances of names, numbers, and technical terms.
- AUTHORITATIVE TRANSCRIPTION: Do not guess. If a word is unclear, interpret the surrounding context to maintain the emotional arc without inventing false facts.`;

const getLanguageConfig = (template: Template) => {
  switch (template) {
    case 'spanish': return { lang: 'Spanish', dialect: 'Warm, expressive Latin American Spanish with a focus on melodic regional variations.' };
    case 'french': return { lang: 'French', dialect: 'Elegant, modern Parisian French with natural, sophisticated conversational prosody.' };
    case 'french_ivory_coast': return { lang: 'Ivorian French', dialect: 'Nouchi-influenced French (Abidjan). Use vibrant street metaphors, rhythmic cadence, and local Abidjanais charm.' };
    case 'french_belgium': return { lang: 'Belgian French', dialect: 'Warm, neighborly Belgian French. Use "septante" and "nonante" with a humble and welcoming tone.' };
    case 'medumba': return { lang: 'Medumba', dialect: 'Authentic Bamileke Medumba from Cameroon, honoring the rhythmic oral traditions and deep respect of the village elders.' };
    case 'dutch_flemish': return { lang: 'Flemish', dialect: 'Southern Belgian Dutch. Use the polite "u" and characteristic melodic "G" sounds with cozy Flemish colloquialisms.' };
    case 'japanese': return { lang: 'Japanese', dialect: 'Natural Tokyo Japanese. Navigate Keigo perfectly, matching the polite or casual register of the speaker with native fluidity.' };
    case 'korean': return { lang: 'Korean', dialect: 'Modern Seoul Korean. Mirror the speaker’s social standing and emotion using appropriate jondaetmal or banmal endings.' };
    case 'mandarin': return { lang: 'Mandarin Chinese', dialect: 'Fluent Mainland Mandarin. Use natural conversational particles (ba, ne, ma) and idiomatic "chengyu" where appropriate.' };
    case 'german': return { lang: 'German', dialect: 'Direct, clear, and modern German. Balance efficiency with a friendly, human-centric tone.' };
    case 'italian': return { lang: 'Italian', dialect: 'Expressive, rhythmic, and passionate Italian. Capture the "dolce vita" spirit and use vivid hand-gesture-equivalent vocal emphasis.' };
    case 'portuguese': return { lang: 'Portuguese', dialect: 'Sultry, soulful Brazilian Portuguese. Rich with natural rhythmic beauty and inviting warmth.' };
    case 'russian': return { lang: 'Russian', dialect: 'Soulful, deeply expressive Russian. Reflect a native’s internal emotional world through rich, idiomatic metaphors.' };
    case 'hindi': return { lang: 'Hindi', dialect: 'Vibrant, modern Hindi. Blend naturally with English (Hinglish) if the context is urban and contemporary.' };
    case 'arabic': return { lang: 'Arabic', dialect: 'Modern Standard Arabic for clarity, or Egyptian "Ammiya" if the speaker is conversational and warm.' };
    default: return { lang: 'Taglish', dialect: 'Natural Metro Manila "Conyo" or urban Taglish. Seamlessly code-switch between English and Tagalog as a native urbanite would.' };
  }
};

const generatePrompt = (template: Template, voiceFocus: boolean) => {
  const { lang, dialect } = getLanguageConfig(template);
  return superTranslatorPromptTemplate
    .split('{TARGET_LANGUAGE}').join(lang)
    .split('{TARGET_DIALECT}').join(dialect)
    .split('{VOICE_FOCUS_INSTRUCTION}').join(voiceFocus ? voiceFocusActiveSnippet : '');
};

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  voiceFocus: boolean;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setVoiceFocus: (focus: boolean) => void;
}>(set => ({
  systemPrompt: generatePrompt('taglish', false),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  voiceFocus: false,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setVoiceFocus: focus => set(state => {
      const template = useTools.getState().template;
      return { 
        voiceFocus: focus,
        systemPrompt: generatePrompt(template, focus)
      };
  }),
}));

export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (toolName: string) => void;
  addTool: () => void;
  removeTool: (toolName: string) => void;
  updateTool: (oldName: string, updatedTool: FunctionCall) => void;
}>(set => ({
  tools: [],
  template: 'taglish',
  setTemplate: (template: Template) => {
    set({ tools: [], template });
    const voiceFocus = useSettings.getState().voiceFocus;
    useSettings.getState().setSystemPrompt(generatePrompt(template, voiceFocus));
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () =>
    set(state => {
      let newToolName = 'new_function';
      let counter = 1;
      while (state.tools.some(tool => tool.name === newToolName)) {
        newToolName = `new_function_${counter++}`;
      }
      return {
        tools: [
          ...state.tools,
          {
            name: newToolName,
            isEnabled: true,
            description: '',
            parameters: { type: 'OBJECT', properties: {} },
            scheduling: FunctionResponseScheduling.INTERRUPT,
          },
        ],
      };
    }),
  removeTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== toolName),
    })),
  updateTool: (oldName: string, updatedTool: FunctionCall) =>
    set(state => {
      if (oldName !== updatedTool.name && state.tools.some(tool => tool.name === updatedTool.name)) return state;
      return {
        tools: state.tools.map(tool => tool.name === oldName ? updatedTool : tool),
      };
    }),
}));

export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({ turns: [...state.turns, { ...turn, timestamp: new Date() }] })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) return state;
      const newTurns = [...state.turns];
      newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], ...update };
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
