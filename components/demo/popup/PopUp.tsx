
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import './PopUp.css';

interface PopUpProps {
  onClose: () => void;
}

const PopUp: React.FC<PopUpProps> = ({ onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Welcome to Super Translator</h2>
        <p>Your high-fidelity translation engine with human-like audio delivery.</p>
        <p>To get started:</p>
        <ol>
          <li><span className="icon">bolt</span>Click the button below to start the engine.</li>
          <li><span className="icon">mic</span>Speak naturally in your preferred language.</li>
          <li><span className="icon">auto_awesome</span>I will automatically translate and speak back to you.</li>
        </ol>
        <button onClick={onClose}>Start Translating</button>
      </div>
    </div>
  );
};

export default PopUp;
