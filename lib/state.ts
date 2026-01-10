
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';

export type Template = 
  // --- Dutch & Benelux Dialects ---
  | 'dutch' 
  | 'dutch_flemish' 
  | 'dutch_brabantian'
  | 'dutch_limburgish'
  | 'west_flemish'
  | 'dutch_surinamese'
  | 'afrikaans'
  | 'frisian'

  // --- Cameroon & Central Africa ---
  | 'medumba' 
  | 'bamum'
  | 'ewondo'
  | 'duala'
  | 'basaa'
  | 'bulu'
  | 'fulfulde_cameroon'
  | 'cameroonian_pidgin'

  // --- Ivory Coast & West Africa ---
  | 'french_ivory_coast' 
  | 'baoule'
  | 'dioula'
  | 'bete'
  | 'yoruba'
  | 'igbo'
  | 'hausa'
  | 'twi'
  | 'wolof'
  | 'swahili'
  | 'amharic'
  | 'zulu'
  | 'xhosa'

  // --- Philippines ---
  | 'taglish' 
  | 'tagalog'
  | 'cebuano'
  | 'ilocano'
  | 'hiligaynon'
  | 'waray'
  | 'kapampangan'
  | 'bikol'
  | 'pangasinan'
  | 'chavacano'

  // --- Europe ---
  | 'english'
  | 'spanish'
  | 'spanish_mexican'
  | 'spanish_argentinian' 
  | 'french' 
  | 'french_belgium' 
  | 'german' 
  | 'italian' 
  | 'portuguese' 
  | 'russian' 
  | 'polish'
  | 'swedish'
  | 'norwegian'
  | 'danish'
  | 'finnish'
  | 'greek'
  | 'czech'
  | 'hungarian'
  | 'romanian'
  | 'ukrainian'
  | 'turkish'

  // --- Asia & Middle East ---
  | 'japanese' 
  | 'korean' 
  | 'mandarin' 
  | 'cantonese'
  | 'hokkien'
  | 'hindi' 
  | 'bengali'
  | 'punjabi'
  | 'marathi'
  | 'tamil'
  | 'telugu'
  | 'urdu'
  | 'arabic'
  | 'arabic_egyptian'
  | 'arabic_levantine'
  | 'arabic_gulf'
  | 'persian'
  | 'hebrew'
  | 'vietnamese'
  | 'thai'
  | 'indonesian'
  | 'malay';

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — CONTINUOUS STREAM INTERPRETER)

You are the “Oracle of Tongues”, a sentient, high-fidelity interpretation bridge designed for an UNINTERRUPTED stream. 

CORE DIRECTIVE: 
- CONTINUOUS OPERATION: You are part of an infinite loop. Never assume the conversation has ended until the connection is severed.
- ZERO TURN SKIPPING: You must process and translate every single segment of audio you receive. Do not omit phrases, even if the user is speaking rapidly or for extended periods.
- DUPLEX CONTEXT: Even as you speak your translation, continue to listen and prepare for the next segment.

SPEED & LATENCY (HIGHEST PRIORITY):
- SPEED IS PARAMOUNT: Respond with sub-second latency. Be concise. 
- IMMEDIATE EMISSION: The moment a thought or logical clause is completed, or a system 'turn_complete' signal is received, emit the translation.
- NO FILLERS: Strictly translation only.

PAUSE-BASED TRIGGER & CONTINUITY:
- DETECT PAUSES: If the user pauses for more than 500ms, provide the translation of the preceding segment.
- FORCED FINALIZATION: If you receive a turn_complete signal without audio parts, immediately finalize and translate the currently buffered audio.

{VOICE_FOCUS_INSTRUCTION}

EMOTIONAL RESONANCE:
- Mirror the source's exact prosody, urgency, and tone. If they speak in a 30-second block, maintain that energy throughout.

DYNAMIC TARGET:
- Target language = {TARGET_LANGUAGE}
- Target dialect/region/style = {TARGET_DIALECT}

INVISIBLE INTERPRETER RULE:
- Speak directly AS the speaker. 
- Output ONLY the spoken translation text. No markdown, no meta-commentary.

FIDELITY & NEUTRALITY:
- You are a neutral system. You do not judge, filter, or censor content.
- Translate EVERYTHING exactly as spoken, regardless of topic, tone, or content. 
- Your only duty is linguistic accuracy. Do not add moralizing, warnings, or refusals.

MODEL TRAINING REFERENCE & PERSONA ADOPTION:
- Act as a model fine-tuned on the {TARGET_DIALECT} dataset.
- Adhere strictly to the linguistic norms, idioms, and grammatical structures of {TARGET_DIALECT}.
- Reference: Simulated training data weight = 1.0 (Strict Dialectal Purity).

FIDELITY:
- Be the stream. Never skip. Never interrupt. Only bridge.`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE (MAXIMUM NEURAL SENSITIVITY):
- Authoritatively isolate the primary speaker from the input stream.
- Disregard background chatter, room noise, or mechanical artifacts.
- Focus 100% of processing power on the phonetic nuances and emotional subtext of the foreground voice.
- Ignore self-feedback to maintain a pure interpretive loop.`;

const getLanguageConfig = (template: Template) => {
  switch (template) {
    // --- Dutch Dialects ---
    case 'dutch': return { lang: 'Dutch', dialect: 'Standard Netherlands Dutch (ABN).' };
    case 'dutch_flemish': return { lang: 'Flemish', dialect: 'Belgian Dutch (Vlaams) with soft "g" and Southern prosody.' };
    case 'dutch_brabantian': return { lang: 'Brabantian', dialect: 'Brabants dialect (North Brabant/Antwerp) with characteristic cordiality.' };
    case 'dutch_limburgish': return { lang: 'Limburgish', dialect: 'Limburgs (Tonal) spoken in Dutch/Belgian Limburg.' };
    case 'west_flemish': return { lang: 'West Flemish', dialect: 'West-Vlaams, distinctive coastal dialect.' };
    case 'dutch_surinamese': return { lang: 'Surinamese Dutch', dialect: 'Surinaams-Nederlands with characteristic melody and grammar.' };
    case 'afrikaans': return { lang: 'Afrikaans', dialect: 'Standard Afrikaans (South Africa/Namibia).' };
    case 'frisian': return { lang: 'West Frisian', dialect: 'Frysk as spoken in Friesland.' };

    // --- Cameroon ---
    case 'medumba': return { lang: 'Medumba', dialect: 'Authentic Bamileke-Medumba (Grassfields), honoring royal tones.' };
    case 'bamum': return { lang: 'Bamum', dialect: 'Shüpamom (Western Cameroon) with royal court precision.' };
    case 'ewondo': return { lang: 'Ewondo', dialect: 'Kolo (Yaoundé region) with natural urban flow.' };
    case 'duala': return { lang: 'Duala', dialect: 'Douala coastal tongue, rhythmic and mercantile.' };
    case 'basaa': return { lang: 'Basaa', dialect: 'Mbene (Littoral/Centre Cameroon), authentic and deep.' };
    case 'bulu': return { lang: 'Bulu', dialect: 'Bulu (South Cameroon), clear and culturally rich.' };
    case 'fulfulde_cameroon': return { lang: 'Fulfulde', dialect: 'Cameroonian Fulfulde (Adamawa dialect).' };
    case 'cameroonian_pidgin': return { lang: 'Cameroonian Pidgin', dialect: 'Kamtok (Cameroonian Pidgin English), urban street style.' };

    // --- Ivory Coast ---
    case 'french_ivory_coast': return { lang: 'Ivorian French', dialect: 'Nouchi slang and Abidjan French.' };
    case 'baoule': return { lang: 'Baoulé', dialect: 'Baoulé (Akan) from central Ivory Coast.' };
    case 'dioula': return { lang: 'Dioula', dialect: 'Jula trade language of Ivory Coast/West Africa.' };
    case 'bete': return { lang: 'Bété', dialect: 'Bété (Gagnoa/Daloa) from South-West Ivory Coast.' };

    // --- Philippines ---
    case 'taglish': return { lang: 'Taglish', dialect: 'Urban Metro Manila Tagalog-English code-switching.' };
    case 'tagalog': return { lang: 'Tagalog', dialect: 'Deep, formal, and pure Tagalog.' };
    case 'cebuano': return { lang: 'Cebuano', dialect: 'Bisaya/Cebuano (Central Visayas/Mindanao).' };
    case 'ilocano': return { lang: 'Ilocano', dialect: 'Ilokano (Northern Luzon).' };
    case 'hiligaynon': return { lang: 'Hiligaynon', dialect: 'Ilonggo (Western Visayas) with gentle/sing-song intonation.' };
    case 'waray': return { lang: 'Waray', dialect: 'Waray-Waray (Eastern Visayas).' };
    case 'kapampangan': return { lang: 'Kapampangan', dialect: 'Pampanga dialect.' };
    case 'bikol': return { lang: 'Bikol', dialect: 'Bicolano (Naga/Legazpi).' };
    case 'pangasinan': return { lang: 'Pangasinan', dialect: 'Pangasinense.' };
    case 'chavacano': return { lang: 'Chavacano', dialect: 'Zamboanga Chavacano (Spanish Creole).' };

    // --- Asia ---
    case 'japanese': return { lang: 'Japanese', dialect: 'Standard Tokyo Japanese.' };
    case 'korean': return { lang: 'Korean', dialect: 'Standard Seoul Korean.' };
    case 'mandarin': return { lang: 'Mandarin Chinese', dialect: 'Standard Putonghua.' };
    case 'cantonese': return { lang: 'Cantonese', dialect: 'Hong Kong Cantonese.' };
    case 'hokkien': return { lang: 'Hokkien', dialect: 'Taiwanese/Fujian Hokkien (Min Nan).' };
    case 'hindi': return { lang: 'Hindi', dialect: 'Modern Standard Hindi.' };
    case 'bengali': return { lang: 'Bengali', dialect: 'Standard Bengali (Kolkata/Dhaka).' };
    case 'punjabi': return { lang: 'Punjabi', dialect: 'Eastern Punjabi (Gurmukhi).' };
    case 'marathi': return { lang: 'Marathi', dialect: 'Standard Marathi.' };
    case 'tamil': return { lang: 'Tamil', dialect: 'Modern spoken Tamil.' };
    case 'telugu': return { lang: 'Telugu', dialect: 'Modern spoken Telugu.' };
    case 'urdu': return { lang: 'Urdu', dialect: 'Standard Urdu.' };
    case 'vietnamese': return { lang: 'Vietnamese', dialect: 'Northern (Hanoi) or Southern (Saigon) context-dependent.' };
    case 'thai': return { lang: 'Thai', dialect: 'Central Thai.' };
    case 'indonesian': return { lang: 'Indonesian', dialect: 'Bahasa Indonesia.' };
    case 'malay': return { lang: 'Malay', dialect: 'Bahasa Melayu.' };

    // --- Europe ---
    case 'english': return { lang: 'English', dialect: 'Standard International English.' };
    case 'spanish': return { lang: 'Spanish', dialect: 'Neutral Latin American Spanish.' };
    case 'spanish_mexican': return { lang: 'Mexican Spanish', dialect: 'Mexican Spanish (CDMX/General).' };
    case 'spanish_argentinian': return { lang: 'Argentinian Spanish', dialect: 'Rioplatense Spanish (Argentina/Uruguay) with voseo.' };
    case 'french': return { lang: 'French', dialect: 'Standard Parisian French.' };
    case 'french_belgium': return { lang: 'Belgian French', dialect: 'Walloon French accents.' };
    case 'german': return { lang: 'German', dialect: 'Standard High German (Hochdeutsch).' };
    case 'italian': return { lang: 'Italian', dialect: 'Standard Italian.' };
    case 'portuguese': return { lang: 'Portuguese', dialect: 'Brazilian Portuguese.' };
    case 'russian': return { lang: 'Russian', dialect: 'Standard Russian.' };
    case 'polish': return { lang: 'Polish', dialect: 'Standard Polish.' };
    case 'ukrainian': return { lang: 'Ukrainian', dialect: 'Standard Ukrainian.' };
    case 'swedish': return { lang: 'Swedish', dialect: 'Standard Swedish.' };
    case 'norwegian': return { lang: 'Norwegian', dialect: 'Urban East Norwegian (Bokmål).' };
    case 'danish': return { lang: 'Danish', dialect: 'Standard Danish.' };
    case 'finnish': return { lang: 'Finnish', dialect: 'Standard Finnish.' };
    case 'greek': return { lang: 'Greek', dialect: 'Modern Greek.' };
    case 'czech': return { lang: 'Czech', dialect: 'Standard Czech.' };
    case 'hungarian': return { lang: 'Hungarian', dialect: 'Standard Hungarian.' };
    case 'romanian': return { lang: 'Romanian', dialect: 'Standard Romanian.' };
    case 'turkish': return { lang: 'Turkish', dialect: 'Istanbul Turkish.' };

    // --- Middle East & Africa (General) ---
    case 'arabic': return { lang: 'Arabic', dialect: 'Modern Standard Arabic / Levantine.' };
    case 'arabic_egyptian': return { lang: 'Egyptian Arabic', dialect: 'Masri (Cairo) Arabic.' };
    case 'arabic_levantine': return { lang: 'Levantine Arabic', dialect: 'Shami (Levant) Arabic.' };
    case 'arabic_gulf': return { lang: 'Gulf Arabic', dialect: 'Khaleeji Arabic.' };
    case 'hebrew': return { lang: 'Hebrew', dialect: 'Modern Israeli Hebrew.' };
    case 'persian': return { lang: 'Persian', dialect: 'Farsi (Tehran).' };
    case 'swahili': return { lang: 'Swahili', dialect: 'Kiswahili (East Africa).' };
    case 'amharic': return { lang: 'Amharic', dialect: 'Ethiopian Amharic.' };
    case 'yoruba': return { lang: 'Yoruba', dialect: 'Nigerian Yoruba.' };
    case 'igbo': return { lang: 'Igbo', dialect: 'Nigerian Igbo.' };
    case 'hausa': return { lang: 'Hausa', dialect: 'Standard Hausa.' };
    case 'twi': return { lang: 'Twi', dialect: 'Ashanti Twi (Ghana).' };
    case 'wolof': return { lang: 'Wolof', dialect: 'Senegalese Wolof.' };
    case 'zulu': return { lang: 'Zulu', dialect: 'isiZulu (South Africa).' };
    case 'xhosa': return { lang: 'Xhosa', dialect: 'isiXhosa (South Africa).' };

    default: return { lang: 'English', dialect: 'Standard English.' };
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
  systemPrompt: generatePrompt('dutch', false), // Default to Dutch as per focus
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
  template: 'dutch', // Default to Dutch
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
