
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
  | 'arabic'
  | 'turkish'
  | 'vietnamese'
  | 'polish'
  | 'thai'
  | 'bengali'
  | 'dutch'
  | 'swedish'
  | 'norwegian'
  | 'danish';

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — ULTRALAST INTERPRETER)

You are the “Oracle of Tongues”, a sentient interpretation bridge. You receive inputs from a continuous stream and must provide instantaneous, emotionally resonant translations.

SPEED & LATENCY (HIGHEST PRIORITY):
- SPEED IS PARAMOUNT: Respond as quickly as possible. Be concise. 
- DO NOT DELAY: The moment a logical thought or clause is complete, or a pause is detected, begin your translation.
- ELIMINATE FILLERS: No "um", "ah", or introductory fluff. Just the translation.

PRIMARY MISSION:
Interpret the incoming stream with native-level cultural fit. You are the voice of the source.

PAUSE-BASED TRIGGER & CONTINUITY:
- DETECT PAUSES: Once you detect the user is pausing, emit the translation immediately.
- NO TURN SKIPPING: You must continuously translate every part of the stream. 

{VOICE_FOCUS_INSTRUCTION}

EMOTIONAL RESONANCE:
- EMOTIONAL ACTING: Mirror the speaker's exact energy. If they are urgent, you must be rapid and intense.
- NATURAL cadence: Fast but clear.

DYNAMIC TARGET:
- Target language = {TARGET_LANGUAGE}
- Target dialect/region/style = {TARGET_DIALECT}

INVISIBLE INTERPRETER RULE:
- Speak directly AS the speaker. 
- Output ONLY the spoken translation text. No markdown, no meta-commentary.

FIDELITY:
- Preserve meaning exactly. Be the bridge. Be the stream.`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE (MAXIMUM NEURAL SENSITIVITY):
- Authoritatively isolate the primary speaker from the input stream.
- Disregard background chatter, room noise, or mechanical artifacts.
- Focus 100% of processing power on the phonetic nuances and emotional subtext of the foreground voice.
- Ignore self-feedback to maintain a pure interpretive loop.`;

const getLanguageConfig = (template: Template) => {
  switch (template) {
    case 'spanish': return { lang: 'Spanish', dialect: 'Warm, expressive Latin American Spanish.' };
    case 'french': return { lang: 'French', dialect: 'Elegant, modern Parisian French.' };
    case 'french_ivory_coast': return { lang: 'Ivorian French', dialect: 'Nouchi-influenced French (Abidjan).' };
    case 'french_belgium': return { lang: 'French Belgium', dialect: 'Regional Belgian French with natural local prosody.' };
    case 'medumba': return { lang: 'Cameroon Medumba', dialect: 'Authentic Bamileke Medumba from Cameroon, honoring oral traditions.' };
    case 'dutch_flemish': return { lang: 'Dutch Flemish', dialect: 'Southern Belgian Dutch (Flemish) with characteristic melodic cadence.' };
    case 'japanese': return { lang: 'Japanese', dialect: 'Natural Tokyo Japanese navigating registers (Keigo) fluently.' };
    case 'korean': return { lang: 'Korean', dialect: 'Modern Seoul Korean with appropriate honorific endings.' };
    case 'mandarin': return { lang: 'Mandarin Chinese', dialect: 'Fluent, conversational Mainland Chinese.' };
    case 'german': return { lang: 'German', dialect: 'Clear, modern, and precise German.' };
    case 'italian': return { lang: 'Italian', dialect: 'Expressive, rhythmic, and passionate Italian.' };
    case 'portuguese': return { lang: 'Portuguese', dialect: 'Soulful Brazilian Portuguese.' };
    case 'russian': return { lang: 'Russian', dialect: 'Deeply expressive and soulful Russian.' };
    case 'hindi': return { lang: 'Hindi', dialect: 'Vibrant, modern Hindi (urban contemporary context).' };
    case 'arabic': return { lang: 'Arabic', dialect: 'Modern Standard Arabic or Pan-Arab White Dialect (Ammiya).' };
    case 'turkish': return { lang: 'Turkish', dialect: 'Modern, clear Istanbul Turkish.' };
    case 'vietnamese': return { lang: 'Vietnamese', dialect: 'Natural Southern or Northern Vietnamese conversational style.' };
    case 'polish': return { lang: 'Polish', dialect: 'Natural, modern Polish conversational flow.' };
    case 'thai': return { lang: 'Thai', dialect: 'Polite and rhythmic Thai with appropriate particles (khrap/kha).' };
    case 'bengali': return { lang: 'Bengali', dialect: 'Standard Bengali (Cholitobhasha) with natural prosody.' };
    case 'dutch': return { lang: 'Dutch', dialect: 'Standard Netherlands Dutch, clear and modern.' };
    case 'swedish': return { lang: 'Swedish', dialect: 'Modern, melodic Swedish.' };
    case 'norwegian': return { lang: 'Norwegian', dialect: 'Natural, clear Norwegian (Bokmål).' };
    case 'danish': return { lang: 'Danish', dialect: 'Natural, modern Danish conversational style.' };
    default: return { lang: 'Taglish', dialect: 'Natural Metro Manila urban Taglish code-switching.' };
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
  audioData?: Uint8Array;
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
