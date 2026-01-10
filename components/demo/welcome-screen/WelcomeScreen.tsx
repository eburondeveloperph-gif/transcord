
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './WelcomeScreen.css';
import { useTools, Template } from '../../../lib/state';
import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';

const welcomeContent: Record<Template, { label: string; title: string; description: string; prompts: string[] }> = {
  'taglish': {
    label: 'Filipino Taglish',
    title: 'Super Translator',
    description: 'High-speed, emotionally faithful English to Taglish translation.',
    prompts: ["How are you doing today?", "Can you help me with this task?", "The meeting was very productive."],
  },
  'french_ivory_coast': {
    label: 'Ivorian French',
    title: 'Super Traducteur',
    description: 'Traduction précise en français de Côte d’Ivoire.',
    prompts: ["C'est comment ?", "On est ensemble.", "Ça va aller."],
  },
  'french_belgium': {
    label: 'French Belgium',
    title: 'Super Traducteur',
    description: 'Traduction naturelle en français de Belgique.',
    prompts: ["Il est nonante heures.", "C'est une belle drache.", "On va manger une frite ?"],
  },
  'medumba': {
    label: 'Cameroon Medumba',
    title: 'Super Translator',
    description: 'Real-time translation into the Medumba language (Cameroon).',
    prompts: ["How are you?", "What is your name?", "Thank you very much."],
  },
  'dutch_flemish': {
    label: 'Dutch Flemish',
    title: 'Super Vertaler',
    description: 'Natuurlijke vertaling in het Vlaams.',
    prompts: ["Hoe gaat het met u?", "Dank u wel.", "Heel erg bedankt."],
  },
  'spanish': {
    label: 'Spanish',
    title: 'Super Traductor',
    description: 'Traducción rápida y natural a español conversacional.',
    prompts: ["¿Cómo estás hoy?", "¿Me puedes ayudar con esto?", "La reunión fue muy productiva."],
  },
  'french': {
    label: 'French',
    title: 'Super Traducteur',
    description: 'Traduction fluide en français naturel.',
    prompts: ["Comment ça va aujourd'hui ?", "Peux-tu m'aider ?", "La réunion était productive."],
  },
  'japanese': {
    label: 'Japanese',
    title: 'Super 翻訳机',
    description: '自然な日本語へのリアルタイム翻訳。',
    prompts: ["今日はどうですか？", "手伝ってくれますか？", "会議は有意義でした。"],
  },
  'korean': {
    label: 'Korean',
    title: '슈퍼 번역기',
    description: '자연스러운 한국어 실시간 번역.',
    prompts: ["오늘 기분이 어때요?", "이것 좀 도와줄 수 있나요?", "회의가 매우 생산적이었습니다."],
  },
  'mandarin': {
    label: 'Mandarin',
    title: '超级翻译',
    description: '流畅的中英文实时翻译。',
    prompts: ["你今天怎么样？", "你能帮 me 吗？", "会议非常有成效。"],
  },
  'german': {
    label: 'German',
    title: 'Super Übersetzer',
    description: 'Schnelle und präzise Übersetzung ins Deutsche.',
    prompts: ["Wie geht es dir heute?", "Kannst du mir helfen?", "Das Meeting war produktiv."],
  },
  'italian': {
    label: 'Italian',
    title: 'Super Traduttore',
    description: 'Traduzione naturale in italiano.',
    prompts: ["Come stai oggi?", "Puoi aiutarmi con questo?", "La riunione è stata produttiva."],
  },
  'portuguese': {
    label: 'Portuguese',
    title: 'Super Tradutor',
    description: 'Tradução natural para português.',
    prompts: ["Como você está hoje?", "Pode me ajudar with this?", "A reunião foi produtiva."],
  },
  'russian': {
    label: 'Russian',
    title: 'Супер Переводчик',
    description: 'Естественный перевод на русский язык.',
    prompts: ["Как дела сегодня?", "Можешь мне помочь?", "Встреча была продуктивной."],
  },
  'hindi': {
    label: 'Hindi',
    title: 'सुपर अनुवादक',
    description: 'प्राकृतिक हिंदी में रीयल-टाइम अनुवाद।',
    prompts: ["आज आप कैसे हैं?", "क्या आप मेरी मदद कर सकते हैं?", "मीटिंग बहुत अच्छी रही।"],
  },
  'arabic': {
    label: 'Arabic',
    title: 'المترجم الخارق',
    description: 'ترجمة فورية وطبيعية إلى اللغة العربية.',
    prompts: ["كيف حالك اليوم؟", "هل يمكنك مساعدتي؟", "كان الاجتماع مثمرًا للغاية."],
  },
  'turkish': {
    label: 'Turkish',
    title: 'Super Çevirmen',
    description: 'Hızlı ve doğal Türkçe çeviri.',
    prompts: ["Bugün nasılsın?", "Bana yardım eder misin?", "Toplantı verimli geçti."],
  },
  'vietnamese': {
    label: 'Vietnamese',
    title: 'Siêu Phiên Dịch',
    description: 'Dịch thuật tiếng Việt tự nhiên và nhanh chóng.',
    prompts: ["Hôm nay bạn thế nào?", "Giúp tôi được không?", "Cuộc họp rất hiệu quả."],
  },
  'polish': {
    label: 'Polish',
    title: 'Super Tłumacz',
    description: 'Szybkie i naturalne tłumaczenie na polski.',
    prompts: ["Jak się dziś masz?", "Pomożesz mi?", "Spotkanie było owocne."],
  },
  'thai': {
    label: 'Thai',
    title: 'สุดยอดนักแปล',
    description: 'แปลภาษาไทยแบบเรียลไทม์ที่รวดเร็วและแม่นยำ',
    prompts: ["วันนี้เป็นอย่างไรบ้าง?", "ช่วยฉันหน่อยได้ไหม?", "การประชุมมีประสิทธิภาพมาก"],
  },
  'bengali': {
    label: 'Bengali',
    title: 'সুপার অনুবাদক',
    description: 'দ্রুত এবং স্বাভাবিক বাংলা অনুবাদ।',
    prompts: ["আজ আপনি কেমন আছেন?", "আপনি কি আমাকে সাহায্য করতে পারেন?", "মিটিংটি খুব ফলপ্রসূ ছিল।"],
  },
  'dutch': {
    label: 'Dutch (Netherlands)',
    title: 'Super Vertaler',
    description: 'Snelle en natuurlijke vertaling naar het Nederlands.',
    prompts: ["Hoe gaat het vandaag?", "Kun je me helpen?", "De vergadering was productief."],
  },
  'swedish': {
    label: 'Swedish',
    title: 'Superöversättare',
    description: 'Snabb och naturlig översättning till svenska.',
    prompts: ["Hur mår du idag?", "Kan du hjälpa mig?", "Mötet var produktivt."],
  },
  'norwegian': {
    label: 'Norwegian',
    title: 'Superoversetter',
    description: 'Rask og naturlig oversettelse tot norsk.',
    prompts: ["Hvordan har du det i dag?", "Kan du hjelpe meg?", "Møtet var produktivt."],
  },
  'danish': {
    label: 'Danish',
    title: 'Superoversætter',
    description: 'Hurtig og naturlig oversættelse til dansk.',
    prompts: ["Hvordan har du det i dag?", "Kan du hjelpe meg?", "Mødet var produktivt."],
  }
};

const WelcomeScreen: React.FC = () => {
  const { template, setTemplate } = useTools();
  const { connect, client, connected } = useLiveAPIContext();
  const current = welcomeContent[template];

  const handlePromptClick = (text: string) => {
    if (!connected) {
      connect().then(() => {
        client.send([{ text }], true);
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
              {(Object.keys(welcomeContent) as Template[]).sort().map((key) => (
                <option key={key} value={key}>
                  {welcomeContent[key as Template].label} Mode
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="welcome-description">{current.description}</p>
        
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
