/* ============================================
   TIERS-LIEUX WHACK-A-MOLE — GAME LOGIC v2
   Real tiers-lieux data from national census
   ============================================ */

// ---- Audio ----
let audioCtx = null;
function playPop() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
}

// ---- Game Duration ----
const GAME_DURATION = 120; // 2 minutes

// ---- Regional Networks (colors & branding) ----
const NETWORKS = {
    'region-auvergne-rhone-alpes': {
        name: 'RELIEF', region: 'Auvergne-Rhône-Alpes',
        primary: '#6366F1', secondary: '#FF9F5D', accent: '#FFD700'
    },
    'region-bourgogne-franche-comte': {
        name: 'Tiers-Lieux BFC', region: 'Bourgogne-Franche-Comté',
        primary: '#d35515', secondary: '#2c3e50', accent: '#d35515'
    },
    'region-bretagne': {
        name: 'Bretagne Tiers-Lieux', region: 'Bretagne',
        primary: '#005C47', secondary: '#F05A28', accent: '#005C47'
    },
    'region-centre-val-de-loire': {
        name: 'Ambition Tiers-Lieux', region: 'Centre-Val de Loire',
        primary: '#30B6F4', secondary: '#4DB748', accent: '#FFCC00'
    },
    'region-corse': {
        name: 'Dà Locu', region: 'Corse',
        primary: '#e94c66', secondary: '#1d2d2a', accent: '#f4be19'
    },
    'region-grand-est': {
        name: 'Tiers-Lieux Grand Est', region: 'Grand Est',
        primary: '#FFD100', secondary: '#333333', accent: '#E86D8B'
    },
    'region-hauts-de-france': {
        name: 'La Compagnie des Tiers-Lieux', region: 'Hauts-de-France',
        primary: '#F9D71C', secondary: '#333333', accent: '#F9D71C'
    },
    'region-ile-de-france': {
        name: 'IDF Tiers-Lieux', region: 'Île-de-France',
        primary: '#f5a216', secondary: '#222320', accent: '#f5a216'
    },
    'region-normandie': {
        name: 'TILINO', region: 'Normandie',
        primary: '#1abc9c', secondary: '#222222', accent: '#1abc9c'
    },
    'region-nouvelle-aquitaine': {
        name: 'La Coopérative Tiers-Lieux', region: 'Nouvelle-Aquitaine',
        primary: '#00aca9', secondary: '#fef84c', accent: '#0274be'
    },
    'region-occitanie': {
        name: 'La Rosêe', region: 'Occitanie',
        primary: '#FFD200', secondary: '#8CBF7F', accent: '#E94E1B'
    },
    'region-pays-de-la-loire': {
        name: 'Cap Tiers-Lieux', region: 'Pays de la Loire',
        primary: '#1d242e', secondary: '#00a99d', accent: '#f7941d'
    },
    'region-provence-alpes-cote-d-azur': {
        name: 'SUD Tiers-Lieux', region: 'Provence-Alpes-Côte d\'Azur',
        primary: '#ebb400', secondary: '#4080a0', accent: '#e66b6b'
    },
    'region-guadeloupe': {
        name: 'Lakou Gwadloup', region: 'Guadeloupe',
        primary: '#018A2D', secondary: '#FCDF02', accent: '#018A2D'
    },
    'region-guyane': {
        name: 'CRESS Guyane', region: 'Guyane',
        primary: '#00407d', secondary: '#009fe3', accent: '#009fe3'
    },
    'region-martinique': {
        name: 'Martinique', region: 'Martinique',
        primary: '#2196F3', secondary: '#FF9800', accent: '#2196F3'
    },
    'region-reunion': {
        name: 'La Réunion', region: 'La Réunion',
        primary: '#9C27B0', secondary: '#FFC107', accent: '#9C27B0'
    },
    'region-mayotte': {
        name: 'Mayotte', region: 'Mayotte',
        primary: '#E91E63', secondary: '#CDDC39', accent: '#E91E63'
    }
};

// ---- Build per-region index of tiers-lieux ----
const LIEUX_BY_REGION = {};
if (typeof TIERS_LIEUX !== 'undefined') {
    TIERS_LIEUX.forEach((lieu, idx) => {
        if (!LIEUX_BY_REGION[lieu.r]) LIEUX_BY_REGION[lieu.r] = [];
        LIEUX_BY_REGION[lieu.r].push(idx);
    });
}

// ---- Game State ----
const gameState = {
    score: 0, timeLeft: GAME_DURATION, isRunning: false,
    activeHouses: [], timerInterval: null, spawnTimeout: null,
    housesClicked: 0, housesMissed: 0,
    usedLieux: new Set() // track which lieux have appeared to avoid repeats
};

// ---- DOM Refs ----
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const networkNameEl = document.getElementById('network-name');
const finalScoreEl = document.getElementById('final-score');
const housesLayer = document.getElementById('houses-layer');
const particlesLayer = document.getElementById('particles-layer');
const mapContainer = document.getElementById('map-container');

// ---- Screens ----
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ---- House SVG ----
function createHouseSVG(primary, secondary) {
    let roof = secondary;
    if (secondary === '#FFFFFF' || secondary === '#ffffff') roof = primary;
    return `<svg viewBox="0 0 44 48" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="46" rx="15" ry="2.5" fill="rgba(0,0,0,0.1)"/>
        <rect x="8" y="23" width="28" height="21" rx="2.5" fill="${primary}"/>
        <polygon points="22,3 45,25 -1,25" fill="${roof}"/>
        <polygon points="22,3 34,15 22,15" fill="rgba(255,255,255,0.15)"/>
        <rect x="18" y="31" width="8" height="13" rx="1.5" fill="rgba(255,255,255,0.35)"/>
        <circle cx="24" cy="38" r="1.2" fill="rgba(0,0,0,0.25)"/>
        <rect x="11" y="27" width="6" height="5" rx="1" fill="rgba(255,255,255,0.4)"/>
        <line x1="14" y1="27" x2="14" y2="32" stroke="rgba(0,0,0,0.08)" stroke-width="0.5"/>
        <line x1="11" y1="29.5" x2="17" y2="29.5" stroke="rgba(0,0,0,0.08)" stroke-width="0.5"/>
        <rect x="27" y="27" width="6" height="5" rx="1" fill="rgba(255,255,255,0.4)"/>
        <line x1="30" y1="27" x2="30" y2="32" stroke="rgba(0,0,0,0.08)" stroke-width="0.5"/>
        <line x1="27" y1="29.5" x2="33" y2="29.5" stroke="rgba(0,0,0,0.08)" stroke-width="0.5"/>
        <rect x="31" y="8" width="5" height="14" rx="1" fill="${roof}"/>
        <rect x="31.5" y="8" width="4" height="2" rx="0.5" fill="rgba(0,0,0,0.15)"/>
    </svg>`;
}

// ---- Shorten long names ----
function shortName(name, max) {
    max = max || 28;
    if (!name || name.length <= max) return name;
    // Try to cut at a word boundary
    const trimmed = name.substring(0, max);
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace > max * 0.5) return trimmed.substring(0, lastSpace) + '…';
    return trimmed + '…';
}

// ---- Pick a random tiers-lieu ----
function pickRandomLieu() {
    const regionIds = Object.keys(LIEUX_BY_REGION);
    if (regionIds.length === 0) return null;

    // Weighted by region size (so smaller regions still appear)
    // Pick a random region, then pick a random lieu from it
    let attempts = 0;
    while (attempts < 30) {
        const regionId = regionIds[Math.floor(Math.random() * regionIds.length)];
        const indices = LIEUX_BY_REGION[regionId];
        if (!indices || indices.length === 0) { attempts++; continue; }

        // Pick a random lieu from this region
        const idx = indices[Math.floor(Math.random() * indices.length)];
        const lieu = TIERS_LIEUX[idx];

        // Check it's not too close to any active house
        const tooClose = gameState.activeHouses.some(h =>
            Math.abs(h.x - lieu.x) < 0.04 && Math.abs(h.y - lieu.y) < 0.04
        );
        if (tooClose) { attempts++; continue; }

        return lieu;
    }
    return null;
}

// ---- Spawn House ----
function spawnHouse() {
    if (!gameState.isRunning || gameState.activeHouses.length >= 4) return;

    const lieu = pickRandomLieu();
    if (!lieu) return;

    const network = NETWORKS[lieu.r];
    if (!network) return;

    const house = document.createElement('div');
    house.className = 'house';
    house.innerHTML = createHouseSVG(network.primary, network.secondary);
    house.style.left = (lieu.x * 100) + '%';
    house.style.top = (lieu.y * 100) + '%';

    // Add name label above the house
    const label = document.createElement('div');
    label.className = 'house-label';
    label.textContent = shortName(lieu.n, 28);
    house.appendChild(label);

    const houseData = {
        element: house, regionId: lieu.r, network,
        lieuName: lieu.n, lieuVille: lieu.v,
        x: lieu.x, y: lieu.y,
        id: Date.now() + Math.random(),
        clicked: false, removed: false
    };

    highlightRegion(lieu.r, network.primary);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (houseData.clicked || houseData.removed) return;
        houseData.clicked = true;

        playPop();

        gameState.score += 10;
        gameState.housesClicked++;
        scoreDisplay.textContent = gameState.score;
        scoreDisplay.style.transform = 'scale(1.3)';
        setTimeout(() => { scoreDisplay.style.transform = 'scale(1)'; }, 150);

        // Show the lieu name + network in the HUD
        networkNameEl.textContent = shortName(lieu.n, 32) + ' — ' + network.region;
        networkNameEl.style.color = network.primary;

        createParticles(houseData);
        createScorePopup(houseData);

        house.classList.add('clicked');
        clearTimeout(houseData.timeout);
        setTimeout(() => removeHouse(houseData, true), 250);
    };

    house.addEventListener('click', handleClick);
    house.addEventListener('pointerdown', handleClick);
    house.addEventListener('touchstart', handleClick, { passive: false });

    housesLayer.appendChild(house);
    gameState.activeHouses.push(houseData);

    const duration = getDuration();
    houseData.timeout = setTimeout(() => {
        if (!houseData.clicked && !houseData.removed) {
            gameState.housesMissed++;
            removeHouse(houseData, false);
        }
    }, duration);
}

// ---- Difficulty (scaled for 120s) ----
function getDuration() {
    const progress = (GAME_DURATION - gameState.timeLeft) / GAME_DURATION;
    return 2800 - (progress * 1500); // starts at 2.8s, ends at 1.3s
}

function getSpawnRate() {
    const progress = (GAME_DURATION - gameState.timeLeft) / GAME_DURATION;
    return 1200 - (progress * 600); // starts at 1.2s, ends at 0.6s
}

// ---- Region Highlighting ----
function highlightRegion(regionId, color) {
    const el = document.getElementById(regionId);
    if (!el) return;
    const network = NETWORKS[regionId];
    let c = color;
    const r0 = parseInt(c.slice(1, 3), 16);
    const g0 = parseInt(c.slice(3, 5), 16);
    const b0 = parseInt(c.slice(5, 7), 16);
    if ((r0 + g0 + b0) < 180 && network && network.accent) {
        c = network.accent;
    }
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    const tR = Math.min(255, Math.round(r * 0.25 + 237 * 0.75));
    const tG = Math.min(255, Math.round(g * 0.25 + 232 * 0.75));
    const tB = Math.min(255, Math.round(b * 0.25 + 225 * 0.75));
    el.classList.add('highlight');
    el.style.fill = `rgb(${tR}, ${tG}, ${tB})`;
}

function unhighlightRegion(regionId) {
    const el = document.getElementById(regionId);
    if (!el) return;
    if (!gameState.activeHouses.some(h => h.regionId === regionId && !h.removed)) {
        el.classList.remove('highlight');
        el.style.fill = '';
    }
}

// ---- Particles ----
function createParticles(houseData) {
    const colors = [houseData.network.primary, houseData.network.secondary, houseData.network.accent];
    for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (Math.PI * 2 / 10) * i + Math.random() * 0.4;
        const dist = 20 + Math.random() * 35;
        p.style.left = (houseData.x * 100) + '%';
        p.style.top = (houseData.y * 100) + '%';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--px', (Math.cos(angle) * dist) + 'px');
        p.style.setProperty('--py', (Math.sin(angle) * dist) + 'px');
        const size = 4 + Math.random() * 7;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        if (Math.random() > 0.5) p.style.borderRadius = '2px';
        particlesLayer.appendChild(p);
        setTimeout(() => p.remove(), 650);
    }
}

function createScorePopup(houseData) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = '+10';
    popup.style.left = (houseData.x * 100) + '%';
    popup.style.top = (houseData.y * 100 - 3) + '%';
    particlesLayer.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
}

// ---- Remove House ----
function removeHouse(houseData, wasClicked) {
    if (houseData.removed) return;
    houseData.removed = true;
    if (!wasClicked) {
        houseData.element.classList.add('disappearing');
        setTimeout(() => houseData.element.remove(), 300);
    } else {
        setTimeout(() => houseData.element.remove(), 250);
    }
    gameState.activeHouses = gameState.activeHouses.filter(h => h.id !== houseData.id);
    unhighlightRegion(houseData.regionId);
}

// ---- Timer ----
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function updateTimer() {
    gameState.timeLeft--;
    timerDisplay.textContent = formatTime(gameState.timeLeft);
    if (gameState.timeLeft <= 10) timerDisplay.classList.add('warning');
    if (gameState.timeLeft <= 0) endGame();
}

// ---- Spawn Loop ----
function spawnLoop() {
    if (!gameState.isRunning) return;
    spawnHouse();
    const delay = getSpawnRate() + (Math.random() * 300 - 150);
    gameState.spawnTimeout = setTimeout(spawnLoop, Math.max(400, delay));
}

// ---- Start Game ----
function startGame() {
    gameState.score = 0;
    gameState.timeLeft = GAME_DURATION;
    gameState.isRunning = true;
    gameState.activeHouses = [];
    gameState.housesClicked = 0;
    gameState.housesMissed = 0;
    gameState.usedLieux = new Set();

    scoreDisplay.textContent = '0';
    scoreDisplay.style.transform = 'scale(1)';
    timerDisplay.textContent = formatTime(GAME_DURATION);
    timerDisplay.classList.remove('warning');
    networkNameEl.innerHTML = '&nbsp;';
    housesLayer.innerHTML = '';
    particlesLayer.innerHTML = '';

    document.querySelectorAll('.region').forEach(r => {
        r.style.fill = '';
        r.classList.remove('highlight');
    });

    showScreen(gameScreen);

    setTimeout(() => {
        gameState.timerInterval = setInterval(updateTimer, 1000);
        spawnLoop();
    }, 400);
}

// ---- End Game ----
function endGame() {
    gameState.isRunning = false;
    clearInterval(gameState.timerInterval);
    clearTimeout(gameState.spawnTimeout);

    gameState.activeHouses.forEach(h => {
        clearTimeout(h.timeout);
        h.element.remove();
    });
    gameState.activeHouses = [];

    document.querySelectorAll('.region').forEach(r => {
        r.style.fill = '';
        r.classList.remove('highlight');
    });

    finalScoreEl.textContent = gameState.score;

    const msgEl = document.getElementById('end-dynamic-msg');
    if (msgEl) {
        const total = typeof TIERS_LIEUX !== 'undefined' ? TIERS_LIEUX.length : '?';
        if (gameState.score >= 600) msgEl.textContent = 'Incroyable ! Vous êtes un·e expert·e des tiers-lieux !';
        else if (gameState.score >= 400) msgEl.textContent = 'Très bien joué ! Un vrai connaisseur !';
        else if (gameState.score >= 200) msgEl.textContent = 'Pas mal ! Continuez à explorer les tiers-lieux !';
        else msgEl.textContent = 'Bon début ! Les tiers-lieux n\'attendent que vous !';
    }

    // Show stats
    const statsEl = document.getElementById('end-stats');
    if (statsEl) {
        statsEl.textContent = gameState.housesClicked + ' tiers-lieux recensés sur ' +
            (gameState.housesClicked + gameState.housesMissed) + ' apparus';
    }

    setTimeout(() => showScreen(endScreen), 400);
}

// ---- Reset ----
function resetGame() {
    showScreen(startScreen);
}

// ---- Mobile ----
if (mapContainer) {
    mapContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
}
