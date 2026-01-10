/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './WelcomeScreen.css';
import { useTools, Template } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

const getContent = (template: Template) => {
  const defaults = {
    title: 'Super Translator',
    description: `Real-time, high-fidelity translation engine. Connect to start the conversation.`,
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
    'french_ivory_coast': {
      label: 'Ivorian French',
      title: 'Super Traducteur',
      description: 'Traduction précise en français de Côte d’Ivoire (Nouchi).',
      prompts: ["C'est comment ?", "On est ensemble.", "Ça va aller."],
    },
  };

  if (template in specificContent) {
    return specificContent[template as keyof typeof specificContent]!;
  }

  return {
    ...defaults,
    label: template.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  };
};

const WelcomeScreen: React.FC = () => {
  const { template } = useTools();
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
        setTimeout(() => {
          client.send([{ text }], true);
        }, 300);
      }).catch(console.error);
    } else {
      client.send([{ text }], true);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="title-container">
          <span className="material-symbols-outlined welcome-icon">translate</span>
          <h1 className="ready-title">Ready</h1>
        </div>
        <p className="welcome-description">{current.description}</p>
        
        <button className="launch-button" onClick={handleLaunch}>
          <span className="material-symbols-outlined filled">bolt</span>
          <span>Connect</span>
        </button>

        <div className="example-prompts-section">
          <h5 className="prompts-title">Try it out</h5>
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
