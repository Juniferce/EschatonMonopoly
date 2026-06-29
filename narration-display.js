import { realtimeDb } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/**
 * Initializes the globally synced narration engine.
 * @param {string} containerId - The ID of the empty div where words should spawn
 */
export function igniteNarrationEngine(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Narration Engine: Could not find container #${containerId}`);
    return;
  }

  // --- INJECT NARRATION STYLES DYNAMICALLY ---
  if (!document.getElementById('narration-styles')) {
    const style = document.createElement('style');
    style.id = 'narration-styles';
    style.innerHTML = `
      #${containerId} {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 20px;
        pointer-events: none; /* Let clicks pass through */
      }
      .narration-word {
        display: inline-block;
        background: #111;
        border: 2px solid #555;
        color: #fff;
        padding: 10px 18px;
        border-radius: 6px;
        font-family: 'Arial', sans-serif;
        font-size: 22px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 2px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.8);
        
        /* Starts sunken down and invisible */
        opacity: 0;
        transform: translateY(30px) scale(0.9);
        transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      .narration-word.revealed {
        /* Floats up into place */
        opacity: 1;
        transform: translateY(0) scale(1);
        border-color: #fff;
      }
      .narration-word.cleared {
        /* Evaporates upwards when killed */
        opacity: 0 !important;
        transform: translateY(-30px) scale(0.9) !important;
        transition: opacity 0.4s ease, transform 0.4s ease-in;
      }
    `;
    document.head.appendChild(style);
  }

  let currentNarration = [];
  let startTime = 0;
  let clearTimer = null;
  const WORD_DELAY_MS = 400; // Milliseconds between each word appearing
  const OUTRO_ANIMATION_MS = 400; // How long it takes to float away

  onValue(ref(realtimeDb, 'gameState/narrator'), (snapshot) => {
    const data = snapshot.val() || {};
    const newNarration = data.narration || [];
    const newTime = data.narrationTime || 0;

    // Only rebuild the DOM if the payload actually changed
    if (newTime !== startTime || JSON.stringify(newNarration) !== JSON.stringify(currentNarration)) {
      
      const existingWords = container.querySelectorAll('.narration-word');
      
      if (existingWords.length > 0) {
        // Trigger the float-away animation on all existing words simultaneously
        existingWords.forEach(w => {
          w.classList.remove('revealed');
          w.classList.add('cleared');
        });

        // Wait for the CSS transition to finish before rendering the new text
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
          currentNarration = newNarration;
          startTime = newTime;
          renderNarration();
        }, OUTRO_ANIMATION_MS);

      } else {
        // If the container is already empty, just render immediately
        currentNarration = newNarration;
        startTime = newTime;
        renderNarration();
      }
    }
  });

  function renderNarration() {
    container.innerHTML = '';
    
    currentNarration.forEach((word, index) => {
      const span = document.createElement('span');
      span.className = 'narration-word wiggle'; 
      span.innerText = word;
      span.dataset.index = index;
      container.appendChild(span);
    });

    // FIX: Force a browser reflow. This explicitly tells the browser to 
    // calculate and paint the invisible starting state (opacity: 0) of the new elements.
    void container.offsetWidth;

    // FIX: Delay checkReveal by 30ms to ensure the CSS transition engine is armed
    // before we apply the .revealed class to the first word.
    setTimeout(checkReveal, 30);
  }

  function checkReveal() {
    if (!startTime || currentNarration.length === 0) return;
    
    const now = Date.now();
    const elapsed = now - startTime;
    let allRevealed = true;

    const words = container.querySelectorAll('.narration-word:not(.revealed):not(.cleared)');
    words.forEach(wordEl => {
      const idx = parseInt(wordEl.dataset.index);
      
      // Math to perfectly sync exactly when each word should appear based on the global timestamp
      if (elapsed >= idx * WORD_DELAY_MS) {
        wordEl.classList.add('revealed');
      } else {
        allRevealed = false;
      }
    });

    if (!allRevealed) {
      requestAnimationFrame(checkReveal);
    }
  }
}