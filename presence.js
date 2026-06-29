// presence.js
import { realtimeDb } from './firebase-config.js';
import { ref, onValue, onDisconnect, set, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 1. Establish or retrieve the unique Device ID
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('deviceId', deviceId);
}

// 2. The Universal Auto-Login Engine
export function initializePresence() {
  const connectedRef = ref(realtimeDb, '.info/connected');
  
  onValue(connectedRef, async (snap) => {
    // If the value is true, the client has established a socket connection to Firebase
    if (snap.val() === true) {
      
      const mappingRef = ref(realtimeDb, 'players/deviceMapping');
      const mappingSnap = await get(mappingRef);
      
      let recognizedPlayer = null;
      
      // Check the database to see if this device ID is already mapped to a player
      if (mappingSnap.exists()) {
        const mappings = mappingSnap.val();
        for (const [playerName, storedDeviceId] of Object.entries(mappings)) {
          if (storedDeviceId === deviceId) {
            recognizedPlayer = playerName;
            break;
          }
        }
      }

      // Fallback to local storage if they temporarily dropped off the DB mapping
      if (!recognizedPlayer) {
        recognizedPlayer = sessionStorage.getItem('playerIdentity');
      }

      // If we know who they are, activate their presence
      if (recognizedPlayer) {
        activatePlayerPresence(recognizedPlayer);
      }
    }
  });
}

// 3. The Activation Function (Fired automatically, or manually when a new user logs in)
export function activatePlayerPresence(playerName) {
  sessionStorage.setItem('playerIdentity', playerName);
  
  const playerRef = ref(realtimeDb, `players/playersConnected/${playerName}`);
  const deviceRef = ref(realtimeDb, `players/deviceMapping/${playerName}`);

  // CRITICAL: Queue up the disconnect instructions on the server FIRST.
  // If the user closes the page, the server will execute these automatically.
  onDisconnect(playerRef).set(false);

  // After the safety net is deployed, announce that we are online
  set(playerRef, true);
  set(deviceRef, deviceId);
}

export { deviceId };

export function forcePlayerOffline() {
  const player = sessionStorage.getItem('playerIdentity');
  if (player) {
    // 1. Set the specific player node to false (offline)
    const playerRef = ref(realtimeDb, `players/playersConnected/${player}`);
    set(playerRef, false);
    
    // 2. Clear local storage so they aren't remembered as logged in
    sessionStorage.removeItem('playerIdentity');
    
    console.log(`Player ${player} has been untied and set to offline.`);
  }
}