/**
 * ============================================================================
 * RESCUE EYE - TACTICAL ADMIN COMMAND & CCTV SURVEILLANCE ENGINE
 * Multi-Feed Edge AI Vision, Victim Clustering & Rescue Dispatch
 * ============================================================================
 */

let allRescueTeams = [];
let activeFeedsData = [];
let selectedFeedForModal = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');
    const btnLogout = document.getElementById('btnLogout');
    const btnSyncFeedsNow = document.getElementById('btnSyncFeedsNow');
    const btnCloseCctvModal = document.getElementById('btnCloseCctvModal');

    // Live Clock in Header
    setInterval(updateAdminClock, 1000);
    updateAdminClock();

    // Check Authentication (Demo Auto-Login or Cookie)
    if (document.cookie.includes('admin_token=') || window.location.hash.includes('autologin')) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        initCommandCenter();
    } else {
        // Default auto-login for local review convenience
        document.cookie = "admin_token=rescue-eye-admin-token; path=/; max-age=86400;";
        if (loginOverlay) loginOverlay.style.display = 'none';
        initCommandCenter();
    }

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (res.ok) {
                document.cookie = "admin_token=rescue-eye-admin-token; path=/; max-age=86400;";
                loginOverlay.style.display = 'none';
                initCommandCenter();
            } else {
                if (loginError) loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    });

    btnLogout?.addEventListener('click', (e) => {
        e.preventDefault();
        document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        location.reload();
    });

    btnSyncFeedsNow?.addEventListener('click', () => {
        fetchSurveillanceFeeds();
    });

    btnCloseCctvModal?.addEventListener('click', () => {
        const modal = document.getElementById('cctvExpandModal');
        if (modal) modal.style.display = 'none';
    });
});

function updateAdminClock() {
    const el = document.getElementById('adminClock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
}

function initCommandCenter() {
    fetchSurveillanceFeeds();
    setupRealtimeUpdates();

    // Fast polling every 500ms for continuous live CCTV frames & ticking ETA countdowns
    setInterval(fetchSurveillanceFeeds, 500);
}

async function fetchSurveillanceFeeds() {
    try {
        const res = await fetch('/api/feed/all');
        if (!res.ok) return;
        const data = await res.json();
        
        allRescueTeams = data.teams || [];
        activeFeedsData = data.feeds || [];

        renderKpis(data.stats, activeFeedsData, data.sosAlerts || []);
        renderCctvGrid(activeFeedsData);
        renderIncidentsTable(data.incidents || [], activeFeedsData);
        renderSosTable(data.sosAlerts || []);

        if (selectedFeedForModal) {
            const updated = activeFeedsData.find(f => f.id === selectedFeedForModal);
            if (updated) updateModalContents(updated);
        }
    } catch (e) {
        console.warn('CCTV sync polling paused:', e.message);
    }
}

function renderKpis(stats, feeds, sosAlerts) {
    const totalPersons = feeds.reduce((sum, f) => sum + (f.personCount || 0), 0);
    const totalDispatched = feeds.filter(f => f.assignedTeam).length;
    const activeCameras = feeds.filter(f => f.isStreaming || (Date.now() - (f.lastUpdate || 0)) < 30000).length;
    const sosCount = (sosAlerts && sosAlerts.length) || 0;

    const elCameras = document.getElementById('kpiCameras');
    if (elCameras) elCameras.textContent = activeCameras;

    const elDistress = document.getElementById('kpiDistressPersons');
    if (elDistress) elDistress.textContent = totalPersons;

    const elMissions = document.getElementById('kpiMissions');
    if (elMissions) elMissions.textContent = totalDispatched;

    const elSos = document.getElementById('kpiSos');
    if (elSos) elSos.textContent = sosCount;

    const elLocation = document.getElementById('kpiLocation');
    if (elLocation && feeds[0]?.location?.name) {
        elLocation.textContent = feeds[0].location.name;
    }

    const elFeedsBadge = document.getElementById('cctvFeedsOnlineBadge');
    if (elFeedsBadge) {
        elFeedsBadge.innerHTML = `<span class="dot-blink">●</span> ${feeds.length} ${feeds.length === 1 ? 'FEED' : 'FEEDS'} ONLINE`;
    }

    const elVictimsBadge = document.getElementById('cctvVictimsBadge');
    if (elVictimsBadge) {
        elVictimsBadge.textContent = `👥 ${totalPersons} ${totalPersons === 1 ? 'PERSON' : 'PERSONS'} MONITORED`;
    }

    const elMissionsBadge = document.getElementById('cctvMissionsBadge');
    if (elMissionsBadge) {
        elMissionsBadge.textContent = `🚀 ${totalDispatched} ${totalDispatched === 1 ? 'TEAM' : 'TEAMS'} DISPATCHED`;
    }
}

function renderCctvGrid(feeds) {
    const grid = document.getElementById('cctvMonitorGrid');
    if (!grid) return;

    if (feeds.length === 1) {
        grid.classList.add('single-camera-mode');
    } else {
        grid.classList.remove('single-camera-mode');
    }

    if (feeds.length === 0) {
        grid.innerHTML = `
            <div style="background: #0f172a; border: 1.5px dashed #334155; border-radius: 12px; padding: 40px; text-align: center; color: #94a3b8; max-width: 700px; margin: 0 auto; width: 100%;">
                <div style="font-size: 36px; margin-bottom: 12px;">📡</div>
                <h3 style="color: #f8fafc; margin-bottom: 8px;">Awaiting Field User Camera Uplink</h3>
                <p style="font-size: 13px; line-height: 1.6; margin-bottom: 18px;">
                    No live camera is transmitting video right now. Open the <a href="/" target="_blank" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">Field User View</a> and turn on your camera or drone to view real-time CCTV surveillance here.
                </p>
                <a href="/" target="_blank" class="btn-primary-drone" style="display: inline-flex; margin: 0 auto;">🚀 Launch Field User Camera</a>
            </div>
        `;
        return;
    }

    // Clean up any tiles that no longer exist in feeds
    const validIds = new Set(feeds.map(f => `tile-${f.id}`));
    Array.from(grid.children).forEach(child => {
        if (!validIds.has(child.id)) {
            child.remove();
        }
    });

    feeds.forEach(feed => {
        let tile = document.getElementById(`tile-${feed.id}`);
        if (!tile) {
            tile = createCctvTileElement(feed);
            grid.appendChild(tile);
        }
        updateCctvTileElement(tile, feed);
    });
}

function createCctvTileElement(feed) {
    const tile = document.createElement('div');
    tile.className = 'cctv-tile';
    tile.id = `tile-${feed.id}`;

    tile.innerHTML = `
        <div class="cctv-tile-header">
            <div class="cctv-tile-channel">
                <span class="channel-indicator ${feed.isStreaming ? 'green-glow' : ''}" id="ch-ind-${feed.id}">● ${feed.channel}</span>
                <span class="feed-title" id="title-${feed.id}">${feed.title}</span>
            </div>
            <div class="cctv-tile-tags">
                ${feed.isUserFeed ? '<span class="badge-user-live">● USER WEBCAM LINK</span>' : ''}
                <span class="feed-fps">1080p 30FPS</span>
                <button class="btn-cctv-expand" onclick="expandCctvFeed('${feed.id}')" title="Expand Surveillance View">⛶</button>
            </div>
        </div>

        <div class="cctv-video-frame-wrap cctv-viewport">
            <img id="cctv-img-${feed.id}" class="cctv-frame-img" src="${feed.frame || ''}" alt="${feed.title}" />
            <div class="cctv-reticle top-left"></div>
            <div class="cctv-reticle top-right"></div>
            <div class="cctv-reticle bottom-left"></div>
            <div class="cctv-reticle bottom-right"></div>
            <div class="cctv-hud-overlay top">
                <span id="timecode-${feed.id}">REC 00:00:00</span>
                <span id="gps-${feed.id}">${feed.telemetry?.gps || 'GPS LOCKED'}</span>
            </div>
            <div class="cctv-hud-overlay bottom">
                <span id="telem-${feed.id}">ALT: 120m | SPD: 18m/s</span>
                <span style="color: #00F0FF; font-weight: bold;">AI EDGE CV</span>
            </div>
        </div>

        <div class="cctv-info-body">
            <div class="cctv-detection-bar" id="det-bar-${feed.id}">
                <!-- Injected dynamically -->
            </div>

            <div class="cctv-recommendation-card" id="rec-card-${feed.id}">
                <!-- Injected dynamically -->
            </div>

            <div class="cctv-dispatch-action-box" id="dispatch-box-${feed.id}">
                <!-- Injected dynamically -->
            </div>
        </div>
    `;

    return tile;
}

function updateCctvTileElement(tile, feed) {
    // 1. Update Video Frame
    const img = document.getElementById(`cctv-img-${feed.id}`);
    if (img && feed.frame && img.src !== feed.frame) {
        img.src = feed.frame;
    }

    // 2. Update Header & Timecode
    const timecode = document.getElementById(`timecode-${feed.id}`);
    if (timecode) {
        const d = new Date();
        timecode.textContent = `REC ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
    }

    const gpsEl = document.getElementById(`gps-${feed.id}`);
    if (gpsEl && feed.telemetry?.gps) {
        gpsEl.textContent = feed.telemetry.gps;
    }

    const telemEl = document.getElementById(`telem-${feed.id}`);
    if (telemEl && feed.telemetry) {
        telemEl.textContent = `ALT: ${feed.telemetry.alt || '120m'} | SPD: ${feed.telemetry.speed || '18m/s'}`;
    }

    // 3. Update AI Detection Bar
    const detBar = document.getElementById(`det-bar-${feed.id}`);
    if (detBar) {
        const pCount = feed.personCount || 0;
        let pillClass = 'safe';
        let statusNotice = 'CLEAR SECTOR';
        if (pCount >= 2) {
            pillClass = 'danger';
            statusNotice = 'CRITICAL STRANDING';
        } else if (pCount === 1) {
            pillClass = 'warning';
            statusNotice = 'ISOLATED SURVIVOR';
        }

        detBar.innerHTML = `
            <div class="detection-pill ${pillClass}">
                <span>👥</span>
                <strong>${pCount} ${pCount === 1 ? 'PERSON' : 'PERSONS'} DETECTED</strong>
                <small style="opacity: 0.85;">(${statusNotice})</small>
            </div>
            <div class="detection-secondary-metrics">
                <span>Vehicles: <strong>${feed.vehicleCount || 0}</strong></span>
                <span>Boats: <strong>${feed.boatCount || 0}</strong></span>
                <span>Elev: <strong>${feed.location?.elevation || 504}m</strong></span>
            </div>
        `;
    }

    // 4. Update Recommendation Card
    const recCard = document.getElementById(`rec-card-${feed.id}`);
    if (recCard) {
        const rec = feed.recommendedTeam || { name: 'NDRF Motorboat Team Bravo', type: 'Tactical Unit', rationale: 'Standard flood extraction response.' };
        recCard.innerHTML = `
            <div class="rec-header">
                <span class="rec-label">🤖 AI RESPONSE RECOMMENDATION:</span>
                <span class="rec-team-name">${rec.icon || '🛟'} ${rec.name}</span>
            </div>
            <div class="rec-rationale">${rec.rationale || 'Deployment advised based on victim count and hydraulic flow velocity.'}</div>
            <div class="rec-specs">
                <span>Capacity: <strong>${rec.capacity || 'Multi-Victim'}</strong></span>
                <span>Base: <strong>${rec.baseName || 'Central Depot (3.8 km away)'}</strong></span>
            </div>
        `;
    }

    // 5. Update Dispatch Action / Live Approach ETA Panel
    const dispatchBox = document.getElementById(`dispatch-box-${feed.id}`);
    if (dispatchBox) {
        if (!feed.assignedTeam) {
            // Unassigned State: Team Picker + Dispatch CTA
            const defaultTeamId = feed.recommendedTeam?.id || 'TM-NDRF-B';
            dispatchBox.innerHTML = `
                <div class="dispatch-form-row">
                    <select class="dispatch-select" id="select-team-${feed.id}">
                        ${allRescueTeams.map(t => `
                            <option value="${t.id}" ${t.id === defaultTeamId ? 'selected' : ''}>
                                ${t.name} (${t.type})
                            </option>
                        `).join('')}
                    </select>
                    <button class="btn-dispatch-now" onclick="dispatchTeamForFeed('${feed.id}')">
                        ⚡ DISPATCH TEAM
                    </button>
                </div>
            `;
        } else {
            // Dispatched / En Route State with Live Approach ETA Clock
            const approach = feed.approach || {};
            const isArrived = approach.status === 'ON SITE / RESCUE UNDERWAY';
            dispatchBox.innerHTML = `
                <div class="approach-status-panel">
                    <div class="approach-top-row">
                        <span class="badge-status-enroute" style="${isArrived ? 'background:rgba(0,240,255,0.2);color:#00F0FF;border-color:#00F0FF;' : ''}">
                            ${isArrived ? '🏁 ON SITE // EXTRACTION UNDERWAY' : '🚀 TEAM DISPATCHED - EN ROUTE'}
                        </span>
                        <div class="countdown-eta-box" style="${isArrived ? 'border-color:#00F0FF;' : ''}">
                            <span class="countdown-eta-label">APPROACH ETA:</span>
                            <span class="countdown-eta-clock" style="${isArrived ? 'color:#00F0FF;' : ''}">${approach.etaDisplay || 'Approaching'}</span>
                        </div>
                    </div>

                    <div class="approach-progress-track">
                        <div class="approach-progress-fill" style="width: ${approach.progressPercent || 10}%;"></div>
                    </div>

                    <div class="approach-details-grid">
                        <div>Unit: <strong>${feed.assignedTeam.name}</strong></div>
                        <div>Approaching: <strong>${feed.location?.name || 'Sector B'}</strong></div>
                        <div>Staging: <strong>${feed.assignedTeam.baseName || 'Civil Depot (3.8 km)'}</strong></div>
                        <div>Speed: <strong>${feed.assignedTeam.speedKmH || 36} km/h</strong></div>
                    </div>

                    <div class="approach-actions-row">
                        <button class="btn-action-sm" onclick="radioCommsPing('${feed.id}')">📻 Radio Check</button>
                        <button class="btn-action-sm" onclick="reassignTeamPrompt('${feed.id}')">🔄 Re-assign</button>
                        <button class="btn-action-sm success" onclick="resolveMission('${feed.id}')">✅ Mark Rescued</button>
                    </div>
                </div>
            `;
        }
    }
}

window.dispatchTeamForFeed = async function(feedId) {
    const select = document.getElementById(`select-team-${feedId}`);
    const teamId = select ? select.value : 'TM-NDRF-B';

    try {
        const res = await fetch('/api/rescue/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedId, teamId })
        });
        const data = await res.json();
        if (data.success) {
            playTacticalTone();
            fetchSurveillanceFeeds();
        }
    } catch (err) {
        console.error('Dispatch failed:', err);
    }
};

window.resolveMission = async function(feedId) {
    if (!confirm('Confirm civilian evacuation completed for this sector?')) return;
    try {
        await fetch('/api/rescue/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedId })
        });
        fetchSurveillanceFeeds();
    } catch (err) {
        console.error('Resolve mission failed:', err);
    }
};

window.reassignTeamPrompt = async function(feedId) {
    const feed = activeFeedsData.find(f => f.id === feedId);
    if (!feed) return;
    feed.assignedTeam = null;
    fetchSurveillanceFeeds();
};

window.radioCommsPing = function(feedId) {
    const feed = activeFeedsData.find(f => f.id === feedId);
    const unitName = feed?.assignedTeam?.name || 'Response Unit';
    alert(`📻 TACTICAL RADIO COMMS [SECURE]:\n\nChannel 04 // Civil Defense Net\n${unitName} Reports: "En route at current heading. GPS waypoint locked. Estimated Approach: ${feed?.approach?.etaDisplay || '7 mins'}. Water depth 1.6m navigated safely."`);
};

window.expandCctvFeed = function(feedId) {
    selectedFeedForModal = feedId;
    const feed = activeFeedsData.find(f => f.id === feedId);
    if (!feed) return;

    const modal = document.getElementById('cctvExpandModal');
    if (!modal) return;
    modal.style.display = 'flex';
    updateModalContents(feed);
};

function updateModalContents(feed) {
    const title = document.getElementById('modalFeedTitle');
    const meta = document.getElementById('modalFeedMeta');
    const img = document.getElementById('modalLargeFrame');
    const telem = document.getElementById('modalTelemetryText');
    const gps = document.getElementById('modalGpsText');
    const breakdown = document.getElementById('modalDetectionBreakdown');
    const recTeam = document.getElementById('modalRecommendedTeam');
    const rationale = document.getElementById('modalRationale');
    const actions = document.getElementById('modalDispatchActions');

    if (title) title.textContent = `${feed.channel} // ${feed.title}`;
    if (meta) meta.textContent = `TACTICAL SURVEILLANCE FEED // ${feed.status || 'STREAMING'} // ${feed.isUserFeed ? 'ACTIVE WEBCAM' : 'REMOTE SENSOR'}`;
    if (img && feed.frame) img.src = feed.frame;
    if (telem) telem.textContent = `ALT: ${feed.telemetry?.alt || '120m'} | SPD: ${feed.telemetry?.speed || '18m/s'} | BAT: ${feed.telemetry?.battery || '88%'}`;
    if (gps) gps.textContent = `GPS: ${feed.telemetry?.gps || '19.8824° N, 74.4761° E'}`;

    if (breakdown) {
        breakdown.innerHTML = `
            <strong>${feed.personCount || 0} Persons Identified</strong> | Vehicles: ${feed.vehicleCount || 0} | Watercraft: ${feed.boatCount || 0}<br>
            <span style="color:#94a3b8; font-size:11px;">Target Sector: ${feed.location?.name || 'Kopargaon Flood Zone'} (Elev: ${feed.location?.elevation || 504}m)</span>
        `;
    }

    const rec = feed.recommendedTeam || { name: 'NDRF Motorboat Team Bravo', rationale: 'Tactical motorboat advised.' };
    if (recTeam) recTeam.textContent = `${rec.icon || '🛟'} ${rec.name}`;
    if (rationale) rationale.textContent = rec.rationale;

    if (actions) {
        if (!feed.assignedTeam) {
            actions.innerHTML = `
                <button class="btn btn-primary w-100" style="padding:12px; font-weight:bold; background:#ef4444; border:none; border-radius:6px; cursor:pointer;" onclick="dispatchTeamForFeed('${feed.id}'); document.getElementById('cctvExpandModal').style.display='none';">
                    ⚡ DISPATCH ${rec.name.toUpperCase()} NOW
                </button>
            `;
        } else {
            actions.innerHTML = `
                <div style="background:#050a14; padding:12px; border-radius:6px; border:1px solid #10b981; text-align:center;">
                    <div style="font-size:11px; color:#94a3b8;">DISPATCHED UNIT EN ROUTE</div>
                    <div style="font-size:18px; font-weight:bold; color:#10b981; font-family:monospace; margin:4px 0;">
                        ETA: ${feed.approach?.etaDisplay || 'Approaching'}
                    </div>
                    <small style="color:#cbd5e1;">${feed.assignedTeam.name} (${feed.approach?.distanceKm || 3.8} km away)</small>
                </div>
            `;
        }
    }
}

function renderIncidentsTable(incidentsList, feeds) {
    const tbody = document.getElementById('incidentsTableBody');
    if (!tbody) return;

    if (!incidentsList || incidentsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">🟢 No active distress incidents. Field camera sector is clear.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    incidentsList.forEach((inc) => {
        const pCount = inc.persons || 0;
        const priorityBadge = pCount >= 3 ? '<span class="badge badge-danger">CRITICAL</span>' : pCount >= 1 ? '<span class="badge badge-amber">HIGH</span>' : '<span class="badge badge-success">MONITORING</span>';
        const statusBadge = inc.status === 'DISPATCHED' ? '<span class="badge badge-success">DISPATCHED</span>' : pCount > 0 ? '<span class="badge badge-danger">ACTIVE DISTRESS</span>' : '<span class="badge badge-success">NORMAL</span>';
        const teamText = inc.assignedTeam && !inc.assignedTeam.startsWith('Unassigned') ? `<strong>${inc.assignedTeam}</strong> <span style="font-family:monospace; color:#10b981;">(ETA: ${inc.eta || 'En Route'})</span>` : `<span style="color:#94a3b8;">${inc.assignedTeam || 'Pending Dispatch'}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${inc.id}</code></td>
            <td><strong>${inc.type || 'Civilian Distress'}</strong></td>
            <td>${inc.location ? (typeof inc.location === 'string' ? inc.location : `${inc.location.lat?.toFixed(4)}, ${inc.location.lng?.toFixed(4)} (${inc.location.name || 'Sector'})`) : '19.8824, 74.4761'}</td>
            <td><strong style="color:${pCount > 0 ? '#f87171' : '#34d399'};">${pCount} Persons</strong></td>
            <td>${priorityBadge}</td>
            <td>${statusBadge}</td>
            <td>${teamText}</td>
            <td>
                <button class="btn-action-sm" onclick="jumpToCctvFeed('${inc.feedId}')">View CCTV</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSosTable(sosAlertsList) {
    const tbody = document.getElementById('sosTableBody');
    if (!tbody) return;

    if (!sosAlertsList || sosAlertsList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">🛡️ No emergency SOS signals received. Citizen emergency channel standing by.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    sosAlertsList.forEach(sos => {
        const statusBadge = sos.status === 'DISPATCHED' ? '<span class="badge badge-success">DISPATCHED</span>' : '<span class="badge badge-danger">ACTIVE DISTRESS</span>';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${sos.id}</code></td>
            <td>${sos.time || new Date().toLocaleTimeString()}</td>
            <td><strong>${sos.location || 'GPS Beacon Sector'}</strong></td>
            <td>${statusBadge}</td>
            <td><strong style="color:#38bdf8;">${sos.assignedTeam || 'Unassigned'}</strong> <span style="font-family:monospace; color:#10b981;">(${sos.eta || 'Approaching'})</span></td>
        `;
        tbody.appendChild(tr);
    });
}

window.jumpToCctvFeed = function(feedId) {
    const tile = document.getElementById(`tile-${feedId}`);
    if (!tile) return;

    tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tile.classList.add('highlighted');
    setTimeout(() => {
        tile.classList.remove('highlighted');
    }, 2800);
};

function playTacticalTone() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
}

function setupRealtimeUpdates() {
    try {
        const source = new EventSource('/api/state/stream');
        source.onmessage = () => {
            fetchSurveillanceFeeds();
        };
    } catch (e) {}
}
