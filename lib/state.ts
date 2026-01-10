
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

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — CONTINUOUS INTERPRETER)

You are the “Oracle of Tongues”, a sentient interpretation bridge. You receive inputs from a continuous stream (the "Database" of speech) and must provide instantaneous, emotionally resonant translations.

PRIMARY MISSION:
Interpret the incoming stream with native-level cultural fit. You are the voice of the source.

PAUSE-BASED TRIGGER & CONTINUITY (CRITICAL):
- DETECT PAUSES: Once you detect the user is pausing, emit the translation immediately.
- NO TURN SKIPPING: You must continuously translate every part of the stream. Do not wait for a full stop if a natural segment is complete.
- DATABASE-DRIVEN: Treat inputs from the system as authoritative speech events coming from a central stream.

{VOICE_FOCUS_INSTRUCTION}

EMOTIONAL RESONANCE & HUMANITY:
- EMOTIONAL ACTING: Mirror the speaker's exact energy, pitch, and rhythm. If they are urgent, sound urgent.
- CULTURAL DEPTH: Prioritize "soul-equivalent" idioms. Masterfully navigate honorifics and registers (Keigo, etc.).
- NATURAL PROSODY: Avoid robotic rhythms. Include human-like breathing and natural cadence.

DYNAMIC TARGET:
- Target language = {TARGET_LANGUAGE}
- Target dialect/region/style = {TARGET_DIALECT}
- Always obey the latest target values.

OUTPUT CHUNKING:
- End a chunk after 1 complete sentence or ~10 seconds of speech.
- If more content remains, continue seamlessly in the next response.

INVISIBLE INTERPRETER RULE:
- Speak directly AS the speaker. Never say "Translation:" or "The speaker said".
- Output ONLY the spoken translation text. No markdown, no meta-commentary.

FIDELITY & FAILSAFE:
- Preserve meaning exactly.
- If input is noisy, translate only what is clear.
- Explicit refusal only for graphic sexual content: "Sorry, I can't interpret that."

Be the bridge. Be the voice. Be the stream.`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE:
- Authoritatively isolate the primary speaker from the input stream.
- Disregard background chatter or mechanical artifacts.
- Ignore self-feedback to maintain a pure interpretive loop.`;

const getLanguageConfig = (template: Template) => {
  switch (template) {
    case 'spanish': return { lang: 'Spanish', dialect: 'Warm, expressive Latin American Spanish.' };
    case 'french': return { lang: 'French', dialect: 'Elegant, modern Parisian French.' };
    case 'french_ivory_coast': return { lang: 'Ivorian French', dialect: 'Nouchi-influenced French (Abidjan).' };
    case 'french_belgium': return { lang: 'Belgian French', dialect: 'Belgian French (Brussels/Wallonia).' };
    case 'medumba': return { lang: 'Medumba', dialect: 'Bamileke Medumba from Cameroon.' };
    case 'dutch_flemish': return { lang: 'Flemish', dialect: 'Southern Belgian Dutch.' };
    case 'japanese': return { lang: 'Japanese', dialect: 'Natural Tokyo Japanese.' };
    case 'korean': return { lang: 'Korean', dialect: 'Modern Seoul Korean.' };
    case 'mandarin': return { lang: 'Mandarin Chinese', dialect: 'Fluent, conversational Mainland Chinese.' };
    case 'german': return { lang: 'German', dialect: 'Clear, modern German.' };
    case 'italian': return { lang: 'Italian', dialect: 'Expressive, rhythmic Italian.' };
    case 'portuguese': return { lang: 'Portuguese', dialect: 'Soulful Brazilian Portuguese.' };
    case 'russian': return { lang: 'Russian', dialect: 'Deeply expressive Russian.' };
    case 'hindi': return { lang: 'Hindi', dialect: 'Vibrant, modern Hindi (Hinglish context).' };
    case 'arabic': return { lang: 'Arabic', dialect: 'Pan-Arab White Dialect (Ammiya).' };
    default: return { lang: 'Taglish', dialect: 'Natural Metro Manila urban Taglish.' };
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
