// admin.js

// --- Mock Data: Government Database Simulation ---
const mockCorridors = [
    {
        id: "C-101",
        name: "Vasant Kunj - Sanjay Van Link",
        zone: "South Delhi",
        area: "Vasant Kunj",
        length_km: 3.2,
        length_meters: 3200,
        ai_score: 9.4,
        votes: 15420,
        priority: "High",
        status: "pending",
        reason: "Critical biodiversity connector for Sanjay Van wildlife.",
        submission_date: "2023-10-15"
    },
    {
        id: "C-102",
        name: "Dwarka Sector 21 - Greenway",
        zone: "Dwarka",
        area: "Sector 21",
        length_km: 5.1,
        length_meters: 5100,
        ai_score: 8.8,
        votes: 12350,
        priority: "High",
        status: "pending",
        reason: "Reduces heat island effect in high-density residential zone.",
        submission_date: "2023-10-18"
    },
    {
        id: "C-103",
        name: "Yamuna Floodplain Connector",
        zone: "East Delhi",
        area: "Mayur Vihar",
        length_km: 8.5,
        length_meters: 8500,
        ai_score: 9.7,
        votes: 8900,
        priority: "Medium",
        status: "approved", // Existing legacy approval
        reason: "Restores natural floodplain ecology and prevents encroachment.",
        submission_date: "2023-09-01"
    },
    {
        id: "C-104",
        name: "Rohini District Park Axis",
        zone: "North Delhi",
        area: "Rohini Sec 14",
        length_km: 2.1,
        length_meters: 2100,
        ai_score: 6.2,
        votes: 3400,
        priority: "Low",
        status: "rejected",
        reason: "Low ecological impact; overlaps with existing infrastructure.",
        submission_date: "2023-10-05"
    },
    {
        id: "C-105",
        name: "Nehru Place Eco-Path",
        zone: "South Delhi",
        area: "Kalkaji",
        length_km: 1.8,
        length_meters: 1800,
        ai_score: 7.9,
        votes: 9800,
        priority: "Medium",
        status: "pending",
        reason: "Connects major employment hub to metro transit.",
        submission_date: "2023-10-20"
    },
    {
        id: "C-106",
        name: "Okhla Bird Sanctuary Buffer",
        zone: "South Delhi",
        area: "Okhla",
        length_km: 4.0,
        length_meters: 4000,
        ai_score: 9.1,
        votes: 11200,
        priority: "High",
        status: "pending",
        reason: "Essential buffer zone for migratory bird protection.",
        submission_date: "2023-10-22"
    }
];

// --- State ---
let currentData = [...mockCorridors];

// --- DOM Elements ---
const tableBody = document.getElementById('corridor-table-body');
const kpiPending = document.getElementById('kpi-pending');
const kpiTotal = document.getElementById('kpi-total');
const kpiSupported = document.getElementById('kpi-supported');
const kpiApproved = document.getElementById('kpi-approved');

// Inputs
const searchInput = document.getElementById('search-input');
const filterZone = document.getElementById('filter-zone');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');
const refreshBtn = document.getElementById('refresh-btn');

// --- Initialization ---
function init() {
    renderTable(currentData);
    updateKPIs();

    // Listeners
    searchInput.addEventListener('input', applyFilters);
    filterZone.addEventListener('change', applyFilters);
    filterPriority.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    sortBy.addEventListener('change', applyFilters);

    refreshBtn.addEventListener('click', () => {
        // Simulate refresh animation
        refreshBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
        setTimeout(() => {
            refreshBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Refresh';
            applyFilters();
        }, 800);
    });
}

// --- Render Logic ---
function renderTable(data) {
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#666;">No corridors found matching filters.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(item => {
        const scoreClass = getScoreClass(item.ai_score);
        const statusClass = `status-${item.status}`;
        if (item.priority === 'High') priorityClass = 'priority-high';
        if (item.priority === 'Medium') priorityClass = 'priority-mid';
        if (item.priority === 'Low') priorityClass = 'priority-low';

        // Actions: View Details (Always) + Decisions (Only if Pending)
        let actionsHtml = `
            <button class="btn-sm btn-secondary" onclick="viewDetails('${item.id}')" title="View Details">
                <i class="fa-solid fa-eye"></i>
            </button>
        `;

        if (item.status === 'pending') {
            actionsHtml += `
                <button class="btn-sm btn-approve" onclick="updateStatus('${item.id}', 'work-in-progress')" title="Approve">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="btn-sm btn-reject" onclick="updateStatus('${item.id}', 'rejected')" title="Reject">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } else if (item.status === 'work-in-progress') {
            actionsHtml = `<span class="badge" style="background:#e7f5ff; color:#1c7ed6; border:1px solid #d0ebff;">Work in Progress</span>`;
        } else if (item.status === 'approved') {
            actionsHtml = `<span class="badge score-high">Approved</span>`;
        } else {
            actionsHtml = `<span class="badge score-low">Rejected</span>`;
        }

        return `
            <tr>
                <td style="font-family:monospace; font-weight:600; color:#555;">${item.id}</td>
                <td>${item.area}</td>
                <td>${item.length_km} km</td>
                <td><span class="badge ${scoreClass}">${item.ai_score}</span></td>
                <td>${item.votes.toLocaleString()}</td>
                <td>
                    <span class="${priorityClass}">${item.priority}</span>
                </td>
                <td>
                    <span class="${statusClass}">
                        <span class="status-dot"></span>
                        <span style="text-transform:capitalize;">${item.status.replace(/-/g, ' ')}</span>
                    </span>
                </td>
                <td>${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

// --- Helpers ---
function getScoreClass(score) {
    if (score >= 9) return 'score-high';
    if (score >= 7) return 'score-med';
    return 'score-low';
}

// --- Toast Logic ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

function updateStatus(id, newStatus) {
    const idx = currentData.findIndex(x => x.id === id);
    if (idx > -1) {
        currentData[idx].status = newStatus;
        renderTable(currentData); // Re-render table
        updateKPIs(); // Re-calc stats

        // Show Toast
        if (newStatus === 'work-in-progress') {
            showToast(`Corridor ${id} moved to Work in Progress`, 'success');
        } else if (newStatus === 'rejected') {
            showToast(`Corridor ${id} rejected`, 'error');
        }
    }
}

function applyFilters() {
    const term = searchInput.value.toLowerCase();
    const zone = filterZone.value;
    const priority = filterPriority.value;
    const status = filterStatus.value;
    const sortMode = sortBy.value;

    let filtered = mockCorridors.filter(item => {
        // 1. Search (ID, Name, Zone, or Area)
        const matchesSearch = item.id.toLowerCase().includes(term) ||
            item.name.toLowerCase().includes(term) ||
            item.zone.toLowerCase().includes(term) ||
            (item.area && item.area.toLowerCase().includes(term));
        if (!matchesSearch) return false;

        // 2. Zone Filter (Exact match on slug-ified zone)
        if (zone !== 'all' && item.zone.toLowerCase().replace(' ', '-') !== zone) return false;

        // 3. Priority Filter
        if (priority !== 'all' && item.priority !== priority) return false;

        // 4. Status Filter
        if (status !== 'all' && item.status !== status) return false;

        return true;
    });

    // 5. Sorting
    filtered.sort((a, b) => {
        if (sortMode === 'votes') {
            return b.votes - a.votes; // Highest votes first
        } else if (sortMode === 'score') {
            return b.ai_score - a.ai_score; // Highest AI Score first
        }
        return 0;
    });

    currentData = filtered;
    renderTable(filtered);
}

function updateKPIs() {
    // 1. Total AI Suggestions
    kpiTotal.innerText = mockCorridors.length;

    // 2. Community Supported (> 10k votes)
    const supportedCount = mockCorridors.filter(x => x.votes > 10000).length;
    kpiSupported.innerText = supportedCount;

    // 3. Approved / Active Projects (Includes Approved & Work in Progress)
    const approvedCount = mockCorridors.filter(x => x.status === 'approved' || x.status === 'work-in-progress').length;
    kpiApproved.innerText = approvedCount;

    // 4. Pending
    const pendingCount = mockCorridors.filter(x => x.status === 'pending').length;
    kpiPending.innerText = pendingCount;
}

// --- Modal Logic ---
const modalOverlay = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalId = document.getElementById('modal-id');
const modalArea = document.getElementById('modal-area');
const modalLength = document.getElementById('modal-length');
const modalScore = document.getElementById('modal-score');
const modalVotes = document.getElementById('modal-votes');
const modalReason = document.getElementById('modal-reason');

function viewDetails(id) {
    const corridor = mockCorridors.find(c => c.id === id);
    if (!corridor) return;

    // Populate Data
    modalTitle.innerText = `Details: ${corridor.name}`;
    modalId.innerText = corridor.id;
    modalArea.innerText = corridor.area;
    modalLength.innerText = `${corridor.length_km} km`;
    modalScore.innerText = corridor.ai_score;
    // Set score class dynamically
    modalScore.className = `detail-value badge ${getScoreClass(corridor.ai_score)}`;
    modalVotes.innerText = corridor.votes.toLocaleString();
    modalReason.innerText = corridor.reason;

    // Show Modal
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
        modalOverlay.classList.add('hidden');
    }, 300); // Wait for transition
}

// Start
init();

// Export global for HTML access
window.updateStatus = updateStatus;
window.viewDetails = viewDetails;
window.closeModal = closeModal;
