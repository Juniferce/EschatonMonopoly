/**
 * Black Water Physics Engine - Ambient Filters & Observer Only
 */
(function() {
  // --- FLUID ENGINE INITIALIZATION: INJECT SVG FILTERS ---
  function injectFluidFilters() {
    if (document.getElementById('fluid-engine-filters')) return; 

    const svgHTML = `
      <svg id="fluid-engine-filters" style="display: none;">
        <defs>
          <filter id="sketch-1"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="1" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" /></filter>
          <filter id="sketch-2"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="2" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" /></filter>
          <filter id="sketch-3"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="3" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" /></filter>
          <filter id="sketch-4"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="4" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" /></filter>
          
          <filter id="extreme-1"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="11" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" /></filter>
          <filter id="extreme-2"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="12" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" /></filter>
          <filter id="extreme-3"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="13" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" /></filter>
          <filter id="extreme-4"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" seed="14" /><feDisplacementMap in="SourceGraphic" in2="noise" scale="30" /></filter>
        </defs>
      </svg>
    `;
    
    document.body.insertAdjacentHTML('beforeend', svgHTML);
  }

  // SAFELY IGNITE THE INJECTOR
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFluidFilters);
  } else {
    injectFluidFilters();
  }

  // --- SCROLL TRIPWIRE (Intersection Observer) ---
  const surfaceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        surfaceObserver.unobserve(entry.target); 
      }
    });
  }, { threshold: 0.15 });

  // Attach tripwire to static elements when DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.q-card-wrapper, #qcard-0').forEach(card => {
      surfaceObserver.observe(card);
    });
  });

  // Expose observer globally so dynamic Firestore elements can be tracked
  window.observeCard = function(element) {
    if (element) surfaceObserver.observe(element);
  };
})();