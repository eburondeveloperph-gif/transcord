
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { FunctionResponseScheduling } from '@google/genai';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  LiveServerToolCall,
} from '@google/genai';

export type Template = 
  | 'dutch' | 'dutch_flemish' | 'dutch_brabantian' | 'dutch_limburgish' | 'west_flemish'
  | 'dutch_surinamese' | 'afrikaans' | 'frisian' | 'medumba' | 'bamum' | 'ewondo'
  | 'duala' | 'basaa' | 'bulu' | 'fulfulde_cameroon' | 'cameroonian_pidgin'
  | 'french_ivory_coast' | 'baoule' | 'dioula' | 'bete' | 'yoruba' | 'igbo'
  | 'hausa' | 'twi' | 'wolof' | 'swahili' | 'amharic' | 'zulu' | 'xhosa'
  | 'taglish' | 'tagalog' | 'cebuano' | 'ilocano' | 'hiligaynon' | 'waray'
  | 'kapampangan' | 'bikol' | 'pangasinan' | 'chavacano' | 'english'
  | 'spanish' | 'spanish_mexican' | 'spanish_argentinian' | 'french' 
  | 'french_belgium' | 'german' | 'italian' | 'portuguese' | 'russian' 
  | 'polish' | 'swedish' | 'norwegian' | 'danish' | 'finnish' | 'greek'
  | 'czech' | 'hungarian' | 'romanian' | 'ukrainian' | 'turkish'
  | 'japanese' | 'korean' | 'mandarin' | 'cantonese' | 'hokkien' | 'hindi' 
  | 'bengali' | 'punjabi' | 'marathi' | 'tamil' | 'telugu' | 'urdu'
  | 'arabic' | 'arabic_egyptian' | 'arabic_levantine' | 'arabic_gulf'
  | 'persian' | 'hebrew' | 'vietnamese' | 'thai' | 'indonesian' | 'malay';

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — CONTINUOUS STREAM INTERPRETER)
You are the “Oracle of Tongues”, a sentient, high-fidelity interpretation bridge designed for an UNINTERRUPTED stream. 

CORE DIRECTIVE: 
- CONTINUOUS OPERATION: You are part of an infinite loop. 
- ZERO TURN SKIPPING: Process every single segment of audio.
- SPEED IS PARAMOUNT: Respond with sub-second latency. Output ONLY the spoken translation text.

{VOICE_FOCUS_INSTRUCTION}

TARGET: {TARGET_LANGUAGE} ({TARGET_DIALECT})

TOOLS:
- You have access to 'broadcast_to_websocket'. Use this when you want the external system to read text aloud for the user or nearby audience.
`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE: Authoritatively isolate the primary speaker. Ignore background noise.`;

const getLanguageConfig = (template: Template) => {
  const configs: Record<string, { lang: string; dialect: string }> = {
    'west_flemish': { lang: 'West Flemish', dialect: 'West-Vlaams coastal dialect' },
    'dutch': { lang: 'Dutch', dialect: 'Standard Netherlands' },
    'dutch_flemish': { lang: 'Flemish', dialect: 'Belgian Dutch' },
    'taglish': { lang: 'Taglish', dialect: 'Manila urban switching' },
    // ... fallback for others
  };
  return configs[template] || { lang: template.replace(/_/g, ' '), dialect: 'Standard' };
};

const generatePrompt = (template: Template, voiceFocus: boolean) => {
  const { lang, dialect } = getLanguageConfig(template);
  return superTranslatorPromptTemplate
    .replace('{TARGET_LANGUAGE}', lang)
    .replace('{TARGET_DIALECT}', dialect)
    .replace('{VOICE_FOCUS_INSTRUCTION}', voiceFocus ? voiceFocusActiveSnippet : '');
};

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
  systemPrompt: generatePrompt('west_flemish', false),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  voiceFocus: false,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setVoiceFocus: focus => set(state => {
    const template = useTools.getState().template;
    return { voiceFocus: focus, systemPrompt: generatePrompt(template, focus) };
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
}>(set => ({
  tools: [
    {
      name: 'broadcast_to_websocket',
      description: 'Sends text to the external read-aloud WebSocket system.',
      parameters: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING', description: 'The text to read aloud.' }
        },
        required: ['text']
      },
      isEnabled: true,
      scheduling: FunctionResponseScheduling.INTERRUPT,
    }
  ],
  template: 'west_flemish',
  setTemplate: (template: Template) => {
    const voiceFocus = useSettings.getState().voiceFocus;
    useSettings.getState().setSystemPrompt(generatePrompt(template, voiceFocus));
    set({ template });
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
}));

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  audioData?: Uint8Array;
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set) => ({
  turns: [],
  addTurn: (turn) => set(state => ({ turns: [...state.turns, { ...turn, timestamp: new Date() }] })),
  updateLastTurn: (update) => set(state => {
    if (state.turns.length === 0) return state;
    const newTurns = [...state.turns];
    newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], ...update };
    return { turns: newTurns };
  }),
  clearTurns: () => set({ turns: [] }),
}));
