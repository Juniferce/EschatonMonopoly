// presence.js
import { realtimeDb } from './firebase-config.js';
import { ref, onValue, onDisconnect, set, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 1. Establish or retrieve the unique Device ID
let deviceId = sessionStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('deviceId', deviceId);
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

// --- DEVICE ID DEBUG WIDGET ---
export function injectDeviceWidget() {
  // 1. Get existing ID or generate a random one (e.g., 8492)
  let deviceId = sessionStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = Math.floor(1000 + Math.random() * 9000).toString();
    sessionStorage.setItem('deviceId', deviceId);
  }

  // 2. Create the floating rectangle
  const widget = document.createElement('div');
  widget.id = 'debug-device-widget';
  
  // Style it to look like a hacker/debug terminal block in the bottom left
  Object.assign(widget.style, {
    position: 'fixed',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#00ff00', // Neon green
    border: '1px solid #00ff00',
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: '9999', // Ensure it stays on top of everything
    boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
  });

  widget.innerText = `DEV: ${deviceId}`;
  
  // 3. Make it clickable to alter the session manually
  widget.onclick = () => {
    const newId = prompt("Enter a new Device Number/ID for this window:", deviceId);
    if (newId && newId.trim() !== "" && newId !== deviceId) {
      // Update the ID
      sessionStorage.setItem('deviceId', newId.trim());
      
      // Optional safety: wipe the player identity so the tab acts like a completely fresh device
      sessionStorage.removeItem('playerIdentity'); 
      
      // Reload the page to ensure Firebase and your scripts re-initialize with the new ID
      window.location.reload();
    }
  };

  // 4. Inject into the page
  document.body.appendChild(widget);
}

// Automatically run this as soon as presence.js is imported
if (typeof document !== 'undefined') {
  // Slight delay to ensure body is fully parsed before injecting
  window.addEventListener('DOMContentLoaded', injectDeviceWidget);
}