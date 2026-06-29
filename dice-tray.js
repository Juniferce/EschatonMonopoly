import { realtimeDb } from './firebase-config.js';
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export function igniteDiceTray(containerId, shardId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!document.getElementById('dice-styles')) {
    const style = document.createElement('style');
    style.id = 'dice-styles';
    style.innerHTML = `
      #${containerId} {
        display: flex; gap: 15px; justify-content: center; align-items: flex-end;
        padding: 20px; width: 100%; height: 160px; 
      }
      .die-wrapper { display: inline-block; cursor: grab; transition: filter 0.2s; user-select: none; }
      .die-wrapper:active { cursor: grabbing; }
      .die { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; border-radius: 8px; border: 3px solid; box-shadow: 0 4px 15px rgba(0,0,0,0.8); }
      
      .die-wrapper.state-used { display: none !important; }
      .die-wrapper.state-locked { transform: scale(0.85); filter: saturate(0.3); pointer-events: none; }
      .die-wrapper.state-grabbed { opacity: 0.3; pointer-events: none; }
      
      .die.d4 { border-color: #ff4444; background: rgba(68, 0, 0, 0.8); }
      .die.d6 { border-color: #4444ff; background: rgba(0, 0, 68, 0.8); }
      .die.d8 { border-color: #44ff44; background: rgba(0, 68, 0, 0.8); }
      .die.d10 { border-color: #aa44ff; background: rgba(34, 0, 68, 0.8); }
      .die.d12 { border-color: #ffff44; background: rgba(68, 68, 0, 0.8); }
      .die.d20 { border-color: #ffffff; background: rgba(34, 34, 34, 0.8); }

      @keyframes dieLift {
        0% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-50px) scale(1.5); }
        100% { transform: translateY(0) scale(1); }
      }
      .die-wrapper.state-rolling { pointer-events: none; animation: dieLift 2s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
      .die-clone { position: absolute; pointer-events: none; z-index: 9999; transform: translate(-50%, -50%) scale(1.1); opacity: 0.9; }
    `;
    document.head.appendChild(style);
  }

  let dicePool = [];
  let isDragging = false;
  let draggedIndex = null;
  let cloneEl = null;
  let originalSize = null;
  
  const poolRef = ref(realtimeDb, `gameState/shards/${shardId}/dicepool`);

  onValue(poolRef, (snapshot) => {
    dicePool = snapshot.val() || [];
    if (document.startViewTransition) { document.startViewTransition(() => renderDice()); } 
    else { renderDice(); }
  });

  function renderDice() {
    container.innerHTML = '';
    dicePool.forEach((die, index) => {
      if (!die || die.state === 'used') return;

      const wrapper = document.createElement('div');
      wrapper.className = `die-wrapper state-${die.state}`;
      wrapper.dataset.index = index; wrapper.dataset.size = die.size; wrapper.dataset.side = die.side; wrapper.dataset.rollTime = die.rollTime || 0;
      if (die.id) wrapper.style.viewTransitionName = `die-uid-${die.id}`;

      const visual = document.createElement('div');
      visual.className = `die d${die.size} wiggle`;
      visual.innerText = die.side;
      wrapper.appendChild(visual);

      if (die.state === 'ready') wrapper.onmousedown = (e) => startDrag(e, index, wrapper);
      container.appendChild(wrapper);
    });
  }

  function startDrag(e, index, originalWrapper) {
    if (isDragging) return;
    isDragging = true;
    draggedIndex = index;
    originalSize = parseInt(originalWrapper.dataset.size);

    update(ref(realtimeDb, `gameState/shards/${shardId}/dicepool/${index}`), { state: 'grabbed' });

    cloneEl = originalWrapper.cloneNode(true);
    cloneEl.className = originalWrapper.className.replace('state-ready', '').replace('state-grabbed', '') + ' die-clone';
    cloneEl.style.left = `${e.clientX}px`; cloneEl.style.top = `${e.clientY}px`;
    document.body.appendChild(cloneEl);

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', endDrag);
  }

  function dragMove(e) {
    if (!isDragging || !cloneEl) return;
    cloneEl.style.left = `${e.clientX}px`; cloneEl.style.top = `${e.clientY}px`;
    
    // Highlight the ring if we hover over it
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const ring = document.getElementById('wager-ring');
    if (ring) {
       if (dropTarget && dropTarget.closest('#wager-ring')) ring.classList.add('active');
       else ring.classList.remove('active');
    }
  }

  function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    
    // Check if they dropped it on the wager ring
    const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
    const droppedOnWager = dropTarget && dropTarget.closest('#wager-ring');

    if (cloneEl) cloneEl.remove(); cloneEl = null;
    document.removeEventListener('mousemove', dragMove);
    document.removeEventListener('mouseup', endDrag);

    if (droppedOnWager) {
       // Fire global event so wager.html can pick it up!
       window.dispatchEvent(new CustomEvent('dieWagered', { 
           detail: { index: draggedIndex, size: originalSize } 
       }));
       const ring = document.getElementById('wager-ring');
       if(ring) ring.classList.remove('active');
       draggedIndex = null;
       return;
    }

    // Otherwise, just return to pool
    update(ref(realtimeDb, `gameState/shards/${shardId}/dicepool/${draggedIndex}`), { state: 'ready' });
    draggedIndex = null;
  }

  function rollLoop() {
    const now = Date.now();
    const rollingWrappers = container.querySelectorAll('.die-wrapper.state-rolling');
    rollingWrappers.forEach(wrapper => {
      const rollTime = parseInt(wrapper.dataset.rollTime);
      const size = parseInt(wrapper.dataset.size);
      const actualSide = wrapper.dataset.side;
      const index = wrapper.dataset.index;
      const visual = wrapper.querySelector('.die');
      if (now < rollTime) {
        visual.innerText = Math.floor(Math.random() * size) + 1;
      } else {
        visual.innerText = actualSide;
        update(ref(realtimeDb, `gameState/shards/${shardId}/dicepool/${index}`), { state: 'ready' });
      }
    });
    requestAnimationFrame(rollLoop);
  }
  rollLoop();
}