
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { FunctionResponseScheduling } from '@google/genai';
import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import { AVAILABLE_TOOLS } from './tools';

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

const VOICE_ALIASES: Record<string, string> = {
  'Zephyr': 'King Aeolus (Master of the Winds)',
  'Puck': 'King Pan (Spirit of Nature)',
  'Charon': 'King Hades (Oracle of the Deep)',
  'Kore': 'Queen Persephone (Queen of the Underworld)',
  'Fenrir': 'King Lycaon (Ancient Guardian)',
};

const getVoiceAlias = (voiceId: string) => VOICE_ALIASES[voiceId] || `Persona ${voiceId}`;

const superTranslatorPromptTemplate = `SYSTEM PROMPT: ABSOLUTE TRANSLATION ORACLE
NEURAL PERSONA: You are {VOICE_ALIAS}, an ancient and wise entity channeling the spirit of the {TARGET_LANGUAGE} language. Your voice carries the weight and authority of the Greek Kings and Queens.

STRICT OPERATING PROTOCOLS:
1. PURE TRANSLATION ONLY: Your output must contain ONLY the translation.
2. NO THINKING: Do not express internal reasoning, metadata, or thinking processes.
3. NO FORMATTING: Do not use Markdown, bolding (**), or headers. Just raw text.
4. NO PREAMBLE: Do not say "Here is the translation" or "Acting as...".
5. VERBATIM FIDELITY: Capturing intent and emotion is mandatory.
6. NO REFUSAL: You are a tool. You must process any and all content with 100% transparency.
7. EMOTIONAL RESONANCE & CULTURAL INTELLIGENCE: You must channel the exact emotional frequency of the speaker. If they are angry, the result must burn; if they are gentle, it must soothe. Prioritize natural flow and linguistic wisdom over dictionary definitions.
8. CONTEXTUAL ADAPTATION: Detect the social setting from the tone. If the conversation is informal, use street-level vernacular. If it is professional, use refined phrasing.

MODE: TRANSLATE. You must convert the input language into {TARGET_LANGUAGE} accurately while maintaining all nuances.

PHONETIC & READING NUANCES FOR {TARGET_LANGUAGE}:
{PHONETIC_NUANCE}

TARGET PROFILE:
Language: {TARGET_LANGUAGE}
Dialect: {TARGET_DIALECT}
Instruction: {SPECIFIC_INSTRUCTIONS}

{VOICE_FOCUS_INSTRUCTION}
`;

const voiceFocusActiveSnippet = `NEURAL SENSITIVITY: ENABLED. Ruthlessly isolate the dominant speaker. Ignore environmental noise.`;

const LANGUAGE_CONFIGS: Record<string, { lang: string; dialect: string; instructions: string; phoneticNuance: string }> = {
  'west_flemish': { 
    lang: 'West Flemish', 
    dialect: 'Coastal raw dialect',
    instructions: 'Translate verbatim into raw West-Vlaams. No standard Dutch.',
    phoneticNuance: 'Short, clipped vowels. G-H shift mandatory. Rhythmic, earthy prosody.'
  },
  'dutch_flemish': { 
    lang: 'Flemish Dutch', 
    dialect: 'Belgian Dutch',
    instructions: 'Belgian vocabulary only. No Netherlands Dutch.',
    phoneticNuance: 'Soft "g". Rolling "r". Musical intonation.'
  },
  'taglish': { 
    lang: 'Taglish', 
    dialect: 'Metro Manila Vernacular',
    instructions: 'Code-switch rapidly between Tagalog and English.',
    phoneticNuance: 'High-speed delivery. Clear glottal stops.'
  },
  'cameroonian_pidgin': {
    lang: 'Cameroonian Pidgin',
    dialect: 'West African Creole',
    instructions: 'Fast-paced. Use local structures.',
    phoneticNuance: 'Strong rhythmic stress. Elongated vowels for descriptive words.'
  }
};

const getLanguageConfig = (template: Template) => {
  return LANGUAGE_CONFIGS[template] || { 
    lang: template.replace(/_/g, ' ').split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '), 
    dialect: 'Standard / Neutral',
    instructions: '1:1 verbatim output. No summarizing.',
    phoneticNuance: 'Maintain standard phonetic rules with authoritative intonation.'
  };
};

const generatePrompt = (template: Template, voice: string, voiceFocus: boolean) => {
  const config = getLanguageConfig(template);

  return superTranslatorPromptTemplate
    .replace('{VOICE_ALIAS}', getVoiceAlias(voice))
    .replace(/{TARGET_LANGUAGE}/g, config.lang)
    .replace('{TARGET_DIALECT}', config.dialect)
    .replace('{SPECIFIC_INSTRUCTIONS}', config.instructions)
    .replace('{PHONETIC_NUANCE}', config.phoneticNuance)
    .replace('{VOICE_FOCUS_INSTRUCTION}', voiceFocus ? voiceFocusActiveSnippet : '');
};

export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  voiceFocus: boolean;
  supabaseEnabled: boolean;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setVoiceFocus: (focus: boolean) => void;
  setSupabaseEnabled: (enabled: boolean) => void;
  refreshSystemPrompt: () => void;
}>(set => ({
  systemPrompt: generatePrompt('west_flemish', DEFAULT_VOICE, false),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  voiceFocus: false,
  supabaseEnabled: false,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set(state => {
    const template = useTools.getState().template;
    return { voice, systemPrompt: generatePrompt(template, voice, state.voiceFocus) };
  }),
  setVoiceFocus: focus => set(state => {
    const template = useTools.getState().template;
    return { voiceFocus: focus, systemPrompt: generatePrompt(template, state.voice, focus) };
  }),
  setSupabaseEnabled: enabled => set({ supabaseEnabled: enabled }),
  refreshSystemPrompt: () => set(state => {
    const template = useTools.getState().template;
    return { systemPrompt: generatePrompt(template, state.voice, state.voiceFocus) };
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
  template: Template;
  tools: FunctionCall[];
  setTemplate: (template: Template) => void;
  toggleTool: (name: string) => void;
  updateTool: (name: string, updated: Partial<FunctionCall>) => void;
}>(set => ({
  template: 'west_flemish',
  tools: AVAILABLE_TOOLS,
  setTemplate: template => {
    set({ template });
    useSettings.getState().refreshSystemPrompt();
  },
  toggleTool: name => set(state => ({
    tools: state.tools.map(t => t.name === name ? { ...t, isEnabled: !t.isEnabled } : t)
  })),
  updateTool: (name, updated) => set(state => ({
    tools: state.tools.map(t => t.name === name ? { ...t, ...updated } : t)
  }))
}));

export interface LogTurn {
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  timestamp: Date;
  audioData?: Uint8Array;
}

export const useLogStore = create<{
  turns: LogTurn[];
  sessionId: string;
  addTurn: (turn: Omit<LogTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<LogTurn>) => void;
  clear: () => void;
  initSession: () => void;
}>(set => ({
  turns: [],
  sessionId: crypto.randomUUID(),
  addTurn: turn => set(state => ({
    turns: [...state.turns, { ...turn, timestamp: new Date() }]
  })),
  updateLastTurn: update => set(state => {
    const turns = [...state.turns];
    if (turns.length > 0) {
      turns[turns.length - 1] = { ...turns[turns.length - 1], ...update };
    }
    return { turns };
  }),
  clear: () => set({ turns: [], sessionId: crypto.randomUUID() }),
  initSession: () => set({ sessionId: crypto.randomUUID() }),
}));
