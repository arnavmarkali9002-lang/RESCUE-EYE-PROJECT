/**
 * ============================================================================
 * RESCUE EYE - UNIFIED AI FLOOD PREDICTION & EARLY WARNING
 * Complete Client-Side Dynamic Controller & Mission Command Engine
 * ============================================================================
 */

// Global App State
const RescueEyeApp = {
    currentLocation: {
        name: 'Kopargaon, Maharashtra',
        lat: 19.8824,
        lng: 74.4761,
        elevation: 504
    },
    forecastHours: 6,
    activePrediction: null,
    map: null,
    mapTileLayer: null,
    mapPolygonsLayer: null,
    mapSheltersLayer: null,
    mapMarkerLayer: null,
    isSatellite: false,
    audioEnabled: true,
    cocoModel: null,
    droneSimActive: false,
    droneSimAnimId: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initLocationSearch();
    initForecastSelector();
    initAnalyzeButton();
    initDrawersAndModals();
    warmupCocoModel();
    initRealTimeSync();

    // Auto-run analysis for default location (Kopargaon) on first load
    setTimeout(() => {
        executeFloodRiskAnalysis();
    }, 300);

    // Dynamic System Health Polling
    setInterval(async () => {
        try {
            const res = await fetch('/api/system-health');
            if (res.ok) {
                const data = await res.json();
                const badge = document.getElementById('systemHealthBadge');
                if (badge) badge.textContent = `System: ${data.status} (${data.latency}ms)`;
            }
        } catch (e) {
            const badge = document.getElementById('systemHealthBadge');
            if (badge) badge.textContent = 'System: OFFLINE';
        }
    }, 15000);

    // Alert Bell Dropdown UI
    document.getElementById('btnAlertsToggle')?.addEventListener('click', () => {
        const drop = document.getElementById('alertsDropdown');
        if (drop) drop.classList.toggle('hidden');
        const badge = document.getElementById('alertCountBadge');
        if (badge) badge.textContent = '0';
    });

    // START DEMO Button
    document.getElementById('btnStartDemo')?.addEventListener('click', runCrisisScenarioDemo);
});

// ============================================================================
// NUMBER COUNT-UP ANIMATION UTILITY
// ============================================================================
function animateNumber(elementId, startVal, endVal, suffix = '', decimals = 0, duration = 650) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * easeOut;
        
        el.textContent = current.toFixed(decimals) + suffix;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = endVal.toFixed(decimals) + suffix;
        }
    }
    requestAnimationFrame(update);
}

// ============================================================================
// 1. LOCATION SELECTION, AUTOCOMPLETE & MAP CLICK
// ============================================================================
function initLocationSearch() {
    const input = document.getElementById('locationSearchInput');
    const dropdown = document.getElementById('autocompleteList');
    const btnGPS = document.getElementById('btnUseCurrentLocation');
    const quickChips = document.querySelectorAll('.quick-basin-chip');

    let debounceTimer = null;

    // Live Geocoding Autocomplete Search
    input?.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (query.length < 2) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
                if (!res.ok) return;
                const data = await res.json();
                renderAutocompleteDropdown(data.results || []);
            } catch (err) {
                console.warn('Geocoding search failed:', err.message);
            }
        }, 250);
    });

    // Close autocomplete on click outside
    document.addEventListener('click', (e) => {
        if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Use Current Location (Browser GPS)
    btnGPS?.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }

        btnGPS.textContent = 'Acquiring GPS...';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(4));
                const lng = parseFloat(pos.coords.longitude.toFixed(4));
                RescueEyeApp.currentLocation = {
                    name: `GPS Device Location [${lat}, ${lng}]`,
                    lat: lat,
                    lng: lng,
                    elevation: 512
                };
                updateSelectedLocationCard();
                btnGPS.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15 12 12 22 9 12 12 2"/></svg> GPS Active`;
                if (input) input.value = RescueEyeApp.currentLocation.name;
                executeFloodRiskAnalysis();
            },
            (err) => {
                alert(`Location access denied: ${err.message}`);
                btnGPS.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="12 2 15 12 12 22 9 12 12 2"/></svg> Use Current Location`;
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });

    // Quick Basin Chips
    quickChips.forEach(chip => {
        chip.addEventListener('click', () => {
            quickChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const lat = parseFloat(chip.getAttribute('data-lat'));
            const lng = parseFloat(chip.getAttribute('data-lng'));
            const name = chip.getAttribute('data-name');

            RescueEyeApp.currentLocation = { name, lat, lng, elevation: 504 };
            updateSelectedLocationCard();
            if (input) input.value = name;
            if (dropdown) dropdown.classList.add('hidden');
            executeFloodRiskAnalysis();
        });
    });
}

function renderAutocompleteDropdown(results) {
    const dropdown = document.getElementById('autocompleteList');
    if (!dropdown) return;

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="autocomplete-item text-muted">No locations found.</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = results.map(r => `
        <div class="autocomplete-item" data-lat="${r.latitude}" data-lng="${r.longitude}" data-elev="${r.elevation || 500}" data-name="${r.formatted}">
            <strong>${r.name}</strong>
            <small style="display:block; color:#94a3b8;">${r.admin1 ? r.admin1 + ', ' : ''}${r.country} (${r.latitude.toFixed(3)}°, ${r.longitude.toFixed(3)}°)</small>
        </div>
    `).join('');

    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const lat = parseFloat(item.getAttribute('data-lat'));
            const lng = parseFloat(item.getAttribute('data-lng'));
            const elev = parseInt(item.getAttribute('data-elev'), 10) || 500;
            const name = item.getAttribute('data-name');

            RescueEyeApp.currentLocation = { name, lat, lng, elevation: elev };
            const input = document.getElementById('locationSearchInput');
            if (input) input.value = name;
            dropdown.classList.add('hidden');
            updateSelectedLocationCard();
            executeFloodRiskAnalysis();
        });
    });

    dropdown.classList.remove('hidden');
}

function updateSelectedLocationCard() {
    const loc = RescueEyeApp.currentLocation;
    const nameEl = document.getElementById('displayTargetName');
    const coordsEl = document.getElementById('displayTargetCoords');

    if (nameEl) nameEl.textContent = loc.name;
    if (coordsEl) {
        coordsEl.textContent = `Lat: ${loc.lat.toFixed(4)}° N, Lng: ${loc.lng.toFixed(4)}° E ${loc.elevation ? '| Elev: ' + loc.elevation + 'm AGL' : ''}`;
    }
}

// ============================================================================
// 2. FORECAST PERIOD SELECTOR
// ============================================================================
function initForecastSelector() {
    const pills = document.querySelectorAll('#forecastPillsGroup .pill-btn');
    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            RescueEyeApp.forecastHours = parseInt(pill.getAttribute('data-hours'), 10) || 6;
            executeFloodRiskAnalysis();
        });
    });
}

// ============================================================================
// 3. ANALYZE BUTTON & STEPPER PROGRESS
// ============================================================================
function initAnalyzeButton() {
    const btn = document.getElementById('btnAnalyzeFloodRisk');
    btn?.addEventListener('click', () => {
        executeFloodRiskAnalysis();
    });
}

async function executeFloodRiskAnalysis() {
    const loc = RescueEyeApp.currentLocation;
    const hours = RescueEyeApp.forecastHours;

    const stepperCard = document.getElementById('pipelineProgressCard');
    const resultContainer = document.getElementById('unifiedResultContainer');
    const btnAnalyze = document.getElementById('btnAnalyzeFloodRisk');

    if (btnAnalyze) {
        btnAnalyze.disabled = true;
        btnAnalyze.innerHTML = `<span class="spinner-inline"></span> Analyzing Sector...`;
    }

    if (stepperCard) stepperCard.classList.remove('hidden');
    resetStepperUI();

    try {
        // Step 1: Location Validated
        updateStep('step-location', 'done');

        // Step 2 & 3: Fast telemetry progression
        await delay(120);
        updateStep('step-weather', 'done');
        updateStep('step-rainfall', 'done');

        await delay(120);
        updateStep('step-river', 'done');
        updateStep('step-terrain', 'done');

        await delay(120);
        updateStep('step-historical', 'done');
        updateStep('step-prediction', 'active');

        // Call real backend inference API
        const res = await fetch('/api/flood/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: loc.lat,
                longitude: loc.lng,
                forecastHours: hours,
                locationName: loc.name
            })
        });

        if (!res.ok) {
            throw new Error(`Inference API returned HTTP error: ${res.status}`);
        }

        const predictionData = await res.json();
        RescueEyeApp.activePrediction = predictionData;

        updateStep('step-prediction', 'done');
        updateStep('step-map', 'done');
        updateStep('step-confidence', 'done');
        updateStep('step-forecast', 'done');

        await delay(150);

        if (stepperCard) stepperCard.classList.add('hidden');
        renderUnifiedResult(predictionData);

        if (resultContainer) {
            resultContainer.classList.remove('hidden');
        }

        // Trigger Audio Chime if probability is elevated
        if (predictionData.probability >= 55 && RescueEyeApp.audioEnabled) {
            playEmergencyTone();
        }
    } catch (err) {
        console.error('Unified prediction failed:', err);
        alert(`Analysis Error: ${err.message}`);
        if (stepperCard) stepperCard.classList.add('hidden');
    } finally {
        if (btnAnalyze) {
            btnAnalyze.disabled = false;
            btnAnalyze.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> ANALYZE FLOOD RISK`;
        }
    }
}

function resetStepperUI() {
    const steps = [
        'step-location', 'step-weather', 'step-rainfall', 'step-river',
        'step-terrain', 'step-historical', 'step-prediction', 'step-map',
        'step-confidence', 'step-forecast'
    ];
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.className = 'step-item';
            const icon = el.querySelector('.step-icon');
            if (icon) icon.textContent = '○';
        }
    });
}

function updateStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = `step-item ${state}`;
    const icon = el.querySelector('.step-icon');
    if (icon) {
        icon.textContent = state === 'done' ? '✓' : state === 'active' ? '●' : '○';
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 4. RENDER UNIFIED RESULT WITH NUMBER COUNT-UP
// ============================================================================
function renderUnifiedResult(data) {
    // 1. Hero KPI Cards
    const locHeader = document.getElementById('resLocation');
    if (locHeader) locHeader.textContent = `${data.location.name} (Elev: ${data.location.elevationMeters}m AGL)`;
    
    // Smooth number animations
    animateNumber('resProbability', 0, data.probability, '%', 0, 700);
    animateNumber('resConfidence', 0, data.confidence, '%', 0, 700);
    animateNumber('resAffectedArea', 0, data.predictedExtent.affectedAreaKm2, ' km²', 1, 700);

    const riskLevelEl = document.getElementById('resRiskLevel');
    if (riskLevelEl) riskLevelEl.textContent = `${data.riskLevel} RISK`;

    const arrivalEl = document.getElementById('resArrivalTime');
    if (arrivalEl) arrivalEl.textContent = data.estimatedArrivalTime;

    const warnEl = document.getElementById('resWarningStatus');
    if (warnEl) warnEl.textContent = data.warningStatus;

    // Severity coloring
    let badgeClass = 'badge-danger';
    let textColor = '#ef4444';
    if (data.riskLevel === 'EXTREME') {
        badgeClass = 'badge-ext';
        textColor = '#ef4444';
    } else if (data.riskLevel === 'HIGH') {
        badgeClass = 'badge-danger';
        textColor = '#f97316';
    } else if (data.riskLevel === 'ELEVATED' || data.riskLevel === 'MODERATE') {
        badgeClass = 'badge-warning';
        textColor = '#f59e0b';
    } else {
        badgeClass = 'badge-success';
        textColor = '#10b981';
    }

    if (riskLevelEl) riskLevelEl.className = `badge ${badgeClass}`;
    if (warnEl) warnEl.className = `badge ${badgeClass} text-lg`;
    const probVal = document.getElementById('resProbability');
    if (probVal) probVal.style.color = textColor;

    // 2. Interactive GIS Map
    renderUnifiedGisMap(data);

    // 3. Explainable AI SHAP factors
    renderUnifiedExplanation(data.explanation);

    // 4. Ingested Telemetry Table
    renderDataStatusTable(data);
}

// ============================================================================
// 5. INTERACTIVE LEAFLET GIS HAZARD MAP WITH CLICK-TO-ANALYZE
// ============================================================================
function renderUnifiedGisMap(data) {
    const lat = data.location.latitude;
    const lng = data.location.longitude;

    if (!RescueEyeApp.map) {
        const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        RescueEyeApp.map = L.map('unifiedGisMap', {
            center: [lat, lng],
            zoom: 13,
            zoomControl: true,
            attributionControl: false
        });

        RescueEyeApp.mapTileLayer = L.tileLayer(darkTileUrl, { maxZoom: 19, subdomains: 'abcd' }).addTo(RescueEyeApp.map);
        RescueEyeApp.mapPolygonsLayer = L.layerGroup().addTo(RescueEyeApp.map);
        RescueEyeApp.mapSheltersLayer = L.layerGroup().addTo(RescueEyeApp.map);
        RescueEyeApp.mapMarkerLayer = L.layerGroup().addTo(RescueEyeApp.map);

        // Click on map to pin and analyze anywhere!
        RescueEyeApp.map.on('click', async (e) => {
            const clickLat = parseFloat(e.latlng.lat.toFixed(4));
            const clickLng = parseFloat(e.latlng.lng.toFixed(4));
            const sectorName = `Catchment Sector [${clickLat}°N, ${clickLng}°E]`;

            RescueEyeApp.currentLocation = {
                name: sectorName,
                lat: clickLat,
                lng: clickLng,
                elevation: 508
            };

            const input = document.getElementById('locationSearchInput');
            if (input) input.value = sectorName;
            updateSelectedLocationCard();
            executeFloodRiskAnalysis();
        });

        // Recenter Button
        document.getElementById('btnMapRecenter')?.addEventListener('click', () => {
            if (RescueEyeApp.activePrediction) {
                RescueEyeApp.map.flyTo([RescueEyeApp.activePrediction.location.latitude, RescueEyeApp.activePrediction.location.longitude], 13);
            }
        });

        // Satellite Toggle Button
        document.getElementById('btnMapSatelliteToggle')?.addEventListener('click', (e) => {
            RescueEyeApp.isSatellite = !RescueEyeApp.isSatellite;
            const darkUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
            const satUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            RescueEyeApp.map.removeLayer(RescueEyeApp.mapTileLayer);
            RescueEyeApp.mapTileLayer = L.tileLayer(RescueEyeApp.isSatellite ? satUrl : darkUrl, { maxZoom: 19 }).addTo(RescueEyeApp.map);
            e.target.textContent = RescueEyeApp.isSatellite ? 'Standard Map View' : 'Toggle Satellite';
        });
    }

    RescueEyeApp.mapPolygonsLayer.clearLayers();
    RescueEyeApp.mapSheltersLayer.clearLayers();
    RescueEyeApp.mapMarkerLayer.clearLayers();

    // Pan map with smooth transition
    RescueEyeApp.map.flyTo([lat, lng], 13, { duration: 1.1 });
    const targetLabel = document.getElementById('mapTargetLabel');
    if (targetLabel) targetLabel.textContent = `Sector: ${data.location.name}`;

    // Target Pin with Radar Pulse
    const targetIcon = L.divIcon({
        className: 'target-pin-icon',
        html: `<div style="background-color: #00f0ff; color: #000; font-weight: 800; font-size: 11px; padding: 5px 10px; border-radius: 4px; border: 2px solid white; box-shadow: 0 0 20px #00f0ff; white-space: nowrap;">🎯 ${data.location.name}</div>`,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
    });
    L.marker([lat, lng], { icon: targetIcon }).addTo(RescueEyeApp.mapMarkerLayer);

    // Hazard Extent Inundation Polygons
    if (data.map && data.map.polygons) {
        data.map.polygons.forEach(poly => {
            const isExtreme = poly.severity === 'EXTREME' || poly.severity === 'HIGH';
            const color = isExtreme ? '#ef4444' : '#f59e0b';
            const fillColor = isExtreme ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.28)';

            const polygon = L.polygon(poly.coords, {
                color: color,
                weight: 2,
                fillColor: fillColor,
                fillOpacity: 0.55,
                dashArray: '5, 5'
            }).addTo(RescueEyeApp.mapPolygonsLayer);

            polygon.bindPopup(`
                <div style="color: #0f172a; padding: 6px; font-family: sans-serif;">
                    <strong style="color: ${color}; font-size: 14px;">${poly.name}</strong><br>
                    <strong>Severity:</strong> <span style="color:${color}; font-weight:bold;">${poly.severity}</span><br>
                    <strong>Modeled Water Depth:</strong> 1.5 - 2.8 meters<br>
                    <div style="margin-top: 8px;">
                        <button class="btn btn-xs btn-primary" onclick="document.getElementById('btnOpenDroneLab').click()" style="background:#0ea5e9; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">
                            🚁 Launch Drone Recon Here
                        </button>
                    </div>
                </div>
            `);
        });
    }

    // Emergency Shelters
    if (data.map && data.map.shelters) {
        data.map.shelters.forEach(s => {
            const shelterIcon = L.divIcon({
                className: 'shelter-marker-icon',
                html: `<div style="background-color: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); font-size: 15px;">🏠</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            L.marker(s.coords, { icon: shelterIcon }).addTo(RescueEyeApp.mapSheltersLayer).bindPopup(`
                <div style="color: #0f172a; padding: 6px; font-family: sans-serif;">
                    <h4 style="margin: 0; color: #059669; font-size: 14px;">${s.name}</h4>
                    <p style="margin: 4px 0;"><strong>Designated High-Ground Shelter</strong></p>
                    <p style="margin: 4px 0;">Capacity: <strong>${s.capacity} Persons</strong></p>
                    <span style="color:#059669; font-weight:bold;">Safe Elevation (+16m above floodline)</span>
                </div>
            `);
        });
    }

    setTimeout(() => {
        RescueEyeApp.map?.invalidateSize();
    }, 200);
}

// ============================================================================
// 6. EXPLAINABLE AI & DATA STATUS
// ============================================================================
function renderUnifiedExplanation(factors) {
    const container = document.getElementById('resExplanationList');
    if (!container || !factors) return;

    container.innerHTML = factors.map(f => {
        const isPos = f.type === 'INCREASING_RISK';
        return `
            <div class="xai-factor-item ${isPos ? 'factor-pos' : 'factor-neg'}">
                <div>
                    <strong>${f.title}</strong>
                    <div style="font-size: 11px; color: #94a3b8;">${f.description}</div>
                </div>
                <strong style="color: ${isPos ? '#ef4444' : '#10b981'}; font-family: monospace;">${f.impact}</strong>
            </div>
        `;
    }).join('');
}

function renderDataStatusTable(data) {
    const w = data.weather;
    const r = data.river;
    const t = data.terrain;
    const h = data.historical;

    const elW = document.getElementById('resWeatherSnippet');
    if (elW) elW.textContent = `${w.temperature}°C, ${w.humidity}% Hum, ${w.pressure} hPa | Wind: ${w.windSpeed} km/h`;

    const elR = document.getElementById('resRainSnippet');
    if (elR) elR.textContent = `24h Rain: ${w.r24h} mm | Forecast: ${w.forecastRain} mm (${data.forecastPeriodHours}h horizon)`;

    const elRiv = document.getElementById('resRiverSnippet');
    if (elRiv) elRiv.textContent = `${r.stationName}: ${r.currentStage}m / Danger: ${r.dangerMark}m (${r.rateOfRise})`;

    const elT = document.getElementById('resTerrainSnippet');
    if (elT) elT.textContent = `Elev: ${t.elevation}m AGL | Slope: ${t.slope}° | Drainage: ${(t.drainageEfficiency * 100).toFixed(0)}%`;

    const elH = document.getElementById('resHistoricalSnippet');
    if (elH) elH.textContent = `${h.analogEvent} (${h.returnPeriod})`;
}

// ============================================================================
// 7. REAL-TIME SSE INCIDENT COMMAND & DISPATCH
// ============================================================================
function initRealTimeSync() {
    fetch('/api/state')
        .then(res => res.json())
        .then(data => {
            renderVictimsTable(data.victims || []);
            renderMissionsTable(data.missions || []);
            renderAlerts(data.alerts || []);
            initAnalyticsCharts();
        })
        .catch(e => console.warn('Real-time state init error:', e));

    try {
        const evtSource = new EventSource('/api/events');
        evtSource.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.event === 'victim_added') {
                const inc = document.getElementById('incidentCommandSection');
                if (inc) inc.style.display = 'block';
                addVictimRow(msg.data);
                updateRiskChartData();
            } else if (msg.event === 'mission_updated') {
                updateMissionRow(msg.data.mission);
                updateVictimStatus(msg.data.victim);
            } else if (msg.event === 'alert_added') {
                addAlert(msg.data);
                if (RescueEyeApp.audioEnabled) playEmergencyTone();
            }
        };
    } catch (e) {}
}

function renderVictimsTable(victims) {
    const list = victims || [];
    const tbody = document.getElementById('victimsTableBody');
    const header = document.getElementById('victimCountHeader');
    if (header) header.textContent = list.length;
    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">No victims detected.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(v => victimRowHtml(v)).join('');
}

function addVictimRow(victim) {
    const tbody = document.getElementById('victimsTableBody');
    const header = document.getElementById('victimCountHeader');
    if (header) header.textContent = parseInt(header.textContent || 0, 10) + 1;
    if (tbody) {
        if (tbody.innerHTML.includes('No victims detected')) tbody.innerHTML = '';
        tbody.insertAdjacentHTML('afterbegin', victimRowHtml(victim));
    }
}

function victimRowHtml(v) {
    return `<tr id="v_row_${v.id}">
        <td>${new Date(v.timestamp).toLocaleTimeString()}</td>
        <td>${Number(v.lat).toFixed(4)}, ${Number(v.lng).toFixed(4)}</td>
        <td id="v_status_${v.id}"><span class="badge ${v.status === 'DETECTED' ? 'badge-danger' : 'badge-primary'}">${v.status}</span></td>
        <td>
            ${v.status === 'DETECTED' ? `<button class="btn btn-xs btn-primary" onclick="assignRescueTeam('${v.id}')">Dispatch Team</button>` : '<span class="text-success">Dispatched</span>'}
        </td>
    </tr>`;
}

function renderMissionsTable(missions) {
    const tbody = document.getElementById('missionsTableBody');
    if (!tbody) return;
    const header = document.getElementById('missionCountHeader');
    if (header) header.textContent = missions.length;
    if (missions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center">No active missions.</td></tr>';
        return;
    }
    tbody.innerHTML = missions.map(m => missionRowHtml(m)).join('');
}

function updateMissionRow(mission) {
    const tbody = document.getElementById('missionsTableBody');
    const header = document.getElementById('missionCountHeader');
    if (tbody) {
        if (tbody.innerHTML.includes('No active missions')) {
            tbody.innerHTML = '';
            if (header) header.textContent = '1';
        } else {
            if (header) header.textContent = parseInt(header.textContent || 0, 10) + 1;
        }
        tbody.insertAdjacentHTML('afterbegin', missionRowHtml(mission));
    }
}

function missionRowHtml(m) {
    return `<tr>
        <td><strong>${m.team}</strong></td>
        <td class="text-warning">${m.eta} mins</td>
        <td><span class="badge badge-warning">${m.status}</span></td>
    </tr>`;
}

function updateVictimStatus(v) {
    const td = document.getElementById(`v_status_${v.id}`);
    if (td) td.innerHTML = `<span class="badge badge-primary">${v.status}</span>`;
    const btn = document.querySelector(`#v_row_${v.id} button`);
    if (btn) btn.outerHTML = '<span class="text-success">Dispatched</span>';
}

window.assignRescueTeam = async function(victimId) {
    try {
        const res = await fetch('/api/missions/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ victimId })
        });
        if (!res.ok) alert('No rescue teams available for dispatch.');
    } catch (e) {
        console.error(e);
    }
};

function renderAlerts(alerts) {
    const list = alerts || [];
    const alertsContainer = document.getElementById('alertsList');
    if (alertsContainer && list.length > 0) {
        alertsContainer.innerHTML = list.map(a => `<div style="margin-bottom:8px; border-bottom: 1px solid #334155; padding-bottom: 5px;">🚨 <strong>${new Date(a.timestamp || Date.now()).toLocaleTimeString()}</strong><br>${a.message}</div>`).join('');
    }
}

function addAlert(alertObj) {
    const list = document.getElementById('alertsList');
    const badge = document.getElementById('alertCountBadge');
    if (list) {
        if (list.innerHTML.includes('No alerts')) list.innerHTML = '';
        list.insertAdjacentHTML('afterbegin', `<div style="margin-bottom:8px; border-bottom: 1px solid #334155; padding-bottom: 5px;">🚨 <strong>${new Date().toLocaleTimeString()}</strong><br>${alertObj.message}</div>`);
    }
    if (badge) {
        badge.textContent = parseInt(badge.textContent || 0, 10) + 1;
    }
}

// Chart.js Analytics
let riskChart, rescueChart;
function initAnalyticsCharts() {
    const el1 = document.getElementById('riskHistoryChart');
    if (el1) {
        const ctx1 = el1.getContext('2d');
        riskChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: ['1h ago', '45m', '30m', '15m', 'Now'],
                datasets: [{
                    label: 'Flood Risk Index (%)',
                    data: [25, 38, 54, 68, 78],
                    borderColor: '#00F0FF',
                    backgroundColor: 'rgba(0, 240, 255, 0.1)',
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                    y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
                }
            }
        });
    }

    const el2 = document.getElementById('rescueStatsChart');
    if (el2) {
        const ctx2 = el2.getContext('2d');
        rescueChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Detected', 'Dispatched', 'Secured'],
                datasets: [{
                    label: 'Victim Status Count',
                    data: [1, 1, 0],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
                    y: { ticks: { color: '#64748b', stepSize: 1 }, grid: { color: '#1e293b' } }
                }
            }
        });
    }
}

function updateRiskChartData() {
    if (!rescueChart) return;
    rescueChart.data.datasets[0].data[0] += 1;
    rescueChart.update();
}

// ============================================================================
// 8. HIGH-FIDELITY DRONE COMPUTER VISION & RECON SIMULATION
// ============================================================================
async function warmupCocoModel() {
    if (window.cocoSsd) {
        try {
            RescueEyeApp.cocoModel = await cocoSsd.load();
        } catch (e) {}
    }
}

function initDroneReconnaissance() {
    const video = document.getElementById('djiVideoFeed');
    const canvas = document.getElementById('cvDetectionCanvas');
    const overlay = document.getElementById('djiConnectionOverlay');
    const btnConnectUsb = document.getElementById('btnConnectUsb');
    const btnConnectStream = document.getElementById('btnConnectStream');

    if (!video || !canvas) return;

    // Option A: Hardware / Webcam
    btnConnectUsb?.addEventListener('click', async () => {
        try {
            btnConnectUsb.textContent = 'Connecting...';
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
            video.style.display = 'block';
            if (overlay) overlay.style.display = 'none';
            RescueEyeApp.droneSimActive = false;

            video.onplay = () => {
                canvas.width = video.clientWidth || 640;
                canvas.height = video.clientHeight || 360;
                updateDroneTelemetry('ACTIVE HARDWARE FEED', 18);
                runWebcamDetectionLoop(video, canvas);
            };
        } catch (err) {
            alert('Hardware/Webcam access not available. Launching simulation mode instead.');
            btnConnectUsb.textContent = 'Connect Hardware';
            startDroneSimulationFeed();
        }
    });

    // Option B: High-Fidelity Simulation Feed
    btnConnectStream?.addEventListener('click', () => {
        startDroneSimulationFeed();
    });
}

function startDroneSimulationFeed() {
    const video = document.getElementById('djiVideoFeed');
    const canvas = document.getElementById('cvDetectionCanvas');
    const overlay = document.getElementById('djiConnectionOverlay');

    if (overlay) overlay.style.display = 'none';
    if (video) video.style.display = 'none';

    // Set canvas dimensions
    canvas.width = canvas.parentElement.clientWidth || 640;
    canvas.height = 320;
    RescueEyeApp.droneSimActive = true;

    updateDroneTelemetry('SEARCH RECON PATROL', 14);
    runDroneCanvasSimulation(canvas);
}

function updateDroneTelemetry(status, speed) {
    const statusText = document.getElementById('droneStatusText');
    const telemetrySpeed = document.getElementById('telemetrySpeed');
    const telemetryAlt = document.getElementById('telemetryAlt');
    const telemetryGps = document.getElementById('telemetryGps');

    if (statusText) {
        statusText.textContent = status;
        statusText.style.color = '#10b981';
    }
    if (telemetrySpeed) telemetrySpeed.textContent = `${speed} m/s`;
    if (telemetryAlt) telemetryAlt.textContent = '120 m AGL';

    if (telemetryGps && !window._gpsJitterInterval) {
        window._gpsJitterInterval = setInterval(() => {
            const lat = (RescueEyeApp.currentLocation.lat + (Math.random() * 0.0004 - 0.0002)).toFixed(4);
            const lng = (RescueEyeApp.currentLocation.lng + (Math.random() * 0.0004 - 0.0002)).toFixed(4);
            telemetryGps.textContent = `${lat}° N, ${lng}° E`;
        }, 2000);
    }
}

function runDroneCanvasSimulation(canvas) {
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let victimReported = false;

    function draw() {
        if (!RescueEyeApp.droneSimActive) return;
        frame++;

        const w = canvas.width;
        const h = canvas.height;

        // 1. Draw River & Flood Background with flowing current
        const waterGrad = ctx.createLinearGradient(0, 0, 0, h);
        waterGrad.addColorStop(0, '#1a365d');
        waterGrad.addColorStop(0.5, '#2b4c7e');
        waterGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, 0, w, h);

        // Water current wave ripples
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            const yOffset = (i * 55 + (frame * 1.5) % 60);
            ctx.moveTo(0, yOffset);
            ctx.bezierCurveTo(w * 0.3, yOffset + Math.sin(frame * 0.05 + i) * 15, w * 0.7, yOffset - Math.cos(frame * 0.05 + i) * 15, w, yOffset);
            ctx.stroke();
        }

        // Submerged Building / Rooftop
        const roofX = w * 0.28;
        const roofY = h * 0.35;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(roofX, roofY, 110, 80);
        ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(roofX, roofY, 110, 80);

        // 2. Stranded Civilian on Rooftop (Target 1: PERSON)
        const pX = roofX + 45;
        const pY = roofY + 30;
        // Draw person avatar
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(pX, pY - 8, 6, 0, Math.PI * 2); // head
        ctx.fill();
        ctx.fillRect(pX - 4, pY - 2, 8, 14); // body
        // Waving arm
        ctx.beginPath();
        ctx.moveTo(pX + 4, pY);
        ctx.lineTo(pX + 12, pY - 6 + Math.sin(frame * 0.2) * 4);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();

        // AI Bounding Box for PERSON
        const boxPx = pX - 16;
        const boxPy = pY - 20;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxPx, boxPy, 36, 42);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(boxPx, boxPy - 14, 86, 14);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('PERSON 94%', boxPx + 3, boxPy - 3);

        // 3. Rescue Raft navigating (Target 2: BOAT)
        const boatX = w * 0.65 + Math.sin(frame * 0.02) * 20;
        const boatY = h * 0.55 + Math.cos(frame * 0.02) * 10;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(boatX, boatY, 28, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // AI Bounding Box for BOAT
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(boatX - 34, boatY - 20, 68, 40);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(boatX - 34, boatY - 34, 72, 14);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('BOAT 92%', boatX - 31, boatY - 23);

        // 4. Submerged Vehicle (Target 3: VEHICLE)
        const vX = w * 0.12;
        const vY = h * 0.72;
        ctx.fillStyle = '#334155';
        ctx.fillRect(vX, vY, 44, 24);
        // Hazard flasher
        if (Math.floor(frame / 15) % 2 === 0) {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(vX + 2, vY + 2, 4, 4);
            ctx.fillRect(vX + 38, vY + 2, 4, 4);
        }

        // AI Bounding Box for VEHICLE
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(vX - 6, vY - 8, 56, 40);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(vX - 6, vY - 22, 84, 14);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('VEHICLE 89%', vX - 3, vY - 11);

        // 5. Tactical HUD Overlay (Reticle, artificial horizon, laser scan)
        const cX = w / 2;
        const cY = h / 2;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;

        // Center crosshair
        ctx.beginPath();
        ctx.moveTo(cX - 30, cY); ctx.lineTo(cX - 10, cY);
        ctx.moveTo(cX + 10, cY); ctx.lineTo(cX + 30, cY);
        ctx.moveTo(cX, cY - 30); ctx.lineTo(cX, cY - 10);
        ctx.moveTo(cX, cY + 10); ctx.lineTo(cX, cY + 30);
        ctx.stroke();

        // Laser scan line sweep
        const scanY = (frame * 2.5) % h;
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();

        // HUD Text Top/Bottom
        ctx.fillStyle = '#00F0FF';
        ctx.font = '10px monospace';
        ctx.fillText('RECON-AI // 4K 60FPS // IR THERMAL ON', 12, 18);
        ctx.fillText(`ALT: 120m | BATT: 88% | FOV: 84°`, w - 210, 18);

        // Dynamic Counters update in UI
        document.getElementById('cvCountPeople').textContent = '1';
        document.getElementById('cvCountVehicles').textContent = '1';
        document.getElementById('cvCountBoats').textContent = '1';

        // Broadcast simulation frame to Admin CCTV Wall
        if (frame % 10 === 0) {
            broadcastUserFrameToServer(canvas, 1, 1, 1, [
                { class: 'person', score: 0.94, bbox: [pX - 16, pY - 20, 36, 42] },
                { class: 'boat', score: 0.92, bbox: [boatX - 34, boatY - 20, 68, 40] },
                { class: 'vehicle', score: 0.89, bbox: [vX - 6, vY - 8, 56, 40] }
            ], true);
        }

        // Automatic verified victim dispatch trigger
        if (!victimReported && frame > 45) {
            victimReported = true;
            if (RescueEyeApp.audioEnabled) playEmergencyTone();
            fetch('/api/victims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: RescueEyeApp.currentLocation.lat - 0.0005,
                    lng: RescueEyeApp.currentLocation.lng - 0.0008,
                    confidence: 94
                })
            }).catch(() => {});
        }

        RescueEyeApp.droneSimAnimId = requestAnimationFrame(draw);
    }

    draw();
}

// Global CCTV Broadcast Buffers
let lastBroadcastTimestamp = 0;
const broadcastOffscreenCanvas = document.createElement('canvas');
broadcastOffscreenCanvas.width = 480;
broadcastOffscreenCanvas.height = 270;
const bCtx = broadcastOffscreenCanvas.getContext('2d');

function broadcastUserFrameToServer(sourceElement, pCount, vCount, bCount, detections = [], isCanvas = false) {
    const now = Date.now();
    if (now - lastBroadcastTimestamp < 320) return; // ~3 frames/sec live network throttle
    lastBroadcastTimestamp = now;

    try {
        bCtx.clearRect(0, 0, 480, 270);
        if (isCanvas) {
            bCtx.drawImage(sourceElement, 0, 0, 480, 270);
        } else {
            bCtx.drawImage(sourceElement, 0, 0, 480, 270);
            const vW = sourceElement.videoWidth || 640;
            const vH = sourceElement.videoHeight || 480;

            detections.forEach(d => {
                const [x, y, w, h] = d.bbox || [0, 0, 0, 0];
                const sx = (x / vW) * 480;
                const sy = (y / vH) * 270;
                const sw = (w / vW) * 480;
                const sh = (h / vH) * 270;

                const color = d.class === 'person' ? '#ef4444' : d.class === 'boat' ? '#00f0ff' : '#f59e0b';
                bCtx.strokeStyle = color;
                bCtx.lineWidth = 2.5;
                bCtx.strokeRect(sx, sy, sw, sh);

                const label = `${(d.class || 'OBJECT').toUpperCase()} ${Math.round((d.score || 0.85) * 100)}%`;
                bCtx.fillStyle = color;
                bCtx.fillRect(sx, Math.max(0, sy - 14), bCtx.measureText(label).width + 6, 14);
                bCtx.fillStyle = '#000000';
                bCtx.font = 'bold 9px monospace';
                bCtx.fillText(label, sx + 3, Math.max(10, sy - 3));
            });
        }

        // Tactical CCTV Stream Banner in offscreen canvas
        bCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        bCtx.fillRect(0, 0, 480, 18);
        bCtx.fillStyle = '#00F0FF';
        bCtx.font = 'bold 9px monospace';
        bCtx.fillText('● RE-01 USER RECON CAM // LIVE BROADCAST', 10, 12);
        bCtx.fillStyle = '#10b981';
        bCtx.fillText(new Date().toLocaleTimeString(), 415, 12);

        const frameData = broadcastOffscreenCanvas.toDataURL('image/jpeg', 0.55);

        fetch('/api/feed/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                feedId: 'FEED-USER-01',
                droneId: 'RE-01',
                title: 'User Field Camera // Drone RE-01 (Live Feed)',
                frame: frameData,
                personCount: pCount,
                vehicleCount: vCount,
                boatCount: bCount,
                detections: detections.map(d => ({ class: d.class, score: d.score, bbox: d.bbox })),
                location: RescueEyeApp.currentLocation || { name: 'Kopargaon, Sector B', lat: 19.8824, lng: 74.4761 },
                telemetry: {
                    alt: '120 m AGL',
                    speed: '18 m/s',
                    heading: '045° NE',
                    gps: `${(RescueEyeApp.currentLocation?.lat || 19.8824).toFixed(4)}° N, ${(RescueEyeApp.currentLocation?.lng || 74.4761).toFixed(4)}° E`,
                    battery: '88%'
                },
                status: isCanvas ? 'SIMULATED SEARCH RECON' : 'ACTIVE HARDWARE FEED'
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.feed) {
                renderUserRescueResponseStatus(data.feed, data.approach);
            }
        })
        .catch(() => {});
    } catch (err) {}
}

function renderUserRescueResponseStatus(feed, approach) {
    const box = document.getElementById('userRescueDispatchBox');
    const badge = document.getElementById('userLivePersonBadge');
    const notice = document.getElementById('userDispatchNotice');
    if (!box || !badge || !notice) return;

    badge.textContent = `${feed.personCount || 0} Persons Monitored`;
    badge.style.color = (feed.personCount || 0) >= 2 ? '#ef4444' : (feed.personCount || 0) === 1 ? '#f59e0b' : '#10b981';

    if (feed.assignedTeam) {
        box.style.borderColor = '#10b981';
        box.style.background = 'rgba(16, 185, 129, 0.12)';
        notice.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <span style="color: #10b981; font-weight: bold; font-size: 13px;">
                    🚀 RESCUE DISPATCHED: ${feed.assignedTeam.name}
                </span>
                <span style="background: #10b981; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 13px;">
                    ETA: ${approach ? approach.etaDisplay : 'Approaching'}
                </span>
            </div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 5px;">
                Approaching from <strong>${feed.assignedTeam.baseName || 'Command Depot'}</strong> (${approach ? approach.distanceKm : 3.8} km away) at ${approach ? approach.speedKmH : 36} km/h.
            </div>
        `;
    } else {
        box.style.borderColor = '#334155';
        box.style.background = 'rgba(15, 23, 42, 0.9)';
        const rec = feed.recommendedTeam || { name: 'NDRF Motorboat Team Bravo', type: 'Tactical Unit' };
        notice.innerHTML = `
            <div style="color: #38bdf8; font-weight: 500;">
                ⚡ AI Recommended Force: <strong>${rec.name}</strong>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">
                ${feed.personCount || 0} victim(s) identified in inundation zone. Live telemetry streaming to Admin CCTV. Awaiting command dispatch.
            </div>
        `;
    }
}

async function runWebcamDetectionLoop(video, canvas) {
    if (video.paused || video.ended) {
        requestAnimationFrame(() => runWebcamDetectionLoop(video, canvas));
        return;
    }

    if (!RescueEyeApp.cocoModel) {
        // Stream frame even while COCO-SSD is warming up
        broadcastUserFrameToServer(video, 0, 0, 0, [], false);
        requestAnimationFrame(() => runWebcamDetectionLoop(video, canvas));
        return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
        const predictions = await RescueEyeApp.cocoModel.detect(video);
        let pCount = 0, vCount = 0, bCount = 0;

        predictions.forEach(d => {
            if (d.class === 'person') pCount++;
            else if (['car', 'truck', 'bus'].includes(d.class)) vCount++;
            else if (d.class === 'boat') bCount++;

            const [x, y, w, h] = d.bbox;
            const scaleX = canvas.width / (video.videoWidth || 640);
            const scaleY = canvas.height / (video.videoHeight || 480);

            const sx = x * scaleX;
            const sy = y * scaleY;
            const sw = w * scaleX;
            const sh = h * scaleY;

            const color = d.class === 'person' ? '#ef4444' : d.class === 'boat' ? '#00f0ff' : '#f59e0b';
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(sx, sy, sw, sh);

            const label = `${d.class.toUpperCase()} ${(d.score * 100).toFixed(0)}%`;
            ctx.fillStyle = color;
            ctx.fillRect(sx, sy - 16, ctx.measureText(label).width + 8, 16);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(label, sx + 4, sy - 4);
        });

        document.getElementById('cvCountPeople').textContent = pCount;
        document.getElementById('cvCountVehicles').textContent = vCount;
        document.getElementById('cvCountBoats').textContent = bCount;

        // Broadcast to Admin CCTV Wall in real time
        broadcastUserFrameToServer(video, pCount, vCount, bCount, predictions, false);
    } catch (e) {}

    requestAnimationFrame(() => runWebcamDetectionLoop(video, canvas));
}

// ============================================================================
// 9. CRISIS SCENARIO DEMO (START DEMO)
// ============================================================================
async function runCrisisScenarioDemo() {
    const demoBasin = {
        name: 'Guwahati, Brahmaputra Catchment (Critical Alert)',
        lat: 26.1445,
        lng: 91.7362,
        elevation: 54
    };

    RescueEyeApp.currentLocation = demoBasin;
    const input = document.getElementById('locationSearchInput');
    if (input) input.value = demoBasin.name;
    updateSelectedLocationCard();

    // Execute risk analysis
    await executeFloodRiskAnalysis();

    // Open Incident Command
    const incSection = document.getElementById('incidentCommandSection');
    if (incSection) {
        incSection.style.display = 'block';
        incSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Auto-open Drone modal in recon mode
    setTimeout(() => {
        document.getElementById('btnOpenDroneLab')?.click();
        setTimeout(() => {
            startDroneSimulationFeed();
        }, 300);
    }, 1800);
}

// ============================================================================
// 10. MODALS, DRAWERS & EXPORT
// ============================================================================
function initDrawersAndModals() {
    // Prediction History
    document.getElementById('btnOpenHistory')?.addEventListener('click', async () => {
        const modal = document.getElementById('historyModal');
        const tbody = document.getElementById('historyTableBody');
        try {
            const res = await fetch('/api/flood/history');
            const list = await res.json();
            if (tbody) {
                if (list.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No historical predictions recorded yet.</td></tr>';
                } else {
                    tbody.innerHTML = list.map(item => `
                        <tr>
                            <td><code>${new Date(item.timestamp).toLocaleTimeString()}</code></td>
                            <td><strong>${item.location}</strong></td>
                            <td><strong class="text-danger">${item.probability}%</strong></td>
                            <td><span class="badge ${item.riskLevel === 'EXTREME' ? 'badge-ext' : 'badge-danger'}">${item.riskLevel}</span></td>
                            <td>${item.estimatedArrivalTime}</td>
                            <td>${item.confidence}%</td>
                            <td>
                                <button class="btn btn-xs btn-primary" onclick="reAnalyzeCoordinates(${item.latitude}, ${item.longitude}, '${item.location}')">Re-Analyze</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
            modal?.classList.remove('hidden');
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    });

    document.getElementById('btnCloseHistoryModal')?.addEventListener('click', () => {
        document.getElementById('historyModal')?.classList.add('hidden');
    });

    // Drone Modal
    document.getElementById('btnOpenDroneLab')?.addEventListener('click', () => {
        document.getElementById('droneModal')?.classList.remove('hidden');
        initDroneReconnaissance();
    });
    document.getElementById('btnCloseDroneModal')?.addEventListener('click', () => {
        document.getElementById('droneModal')?.classList.add('hidden');
        RescueEyeApp.droneSimActive = false;
        if (RescueEyeApp.droneSimAnimId) cancelAnimationFrame(RescueEyeApp.droneSimAnimId);
    });

    // Model Governance
    document.getElementById('btnOpenModelGovernance')?.addEventListener('click', async () => {
        const modal = document.getElementById('governanceModal');
        try {
            const res = await fetch('/api/flood/model-status');
            const metrics = await res.json();
            if (metrics.validationMetrics) {
                const elAcc = document.getElementById('govAccuracy'); if (elAcc) elAcc.textContent = metrics.validationMetrics.accuracy + '%';
                const elP = document.getElementById('govPrecision'); if (elP) elP.textContent = metrics.validationMetrics.precision + '%';
                const elR = document.getElementById('govRecall'); if (elR) elR.textContent = metrics.validationMetrics.recall + '%';
                const elA = document.getElementById('govRocAuc'); if (elA) elA.textContent = metrics.validationMetrics.rocAuc;
            }
            if (metrics.confusionMatrix) {
                const elTN = document.getElementById('govTn'); if (elTN) elTN.textContent = metrics.confusionMatrix.trueNegatives.toLocaleString();
                const elFP = document.getElementById('govFp'); if (elFP) elFP.textContent = metrics.confusionMatrix.falsePositives.toLocaleString();
                const elFN = document.getElementById('govFn'); if (elFN) elFN.textContent = metrics.confusionMatrix.falseNegatives.toLocaleString();
                const elTP = document.getElementById('govTp'); if (elTP) elTP.textContent = metrics.confusionMatrix.truePositives.toLocaleString();
            }
        } catch (e) {
            console.error('Failed to load governance metrics:', e);
        }
        modal?.classList.remove('hidden');
    });
    document.getElementById('btnCloseGovernanceModal')?.addEventListener('click', () => {
        document.getElementById('governanceModal')?.classList.add('hidden');
    });

    // Situational Report
    document.getElementById('btnExportReport')?.addEventListener('click', openReportModal);
    document.getElementById('btnCloseReportModal')?.addEventListener('click', () => {
        document.getElementById('reportModal')?.classList.add('hidden');
    });
    document.getElementById('btnPrintReport')?.addEventListener('click', () => window.print());
    document.getElementById('btnDownloadReportTxt')?.addEventListener('click', downloadReportTxt);

    // Emergency Citizen SOS Beacon
    let sosCountdownTimer = null;
    document.getElementById('btnEmergencySos')?.addEventListener('click', () => {
        const modal = document.getElementById('sosModal');
        const gpsEl = document.getElementById('sosGpsCoords');
        const sectorEl = document.getElementById('sosSectorName');
        const lat = RescueEyeApp.currentLocation?.lat || 19.8824;
        const lng = RescueEyeApp.currentLocation?.lng || 74.4761;
        const secName = RescueEyeApp.currentLocation?.name || 'Kopargaon Basin';

        if (gpsEl) gpsEl.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
        if (sectorEl) sectorEl.textContent = secName;

        modal?.classList.remove('hidden');
    });

    document.getElementById('btnCloseSosModal')?.addEventListener('click', () => {
        document.getElementById('sosModal')?.classList.add('hidden');
    });

    document.getElementById('btnTransmitSosNow')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnTransmitSosNow');
        const personCount = parseInt(document.getElementById('sosPersonCountInput')?.value || '1', 10);
        const medical = document.getElementById('sosMedicalCheckbox')?.checked || false;
        const lat = RescueEyeApp.currentLocation?.lat || 19.8824;
        const lng = RescueEyeApp.currentLocation?.lng || 74.4761;
        const locationName = RescueEyeApp.currentLocation?.name || 'Kopargaon Basin';

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'TRANSMITTING BEACON...';
        }

        try {
            const res = await fetch('/api/sos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    persons: personCount,
                    lat: lat,
                    lng: lng,
                    locationName: locationName,
                    medical: medical,
                    details: `${personCount} citizen(s) stranded. ${medical ? 'CRITICAL: Medical assistance required.' : 'Immediate extraction requested.'}`
                })
            });
            const data = await res.json();
            if (data && data.success) {
                if (RescueEyeApp.audioEnabled) playEmergencyTone();
                document.getElementById('sosPreTriggerForm')?.classList.add('hidden');
                const card = document.getElementById('sosActiveResponseCard');
                if (card) card.classList.remove('hidden');

                const unitEl = document.getElementById('sosDispatchedUnit');
                if (unitEl) unitEl.textContent = data.assignedTeam?.name || 'Tactical Watercraft Unit';

                const trackEl = document.getElementById('sosTrackingId');
                if (trackEl) trackEl.textContent = data.sosId;

                let remainingSec = 400;
                const countdownEl = document.getElementById('sosCountdownEta');
                if (sosCountdownTimer) clearInterval(sosCountdownTimer);
                sosCountdownTimer = setInterval(() => {
                    remainingSec = Math.max(0, remainingSec - 1);
                    const m = Math.floor(remainingSec / 60);
                    const s = remainingSec % 60;
                    if (countdownEl) {
                        countdownEl.textContent = remainingSec === 0 ? 'ARRIVED ON SITE' : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
                    }
                    if (remainingSec === 0) clearInterval(sosCountdownTimer);
                }, 1000);
            } else {
                alert('Distress beacon transmission failed. Please retry or call emergency services.');
            }
        } catch (err) {
            alert('Network error transmitting SOS beacon: ' + err.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = '📡 TRANSMIT DISTRESS BEACON NOW';
            }
        }
    });

    document.getElementById('btnCancelSos')?.addEventListener('click', () => {
        if (sosCountdownTimer) clearInterval(sosCountdownTimer);
        document.getElementById('sosActiveResponseCard')?.classList.add('hidden');
        document.getElementById('sosPreTriggerForm')?.classList.remove('hidden');
        document.getElementById('sosModal')?.classList.add('hidden');
    });

    // Audio Siren Toggle
    document.getElementById('btnAudioToggle')?.addEventListener('click', () => {
        RescueEyeApp.audioEnabled = !RescueEyeApp.audioEnabled;
        const statusText = document.getElementById('audioStatusText');
        if (statusText) statusText.textContent = RescueEyeApp.audioEnabled ? '🔊 Alerts: ON' : '🔇 Alerts: MUTED';
        if (RescueEyeApp.audioEnabled) playEmergencyTone();
    });
}

window.reAnalyzeCoordinates = function(lat, lng, name) {
    RescueEyeApp.currentLocation = { name, lat, lng, elevation: 504 };
    const input = document.getElementById('locationSearchInput');
    if (input) input.value = name;
    updateSelectedLocationCard();
    document.getElementById('historyModal')?.classList.add('hidden');
    executeFloodRiskAnalysis();
};

function playEmergencyTone() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
    } catch (e) {}
}

function openReportModal() {
    const data = RescueEyeApp.activePrediction;
    if (!data) {
        alert('Please run a flood risk analysis first to generate a report.');
        return;
    }

    const modal = document.getElementById('reportModal');
    const area = document.getElementById('reportModalBody');
    if (!modal || !area) return;

    area.innerHTML = `
        <div class="report-print-container" style="font-family: sans-serif; color: #f8fafc;">
            <div style="border-bottom: 2px solid #00F0FF; padding-bottom: 12px; margin-bottom: 16px;">
                <h2 style="color: #00F0FF; margin: 0 0 6px;">RESCUE EYE | DISASTER SITUATION REPORT</h2>
                <div style="font-size: 12px; color: #94a3b8;">Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST | Sector: ${data.location.name}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                    <small style="color: #94a3b8; font-size: 11px;">FLOOD PROBABILITY</small>
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${data.probability}%</div>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                    <small style="color: #94a3b8; font-size: 11px;">RISK LEVEL</small>
                    <div style="font-size: 18px; font-weight: bold; color: #f59e0b;">${data.riskLevel}</div>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                    <small style="color: #94a3b8; font-size: 11px;">ARRIVAL TIME</small>
                    <div style="font-size: 16px; font-weight: bold; color: #38bdf8;">${data.estimatedArrivalTime}</div>
                </div>
                <div style="background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;">
                    <small style="color: #94a3b8; font-size: 11px;">MODEL CONFIDENCE</small>
                    <div style="font-size: 24px; font-weight: bold; color: #10b981;">${data.confidence}%</div>
                </div>
            </div>

            <h4 style="color: #38bdf8; margin: 12px 0 6px;">METEOROLOGY & BASIN HYDROLOGY</h4>
            <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 16px;">
                <tr><td style="padding: 6px; border-bottom: 1px solid #334155; color: #94a3b8;">24h Rainfall:</td><td style="padding: 6px; border-bottom: 1px solid #334155;">${data.weather.r24h} mm</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #334155; color: #94a3b8;">Forecast Rainfall:</td><td style="padding: 6px; border-bottom: 1px solid #334155;">${data.weather.forecastRain} mm (${data.forecastPeriodHours}h window)</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #334155; color: #94a3b8;">River Stage:</td><td style="padding: 6px; border-bottom: 1px solid #334155;">${data.river.currentStage}m (Danger: ${data.river.dangerMark}m)</td></tr>
                <tr><td style="padding: 6px; border-bottom: 1px solid #334155; color: #94a3b8;">Catchment Elevation:</td><td style="padding: 6px; border-bottom: 1px solid #334155;">${data.location.elevationMeters}m AGL</td></tr>
            </table>

            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 10px 14px; font-size: 12px; color: #cbd5e1;">
                <strong>Decision Support Advisory:</strong> Algorithmic AI estimation. Comply with local disaster management directives (NDMA/IMD/CWC).
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function downloadReportTxt() {
    const data = RescueEyeApp.activePrediction;
    if (!data) return;

    const txt = `=======================================================
RESCUE EYE: UNIFIED FLOOD PREDICTION BRIEFING
=======================================================
Location: ${data.location.name}
Coordinates: [${data.location.latitude}, ${data.location.longitude}]
Elevation: ${data.location.elevationMeters}m AGL
Timestamp: ${data.timestamp}

FLOOD PROBABILITY: ${data.probability}%
RISK LEVEL: ${data.riskLevel}
ESTIMATED ARRIVAL TIME: ${data.estimatedArrivalTime}
PREDICTED AFFECTED AREA: ${data.predictedExtent.affectedAreaKm2} km²
CONFIDENCE: ${data.confidence}%
WARNING DIRECTIVE: ${data.warningStatus}

METEOROLOGICAL INGESTION:
- 24h Rainfall: ${data.weather.r24h} mm
- Forecast Rainfall (${data.forecastPeriodHours}h): ${data.weather.forecastRain} mm
- River Gauge: ${data.river.currentStage}m (Danger Mark: ${data.river.dangerMark}m)
- River Station: ${data.river.stationName}

SCIENTIFIC HONESTY DISCLAIMER:
Prediction is an AI-assisted estimate and should not replace
official disaster-management warnings from IMD / CWC / NDMA authorities.
=======================================================`;

    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RescueEye_Forecast_${data.id}.txt`;
    a.click();
}
