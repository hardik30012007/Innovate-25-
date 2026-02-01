// script.js - Dashboard Stats & Utility Logic

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fullscreen Toggle Logic
  const fullscreenBtn = document.getElementById('fullscreen-toggle');
  const mapWrapper = document.querySelector('.map-wrapper');

  if (fullscreenBtn && mapWrapper) {
    fullscreenBtn.addEventListener('click', () => {
      mapWrapper.classList.toggle('fullscreen');
      const icon = fullscreenBtn.querySelector('i');

      if (mapWrapper.classList.contains('fullscreen')) {
        icon.classList.replace('fa-expand', 'fa-compress');
      } else {
        icon.classList.replace('fa-compress', 'fa-expand');
      }

      // Invalidate map size after transition to prevent gray areas
      setTimeout(() => {
        window.map.invalidateSize();
      }, 400);
    });
  }

  // 2. Setup Layer Toggles
  const checkGreen = document.getElementById('check-green');
  const checkAI = document.getElementById('check-ai');
  const checkAnchors = document.getElementById('check-anchors');
  const checkWip = document.getElementById('check-wip');

  function setupToggle(el, layerName) {
    if (!el) return;
    el.addEventListener('change', (e) => {
      if (window.overlayLayers && window.overlayLayers[layerName]) {
        if (e.target.checked) window.map.addLayer(window.overlayLayers[layerName]);
        else window.map.removeLayer(window.overlayLayers[layerName]);
      }
    });
  }

  setupToggle(checkGreen, "Existing Green Zones");
  setupToggle(checkAI, "AI Suggested Corridors");
  setupToggle(checkAnchors, "Green Anchors");
  setupToggle(checkWip, "Work In Progress");

  // 3. Priority Alert Logic
  // 3. Priority Alert Logic
  function showPriorityAlert() {
    const alert = document.getElementById('priority-alert');
    const text = document.getElementById('priority-text');
    const viewBtn = document.getElementById('btn-view-priority');

    if (alert && window.priorityZone) {
      text.innerText = `Priority AI Suggestion: ${window.priorityZone.name}`;
      // Use flex to maintain the icon/text/button layout defined in CSS
      alert.style.display = 'flex';

      viewBtn.onclick = () => {
        if (window.map) {
          window.map.flyToBounds(window.priorityZone.bounds, {
            padding: [50, 50],
            duration: 1.5
          });
        }

        // Ensure AI layer is visible
        const checkAI = document.getElementById('check-ai');
        if (checkAI && !checkAI.checked) {
          checkAI.click();
        }
      };
    }
  }

  // Listen for event
  window.addEventListener('priorityReady', showPriorityAlert);

  // Check if already ready (race condition fix)
  if (window.priorityZone) {
    showPriorityAlert();
  }
});
