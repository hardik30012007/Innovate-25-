/* =========================================
   AGENT AI UI & LOGIC
   ========================================= */

// --- 1. UI Construction ---
const agentHTML = `
<div class="agent-fab" onclick="toggleAgent()">
    <i class="fa-solid fa-robot"></i>
</div>

<div class="agent-window" id="agent-window">
    <div class="agent-header">
        <h3><i class="fa-solid fa-sparkles"></i> AI Architect</h3>
        <span class="agent-close" onclick="toggleAgent()"><i class="fa-solid fa-xmark"></i></span>
    </div>
    <div class="agent-messages" id="agent-messages">
        <div class="msg agent">
            Hi! I'm your AI Architect. 🤖<br>I can help you navigate the map, find priority zones, or even upvote ideas for you. What shall we do?
        </div>
    </div>
    <div class="agent-input-area">
        <input type="text" id="agent-input" placeholder="Type a command..." onkeypress="handleEnter(event)">
        <button onclick="sendMessage()" id="agent-send-btn"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
</div>
`;

// Inject into body
document.body.insertAdjacentHTML('beforeend', agentHTML);

// --- 2. State & Toggles ---
const agentWindow = document.getElementById('agent-window');
const msgsContainer = document.getElementById('agent-messages');
const inputField = document.getElementById('agent-input');
let isAgentOpen = false;

function toggleAgent() {
    isAgentOpen = !isAgentOpen;
    if (isAgentOpen) {
        agentWindow.classList.add('open');
        setTimeout(() => inputField.focus(), 300);
    } else {
        agentWindow.classList.remove('open');
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// --- 3. Messaging Logic ---
async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    // 1. Show User Message
    addMessage(text, 'user');
    inputField.value = '';

    // 2. Show Loading
    const loadingId = addMessage('<i class="fa-solid fa-circle-notch fa-spin"></i> Thinking...', 'agent', true);

    try {
        // 3. Call Backend
        const res = await fetch('https://innovate-25-1.onrender.com/ask_agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: text,
                context: "Map is open on " + (window.currentZoneId || "general view")
            })
        });
        const data = await res.json();

        // 4. Remove Loading & Show Reply
        removeMessage(loadingId);
        addMessage(data.reply, 'agent');

        // 5. Execute Action
        if (data.action) {
            executeAgentAction(data.action, data.params);
        }

    } catch (e) {
        console.error(e);
        removeMessage(loadingId);
        addMessage("Sorry, I lost connection to the server.", 'agent');
    }
}

function addMessage(html, type, returnId = false) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.innerHTML = html;
    div.id = 'msg-' + Date.now();
    msgsContainer.appendChild(div);
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
    return returnId ? div.id : null;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- 4. THE HANDS (Action Executor) ---
function executeAgentAction(action, params) {
    console.log(`[AGENT] Executing ${action}`, params);

    switch (action) {
        case 'PAN_TO_ZONE':
            panToZone(params.id);
            break;

        case 'UPVOTE_ZONE':
            upvoteZone(params.id);
            break;

        case 'SHOW_PRIORITY':
            showPriorityZone();
            break;

        case 'FILTER_MAP':
            // TODO: implementing layer toggling
            break;
    }
}

// --- 5. Helper Functions (Interfacing with Map) ---

function panToZone(zoneId) {
    if (!window.overlayLayers || !window.overlayLayers["AI Suggested Corridors"]) return;

    // Search in all main keys
    let targetLayer = null;

    // Check Suggestions
    const suggested = window.overlayLayers["AI Suggested Corridors"].getLayers();
    targetLayer = suggested.find(l => l.feature.properties.id === zoneId);

    // Check Work in Progress
    if (!targetLayer && window.overlayLayers["Work In Progress"]) {
        targetLayer = window.overlayLayers["Work In Progress"].getLayers().find(l => l.feature.properties.id === zoneId);
    }

    // Check Existing
    if (!targetLayer && window.overlayLayers["Existing Green Zones"]) {
        targetLayer = window.overlayLayers["Existing Green Zones"].getLayers().find(l => l.feature.properties.id === zoneId);
    }

    if (targetLayer) {
        window.map.flyToBounds(targetLayer.getBounds(), { padding: [50, 50], duration: 1.5 });
        setTimeout(() => targetLayer.openPopup(), 1600);
        window.currentZoneId = zoneId;
    } else {
        addMessage(`I couldn't find ${zoneId}.`, 'agent');
    }
}

function upvoteZone(zoneId) {
    // 1. Pan to it first to ensure it's loaded/visible
    panToZone(zoneId);

    // 2. Find the upvote button in the DOM *after* popup opens
    setTimeout(() => {
        // Trigger the upvote function exposed on window
        const btn = document.querySelector(`.btn-upvote[onclick*="${zoneId}"]`);
        if (btn && !btn.disabled) {
            window.handleUpvote(zoneId, btn);
            addMessage(`Done! Upvoted ${zoneId} for you.`, 'agent');
        } else if (btn && btn.disabled) {
            addMessage("Looks like we already voted for this one!", 'agent');
        } else {
            // Attempt direct call if popup isn't open or button styling differs
            // We can manually call the fetch logic if needed, but clicking is safer for state
            // Let's force calling the window function if we can't find button
            // Create a dummy button element to pass
            const dummyBtn = document.createElement('button');
            window.handleUpvote(zoneId, dummyBtn);
            addMessage(`Upvote command sent for ${zoneId}.`, 'agent');
        }
    }, 2000);
}

function showPriorityZone() {
    // Use the window.priorityZone logic from map.js
    if (window.priorityZone) {
        window.map.flyToBounds(window.priorityZone.bounds, { padding: [50, 50] });
        addMessage(`Here is the highest priority zone: ${window.priorityZone.name}`, 'agent');
    } else {
        // Fallback: iterate layers to find max score
        addMessage("Scanning for highest priority...", 'agent');
        // (Simpler to just wait for user to browse, but let's try)
        // Logic already exists in map.js to set window.priorityZone.
    }
}
