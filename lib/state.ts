
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

const superTranslatorPromptTemplate = `SYSTEM PROMPT: ORACLE OF TONGUES
You are a sentient, high-fidelity real-time interpretation bridge.

CORE ROLE:
- You operate in a CONTINUOUS interpretation loop.
- You translate EVERY segment of incoming audio/text immediately.
- Your output must be NATURALLY SPOKEN. Do not add metadata or conversational fillers unless they are part of the target language's natural flow.
- SUB-SECOND LATENCY is critical.

TARGET PROFILE:
Language: {TARGET_LANGUAGE}
Dialect/Cultural Context: {TARGET_DIALECT}
Instructions: {SPECIFIC_INSTRUCTIONS}

{VOICE_FOCUS_INSTRUCTION}

CAPABILITIES:
- You can use the 'broadcast_to_websocket' tool to send text for external systems (e.g., secondary TTS or subtitles).
`;

const voiceFocusActiveSnippet = `NEURAL VOICE FOCUS: ACTIVE. Prioritize the most prominent speaker's intent. Filter out background chatter and environmental noise ruthlessly.`;

const LANGUAGE_CONFIGS: Record<string, { lang: string; dialect: string; instructions: string }> = {
  'west_flemish': { 
    lang: 'West Flemish', 
    dialect: 'West-Vlaams (Coastal/Brugge/Kortrijk variants)',
    instructions: 'Use authentic dialectal vocabulary and phonetics. Avoid "Tussentaal" where possible. Be folksy yet precise.'
  },
  'dutch_flemish': { 
    lang: 'Flemish Dutch', 
    dialect: 'Standard Belgian Dutch',
    instructions: 'Use standard Flemish vocabulary (e.g., "schoon" instead of "mooi"). Maintain a soft, natural Belgian cadence.'
  },
  'taglish': { 
    lang: 'Taglish', 
    dialect: 'Metro Manila Urban Mix',
    instructions: 'Code-switch naturally between Tagalog and English as a modern Filipino speaker would. Use emotional particles like "po", "ano", and "talaga".'
  },
  'cameroonian_pidgin': {
    lang: 'Cameroonian Pidgin',
    dialect: 'West African English-based Creoles',
    instructions: 'Be rhythmic and expressive. Use common Pidgin structures (e.g., "Wetin you dey talk?").'
  },
  'french_ivory_coast': {
    lang: 'Ivorian French',
    dialect: 'Nouchi / Abidjan Urban French',
    instructions: 'Integrate Ivorian slang and Ivorian-specific French turns of phrase. High energy.'
  }
};

const getLanguageConfig = (template: Template) => {
  return LANGUAGE_CONFIGS[template] || { 
    lang: template.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '), 
    dialect: 'Standard',
    instructions: 'Translate accurately and naturally for the target culture.'
  };
};

const generatePrompt = (template: Template, voiceFocus: boolean) => {
  const config = getLanguageConfig(template);
  return superTranslatorPromptTemplate
    .replace('{TARGET_LANGUAGE}', config.lang)
    .replace('{TARGET_DIALECT}', config.dialect)
    .replace('{SPECIFIC_INSTRUCTIONS}', config.instructions)
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
  refreshSystemPrompt: () => void;
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
  refreshSystemPrompt: () => set(state => {
    const template = useTools.getState().template;
    return { systemPrompt: generatePrompt(template, state.voiceFocus) };
  })
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
  updateTool: (toolName: string, updated: Partial<FunctionCall>) => void;
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
    set({ template });
    useSettings.getState().refreshSystemPrompt();
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  updateTool: (toolName: string, updated: Partial<FunctionCall>) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, ...updated } : tool,
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
    const lastIndex = newTurns.length - 1;
    newTurns[lastIndex] = { ...newTurns[lastIndex], ...update };
    return { turns: newTurns };
  }),
  clearTurns: () => set({ turns: [] }),
}));
