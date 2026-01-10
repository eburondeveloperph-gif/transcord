
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './WelcomeScreen.css';
import { useTools, Template } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

// Helper to generate default content for missing keys
const getContent = (template: Template) => {
  const defaults = {
    title: 'Super Translator',
    description: `Real-time, high-fidelity translation into ${template.replace(/_/g, ' ')}.`,
    prompts: ["Hello, how are you?", "Can you help me?", "This is amazing."]
  };

  const specificContent: Partial<Record<Template, typeof defaults & { label: string }>> = {
    'dutch': {
      label: 'Dutch (Netherlands)',
      title: 'Super Vertaler',
      description: 'Snelle en natuurlijke vertaling naar het Nederlands.',
      prompts: ["Hoe gaat het vandaag?", "Kun je me helpen?", "De vergadering was productief."],
    },
    'dutch_flemish': {
      label: 'Dutch (Flemish)',
      title: 'Super Vertaler',
      description: 'Natuurlijke vertaling in het Vlaams.',
      prompts: ["Hoe gaat het met u?", "Dank u wel.", "Heel erg bedankt."],
    },
    'dutch_limburgish': {
      label: 'Dutch (Limburgish)',
      title: 'Super Vertaler',
      description: 'Vertaling naar het Limburgs dialect.',
      prompts: ["Wie geit 't?", "Kins se mich helpe?", "Dankjewel."],
    },
    'medumba': {
      label: 'Medumba',
      title: 'Super Translator',
      description: 'Real-time translation into the Medumba language (Cameroon).',
      prompts: ["O li la?", "A ke la?", "Momsi bwu."],
    },
    'cameroonian_pidgin': {
      label: 'Cameroon Pidgin',
      title: 'Super Translator',
      description: 'Translation into Cameroonian Pidgin English.',
      prompts: ["How you dey?", "Wetin dey happen?", "I dey fine."],
    },
    'taglish': {
      label: 'Taglish',
      title: 'Super Translator',
      description: 'High-speed, emotionally faithful English to Taglish translation.',
      prompts: ["Kamusta ka na?", "Pwede mo ba akong tulungan?", "Ang ganda nito."],
    },
    'cebuano': {
      label: 'Cebuano',
      title: 'Super Translator',
      description: 'Translation into Cebuano (Bisaya).',
      prompts: ["Kumusta ka?", "Makatabang ka nako?", "Salamat kaayo."],
    },
    'french_ivory_coast': {
      label: 'Ivorian French',
      title: 'Super Traducteur',
      description: 'Traduction précise en français de Côte d’Ivoire (Nouchi).',
      prompts: ["C'est comment ?", "On est ensemble.", "Ça va aller."],
    },
    // ... Add other specific ones if needed, otherwise fallback to generated
  };

  if (template in specificContent) {
    return specificContent[template as keyof typeof specificContent]!;
  }

  // Fallback generation
  return {
    ...defaults,
    label: template.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  };
};

// We need a list of all templates to render the dropdown
const ALL_TEMPLATES: Template[] = [
  'dutch', 'dutch_flemish', 'dutch_brabantian', 'dutch_limburgish', 'west_flemish', 'dutch_surinamese', 'afrikaans', 'frisian',
  'medumba', 'bamum', 'ewondo', 'duala', 'basaa', 'bulu', 'fulfulde_cameroon', 'cameroonian_pidgin',
  'french_ivory_coast', 'baoule', 'dioula', 'bete', 'yoruba', 'igbo', 'hausa', 'twi', 'wolof', 'swahili', 'amharic', 'zulu', 'xhosa',
  'taglish', 'tagalog', 'cebuano', 'ilocano', 'hiligaynon', 'waray', 'kapampangan', 'bikol', 'pangasinan', 'chavacano',
  'english', 'spanish', 'french', 'french_belgium', 'german', 'italian', 'portuguese', 'russian', 'polish', 'ukrainian', 
  'swedish', 'norwegian', 'danish', 'finnish', 'greek', 'czech', 'hungarian', 'romanian', 'turkish',
  'japanese', 'korean', 'mandarin', 'cantonese', 'hokkien', 'hindi', 'bengali', 'punjabi', 'marathi', 'tamil', 'telugu', 'urdu', 
  'arabic', 'persian', 'hebrew', 'vietnamese', 'thai', 'indonesian', 'malay'
];

const WelcomeScreen: React.FC = () => {
  const { template, setTemplate } = useTools();
  const { connect, client, connected } = useLiveAPIContext();
  const current = getContent(template);

  const handleLaunch = () => {
    if (!connected) {
      connect().catch(console.error);
    }
  };

  const handlePromptClick = (text: string) => {
    if (!connected) {
      connect().then(() => {
        // Short delay to ensure setup completion before sending text
        setTimeout(() => {
          client.send([{ text }], true);
        }, 100);
      }).catch(console.error);
    } else {
      client.send([{ text }], true);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="title-container">
          <span className="welcome-icon">translate</span>
          <div className="title-selector">
            <select 
              value={template} 
              onChange={(e) => setTemplate(e.target.value as Template)} 
              aria-label="Select Target Language"
            >
              {ALL_TEMPLATES.sort().map((key) => {
                const info = getContent(key);
                return (
                  <option key={key} value={key}>
                    {info.label} Mode
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <p className="welcome-description">{current.description}</p>
        
        <button className="launch-button" onClick={handleLaunch}>
          <span className="material-symbols-outlined filled">bolt</span>
          <span>Launch Translator</span>
        </button>

        <div className="example-prompts-section">
          <h5 className="prompts-title">Try a sample phrase</h5>
          <div className="example-prompts">
            {current.prompts.map((prompt, index) => (
              <button 
                key={index} 
                className="prompt-card" 
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
