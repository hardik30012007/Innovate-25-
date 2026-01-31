// admin.js

// --- State ---
let masterData = []; // Full list from server
let currentData = []; // Filtered/Sorted list for display

// --- DOM Elements ---
const tableBody = document.getElementById('corridor-table-body');
const kpiPending = document.getElementById('kpi-pending');
const kpiTotal = document.getElementById('kpi-total');
const kpiSupported = document.getElementById('kpi-supported');
const kpiApproved = document.getElementById('kpi-approved');

const searchInput = document.getElementById('search-input');
const filterZone = document.getElementById('filter-zone');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');
const refreshBtn = document.getElementById('refresh-btn');

// --- Initialization ---
async function init() {
    await fetchData();

    // Listeners
    searchInput.addEventListener('input', applyFilters);
    filterZone.addEventListener('change', applyFilters);
    filterPriority.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    sortBy.addEventListener('change', applyFilters);

    refreshBtn.addEventListener('click', async () => {
        refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
        await fetchData();
        refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh';
    });
}

// --- Data Fetching & Processing ---
async function fetchData() {
    try {
        const [anchorsRes, corridorsRes] = await Promise.all([
            fetch("http://127.0.0.1:5001/green-zones").then(res => res.json()),
            fetch("http://127.0.0.1:5001/corridors").then(res => res.json())
        ]);

        if (!anchorsRes?.features || !corridorsRes?.features) throw new Error("Invalid data format");

        // Identify Implemented Zones (Anchors for Penalty)
        const implementedIds = ['zone_13', 'zone_6', 'zone_4']; // User Zones 14, 7, 5
        const implementedZones = corridorsRes.features.filter(f => implementedIds.includes(f.properties.id));
        const implPts = [];
        implementedZones.forEach(f => {
            f.geometry.coordinates[0].forEach(c => implPts.push({ lat: c[1], lon: c[0] }));
        });

        // Map Backend GeoJSON to Dashboard Model
        masterData = corridorsRes.features.map(f => {
            const p = f.properties;
            const isImplemented = implementedIds.includes(p.id);
            const zoneNum = parseInt(p.id.split('_')[1]) + 1;

            // 1. Calculate Perimeter Proximity Penalty (matching map.js)
            let minDistance = Infinity;
            if (!isImplemented && implPts.length > 0) {
                f.geometry.coordinates[0].forEach(c_sug => {
                    implPts.forEach(p_impl => {
                        const d = calculateDistance(c_sug[1], c_sug[0], p_impl.lat, p_impl.lon);
                        if (d < minDistance) minDistance = d;
                    });
                });
            }

            let penalty = 0;
            if (minDistance < 500) penalty = 25;
            else if (minDistance < 1000) penalty = 15;
            else if (minDistance < 2000) penalty = 5;

            // 2. Calculate Community Bonus (+2 per 100 upvotes, max 20)
            const communityBonus = Math.min(Math.floor(p.upvotes / 100) * 2, 20);

            // 3. Combined Priority Score
            const combinedScore = Math.max(0, p.score + communityBonus - penalty);

            // 4. Assign Qualitative Priority
            let priorityLabel = "Low";
            if (combinedScore >= 75) priorityLabel = "High";
            else if (combinedScore >= 50) priorityLabel = "Medium";

            return {
                id: p.id,
                displayText: `Zone ${zoneNum}`,
                area: p.nearby_landmarks.length > 0 ? p.nearby_landmarks.join(", ") : "Green Belt Area",
                length_km: p.area_sqkm.toFixed(2),
                ai_base_score: p.score,
                votes: p.upvotes,
                penalty: penalty,
                bonus: communityBonus,
                combined_score: combinedScore,
                priority: priorityLabel,
                status: isImplemented ? 'approved' : 'pending',
                distance_to_green: minDistance
            };
        });

        applyFilters();
    } catch (error) {
        console.error("Fetch error:", error);
        showToast("Failed to load live data.", "error");
    }
}

// Haversine for perimeter check in JS
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

// --- Render Logic ---
function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#666;">No corridors found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(item => {
        const scoreClass = getScoreClass(item.combined_score);
        const statusClass = `status-${item.status}`;
        let priorityClass = 'priority-low';
        if (item.priority === 'High') priorityClass = 'priority-high';
        if (item.priority === 'Medium') priorityClass = 'priority-mid';

        let actionsHtml = `
            <button class="btn-sm btn-secondary" onclick="viewDetails('${item.id}')" title="View Details">
                <i class="fa-solid fa-eye"></i>
            </button>
        `;

        if (item.status === 'pending') {
            actionsHtml += `
                <button class="btn-sm btn-approve" onclick="updateStatus('${item.id}', 'approved')" title="Approve">
                    <i class="fa-solid fa-check"></i>
                </button>
            `;
        } else {
            actionsHtml = `<span class="badge ${item.status === 'approved' ? 'score-high' : 'score-low'}">${item.status}</span>`;
        }

        return `
            <tr>
                <td style="font-family:monospace; font-weight:600; color:#555;">${item.id}</td>
                <td>${item.displayText}</td>
                <td>${item.length_km} km²</td>
                <td>
                    <span class="badge ${scoreClass}" title="Base: ${item.ai_base_score} | Bonus: +${item.bonus} | Penalty: -${item.penalty}">
                        ${item.combined_score.toFixed(0)}
                    </span>
                </td>
                <td>${item.votes.toLocaleString()}</td>
                <td><span class="${priorityClass}">${item.priority}</span></td>
                <td>
                    <span class="${statusClass}">
                        <span class="status-dot"></span>
                        <span style="text-transform:capitalize;">${item.status}</span>
                    </span>
                </td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    }).join('');

    updateKPIs();
}

function getScoreClass(score) {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-med';
    return 'score-low';
}

function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const priority = filterPriority.value;
    const status = filterStatus.value;
    const sortMode = sortBy.value;

    let filtered = masterData.filter(item => {
        const matchesSearch = item.id.toLowerCase().includes(term) || item.displayText.toLowerCase().includes(term);
        if (!matchesSearch) return false;
        if (priority !== 'all' && item.priority !== priority) return false;
        if (status !== 'all' && item.status !== status) return false;
        return true;
    });

    filtered.sort((a, b) => {
        if (sortMode === 'votes') return b.votes - a.votes;
        if (sortMode === 'score') return b.combined_score - a.combined_score;
        return 0;
    });

    currentData = filtered;
    renderTable(filtered);
}

function updateKPIs() {
    kpiTotal.innerText = masterData.length;
    kpiSupported.innerText = masterData.filter(x => x.votes > 1000).length;
    kpiApproved.innerText = masterData.filter(x => x.status === 'approved').length;
    kpiPending.innerText = masterData.filter(x => x.status === 'pending').length;
}

// --- Modal & Toast ---
const modalOverlay = document.getElementById('detail-modal');
function viewDetails(id) {
    const item = masterData.find(c => c.id === id);
    if (!item) return;

    document.getElementById('modal-title').innerText = item.displayText;
    document.getElementById('modal-id').innerText = item.id;
    document.getElementById('modal-area').innerText = item.area;
    document.getElementById('modal-length').innerText = `${item.length_km} sq km`;
    document.getElementById('modal-score').innerText = item.combined_score.toFixed(0);
    document.getElementById('modal-score').className = `detail-value badge ${getScoreClass(item.combined_score)}`;
    document.getElementById('modal-votes').innerText = item.votes.toLocaleString();

    let reason = `This corridor has an AI Base Score of ${item.ai_base_score}. `;
    if (item.penalty > 0) reason += `A proximity penalty of -${item.penalty} was applied due to its distance (${(item.distance_to_green / 1000).toFixed(2)}km) from existing green zones. `;
    if (item.bonus > 0) reason += `It received a community priority bonus of +${item.bonus} points. `;

    document.getElementById('modal-reason').innerText = reason;
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    setTimeout(() => modalOverlay.classList.add('hidden'), 300);
}

function updateStatus(id, newStatus) {
    const item = masterData.find(x => x.id === id);
    if (item) {
        item.status = newStatus;
        showToast(`${id} marked as ${newStatus}`, 'success');
        applyFilters();
    }
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Export for UI
window.updateStatus = updateStatus;
window.viewDetails = viewDetails;
window.closeModal = closeModal;

init();
