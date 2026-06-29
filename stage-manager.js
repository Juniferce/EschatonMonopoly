import { realtimeDb } from './firebase-config.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 1. Export the Master Manifest globally so other files can read it
export const STAGE_MANIFEST = {
  "locked": [""],
  "lobby": ["lobby.html", "quiz"], // Changed to waiting to match your terminology
  "attunement": ["attunement.html"],
  "wager": ["wager"],
  "encounter": ["encounter"],
  "adaptation": ["adaptation"],
};

// 2. Automatically generate the dropdown list for the controller
export const VALID_STAGES = Object.keys(STAGE_MANIFEST).map(stageId => ({
  id: stageId,
  label: stageId.toUpperCase()
}));

export function initializeStageManager() {
  const stageRef = ref(realtimeDb, 'gameState/stage');

  onValue(stageRef, (snapshot) => {
    const currentStage = snapshot.val(); 
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const permittedPages = STAGE_MANIFEST[currentStage] || ["index.html"];

    if (!permittedPages.includes(currentPage)) {
      console.log(`Stage "${currentStage}" does not permit access to ${currentPage}. Redirecting...`);
      window.location.href = permittedPages[0];
    }
  });
}