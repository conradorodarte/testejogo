// VARIÁVEIS DE ESTADO
let selectedMode = 'gridshot';
let selectedWeapon = 'pistol';
let score = 0;
let timeLeft = 30;
let shotsFired = 0;
let hits = 0;
let combo = 0;
let maxCombo = 0;
let reactionTimes = [];
let gameInterval = null;
let spiderCenterNext = true;
let isGameRunning = false;
let isPaused = false;

// CONFIGURAÇÃO DE SENSIBILIDADE E MIRA VIRTUAL
let mouseSensitivity = 1.0;
let aimX = 450;
let aimY = 275;

let weaponX = 0;
let weaponY = 0;

let crosshairConfig = {
    color: '#00ffcc',
    length: 4,
    thickness: 2,
    offset: 2,
    outline: false,
    dot: false,
    dotSize: 3,
    showLines: true
};

const VALORANT_COLORS = {
    '0': '#ffffff',
    '1': '#00ff00',
    '2': '#7fff00',
    '3': '#dfff00',
    '4': '#00ffff',
    '5': '#ff00ff',
    '6': '#ffff00',
    '7': '#ff0000'
};

// SISTEMA DE ÁUDIO (WEB AUDIO API)
let audioCtx = null;
let soundVolume = 0.8;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type, comboMultiplier = 0) {
    if (!audioCtx || soundVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'shot') {
            osc.type = selectedWeapon === 'sniper' ? 'sawtooth' : 'triangle';
            const baseFreq = selectedWeapon === 'sniper' ? 180 : (selectedWeapon === 'rifle' ? 320 : 450);
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

            gain.gain.setValueAtTime(soundVolume * 0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'hit') {
            osc.type = 'sine';
            const hitFreq = 600 + Math.min(comboMultiplier * 35, 800);
            osc.frequency.setValueAtTime(hitFreq, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

            gain.gain.setValueAtTime(soundVolume * 0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {}
}

// ELEMENTOS DA DOM
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const openPauseBtn = document.getElementById('open-pause-btn');
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');

const arena = document.getElementById('arena');
const lockOverlay = document.getElementById('lock-overlay');
const targetsLayer = document.getElementById('targets-layer');
const crosshair = document.getElementById('crosshair');
const previewCrosshair = document.getElementById('preview-crosshair');
const weaponSwayWrapper = document.getElementById('weapon-sway-wrapper');
const weaponModel = document.getElementById('weapon-model');

// Controlos Menu Principal
const sensSlider = document.getElementById('sens-slider');
const sensVal = document.getElementById('sens-val');
const soundVolInput = document.getElementById('sound-vol');
const volVal = document.getElementById('vol-val');

// Controlos Painel de Pausa (In-Game)
const pauseSensSlider = document.getElementById('pause-sens-slider');
const pauseSensVal = document.getElementById('pause-sens-val');
const pauseSoundVol = document.getElementById('pause-sound-vol');
const pauseVolVal = document.getElementById('pause-vol-val');

const valCodeInput = document.getElementById('val-code-input');
const importCodeBtn = document.getElementById('import-code-btn');
const chColorInput = document.getElementById('ch-color');
const chLenSlider = document.getElementById('ch-len');
const chLenVal = document.getElementById('ch-len-val');
const chThickSlider = document.getElementById('ch-thick');
const chThickVal = document.getElementById('ch-thick-val');
const chOffsetSlider = document.getElementById('ch-offset');
const chOffsetVal = document.getElementById('ch-offset-val');
const chOutlineCheck = document.getElementById('ch-outline');
const chDotCheck = document.getElementById('ch-dot-check');

const scoreVal = document.getElementById('score-val');
const timeVal = document.getElementById('time-val');
const accVal = document.getElementById('acc-val');
const comboVal = document.getElementById('combo-val');

const resScore = document.getElementById('res-score');
const resReaction = document.getElementById('res-reaction');
const resAcc = document.getElementById('res-acc');
const resRank = document.getElementById('res-rank');

// SINCRONIZAÇÃO DE CONFIGURAÇÕES (MENU & PAUSA)
function updateSensitivity(val) {
    mouseSensitivity = parseFloat(val);
    sensSlider.value = mouseSensitivity;
    sensVal.textContent = mouseSensitivity.toFixed(1);
    pauseSensSlider.value = mouseSensitivity;
    pauseSensVal.textContent = mouseSensitivity.toFixed(1);
}

function updateVolume(val) {
    soundVolume = parseInt(val) / 100;
    soundVolInput.value = val;
    volVal.textContent = val;
    pauseSoundVol.value = val;
    pauseVolVal.textContent = val;
}

sensSlider.addEventListener('input', (e) => updateSensitivity(e.target.value));
pauseSensSlider.addEventListener('input', (e) => updateSensitivity(e.target.value));

soundVolInput.addEventListener('input', (e) => updateVolume(e.target.value));
pauseSoundVol.addEventListener('input', (e) => updateVolume(e.target.value));

function renderCrosshair(el) {
    const { color, length, thickness, offset, outline, dot, dotSize, showLines } = crosshairConfig;
    const outlineStyle = outline ? '1px solid #000000' : 'none';
    const lineDisplay = (showLines && length > 0) ? 'block' : 'none';

    const top = el.querySelector('.ch-top');
    const bottom = el.querySelector('.ch-bottom');
    const left = el.querySelector('.ch-left');
    const right = el.querySelector('.ch-right');
    const centerDot = el.querySelector('.ch-dot');

    [top, bottom, left, right].forEach(line => {
        line.style.display = lineDisplay;
        line.style.backgroundColor = color;
        line.style.border = outlineStyle;
    });

    top.style.width = `${thickness}px`;
    top.style.height = `${length}px`;
    top.style.bottom = `${offset}px`;

    bottom.style.width = `${thickness}px`;
    bottom.style.height = `${length}px`;
    bottom.style.top = `${offset}px`;

    left.style.height = `${thickness}px`;
    left.style.width = `${length}px`;
    left.style.right = `${offset}px`;

    right.style.height = `${thickness}px`;
    right.style.width = `${length}px`;
    right.style.left = `${offset}px`;

    centerDot.style.display = dot ? 'block' : 'none';
    centerDot.style.width = `${dotSize}px`;
    centerDot.style.height = `${dotSize}px`;
    centerDot.style.backgroundColor = color;
    centerDot.style.border = outlineStyle;
}

function updateAllCrosshairs() {
    renderCrosshair(previewCrosshair);
    renderCrosshair(crosshair);

    chColorInput.value = crosshairConfig.color;
    chLenSlider.value = crosshairConfig.length;
    chLenVal.textContent = crosshairConfig.length;
    chThickSlider.value = crosshairConfig.thickness;
    chThickVal.textContent = crosshairConfig.thickness;
    chOffsetSlider.value = crosshairConfig.offset;
    chOffsetVal.textContent = crosshairConfig.offset;
    chOutlineCheck.checked = crosshairConfig.outline;
    chDotCheck.checked = crosshairConfig.dot;
}

function parseValorantCode(codeStr) {
    const parts = codeStr.trim().split(';');
    const map = {};
    const pIndex = parts.indexOf('P');
    const startIndex = pIndex !== -1 ? pIndex + 1 : 0;

    for (let i = startIndex; i < parts.length - 1; i += 2) {
        map[parts[i]] = parts[i + 1];
    }

    if (map['c'] === '8' && map['u']) {
        crosshairConfig.color = `#${map['u'].slice(0, 6)}`;
    } else if (map['c'] && VALORANT_COLORS[map['c']]) {
        crosshairConfig.color = VALORANT_COLORS[map['c']];
    } else {
        crosshairConfig.color = '#ffffff';
    }

    crosshairConfig.outline = map['h'] === '0' ? false : true;
    crosshairConfig.dot = map['d'] === '1';
    crosshairConfig.dotSize = map['z'] ? Math.max(2, Math.min(8, parseInt(map['z']))) : 3;

    crosshairConfig.showLines = map['0b'] === '0' ? false : true;
    crosshairConfig.length = map['0l'] !== undefined ? Math.min(16, parseInt(map['0l'])) : 4;
    crosshairConfig.thickness = map['0t'] !== undefined ? Math.max(1, Math.min(6, parseInt(map['0t']))) : 2;
    crosshairConfig.offset = map['0o'] !== undefined ? Math.min(15, parseInt(map['0o'])) : 2;

    updateAllCrosshairs();
}

importCodeBtn.addEventListener('click', () => parseValorantCode(valCodeInput.value));

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        valCodeInput.value = code;
        parseValorantCode(code);
    });
});

chColorInput.addEventListener('input', (e) => { crosshairConfig.color = e.target.value; updateAllCrosshairs(); });
chLenSlider.addEventListener('input', (e) => { crosshairConfig.length = parseInt(e.target.value); crosshairConfig.showLines = crosshairConfig.length > 0; updateAllCrosshairs(); });
chThickSlider.addEventListener('input', (e) => { crosshairConfig.thickness = parseInt(e.target.value); updateAllCrosshairs(); });
chOffsetSlider.addEventListener('input', (e) => { crosshairConfig.offset = parseInt(e.target.value); updateAllCrosshairs(); });
chOutlineCheck.addEventListener('change', (e) => { crosshairConfig.outline = e.target.checked; updateAllCrosshairs(); });
chDotCheck.addEventListener('change', (e) => { crosshairConfig.dot = e.target.checked; updateAllCrosshairs(); });

parseValorantCode(valCodeInput.value);

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMode = btn.getAttribute('data-mode');
    });
});

document.querySelectorAll('.weapon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.weapon-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedWeapon = btn.getAttribute('data-weapon');
        weaponModel.className = `weapon-${selectedWeapon}`;
    });
});

// GESTÃO DE PAUSA E TECLA ESC
function togglePause(pauseState) {
    if (!isGameRunning) return;
    isPaused = pauseState;

    if (isPaused) {
        if (document.pointerLockElement) document.exitPointerLock();
        pauseMenu.classList.remove('hidden');
        lockOverlay.classList.add('hidden');
    } else {
        pauseMenu.classList.add('hidden');
        arena.requestPointerLock();
    }
}

openPauseBtn.addEventListener('click', () => togglePause(true));
resumeBtn.addEventListener('click', () => togglePause(false));
quitToMenuBtn.addEventListener('click', () => {
    isGameRunning = false;
    isPaused = false;
    pauseMenu.classList.add('hidden');
    clearInterval(gameInterval);
    if (document.pointerLockElement) document.exitPointerLock();
    showMenu();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isGameRunning) {
        togglePause(!isPaused);
    }
});

arena.addEventListener('click', () => {
    initAudio();
    if (isGameRunning && !isPaused && document.pointerLockElement !== arena) {
        arena.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === arena) {
        lockOverlay.classList.add('hidden');
    } else if (isGameRunning && !isPaused) {
        lockOverlay.classList.remove('hidden');
    }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== arena || isPaused) return;

    aimX += e.movementX * mouseSensitivity;
    aimY += e.movementY * mouseSensitivity;

    aimX = Math.max(0, Math.min(arena.clientWidth, aimX));
    aimY = Math.max(0, Math.min(arena.clientHeight, aimY));
    updateCrosshairPosition();

    weaponX -= e.movementX * 0.16;
    weaponY -= e.movementY * 0.16;

    weaponX = Math.max(-28, Math.min(28, weaponX));
    weaponY = Math.max(-22, Math.min(22, weaponY));
});

function animateWeaponSway() {
    if (document.pointerLockElement === arena && !isPaused) {
        weaponX += (0 - weaponX) * 0.12;
        weaponY += (0 - weaponY) * 0.12;

        const tilt = weaponX * 0.25;
        weaponSwayWrapper.style.transform = `translate(${weaponX}px, ${weaponY}px) rotate(${tilt}deg)`;
    }
    requestAnimationFrame(animateWeaponSway);
}
requestAnimationFrame(animateWeaponSway);

function updateCrosshairPosition() {
    crosshair.style.left = `${aimX}px`;
    crosshair.style.top = `${aimY}px`;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMenu);

function showMenu() {
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    menuScreen.classList.add('active');
}

function startGame() {
    initAudio();
    menuScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    gameScreen.classList.add('active');

    isGameRunning = true;
    isPaused = false;
    pauseMenu.classList.add('hidden');
    score = 0;
    timeLeft = 30;
    shotsFired = 0;
    hits = 0;
    combo = 0;
    maxCombo = 0;
    reactionTimes = [];
    spiderCenterNext = true;
    targetsLayer.innerHTML = '';

    aimX = arena.clientWidth / 2;
    aimY = arena.clientHeight / 2;
    weaponX = 0;
    weaponY = 0;
    weaponSwayWrapper.style.transform = 'translate(0px, 0px) rotate(0deg)';
    updateCrosshairPosition();

    arena.requestPointerLock();
    updateHUD();

    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        if (!isGameRunning || isPaused) return;
        if (document.pointerLockElement !== arena) return;
        
        timeLeft--;
        timeVal.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    spawnTargetsForMode();
}

function updateHUD() {
    scoreVal.textContent = score;
    timeVal.textContent = timeLeft;
    const acc = shotsFired > 0 ? Math.round((hits / shotsFired) * 100) : 100;
    accVal.textContent = acc;
    comboVal.textContent = combo;
}

function triggerRecoil() {
    weaponModel.classList.remove('recoil');
    void weaponModel.offsetWidth;
    weaponModel.classList.add('recoil');
    setTimeout(() => {
        weaponModel.classList.remove('recoil');
    }, 65);
}

function createShards(centerX, centerY) {
    for (let i = 0; i < 7; i++) {
        const shard = document.createElement('div');
        shard.classList.add('shard');
        shard.style.left = `${centerX}px`;
        shard.style.top = `${centerY}px`;

        const angle = Math.random() * Math.PI * 2;
        const distance = 45 + Math.random() * 65;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance - 15;

        shard.style.setProperty('--tx', `${tx}px`);
        shard.style.setProperty('--ty', `${ty}px`);

        targetsLayer.appendChild(shard);
        setTimeout(() => shard.remove(), 450);
    }
}

arena.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || document.pointerLockElement !== arena || isPaused) return;

    shotsFired++;
    triggerRecoil();
    playSound('shot');

    let hitTarget = null;
    const targets = Array.from(targetsLayer.children).filter(el => el.classList.contains('target'));

    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const radius = t.offsetWidth / 2;
        const centerX = t.offsetLeft + radius;
        const centerY = t.offsetTop + radius;

        const dist = Math.hypot(aimX - centerX, aimY - centerY);
        if (dist <= radius) {
            hitTarget = t;
            break;
        }
    }

    if (hitTarget) {
        const radius = hitTarget.offsetWidth / 2;
        const centerX = hitTarget.offsetLeft + radius;
        const centerY = hitTarget.offsetTop + radius;

        const reactionTime = performance.now() - parseFloat(hitTarget.dataset.spawnTime);
        reactionTimes.push(reactionTime);

        hits++;
        score += 100 + (combo * 10);
        combo++;
        if (combo > maxCombo) maxCombo = combo;

        playSound('hit', combo);
        createShards(centerX - 6, centerY - 6);

        hitTarget.remove();
        spawnTargetsForMode();
    } else {
        combo = 0;
    }

    updateHUD();
});

function spawnTargetsForMode() {
    if (selectedMode === 'gridshot') {
        while (targetsLayer.querySelectorAll('.target').length < 3) {
            createTarget(60);
        }
    } else if (selectedMode === 'spidershot') {
        if (targetsLayer.querySelectorAll('.target').length === 0) {
            createTarget(55, spiderCenterNext);
            spiderCenterNext = !spiderCenterNext;
        }
    } else if (selectedMode === 'microshot') {
        if (targetsLayer.querySelectorAll('.target').length === 0) {
            createTarget(28);
        }
    }
}

function createTarget(customSize = 60, forceCenter = false) {
    const target = document.createElement('div');
    target.classList.add('target');
    target.style.width = `${customSize}px`;
    target.style.height = `${customSize}px`;

    const padding = 25;
    let x, y;

    if (forceCenter) {
        x = (arena.clientWidth / 2) - (customSize / 2);
        y = (arena.clientHeight / 2) - (customSize / 2);
    } else {
        const maxX = arena.clientWidth - customSize - padding;
        const maxY = arena.clientHeight - customSize - padding;
        x = Math.floor(Math.random() * (maxX - padding + 1)) + padding;
        y = Math.floor(Math.random() * (maxY - padding + 1)) + padding;
    }

    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    target.dataset.spawnTime = performance.now();

    targetsLayer.appendChild(target);
}

function endGame() {
    isGameRunning = false;
    isPaused = false;
    clearInterval(gameInterval);
    if (document.pointerLockElement) document.exitPointerLock();

    gameScreen.classList.remove('active');
    resultScreen.classList.add('active');

    const finalAcc = shotsFired > 0 ? Math.round((hits / shotsFired) * 100) : 0;
    const avgReaction = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) 
        : 0;

    resScore.textContent = score;
    resReaction.textContent = `${avgReaction} ms`;
    resAcc.textContent = `${finalAcc}%`;

    let rank = 'Bronze';
    if (score > 4500) rank = 'Radiante // Aim God';
    else if (score > 3200) rank = 'Diamante';
    else if (score > 2000) rank = 'Platina';
    else if (score > 1000) rank = 'Ouro';
    resRank.textContent = rank;
}