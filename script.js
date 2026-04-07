// Dane gry
let moveX = 0;
let moveY = 0;
let currentDodgeDifficulty = { minSpeed: 2, maxSpeed: 4, size: 75 };
let playerTurnActive = true; // Flaga blokująca spamowanie ataku
let quenActive = false;
let equipped = { weapon: null, armor: null, trinket: null };
let currentCombo = 0; // Dla stylu 'combo'
let hitsNeeded = 1; // Ile razy trzeba kliknąć (dla stylu Combo)
let isMirageActive = false; // Czy aktualnie trwa Miraż
let signsUsed = { igni: false, quen: false, yrden: false, axii: false };
let dodgeIntervals = []; // Tablica na wszystkie aktywne interwały
let currentTurnTimer;
let selectedSigns = ['igni', 'quen', 'yrden']; // Domyślne 3 znaki
let f = 0;
let monster = {}; // Obiekt przechowujący dane aktualnego przeciwnika
let lastOpenedId = null;
let currentMoveState = null; // Globalna referencja do stanu ruchu

let battleState = {
    active: false,
    isTraining: false,
    playerTurnActive: true,
    quenActive: false,
    isDodgeWindowActive: false,
    currentCombo: 0,
    hitsNeeded: 1,
    dodgeIntervals: [],
    igniBuffTicks: 0 // Przeniesione tutaj ze stats
};


let stats = {
    gold: 300,
    atk: 15,
    arm: 0,
    agi: 10,
    pot: 1,
    bomb: 0,
    hp: 100,
    maxHp: 100,
    maxUnlockedIndex: 0
};


let canDodge = false;

let inventory = [];

const BATTLE_STYLES = {
    'normal': {
        name: 'Klasyczny',
        hits: 1,
        update: (f, pos, move, agi) => ({
            x: pos.x + move.x * agi,
            y: pos.y + move.y * agi
        })
    },
    'charge': {
        name: 'Szarża',
        hits: 1,
        update: (f, pos, move, agi) => ({
            x: pos.x + move.x * 4.5 * agi,
            y: pos.y + move.y * 0.3 * agi
        })
    },
    'mirage': {
        name: 'Miraż',
        hits: 1,
        update: (f, pos, move, agi) => ({
            x: pos.x + move.x * 1.2 * agi,
            y: pos.y + move.y * 1.2 * agi
        })
    },
    'combo': {
        name: 'Grad ciosów',
        hits: 3,
        static: true,
        update: (f, pos) => pos
    },
    'orbit': {
        name: 'Spirala',
        hits: 1,
        noBounce: true,
        init: (area) => {
            // Losujemy kąt startowy
            const startAngle = Math.random() * Math.PI * 2;
            // Startujemy z daleka (70% przekątnej kontenera)
            const startRadius = Math.min(area.clientWidth, area.clientHeight) * 0.45;
            return {
                angle: startAngle,
                radius: startRadius,
                spiralSpeed: 0.08, // Prędkość obrotu
                collapseSpeed: 1.5  // Prędkość zbliżania się do środka
            };
        },
        update: (t, pos, move, agi, area, dBtn) => {
            // 1. Zwiększamy kąt (ruch obrotowy) skalowany o zwinność
            pos.angle += pos.spiralSpeed * agi;

            // 2. Zmniejszamy promień (zbliżanie do środka)
            // Jeśli Yrden aktywny, zbliża się wolniej (agi jest mniejsze)
            pos.radius -= pos.collapseSpeed * agi;

            // 3. Jeśli promień spadnie poniżej 10, odbijamy go lekko (żeby nie stał w miejscu)
            if (pos.radius < 10) pos.radius = 10;

            // 4. Obliczamy pozycję względem środka ekranu
            const centerX = area.clientWidth / 2 - (dBtn.clientWidth / 2);
            const centerY = area.clientHeight / 2 - (dBtn.clientHeight / 2);

            return {
                x: centerX + Math.cos(pos.angle) * pos.radius,
                y: centerY + Math.sin(pos.angle) * pos.radius,
                angle: pos.angle,
                radius: pos.radius,
                t: t + 0.016
            };
        }
    },

    'blink': {
        name: 'Teleportacja',
        hits: 1,
        update: (f, pos, move, agi, area, dBtn) => {
            pos.t = (pos.t || 0) + 0.05;
            const cycle = pos.t % 1.8;
            const isBlinking = cycle > 1.05; // Moment "mignięcia"
            let speedMult = isBlinking ? (12 * agi) : (2 * agi);

            if (dBtn) {
                dBtn.style.opacity = isBlinking ? "0.2" : "1";
                dBtn.style.pointerEvents = isBlinking ? "none" : "auto";
                dBtn.style.filter = isBlinking ? "blur(4px)" : "none";
            }

            return {
                x: pos.x + move.x * speedMult,
                y: pos.y + move.y * speedMult,
                t: pos.t
            };
        }
    },
    'gaunter': {
        name: 'Chaos',
        hits: 1
    }
};






const shopItems = [
    // --- BROŃ (DMG: 8 -> 8 000) ---
    { id: 1, name: "Kord szermierczy", price: 100, atk: 8, rarity: 'common', type: 'weapon', desc: "Lekka broń treningowa." },
    { id: 2, name: "Srebrny Miecz", price: 500, atk: 30, rarity: 'common', type: 'weapon', desc: "Podstawa na potwory." },
    { id: 3, name: "Harvall", price: 1200, atk: 65, rarity: 'rare', type: 'weapon', desc: "Gisermeński miecz o dobrym wyważeniu." },
    { id: 4, name: "Gwyhyr", price: 3500, atk: 150, rarity: 'rare', type: 'weapon', desc: "Mistrzowska robota gnomów." },
    { id: 5, name: "D'yaebl", price: 8500, atk: 350, rarity: 'epic', type: 'weapon', desc: "Diabelsko ostre i ciężkie ostrze." },
    { id: 6, name: "Miecz z Mahakamu", price: 15000, atk: 600, rarity: 'epic', type: 'weapon', desc: "Praktycznie niezniszczalny." },
    { id: 31, name: "Ciri's Zirael", price: 35000, atk: 1200, rarity: 'legendary', type: 'weapon', desc: "Miecz Jaskółki. Przecina czas i przestrzeń." },
    { id: 32, name: "Aerondight", price: 65000, atk: 2500, rarity: 'legendary', type: 'weapon', desc: "Rośnie w siłę z każdym ciosem." },
    { id: 33, name: "Miecz Przeznaczenia", price: 120000, atk: 4500, rarity: 'legendary', type: 'weapon', desc: "Ma dwa ostrza. Jednym jesteś Ty." },
    { id: 34, name: "Ostrze Zimy", price: 250000, atk: 9500, rarity: 'legendary', type: 'weapon', desc: "Dar od Króla Skellige. Zamraża krew w żyłach." },

    // --- ZBROJE LEKKIE / ZWINSTOŚĆ (Skalowanie Agi: 5 -> 180) ---
    { id: 7, name: "Przeszywanica", price: 150, agi: 5, type: 'armor', rarity: 'common', desc: "Tania ochrona i swoboda ruchów." },
    { id: 8, name: "Kurtka Szkoły Kota", price: 900, agi: 15, arm: 15, type: 'armor', rarity: 'rare', desc: "Dla mistrzów uników." },
    { id: 9, name: "Zbroja Kaer Morhen", price: 2200, arm: 80, agi: 5, type: 'armor', rarity: 'rare', desc: "Klasyczny rynsztunek wiedźmiński." },
    { id: 22, name: "Zbroja Mantikory", price: 6500, agi: 30, arm: 150, type: 'armor', rarity: 'epic', desc: "Zwiększa refleks i tolerancję na ból." },
    { id: 35, name: "Pancerz z Nilfgaardu", price: 15000, agi: 50, arm: 400, type: 'armor', rarity: 'epic', desc: "Czarne słońce daje szybkość." },
    { id: 36, name: "Skóra Białego Wilka", price: 45000, agi: 75, arm: 1000, type: 'armor', rarity: 'legendary', desc: "Uniki stają się instynktem." },
    { id: 37, name: "Tunicja Elfów Aen Elle", price: 90000, agi: 110, arm: 2500, type: 'armor', rarity: 'legendary', desc: "Niematerialna lekkość bytu." },
    { id: 39, name: "Opończa Wyższego Wampira", price: 250000, agi: 180, arm: 6000, type: 'armor', rarity: 'legendary', desc: "Szybkość przekraczająca granice śmiertelników." },

    // --- ZBROJE CIĘŻKIE / TANK (Skalowanie Arm: 450 -> 45 000) ---
    { id: 10, name: "Pancerz Niedźwiedzia", price: 8000, arm: 450, type: 'armor', rarity: 'epic', desc: "Kuta stal kosztuje. Prawdziwa forteca." },
    { id: 40, name: "Zbroja Brygady Impera", price: 22000, arm: 1500, type: 'armor', rarity: 'epic', desc: "Import z południa. Cło wliczone w cenę." },
    { id: 41, name: "Pancerz Gryfa", price: 55000, arm: 5000, type: 'armor', rarity: 'epic', desc: "Rytualnie hartowana stal." },
    { id: 42, name: "Zbroja Płonącej Róży", price: 120000, arm: 12000, type: 'armor', rarity: 'legendary', desc: "Zbroja godna wielkiego mistrza." },
    { id: 43, name: "Płyta z Mahakamu", price: 280000, arm: 22000, type: 'armor', rarity: 'legendary', desc: "Krasnoludy nie znają pojęcia 'tanio'." },
    { id: 44, name: "Zbroja Hen Gaidth", price: 550000, arm: 35000, type: 'armor', rarity: 'legendary', desc: "Karmazynowa legenda." },
    { id: 45, name: "Tesham Mutna", price: 1200000, arm: 60000, type: 'armor', rarity: 'legendary', desc: "Szczyt wytrzymałości." },

    // --- UŻYTKOWE ---
    { id: 13, name: "Jaskółka", price: 60, type: 'consumable', sub: 'pot', rarity: 'common', desc: "🧪 Podstawowa regeneracja." },
    { id: 15, name: "Samum", price: 200, type: 'consumable', sub: 'bomb', rarity: 'common', desc: "💣 Ogłuszająca petarda (150 DMG)." },
    { id: 14, name: "Puszczyk", price: 1500, type: 'consumable', sub: 'atk_perm', rarity: 'rare', desc: "📖 Wiedza o punktach witalnych (+5 Atak)." },
    { id: 17, name: "Grom", price: 1500, type: 'consumable', sub: 'arm_perm', rarity: 'rare', desc: "🧪 Alchemiczne wzmocnienie skóry (+5 Obrona)." },
    { id: 46, name: "Dekokt Raffarda Białego", price: 6000, type: 'consumable', sub: 'pot_full', rarity: 'epic', desc: "✨ Natychmiast leczy wszystkie rany." },
    { id: 16, name: "Kartacz", price: 2500, type: 'consumable', sub: 'bomb_super', rarity: 'rare', desc: "💥 Rozrywa pancerz wrogów (350 DMG)." },
    { id: 47, name: "Filtr Petriego", price: 12000, type: 'consumable', sub: 'sign_perm', rarity: 'epic', desc: "✨ Zwiększa moc znaków na stałe." },
    { id: 48, name: "Eliksir Oczyszczenia", price: 20000, type: 'consumable', sub: 'reset', rarity: 'epic', desc: "🌀 Pozwala zresetować statystyki." },

    // --- TALIZMANY (Mieszane bonusy) ---
    { id: 18, name: "Ząb Utopca", price: 400, atk: 8, type: 'trinket', rarity: 'common', desc: "Szczęście neofity." },
    { id: 19, name: "Medalion Wilka", price: 2500, maxHp: 300, type: 'trinket', rarity: 'rare', desc: "Wibruje w walce." },
    { id: 20, name: "Pierścień Kota", price: 5500, agi: 25, type: 'trinket', rarity: 'rare', desc: "Kocie ruchy (+25 Agi)." },
    { id: 50, name: "Kamień Runiczny", price: 12000, atk: 250, type: 'trinket', rarity: 'epic', desc: "Magiczne runy na ostrzu." },
    { id: 21, name: "Pierścień Mocy", price: 35000, maxHp: 1500, atk: 600, type: 'trinket', rarity: 'epic', desc: "Potężny artefakt." },
    { id: 51, name: "Klejnot Północy", price: 75000, arm: 1500, agi: 60, type: 'trinket', rarity: 'epic', desc: "Mroźna ochrona." },
    { id: 52, name: "Serce Biesa", price: 150000, maxHp: 8000, type: 'trinket', rarity: 'legendary', desc: "Nienaturalna żywotność." },
    { id: 53, name: "Oko Proroka", price: 300000, agi: 120, atk: 2000, type: 'trinket', rarity: 'legendary', desc: "Widzisz przyszłość." },
    { id: 55, name: "Medalion Gauntera", price: 1000000, atk: 8000, agi: 200, type: 'trinket', rarity: 'legendary', desc: "Pakt podpisany krwią." }
];








const monsterTemplates = {
    // POZIOM 1-3: Rozgrzewka (HP: 150 - 800)
    'utopiec': { name: 'Utopiec', hp: 200, atk: 20, arm: 5, reward: 80, style: 'normal', baseSpeed: 1.0, img: 'utopiec.webp' },
    'ghul': { name: 'Ghul Alghul', hp: 450, atk: 35, arm: 15, reward: 160, style: 'charge', baseSpeed: 1.3, img: 'ghul.webp' },
    'poludnica': { name: 'Południca', hp: 900, atk: 55, arm: 35, reward: 350, style: 'mirage', baseSpeed: 1.5, img: 'polodnica.webp' },

    // POZIOM 4-6: Poważne zlecenia (HP: 2 000 - 8 000)
    'gryf': { name: 'Gryf Królewski', hp: 2500, atk: 110, arm: 80, reward: 1200, style: 'charge', baseSpeed: 1.9, img: 'gryf.webp' },
    'wilkolak': { name: 'Wilkołak', hp: 5000, atk: 180, arm: 150, reward: 2800, style: 'combo', baseSpeed: 2.3, img: 'wilkolak.webp' },
    'leszy': { name: 'Starożytny Leszy', hp: 9500, atk: 280, arm: 250, reward: 5500, style: 'mirage', baseSpeed: 2.6, img: 'leszy.webp' },

    // POZIOM 7-9: Koszmary (HP: 20 000 - 80 000)
    'bies': { name: 'Bies', hp: 22000, atk: 450, arm: 600, reward: 14000, style: 'blink', baseSpeed: 3.0, img: 'bies.webp' },
    'stara_przadka': { name: 'Prządka', hp: 45000, atk: 850, arm: 1200, reward: 35000, style: 'orbit', baseSpeed: 3.4, img: 'przadka.webp' },
    'detlaff': { name: 'Dettlaff van der Eretein', hp: 90000, atk: 1500, arm: 2500, reward: 85000, style: 'blink', baseSpeed: 4.0, img: 'detlaff.webp' },

    // POZIOM 10: Finał (HP: 250 000+)
    'ukryty': { name: 'Ukryty Wyższy Wampir', hp: 250000, atk: 3500, arm: 6000, reward: 180000, style: 'blink', baseSpeed: 4.8, img: 'ukryty.webp' },
    'pan_lusterko': { name: 'Gaunter o\'Dim', hp: 750000, atk: 8000, arm: 15000, reward: 500000, style: 'gaunter', baseSpeed: 5.5, img: 'gaunter.webp' }
};









window.onload = () => {
    loadGame();
    updateUI();
};

function switchTab(tabId) {
    // 1. Ukrywamy wszystkie ekrany
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    closeSideMenu();

    // 2. Pokazujemy ten wybrany
    const targetScreen = document.getElementById(tabId);
    if (targetScreen) targetScreen.style.display = 'block';

    // 3. Wywołujemy funkcje odświeżające widok
    if (tabId === 'char') {
        renderInventory();
        renderSignSelection();
    }
    if (tabId === 'shop') renderShop();
    if (tabId === 'hunt') renderMonsterBoard();
    if (tabId === 'menu' || tabId === 'tutorial') updateUI();

    // TRENING: Tylko generujemy listę potworów "w tle"
    if (tabId === 'training') {
        renderTrainingMonsterList();
    }
}


function getDifficultyLabel(arm) {
    // POZIOMY STARTOWE (Biały/Szary)
    if (arm <= 15) return "<span style='color:#888;'>⚪ Płotka</span>";
    if (arm <= 35) return "<span style='color:#bbb;'>⚪ Szkodnik</span>";

    // POZIOMY ŚREDNIE (Niebieski - Rare)
    if (arm <= 60) return "<span style='color:#4682b4; font-weight:bold;'>🔵 Wyzwanie</span>";
    if (arm <= 100) return "<span style='color:#5f9ea0; font-weight:bold;'>🔵 Groźna Bestia</span>";

    // POZIOMY TRUDNE (Fioletowy - Epic)
    if (arm <= 200) return "<span style='color:#a335ee; font-weight:bold;'>🟣 Potwór</span>";
    if (arm <= 400) return "<span style='color:#bf40bf; font-weight:bold;'>🟣 Król Puszczy</span>";

    // POZIOMY EKSTREMALNE (Pomarańczowy - Legendary)
    if (arm <= 650) return "<span style='color:#ff8c00; font-weight:bold;'>🟠 Zabójca</span>";
    if (arm <= 850) return "<span style='color:#ff4500; font-weight:bold; text-shadow: 0 0 3px gold;'>🔥 Koniec żartów</span>";

    // POZIOMY BOSKIE (Czerwony/Neon - Mythic)
    if (arm <= 1200) return "<span style='color:#ff0000; font-weight:bold; text-shadow: 0 0 8px red;'>🔥 KOSZMAR Z KOSZMARÓW</span>";

    // WSZYSTKO POWYŻEJ (Dla Gauntera o'Dim i Ukrytego)
    return "<span style='color:#ff0000; font-weight:900; text-shadow: 0 0 12px red; animation: pulseRed 1s infinite alternate;'>💀 Śmierć</span>";
}

function renderMonsterBoard() {
    const board = document.getElementById('monster-board');
    if (!board) return;

    const monsterKeys = Object.keys(monsterTemplates);
    const unlocked = stats.maxUnlockedIndex || 0;

    board.innerHTML = monsterKeys.map((key, index) => {
        const m = monsterTemplates[key];
        const isUnlocked = index <= unlocked;

        // PANCERNA LOGIKA: Sprawdzanie gotowości (Atak vs Pancerz)
        const isReady = stats.atk > (m.arm * 0.7);
        const warningIcon = !isReady && isUnlocked ? "⚠️" : "";

        if (isUnlocked) {
            return `
            <div class="monster-card ${!isReady ? 'low-stats-warn' : ''}" onclick="handleMonsterClick('${key}')">
                <div class="m-info">
                    <h4>${warningIcon} ${m.name}</h4>
                    <div class="m-stats">⚔️ Atak: ${m.atk} | 🛡️ Pancerz: ${m.arm}</div>
                </div>
                <div class="m-reward">${m.reward} 💰</div>
            </div>`;
        } else {
            return `
            <div class="monster-card locked" style="opacity: 0.5; filter: grayscale(1); cursor: not-allowed;">
                <div class="m-info">
                    <h4>🔒 ${index === unlocked + 1 ? m.name : '???'}</h4>
                    <p>Zlecenie zablokowane.</p>
                </div>
                <div class="m-reward">❌</div>
            </div>`;
        }
    }).join('');
}

function handleMonsterClick(monsterKey) {
    const m = monsterTemplates[monsterKey];
    if (!m) return;

    // Definiujemy "Gotowość": jeśli Twój atak jest mniejszy niż 70% pancerza wroga, będzie ciężko
    const isReady = stats.atk > (m.arm * 0.7);

    if (!isReady) {
        openModal(
            "⚠️ OSTRZEŻENIE",
            `Twoja broń może być za słaba na pancerz ${m.name.toUpperCase()}. Zadawane obrażenia będą minimalne. Czy na pewno chcesz podjąć zlecenie?`,
            () => startBattle(monsterKey)
        );
    } else {
        startBattle(monsterKey);
    }
}


function renderShop(filter = 'all') {
    const list = document.getElementById('shop-list');
    if (!list) return;

    // 1. FILTROWANIE
    let filtered = filter === 'all' ? [...shopItems] : shopItems.filter(i => i.type === filter);

    // 2. PANCERNE SORTOWANIE (Od najniższej ceny do najwyższej)
    filtered.sort((a, b) => a.price - b.price);

    // 3. RENDEROWANIE
    list.innerHTML = filtered.map(item => {
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        return `
        <div class="item-card item-${item.rarity}" 
             onclick="openItemPreview(${item.id}, true)" 
             onmouseenter="showTooltip(event, 'item', ${itemJson})" 
             onmousemove="moveTooltip(event)" 
             onmouseleave="hideTooltip()">
            <div class="item-info">
                <div class="item-type-icon">${item.type.toUpperCase()} | ${item.rarity.toUpperCase()}</div>
                <div class="item-name">${item.name} ${item.sub === 'pot_full' ? '✨' : ''}</div>
                <div class="item-stats-badge">
                    ${item.atk ? '⚔️ +' + item.atk : ''} 
                    ${item.arm ? '🛡️ +' + item.arm : ''} 
                    ${item.agi ? '👟 +' + item.agi : ''}
                    ${item.maxHp ? '❤️ +' + item.maxHp : ''}
                </div>
            </div>
            <div style="color:var(--gold); font-weight:bold; min-width:80px; text-align:right;">${item.price} 💰</div>
        </div>`;
    }).join('');

    // Opcjonalne: Dodanie klasy active do przycisków filtrów
    document.querySelectorAll('.shop-filters button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${filter}'`)) btn.classList.add('active');
    });
}



function renderInventory() {
    const list = document.getElementById('inv-list');
    if (!list) return;

    // Sloty górne
    document.getElementById('slot-weapon').innerHTML = equipped.weapon ? `⚔️ ${equipped.weapon.name}` : "Brak broni";
    document.getElementById('slot-armor').innerHTML = equipped.armor ? `🛡️ ${equipped.armor.name}` : "Brak zbroi";
    document.getElementById('slot-trinket').innerHTML = equipped.trinket ? `💍 ${equipped.trinket.name}` : "Brak talizmanu";

    if (inventory.length === 0) {
        list.innerHTML = "<div style='color:#666; padding:20px; text-align:center;'>Juki są puste...</div>";
    } else {
        list.innerHTML = inventory.map((item, index) => {
            const isEquipped = Object.values(equipped).includes(item);
            const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

            return `
            <div class="item-card item-${item.rarity}" 
                 style="opacity: ${isEquipped ? '0.5' : '1'}" 
                 onclick="openItemPreview(null, false, ${index})"
                 onmouseenter="showTooltip(event, 'item', ${itemJson})" 
                 onmousemove="moveTooltip(event)" 
                 onmouseleave="hideTooltip()">
                <div class="item-info">
                    <div class="item-type-icon">${item.type} | ${item.rarity}</div>
                    <div class="item-name">${item.name} ${isEquipped ? '(ZAŁOŻONO)' : ''}</div>
                </div>
            </div>`;
        }).join('');
    }

    renderSignSelection(); // Wywołujemy uniwersalny wybór znaków
}

function updateUI() {
    // Statystyki górnego paska
    if (document.getElementById('goldDisp')) document.getElementById('goldDisp').innerText = stats.gold;
    if (document.getElementById('atkDisp')) document.getElementById('atkDisp').innerText = stats.atk;
    if (document.getElementById('armDisp')) document.getElementById('armDisp').innerText = stats.arm;
    if (document.getElementById('agiDisp')) document.getElementById('agiDisp').innerText = stats.agi;

    const pBar = document.getElementById('pHpBar');
    const blood = document.getElementById('blood-overlay');
    let pPerc = (stats.hp / stats.maxHp) * 100;

    // Sprawdzamy czy jesteśmy w trakcie walki
    const isGameScreen = document.getElementById('game').style.display === 'block';

    // Obsługa efektu krwawienia - Zawsze aktywny poniżej 25% w walce
    if (blood) {
        if (pPerc <= 40 && stats.hp > 0 && isGameScreen) {
            blood.classList.add('low-hp-vignette');
        } else if (!isGameScreen || pPerc > 25) {
            blood.classList.remove('low-hp-vignette');
        }
    }

    // Pasek HP gracza i napisy
    if (pBar) {
        pBar.style.width = Math.max(0, pPerc) + "%";
        document.getElementById('pHpVal').innerText = Math.max(0, Math.floor(stats.hp));
        document.getElementById('pMaxHpVal').innerText = stats.maxHp;

        // Pulsowanie paska HP
        if (pPerc <= 25) pBar.parentElement.classList.add('low-hp');
        else pBar.parentElement.classList.remove('low-hp');
    }
}

function buyItem(id) {
    const item = shopItems.find(i => i.id === id);
    if (!item) return;

    if (stats.gold < item.price) {
        showToast("Za mało złota!", "red");
        return;
    }

    // PANCERNA LOGIKA ZUŻYWALNYCH
    if (item.type === 'consumable') {
        if (item.sub === 'pot') {
            if (stats.pot >= 5) return showToast("Max 5 mikstur!");
            stats.pot++;
        }
        else if (item.sub === 'bomb') {
            if (stats.bomb >= 10) return showToast("Max 10 petard!");
            stats.bomb++;
        }
        else if (item.sub === 'atk_perm') stats.atk += 5;
        else if (item.sub === 'arm_perm') stats.arm += 5;
        // Dodaj tutaj inne efekty sub jeśli potrzebujesz
    }
    else {
        // Przedmioty trwałe trafiają do juków
        inventory.push({ ...item, instanceId: Date.now() + Math.random() });
    }

    stats.gold -= item.price;
    showToast(`Kupiono: ${item.name}`, "var(--gold)");

    // KLUCZOWY ZAPIS: Po każdej transakcji
    updateUI();
    saveGame();
}

function sellItem(index) {
    const item = inventory[index];
    if (!item) return;

    const isEquippedSlot = Object.keys(equipped).find(type => equipped[type] === item);
    if (isEquippedSlot) {
        unequip(isEquippedSlot);
    }

    const sellPrice = Math.floor(item.price * 0.5);
    stats.gold += sellPrice;
    inventory.splice(index, 1);

    showToast(`Sprzedano: ${item.name} (+${sellPrice} 💰)`, "#ffd700");

    // KLUCZOWY ZAPIS: Po sprzedaży
    renderInventory();
    updateUI();
    saveGame();
}

function finalizePurchase(price, name) {
    stats.gold -= price;
    addLog(`Kupiono: ${name}`, "#4caf50");
    updateUI();
    saveGame();
}

function equip(index) {
    const item = inventory[index];
    if (!item) return;
    const type = item.type;

    // 1. Jeśli już coś mamy w tym slocie - najpierw zdejmij (pancerne czyszczenie)
    if (equipped[type]) unequip(type);

    equipped[type] = item;

    // 2. Dodaj bonusy (Pancerne skalowanie statystyk)
    if (item.atk) stats.atk += item.atk;
    if (item.arm) stats.arm += item.arm;
    if (item.agi) stats.agi += item.agi;

    // Jeśli przedmiot daje życie, zwiększamy max i aktualne HP
    if (item.maxHp) {
        stats.maxHp += item.maxHp;
        stats.hp += item.maxHp;
    }

    showToast(`Założono: ${item.name}`, "#4caf50");
    renderInventory();
    updateUI();
    saveGame(); // Dodane przy okazji (Problem 6 rozwiązujemy częściowo już tutaj!)
}

function unequip(type) {
    const item = equipped[type];
    if (!item) return;

    // 1. Odejmij bonusy
    if (item.atk) stats.atk -= item.atk;
    if (item.arm) stats.arm -= item.arm;
    if (item.agi) stats.agi -= item.agi;

    // 2. PANCERNA LOGIKA HP: Postać nie może umrzeć od zdjęcia zbroi
    if (item.maxHp) {
        stats.maxHp -= item.maxHp;
        // Zmniejszamy HP, ale nigdy nie pozwalamy spaść poniżej 1 HP
        stats.hp = Math.max(1, Math.min(stats.hp, stats.maxHp));
    }

    equipped[type] = null;
    showToast(`Zdjęto: ${item.name}`, "gray");
    renderInventory();
    updateUI();
    saveGame(); // Dodane dla spójności zapisu
}





function startBattle(monsterKey, forcedHp = null) {
    const data = monsterTemplates[monsterKey];
    if (!data) return;

    battleState.active = true;
    battleState.quenActive = false;
    battleState.igniBuffTicks = 0;
    signsUsed = { igni: false, quen: false, yrden: false, axii: false, aard: false };

    monster = {
        ...data,
        key: monsterKey,
        maxHp: data.hp,
        hp: forcedHp !== null ? forcedHp : data.hp,
        arm: data.arm || 0,
        style: data.style || 'normal',
        baseSpeed: data.baseSpeed || 1.0,
        yrdenTicks: 0,
        axiiTicks: 0,
        aardStun: false,
        frenzyLogged: false // <-- PANCERNY RESET FLAGI NA START
    };

    const sideMenu = document.querySelector('.side-panel');
    sideMenu.classList.remove('active');

    document.getElementById('mImg').src = monster.img;
    document.getElementById('mName').innerText = monster.name;

    // Dodatkowy reset wizualny paska na wszelki wypadek
    document.getElementById('mHpBar').parentElement.classList.remove('monster-frenzy-active');

    playerTurnActive = true;
    document.getElementById('battleActions').style.display = 'grid';
    document.getElementById('battleActions').style.opacity = "1";
    document.getElementById('exitBattleBtn').style.display = "none";
    document.getElementById('finishBtn').style.display = 'none';

    updateMonsterHP();
    updateUI();
    switchTab('game');

    localStorage.setItem('witcher_in_battle', JSON.stringify({
        inBattle: true,
        monsterKey: monsterKey,
        monsterHp: monster.hp
    }));
}



function finishBattle() {
    stopDodgeMove();
    signsUsed = { igni: false, quen: false, yrden: false, axii: false, aard: false };

    // 1. PANCERNY RESET SZALU: Usuwamy klasę wizualną z paska HP potwora
    const mHpBarContainer = document.getElementById('mHpBar').parentElement;
    if (mHpBarContainer) {
        mHpBarContainer.classList.remove('monster-frenzy-active');
    }

    // Wymuszone usunięcie klasy krwawienia przy wyjściu
    const blood = document.getElementById('blood-overlay');
    if (blood) blood.className = "blood-vignette";

    if (currentTurnTimer) {
        clearTimeout(currentTurnTimer);
        currentTurnTimer = null;
    }

    // Regeneracja po walce
    if (stats.hp > 0 && monster && !monster.name.includes("Kukła")) {
        regenerateAfterBattle();
    }

    localStorage.removeItem('witcher_in_battle');
    playerTurnActive = true;
    document.getElementById('exitBattleBtn').style.display = "none";
    document.getElementById('finishBtn').style.display = "none";

    if (monster && monster.name && monster.name.includes("Kukła")) {
        switchTab('training');
    } else {
        switchTab('menu');
    }

    // 2. CZYSZCZENIE OBIEKTU: To ostatecznie zabija flagi typu frenzyLogged
    monster = {};
    updateUI();
}


function handleAction(type) {
    hideTooltip();
    if (!playerTurnActive || monster.hp <= 0) return;

    const mImg = document.getElementById('mImg');
    const container = document.getElementById('mainContainer');

    // SŁOWNIK AKCJI - MODUŁOWY I ELASTYCZNY
    const actions = {
        'attack': () => {
            let rawDmg = stats.atk + Math.floor(Math.random() * 10);
            applyPlayerDamage(Math.max(2, rawDmg - monster.arm), 0.1, "Szybkie cięcie!", "#eee",
                { minSpeed: 2.5, maxSpeed: 4.5, size: 85 });
        },
        'igni': () => {
            if (signsUsed.igni) return;
            signsUsed.igni = true;
            openWitcherPanel('none');

            let igniDmg = 20 + Math.floor(stats.atk * 0.4);

            // PANCERNA ZMIANA: Buff trafia do battleState, nie do stats
            battleState.igniBuffTicks = 4;

            addLog("IGNI! Twoje ostrza chłoną żar i zadają +75% DMG!", "#ff8c00");

            applyPlayerDamage(igniDmg, 0.1, "Ogień spala wroga!", "#ff8c00",
                { minSpeed: 2.5, maxSpeed: 4.5, size: 80 });
        },
        'quen': () => {
            if (signsUsed.quen) return;
            signsUsed.quen = true;
            openWitcherPanel('none');

            quenActive = true;
            // Leczenie: 15% max HP (zamiast 25%) - bezpieczniejszy start
            let heal = Math.floor(stats.maxHp * 0.15);
            stats.hp = Math.min(stats.maxHp, stats.hp + heal);

            addLog(`QUEN! Tarcza chroni wiedźmina (+${heal} HP).`, "#4682b4");
            updateUI();

            // Konsumuje turę, aby wymusić wybór: leczenie czy atak?
            playerTurnActive = false;
            setTimeout(monsterTurn, 800);
        },
        'yrden': () => {
            if (signsUsed.yrden) return;
            signsUsed.yrden = true;
            openWitcherPanel('none');

            monster.yrdenTicks = 4; // <--- WZMOCNIENIE: Z 3 na 5 tur
            addLog("YRDEN! Pułapka ekstremalnie spowalnia ruchy bestii.", "#8a2be2");

            playerTurnActive = true;
            document.getElementById('battleActions').style.opacity = "1";
        },
        'axii': () => {
            if (signsUsed.axii) return;
            signsUsed.axii = true;
            openWitcherPanel('none');

            monster.axiiTicks = 6; // Krótszy czas trwania na starcie
            addLog("AXII! Potwór traci rezon.", "#50c878");

            playerTurnActive = true;
            document.getElementById('battleActions').style.opacity = "1";
        },
        'aard': () => {
            if (signsUsed.aard) return;
            signsUsed.aard = true;
            openWitcherPanel('none');

            // TRWAŁE OSŁABIENIE (Punkt 1)
            monster.arm = Math.floor(monster.arm * 0.7); // Wróg traci 30% pancerza
            stats.arm = Math.floor(stats.arm * 0.85);    // Ty tracisz 15% pancerza (ryzyko!)

            addLog("AARD! Fala uderzeniowa rozbiła pancerze obu walczących!", "#87ceeb");

            // NIE KOŃCZY TURY (Punkt 1)
            playerTurnActive = true;
            document.getElementById('battleActions').style.opacity = "1";
            updateUI();
        },

        'potion': () => {
            if (stats.pot > 0 && stats.hp < stats.maxHp) {
                stats.pot--;
                let healVal = stats.maxHp * 0.4;
                stats.hp = Math.min(stats.maxHp, stats.hp + healVal);
                addLog("Wypito Jaskółkę! + 40% HP", "#00ff00");

                // PANCERNE ODŚWIEŻENIE: Przebudowujemy panel, aby pokazać nową ilość (np. 4 zamiast 5)
                openWitcherPanel('inv');

                const container = document.getElementById('mainContainer');
                container.classList.add('heal-effect');
                setTimeout(() => container.classList.remove('heal-effect'), 600);

                updateUI();
                saveGame(); // Zapisujemy stan po wypiciu
            } else {
                showToast("Nie możesz teraz użyć mikstury!", "gray");
            }
        },
        'bomb': () => {
            if (stats.bomb > 0) {
                stats.bomb--;
                addLog("Bomba wybuchła! -150 DMG", "#ff4500");
                monster.hp -= 150;

                // PANCERNE ODŚWIEŻENIE: Przebudowujemy panel, aby pokazać nową ilość
                openWitcherPanel('inv');

                updateMonsterHP();
                updateUI();
                saveGame(); // Zapisujemy stan po rzucie
                checkWinOrContinue({ minSpeed: 2, maxSpeed: 3, size: 100 });
            } else {
                showToast("Brak petard!", "gray");
            }
        }

    };

    // WYWOŁANIE AKCJI
    if (actions[type]) actions[type]();

    // --- WEWNĘTRZNE FUNKCJE POMOCNICZE ---

    function applyPlayerDamage(dmg, critChance, msg, color, nextDifficulty) {
        playerTurnActive = false;
        document.getElementById('battleActions').style.opacity = "0.5";

        // --- PANCERNY BALANS DMG (Zasada 10% Przebicia) ---
        // Obliczamy surowe obrażenia (Atak - Pancerz wroga)
        let rawDmg = dmg - monster.arm;
        // Gwarantujemy, że wiedźmin zawsze zada minimum 10% swojego Ataku
        let minDmg = Math.max(5, Math.floor(stats.atk * 0.10));
        let finalDmg = Math.max(minDmg, rawDmg);

        // 2. Bonus z IGNI (liczony od finalnych obrażeń)
        if (battleState.igniBuffTicks > 0) {
            finalDmg = Math.floor(finalDmg * 1.75);
            battleState.igniBuffTicks--;
            msg += " (Płonące ostrze!)";
        }

        // 3. Krytyk
        let isCrit = Math.random() < critChance;
        if (isCrit) {
            finalDmg = Math.floor(finalDmg * 2.5);
            addLog("TRAFIENIE KRYTYCZNE!", "#ff4500");
        }

        showDamagePopup(finalDmg, isCrit);
        addLog(msg, color);
        monster.hp -= finalDmg;
        updateMonsterHP();

        // 4. LOGIKA FRENZY (Punkt 4 - już wdrożony, zostaje tutaj)
        let isFrenzy = (monster.hp / monster.maxHp) <= 0.3;
        if (isFrenzy) {
            nextDifficulty.minSpeed *= 1.25;
            nextDifficulty.maxSpeed *= 1.25;
        }

        const mImg = document.getElementById('mImg');
        mImg.classList.add('dmg-monster');
        setTimeout(() => mImg.classList.remove('dmg-monster'), 500);

        checkWinOrContinue(nextDifficulty);
    }




    function checkWinOrContinue(nextDifficulty) {
        if (monster.hp <= 0) {
            win();
        } else {
            currentDodgeDifficulty = nextDifficulty;
            setTimeout(monsterTurn, 800);
        }
    }
}

function setRandomPosition(element) {
    const container = document.getElementById('game');
    const padding = 60;
    const maxX = container.clientWidth - element.clientWidth - padding;
    const maxY = container.clientHeight - element.clientHeight - padding;

    const randomX = Math.max(padding, Math.floor(Math.random() * maxX));
    const randomY = Math.max(padding, Math.floor(Math.random() * maxY));

    element.style.left = randomX + "px";
    element.style.top = randomY + "px";
}

function monsterTurn() {
    if (monster.hp <= 0) return;

    if (monster.aardStun || (monster.axiiTicks > 0 && Math.random() < 0.6)) {
        if (monster.aardStun) monster.aardStun = false;
        if (monster.axiiTicks > 0) monster.axiiTicks--;
        addLog("Potwór traci orientację... Twoja tura!", "#50c878");
        playerTurnActive = true;
        document.getElementById('battleActions').style.opacity = "1";
        return;
    }

    stopDodgeMove();

    const dBtn = document.getElementById('dodgeBtn');
    const area = document.getElementById('game');
    const container = document.getElementById('mainContainer');
    const agiBonus = 1 + (stats.agi - 10) * 0.02;

    let activeStyleKey = monster.style;
    let styleData = BATTLE_STYLES[activeStyleKey] || BATTLE_STYLES['normal'];

    if (activeStyleKey === 'gaunter') {
        const availableKeys = Object.keys(BATTLE_STYLES).filter(k => k !== 'gaunter' && k !== 'normal');
        const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];
        activeStyleKey = randomKey;
        styleData = BATTLE_STYLES[randomKey];

        container.classList.add('chaos-flash');
        setTimeout(() => container.classList.remove('chaos-flash'), 500);
        addLog(`PAN LUSTERKO: ${styleData.name.toUpperCase()}!`, "var(--gold)");
    }

    const isYrdenActive = monster.yrdenTicks > 0;
    if (isYrdenActive) dBtn.classList.add('yrden-glow');

    hitsNeeded = styleData.hits || 1;
    dBtn.innerText = hitsNeeded > 1 ? `KLIKNIJ x${hitsNeeded}` : "UNIK!";
    dBtn.style.display = "flex";
    canDodge = true;

    const startX = Math.random() * (area.clientWidth - 80);
    const startY = Math.random() * (area.clientHeight - 80);

    // PANCERNA ZMIANA: Przekazujemy wylosowany styleData jako ostatni argument
    applyStyleBehavior(dBtn, area, startX, startY, null, null, false, styleData);

    if (activeStyleKey === 'mirage') {
        for (let i = 0; i < 2; i++) {
            const fake = document.createElement('button');
            fake.className = 'fake-dodge';
            if (isYrdenActive) fake.classList.add('yrden-glow');
            fake.innerText = "UNIK?";
            // LOSUJEMY RÓŻNE POZYCJE STARTOWE DLA KAŻDEGO MIRAŻU
            const fX = Math.random() * (area.clientWidth - 80);
            const fY = Math.random() * (area.clientHeight - 80);
            area.appendChild(fake);
            applyStyleBehavior(fake, area, fX, fY, null, null, false, styleData);
            fake.onmousedown = (e) => { e.stopPropagation(); if (!canDodge) return; stopDodgeMove(); applyMonsterDamage(); };
        }
    }

    if (activeStyleKey === 'combo') reactionTime *= 0.8;


    if (isYrdenActive) monster.yrdenTicks--;
    const monsterIndex = Object.keys(monsterTemplates).indexOf(monster.key) || 0;
    let reactionTime = isYrdenActive ? 4000 : Math.max(800, 1600 - (monsterIndex * 100));

    currentTurnTimer = setTimeout(() => { if (canDodge) { stopDodgeMove(); applyMonsterDamage(); } }, reactionTime);
}

function removeFakes() {
    isMirageActive = false;
    document.querySelectorAll('.fake-dodge').forEach(f => f.remove());
}

function stopDodgeMove() {
    canDodge = false;
    currentMoveState = null;

    // Czyścimy wszystkie interwały ruchu przycisku i miraży
    if (dodgeIntervals && dodgeIntervals.length > 0) {
        dodgeIntervals.forEach(clearInterval);
        dodgeIntervals = [];
    }

    // Czyścimy główny timer reakcji (ten, który zadaje obrażenia po czasie)
    if (currentTurnTimer) {
        clearTimeout(currentTurnTimer);
        currentTurnTimer = null;
    }

    const dBtn = document.getElementById('dodgeBtn');
    if (dBtn) {
        dBtn.style.display = "none";
        dBtn.classList.remove('yrden-glow');
    }

    removeFakes(); // Usuwamy wszystkie przyciski-miraże z ekranu
}

function doDodge() {
    if (!canDodge) return;

    if (monster.style === 'combo' && hitsNeeded > 1) {
        hitsNeeded--;
        const dBtn = document.getElementById('dodgeBtn');
        const area = document.getElementById('game');
        dBtn.innerText = `KLIKNIJ x${hitsNeeded}`;

        // 1. PANCERNE WYLICZANIE CZASU (Punkt 8)
        // Baza to 1000ms. Dzielimy przez baseSpeed potwora i dodajemy bonus za Twoją zwinność.
        // Formuła: 1000ms / (SzybkośćPotwora * BonusTwojejZwinności)
        const agiBonus = 1 + (stats.agi - 10) * 0.02; // Każdy punkt ponad 10 daje 2% więcej czasu
        const reactionWindow = Math.max(300, 1100 / (monster.baseSpeed * agiBonus));

        // 2. AKTUALIZACJA POZYCJI (Z poprzedniej poprawki)
        if (dBtn._moveState) {
            const padding = 60;
            const maxX = area.clientWidth - dBtn.clientWidth - padding;
            const maxY = area.clientHeight - dBtn.clientHeight - padding;
            dBtn._moveState.x = Math.max(padding, Math.floor(Math.random() * maxX));
            dBtn._moveState.y = Math.max(padding, Math.floor(Math.random() * maxY));
            dBtn.style.left = dBtn._moveState.x + "px";
            dBtn.style.top = dBtn._moveState.y + "px";
        }

        // 3. RESET TIMERA Z NOWYM, KRÓTSZYM CZASEM
        if (currentTurnTimer) clearTimeout(currentTurnTimer);
        currentTurnTimer = setTimeout(() => {
            if (canDodge) {
                stopDodgeMove();
                applyMonsterDamage();
            }
        }, reactionWindow);

        return;
    }

    // Standardowy unik (bez zmian)
    if (currentTurnTimer) clearTimeout(currentTurnTimer);
    stopDodgeMove();
    playerTurnActive = true;
    document.getElementById('battleActions').style.opacity = "1";
    addLog("UNIKNIĘTO ATAKU!", "var(--gold)");
}






function applyMonsterDamage() {
    const blood = document.getElementById('blood-overlay');
    const container = document.getElementById('mainContainer');

    // PANCERNE ZABEZPIECZENIE: Zatrzymujemy WSZYSTKIE liczniki i ruchy natychmiast po trafieniu
    stopDodgeMove();

    playerTurnActive = true;
    document.getElementById('battleActions').style.opacity = "1";

    // 1. Sprawdzenie czy to trening (Kukła)
    if (monster.name.includes("Kukła")) {
        addLog("Kukła by Cię trafiła! Ćwicz dalej.", "orange");
        container.classList.add('hit-screen');
        setTimeout(() => container.classList.remove('hit-screen'), 400);
        return;
    }

    // 2. Obsługa znaku QUEN
    if (quenActive) {
        quenActive = false;
        if (Math.random() < 0.5) {
            let reflectedDmg = Math.floor(monster.atk * 0.5);
            monster.hp -= reflectedDmg;
            addLog(`QUEN ODBIJA ATAK! Potwór otrzymuje ${reflectedDmg} DMG!`, "#4682b4");
            updateMonsterHP();
        } else {
            addLog("Quen odpiera cios, ale nie odbija energii.", "gray");
        }
        container.classList.add('dodge');
        setTimeout(() => container.classList.remove('dodge'), 400);
        return;
    }

    // 3. REALNE OBRAŻENIA
    let damageTaken = Math.max(5, monster.atk - stats.arm);
    stats.hp -= damageTaken;

    addLog(`Potwór trafia! Tracisz ${damageTaken} HP.`, "red");
    container.classList.add('hit-screen');
    setTimeout(() => container.classList.remove('hit-screen'), 400);

    if (blood) {
        blood.classList.remove('hit-vignette');
        void blood.offsetWidth;
        blood.classList.add('hit-vignette');
    }

    updateUI();

    if (stats.hp <= 0) {
        handleDeath();
    }
}

function handleDeath() {
    stopDodgeMove();
    localStorage.removeItem('witcher_in_battle');

    // Usuń krew przy śmierci
    const blood = document.getElementById('blood-overlay');
    if (blood) blood.className = "blood-vignette";

    const report = document.getElementById('death-report');
    let goldLost = Math.floor(stats.gold * 0.3);
    stats.gold -= goldLost;

    let lostItemName = "Brak (miałeś farta)";
    const equippedTypes = Object.keys(equipped).filter(type => equipped[type] !== null);

    if (equippedTypes.length > 0) {
        let randomSlot = equippedTypes[Math.floor(Math.random() * equippedTypes.length)];
        let item = equipped[randomSlot];
        lostItemName = `${item.name} (STRACONY)`;
        const invIndex = inventory.findIndex(i => i === item);
        if (invIndex > -1) inventory.splice(invIndex, 1);
        unequip(randomSlot);
    }

    report.innerHTML = `💰 Złoto: -${goldLost} koron<br>🎒 Ekwipunek: ${lostItemName}`;
    document.getElementById('death-screen').style.display = "flex";
    saveGame();
}

function respawn() {
    // Powrót do życia z 50% HP
    stats.hp = Math.floor(stats.maxHp * 0.5);

    document.getElementById('death-screen').style.display = "none";

    // PANCERNE CZYSZCZENIE: Śmierć definitywnie kończy sesję walki w pamięci
    localStorage.removeItem('witcher_in_battle');

    updateUI();
    switchTab('menu');

    // KLUCZOWY ZAPIS: Stan po zmartwychwstaniu
    saveGame();
}

function updateMonsterHP() {
    let perc = (monster.hp / monster.maxHp) * 100;
    document.getElementById('mHpBar').style.width = Math.max(0, perc) + "%";
    document.getElementById('mHpVal').innerText = Math.max(0, Math.floor(monster.hp));

    // PANCERNY LOG SZALU: Odpala się tylko raz
    if (perc <= 30 && !monster.frenzyLogged) {
        addLog(`${monster.name.toUpperCase()} WPADA W SZAŁ!`, "red");
        monster.frenzyLogged = true; // Flaga, żeby nie spamować logu
    }
}


function addLog(msg, color) {
    const log = document.getElementById('log');
    log.innerHTML = `<div style="color:${color}">> ${msg}</div>` + log.innerHTML;
}

function win() {
    // 1. OBLICZANIE NAGRODY (Armor Tax - modularny balans)
    let armorTax = Math.min(0.5, (stats.arm / 20000));
    let finalReward = Math.floor(monster.reward * (1 - armorTax));

    addLog(`ZWYCIĘSTWO! Zdobyto ${finalReward} koron.`, "#ffd700");

    // 2. LOGIKA ODBLOKOWYWANIA NOWYCH ZLECEŃ (Pancerna Progresja)
    if (monster.key && !monster.key.includes("Kukła")) {
        const monsterKeys = Object.keys(monsterTemplates);
        const currentIndex = monsterKeys.indexOf(monster.key);

        // ZMIANA PANCERNA: Sprawdzamy czy pokonany potwór jest na szczycie naszych aktualnych możliwości
        // Używamy >= aby uniknąć błędów przy ewentualnych przeskokach w liście
        if (currentIndex >= stats.maxUnlockedIndex && stats.maxUnlockedIndex < monsterKeys.length - 1) {
            stats.maxUnlockedIndex = currentIndex + 1; // Odblokowujemy dokładnie następnego potwora w kolejce

            showToast("NOWE ZLECENIE ODBLOKOWANE!", "var(--gold)");
            addLog("Twoja sława rośnie! Nowy potwór na tablicy.", "gold");
        }
    }

    // 3. ZAMKNIĘCIE INTERFEJSU WALKI
    document.getElementById('battleActions').style.display = 'none';
    const fBtn = document.getElementById('finishBtn');
    fBtn.innerText = "💰 ODBIERZ NAGRODĘ I WRÓĆ";
    fBtn.style.display = 'block';

    // 4. ZAPIS STANU (Pancerne utrwalenie postępu)
    stats.gold += finalReward;
    updateUI();
    saveGame();
}

function useItemFromBattle(id) {
    // 1. SZUKAMY PRZEDMIOTU W PLECAKU
    hideTooltip();
    const itemIndex = inventory.findIndex(i => i.id === id);


    if (itemIndex === -1) {
        showToast("Nie masz już tego przedmiotu!", "gray");
        return;
    }

    const item = inventory[itemIndex];

    // 2. LOGIKA EFEKTÓW (Modularna - możesz tu dopisać co chcesz)
    if (item.type === 'consumable') {
        // Przykład: Eliksir Puszczyk (id 14) daje +5 Ataku na stałe
        if (item.sub === 'atk_perm') {
            stats.atk += 5;
            addLog(`Użyto: ${item.name}. Atak wzrósł o 5!`, "#daa520");
        }
        // Przykład: Grom (id 17) daje +5 Obrony na stałe
        else if (item.sub === 'arm_perm') {
            stats.arm += 5;
            addLog(`Użyto: ${item.name}. Obrona wzrosła o 5!`, "#daa520");
        }
        // Przykład: Filtr Petriego (id 47) - wzmocnienie (na razie log)
        else if (item.sub === 'sign_perm') {
            addLog(`Użyto: ${item.name}. Moc znaków wzrosła!`, "#daa520");
        }
        // Przykład: Dekokt Raffarda (id 46) - Pełne leczenie
        else if (item.sub === 'pot_full') {
            stats.hp = stats.maxHp;
            addLog(`Użyto: ${item.name}. Pełna regeneracja!`, "#4caf50");
        }

        // 3. ZUŻYCIE PRZEDMIOTU
        inventory.splice(itemIndex, 1); // Usuwamy jedną sztukę z tablicy

        // 4. PANCERNE ODŚWIEŻENIE
        updateUI();      // Aktualizuje paski HP i cyfry na górze
        saveGame();      // Zapisuje, żeby gracz nie "oszukał" odświeżeniem strony
        openWitcherPanel('inv'); // PRZEBUDOWUJE MENU: ilość spadnie (np. z 2 na 1) lub przycisk zniknie

        // Efekt wizualny leczenia jeśli to był eliksir zdrowia
        if (item.sub === 'pot_full') {
            const container = document.getElementById('mainContainer');
            container.classList.add('heal-effect');
            setTimeout(() => container.classList.remove('heal-effect'), 600);
        }
    }
}



function renderSignSelection() {
    const list = document.getElementById('sign-selection-list');
    if (!list) return;

    // Obiektowa baza znaków (łatwa do rozbudowy w przyszłości)
    const allSigns = [
        { id: 'igni', name: 'Igni', icon: '🔥', desc: 'DMG +75%' },
        { id: 'quen', name: 'Quen', icon: '🛡️', desc: 'Tarcza & Heal' },
        { id: 'yrden', name: 'Yrden', icon: '🔮', desc: 'Spowolnienie' },
        { id: 'axii', name: 'Axii', icon: '🌀', desc: 'Oszołomienie' },
        { id: 'aard', name: 'Aard', icon: '💨', desc: '-30% ARM Wroga' }
    ];

    // Ustawienia układu (Twoje style)
    list.style.display = "grid";
    list.style.gridTemplateColumns = "repeat(auto-fit, minmax(85px, 1fr))";
    list.style.gap = "10px";

    list.innerHTML = allSigns.map(z => {
        const isSelected = selectedSigns.includes(z.id);

        return `
            <div onclick="selectSign('${z.id}')" 
                 onmouseenter="showTooltip(event, 'sign', '${z.id}')" 
                 onmousemove="moveTooltip(event)" 
                 onmouseleave="hideTooltip()"
                 style="cursor:pointer; display:flex; flex-direction:column; align-items:center; padding:10px; 
                        border:2px solid ${isSelected ? 'var(--gold)' : '#333'}; 
                        background:${isSelected ? '#252525' : '#151515'}; 
                        border-radius:8px; transition: 0.2s;">
                <span style="font-size:1.4rem; margin-bottom:4px;">${z.icon}</span>
                <span style="font-size:0.7rem; font-weight:bold; color:${isSelected ? 'var(--gold)' : '#eee'}; text-transform:uppercase;">${z.name}</span>
                <span style="font-size:0.5rem; color:#d4af37; text-align:center; margin-top:2px;">${z.desc}</span>
            </div>
        `;
    }).join('');
}





function selectSign(id) {
    if (selectedSigns.includes(id)) {
        selectedSigns = selectedSigns.filter(s => s !== id);
    } else {
        if (selectedSigns.length >= 3) {
            showToast("Możesz wybrać tylko 3 znaki!", "red");
            return;
        }
        selectedSigns.push(id);
    }
    renderSignSelection(); // Odświeża widok w ekwipunku
}

function openWitcherPanel(type) {
    const sideMenu = document.getElementById('sideMenuContainer');
    if (!sideMenu) return;

    if (sideMenu.classList.contains('active') && lastOpenedId === type) {
        closeSideMenu();
        return;
    }
    lastOpenedId = type;
    sideMenu.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'panel-content visible';

    if (type === 'signs') {
        wrapper.innerHTML = '<h4>✨ ZNAKI WIEDŹMIŃSKIE</h4>';
        // Mapa ikon dla znaków
        const signIcons = { igni: '🔥', quen: '🛡️', yrden: '🔮', axii: '🌀', aard: '💨' };

        selectedSigns.forEach(id => {
            const isUsed = signsUsed[id];
            const icon = signIcons[id] || '✨';

            wrapper.innerHTML += `
                <button onclick="${isUsed ? '' : `handleAction('${id}'); closeSideMenu();`}" 
                        onmouseenter="showTooltip(event, 'sign', '${id}')" 
                        onmousemove="moveTooltip(event)" 
                        onmouseleave="hideTooltip()"
                        ${isUsed ? 'disabled' : ''} 
                        style="width:100%; margin-bottom:10px;">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <span>${id.toUpperCase()} ${isUsed ? '(WYCZERPANY)' : ''}</span>
                </button>`;
        });
    }

    if (type === 'inv') {
        wrapper.innerHTML = '<h4>🎒 PAS I JUKI</h4>';

        let battleItems = [];
        // Mapowanie stałych zapasów z ikonami
        if (stats.pot > 0) battleItems.push({ id: 13, ...shopItems.find(i => i.id === 13), name: `🧪 JASKÓŁKA (${stats.pot})`, action: "potion" });
        if (stats.bomb > 0) battleItems.push({ id: 15, ...shopItems.find(i => i.id === 15), name: `💣 SAMUM (${stats.bomb})`, action: "bomb" });

        const counts = {};
        inventory.forEach(item => {
            if (item.type === 'consumable' && item.id !== 13 && item.id !== 15) {
                counts[item.id] = { ...item, qty: (counts[item.id]?.qty || 0) + 1 };
            }
        });

        Object.keys(counts).forEach(id => {
            const itemData = counts[id];
            const icon = itemData.sub && itemData.sub.includes('bomb') ? '💣' : '🧪';
            battleItems.push({ ...itemData, name: `${icon} ${itemData.name.toUpperCase()} (${itemData.qty})`, action: `useItemFromBattle(${id})` });
        });

        if (battleItems.length === 0) {
            wrapper.innerHTML += '<p style="color:#666;">Puste juki...</p>';
        } else {
            battleItems.forEach(item => {
                const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
                // Każda akcja zamyka menu, by gracz widział efekt (np. animację leczenia)
                const finalAction = item.action.includes('(') ? `${item.action}; closeSideMenu();` : `handleAction('${item.action}'); closeSideMenu();`;

                wrapper.innerHTML += `
                    <button onclick="${finalAction}" 
                            onmouseenter="showTooltip(event, 'item', ${itemJson})" 
                            onmousemove="moveTooltip(event)" 
                            onmouseleave="hideTooltip()"
                            style="width:100%; margin-bottom:10px;">
                        ${item.name}
                    </button>`;
            });
        }
    }

    wrapper.innerHTML += `<button onclick="closeSideMenu(); hideTooltip();" class="btn-close" style="width:100%; margin-top:auto;">POWRÓT</button>`;
    sideMenu.appendChild(wrapper);
    sideMenu.classList.add('active');
}









function showToast(msg, color = "var(--gold)") {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeftColor = color;
    toast.innerText = msg;
    area.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function saveGame() {
    const gameState = {
        stats: stats, // Upewnij się, że stats.maxUnlockedIndex tu jest
        inventory: inventory,
        equippedIds: {
            weapon: equipped.weapon ? equipped.weapon.id : null,
            armor: equipped.armor ? equipped.armor.id : null,
            trinket: equipped.trinket ? equipped.trinket.id : null
        }
    };
    localStorage.setItem('witcher_save', JSON.stringify(gameState));
    showToast("Postęp zapisany", "#4682b4");
}

function confirmItemSale(index) {
    const item = inventory[index];
    if (!item) return;

    openModal(
        "ZATWIERDZENIE SPRZEDAŻY",
        `Czy na pewno chcesz sprzedać ${item.name} za ${Math.floor(item.price * 0.5)} 💰?`,
        () => {
            const sellPrice = Math.floor(item.price * 0.5);
            stats.gold += sellPrice;

            // Uniequip jeśli przedmiot jest na wiedźminie
            const slot = Object.keys(equipped).find(k => equipped[k] === item);
            if (slot) unequip(slot);

            inventory.splice(index, 1);
            closeSideMenu();
            renderInventory();
            updateUI();
            showToast(`Sprzedano: ${item.name}`);
        }
    );
}

function loadGame() {
    const saved = localStorage.getItem('witcher_save');
    if (saved) {
        const data = JSON.parse(saved);
        stats = data.stats;

        if (stats.maxUnlockedIndex === undefined) {
            stats.maxUnlockedIndex = 0;
        }

        inventory = data.inventory || [];
        if (data.equippedIds) {
            Object.keys(data.equippedIds).forEach(slot => {
                const id = data.equippedIds[slot];
                if (id) {
                    const item = inventory.find(i => i.id === id);
                    if (item) equipped[slot] = item;
                }
            });
        }
    }

    // PANCERNY MECHANIZM REANIMACJI WALKI
    const battleRecovery = localStorage.getItem('witcher_in_battle');
    if (battleRecovery) {
        const recoverData = JSON.parse(battleRecovery);
        if (recoverData && recoverData.inBattle) {
            console.log("Wykryto przerwaną walkę! Powrót na szlak...");
            // Odpalamy walkę ponownie, przekazując zapisane HP potwora
            setTimeout(() => {
                startBattle(recoverData.monsterKey, recoverData.monsterHp);
            }, 100);
            return; // Przerywamy standardowe ładowanie UI, startBattle zrobi to za nas
        }
    }

    updateUI();
}


function openModal(title, text, onConfirm) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-text').innerText = text;
    modal.style.display = 'flex';

    // Obsługa przycisku TAK
    document.getElementById('modal-confirm-btn').onclick = () => {
        onConfirm();
        modal.style.display = 'none';
    };

    // Obsługa przycisku ANULUJ
    document.getElementById('modal-cancel-btn').onclick = () => {
        modal.style.display = 'none';
    };
}

function confirmReset() {
    openModal(
        "PORZUCENIE SZLAKU",
        "Czy na pewno chcesz zacząć od nowa? Stracisz wszystkie przedmioty i złoto.",
        () => {
            // Drugie potwierdzenie (zgodnie z Twoją prośbą)
            setTimeout(() => {
                openModal(
                    "OSTATECZNA DECYZJA",
                    "To Twoja ostatnia szansa. Na pewno usunąć zapis gry?",
                    resetGame
                );
            }, 300);
        }
    );
}

function resetGame() {
    localStorage.removeItem('witcher_save');
    localStorage.removeItem('witcher_in_battle');

    stats = {
        gold: 300,
        atk: 15,
        arm: 0,
        agi: 10,
        pot: 1,
        bomb: 0,
        hp: 100,
        maxHp: 100,
        igniBuffTicks: 0,
        maxUnlockedIndex: 0
    };

    inventory = [];
    equipped = { weapon: null, armor: null, trinket: null };
    selectedSigns = ['igni', 'quen', 'yrden']; // Reset domyślnych znaków
    signsUsed = { igni: false, quen: false, yrden: false, axii: false, aard: false };

    updateUI();
    renderInventory();
    renderSignSelection();

    showToast("Zresetowano postęp. Szlak zaczyna się od nowa.", "#8e2727");
    switchTab('menu');
}


// Główna logika ruchów w monsterTurn()
// Dodaliśmy parametr forcedStyle na końcu


function applyStyleBehavior(dBtn, area, posX, posY, customMoveX, customMoveY, shouldStop = true, forcedStyle = null) {
    const styleData = forcedStyle || BATTLE_STYLES[monster.style] || BATTLE_STYLES['normal'];

    if (shouldStop) {
        stopDodgeMove();
        canDodge = true;
    }

    dBtn.style.display = "flex";
    dBtn.style.pointerEvents = "auto";

    // --- LOGIKA MONSTER FRENZY ---
    // Jeśli potwór ma poniżej 30% HP, wpada w szał (+25% do prędkości)
    const isFrenzy = (monster.hp / monster.maxHp) <= 0.3;
    const frenzyMult = isFrenzy ? 1.25 : 1.0;

    // Wizualizacja szału na pasku HP
    const mHpBarContainer = document.getElementById('mHpBar').parentElement;
    if (isFrenzy) {
        mHpBarContainer.classList.add('monster-frenzy-active');
    } else {
        mHpBarContainer.classList.remove('monster-frenzy-active');
    }

    const monsterLevelMult = 1 + (monster.arm / 1500);
    const mBaseSpeed = (monster.baseSpeed || 1.0) * monsterLevelMult;
    const agiFactor = Math.max(0.15, 1 / (1 + (stats.agi - 10) * 0.025));
    const yrdenMult = (monster.yrdenTicks > 0) ? 0.3 : 1;

    // Mnożymy finalną prędkość przez frenzyMult
    let finalSpeedMult = Math.min(10.0, mBaseSpeed * agiFactor * yrdenMult * frenzyMult);

    let localPos = {
        x: posX,
        y: posY,
        angle: Math.random() * Math.PI * 2,
        t: 0,
        mX: customMoveX || (2 + Math.random()) * (Math.random() > 0.5 ? 1 : -1),
        mY: customMoveY || (2 + Math.random()) * (Math.random() > 0.5 ? 1 : -1)
    };

    if (styleData.init) Object.assign(localPos, styleData.init(area));
    dBtn._moveState = localPos;

    const interval = setInterval(() => {
        const next = styleData.update(localPos.t, localPos, { x: localPos.mX, y: localPos.mY }, finalSpeedMult, area, dBtn);

        localPos.x = next.x;
        localPos.y = next.y;
        if (next.angle !== undefined) localPos.angle = next.angle;
        if (next.t !== undefined) localPos.t = next.t;

        if (!styleData.noBounce && !styleData.static) {
            if (localPos.x <= 0) { localPos.x = 0; localPos.mX *= -1; }
            if (localPos.x >= area.clientWidth - dBtn.clientWidth) { localPos.x = area.clientWidth - dBtn.clientWidth; localPos.mX *= -1; }
            if (localPos.y <= 0) { localPos.y = 0; localPos.mY *= -1; }
            if (localPos.y >= area.clientHeight - dBtn.clientHeight) { localPos.y = area.clientHeight - dBtn.clientHeight; localPos.mY *= -1; }
        }

        dBtn.style.left = localPos.x + "px";
        dBtn.style.top = localPos.y + "px";
    }, 16);

    dodgeIntervals.push(interval);
}






// Funkcja startująca trening (bezpieczna walka)
function startTraining(styleKey, monsterName = null) {
    // 1. CZYSZCZENIE STANU (Pancerne zatrzymanie wszystkiego)
    stopDodgeMove();
    if (currentTurnTimer) clearTimeout(currentTurnTimer);

    const styleData = BATTLE_STYLES[styleKey];
    if (!styleData) return;

    // 2. POBIERANIE SZYBKOŚCI (Z suwaka, który jest ustawiany ręcznie lub przez startMonsterSimulation)
    const simulatedDifficulty = parseFloat(document.getElementById('agiSlider').value);

    // 3. DEFINICJA KUKŁY (Modularna)
    // Jeśli monsterName jest podane, nazwa to "Kukła: Nazwa Potwora", jeśli nie, to "Kukła: Nazwa Stylu"
    const displayName = monsterName ? `Kukła: ${monsterName}` : `Kukła: ${styleData.name}`;

    monster = {
        name: displayName,
        hp: 999999,
        maxHp: 999999,
        atk: 0,
        arm: 0,
        reward: 0,
        style: styleKey,
        baseSpeed: simulatedDifficulty,
        img: "kukla.png", // Domyślny obrazek kukły (można podmienić w startMonsterSimulation)
        key: 'training_dummy' // Klucz do rozpoznawania trybu treningu w innych funkcjach
    };

    // 4. PRZEŁĄCZENIE EKRANU I UI
    switchTab('game');

    document.getElementById('mName').innerText = monster.name;
    document.getElementById('mImg').src = monster.img;
    document.getElementById('log').innerHTML = "";

    // 5. OBSŁUGA PRZYCISKÓW (Zapewnienie możliwości wyjścia X)
    document.getElementById('exitBattleBtn').style.display = "flex";
    document.getElementById('finishBtn').style.display = "none";
    document.getElementById('battleActions').style.display = 'grid';
    document.getElementById('battleActions').style.opacity = "1";

    // 6. AKTUALIZACJA WIDOKU
    updateMonsterHP();
    updateUI();

    addLog(`TRENING ROZPOCZĘTY: ${displayName}. Szybkość: ${simulatedDifficulty}x.`, "gold");
}


function showDamagePopup(amount, isCrit = false) {
    const area = document.querySelector('.visual-area');
    if (!area) return;

    const popup = document.createElement('div');
    popup.className = 'dmg-popup';

    // Jeśli trafienie krytyczne, dodajemy wykrzykniki i złoty kolor
    if (isCrit) {
        popup.style.color = "#ffcc00";
        popup.style.fontSize = "3.5rem";
        popup.innerText = `-${amount}!!`;
    } else {
        popup.innerText = `-${amount}`;
    }

    area.appendChild(popup);

    // Usuwamy element po zakończeniu animacji (0.8s)
    setTimeout(() => {
        popup.remove();
    }, 800);
}

function getRandomGaunterStyle() {
    const styles = Object.keys(BATTLE_STYLES).filter(s => s !== 'normal'); // Wykluczamy 'normal', żeby było trudniej
    return styles[Math.floor(Math.random() * styles.length)];
}

function regenerateAfterBattle() {
    // Regeneracja 30% maksymalnego zdrowia po każdej walce
    let healAmount = Math.floor(stats.maxHp * 0.3);
    stats.hp = Math.min(stats.maxHp, stats.hp + healAmount);

    showToast(`Odpoczynek: +${healAmount} HP`, "#2ecc71");
    updateUI();
}

// Poprawiona funkcja openItemPreview
function openItemPreview(idOrObject, isShop = true, inventoryIndex = null) {
    const sideMenu = document.querySelector('.side-panel');
    let currentId = isShop ? idOrObject : `inv-${inventoryIndex}`;

    // 1. Logika TOGGLE
    if (lastOpenedId === currentId && sideMenu.classList.contains('active')) {
        closeSideMenu();
        return;
    }

    let item;
    if (isShop) {
        item = (typeof idOrObject === 'object') ? idOrObject : shopItems.find(i => i.id === idOrObject);
    } else {
        item = inventory[inventoryIndex];
    }

    if (!item) return;
    lastOpenedId = currentId;

    // 2. CZYŚCIMY I TWORZYMY STRUKTURĘ Z KLASĄ .visible (Pancerny Fix)
    sideMenu.innerHTML = '';
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'panel-content visible'; // .visible wymusza display: flex !important

    contentWrapper.innerHTML = `
        <h2 style="color:var(--gold); font-size:1.1rem; margin:0 0 10px 0; text-transform:uppercase; border-bottom:1px solid #333; padding-bottom:10px; width:100%; text-align:center;">
            ${item.name}
        </h2>
        <div style="flex-grow: 1; overflow-y: auto; margin-bottom: 20px; width:100%;">
            <p style="font-size:0.9rem; color:#ccc; line-height:1.5; font-style:italic; margin:15px 0;">"${item.desc}"</p>
            <div style="background:rgba(255,255,255,0.05); padding:12px; border:1px solid #222; border-radius:5px;">
                <div style="font-size:0.6rem; color:#666; text-transform:uppercase; margin-bottom:5px;">Statystyki:</div>
                ${item.atk ? `<div style="color:#ff4444;">⚔️ Atak: +${item.atk}</div>` : ''}
                ${item.arm ? `<div style="color:var(--armor);">🛡️ Pancerz: +${item.arm}</div>` : ''}
                ${item.agi ? `<div style="color:#2ecc71;">👟 Zwinność: +${item.agi}</div>` : ''}
                ${item.maxHp ? `<div style="color:#ff4444;">❤️ HP: +${item.maxHp}</div>` : ''}
            </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
            ${isShop ?
            `<button class="btn-buy" onclick="buyItem(${item.id}); closeSideMenu();" style="width:100%;">ZAKUP (${item.price} 💰)</button>` :
            `<button class="btn-buy" onclick="equip(${inventoryIndex}); closeSideMenu();" style="width:100%;">ZAŁÓŻ PRZEDMIOT</button>
                 <button onclick="confirmItemSale(${inventoryIndex})" style="background:none; border:1px solid #444; color:#8e2727; font-size:0.7rem; padding:10px; cursor:pointer; width:100%;">SPRZEDAJ</button>`
        }
            <button onclick="closeSideMenu()" style="background:#111; border:1px solid #333; color:#555; font-size:0.7rem; padding:10px; cursor:pointer; width:100%;">POWRÓT</button>
        </div>
    `;

    sideMenu.appendChild(contentWrapper);
    sideMenu.classList.add('active');
}


function closeSideMenu() {
    const sideMenu = document.querySelector('.side-panel');
    if (!sideMenu || !sideMenu.classList.contains('active')) return;

    hideTooltip(); // Pancerne ukrycie tooltipa przy zamykaniu menu
    sideMenu.classList.remove('active');
    sideMenu.classList.add('closing');

    setTimeout(() => {
        sideMenu.classList.remove('closing');
        lastOpenedId = null;
    }, 400);
}





// Inteligentna funkcja Tooltipa (Modularna)
function showTooltip(e, type, data) {
    const tt = document.getElementById('item-tooltip');
    if (!tt) return;

    let title = "Nieznany obiekt";
    let desc = "";
    let statsHtml = "";

    // DYNAMICZNE ROZPOZNAWANIE (Obiektowe)
    if (type === 'item') {
        title = data.name || "Przedmiot";
        desc = data.desc || "";

        // Mapowanie kluczy statystyk na czytelne ikony i nazwy
        const statMap = {
            atk: '⚔️ Atak',
            arm: '🛡️ Pancerz',
            agi: '👟 Zwinność',
            maxHp: '❤️ Życie'
        };

        // Automatyczne skanowanie obiektu pod kątem statystyk
        Object.keys(statMap).forEach(key => {
            if (data[key]) {
                statsHtml += `<div style="color:var(--gold); font-size:0.7rem; margin-top:2px;">${statMap[key]}: +${data[key]}</div>`;
            }
        });
    }
    else if (type === 'sign') {
        const signInfo = {
            igni: { n: "Igni", d: "Fala ognia: 80 DMG + efekt Płonącego Ostrza (+75% DMG)." },
            quen: { n: "Quen", d: "Tarcza i natychmiastowe leczenie 15% HP." },
            yrden: { n: "Yrden", d: "Pułapka spowalniająca potwora. Nie kończy tury." },
            axii: { n: "Axii", d: "Oszołomienie wroga (szansa na chybienie tury)." },
            aard: { n: "Aard", d: "Fala uderzeniowa niszcząca 30% pancerza." }
        };
        const s = signInfo[data] || { n: data, d: "" };
        title = `Znak ${s.n}`;
        desc = s.d;
    }

    tt.innerHTML = `
        <div style="font-weight:bold; color:var(--gold); border-bottom:1px solid #444; padding-bottom:5px; margin-bottom:5px; text-transform:uppercase; font-size:0.85rem;">${title}</div>
        ${desc ? `<div style="font-size:0.75rem; color:#ccc; font-style:italic; line-height:1.3;">${desc}</div>` : ''}
        ${statsHtml ? `<div style="margin-top:8px; border-top:1px solid #222; padding-top:5px;">${statsHtml}</div>` : ''}
    `;

    tt.style.display = 'block';
    moveTooltip(e);
}

function moveTooltip(e) {
    const tt = document.getElementById('item-tooltip');
    if (tt && tt.style.display === 'block') {
        tt.style.left = (e.clientX + 15) + 'px';
        tt.style.top = (e.clientY + 15) + 'px';
    }
}

function hideTooltip() {
    const tt = document.getElementById('item-tooltip');
    if (tt) tt.style.display = 'none';
}


// 1. FUNKCJA PRZEŁĄCZAJĄCA TRYBY TRENINGU
function toggleTrainingMode(mode) {
    const classic = document.getElementById('training-classic');
    const monsters = document.getElementById('training-monsters');

    if (!classic || !monsters) return; // Zabezpieczenie przed błędami DOM

    if (mode === 'monsters') {
        classic.style.display = 'none';
        monsters.style.display = 'block';
        renderTrainingMonsterList(); // Generujemy listę w momencie pokazania kontenera
    } else {
        classic.style.display = 'block';
        monsters.style.display = 'none';
    }
}


// 2. RENDEROWANIE LISTY POTWORÓW W TRENINGU
function renderTrainingMonsterList() {
    const list = document.getElementById('training-monster-list');
    if (!list) return;

    const monsterKeys = Object.keys(monsterTemplates);
    const unlocked = stats.maxUnlockedIndex || 0;

    list.innerHTML = monsterKeys.map((key, index) => {
        const m = monsterTemplates[key];
        const isUnlocked = index <= unlocked;

        // PANCERNE ZABEZPIECZENIE (Fix błędu undefined)
        // Sprawdzamy czy styl istnieje, jeśli nie - używamy 'normal'
        const styleInfo = BATTLE_STYLES[m.style] || BATTLE_STYLES['normal'];
        const styleName = styleInfo.name || "Klasyczny";

        return `
            <div class="monster-card ${!isUnlocked ? 'locked' : ''}" 
                 onclick="${isUnlocked ? `startMonsterSimulation('${key}')` : ''}" 
                 style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom:5px; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}">
                <div style="text-align: left;">
                    <div style="font-weight: bold; color: ${isUnlocked ? '#eee' : '#555'}">${isUnlocked ? '⚔️' : '🔒'} ${m.name}</div>
                    <div style="font-size: 0.6rem; color: #666; text-transform: uppercase;">Styl: ${styleName}</div>
                </div>
                ${isUnlocked ? `<span style="color: var(--gold); font-size: 0.7rem;">Szybkość: ${m.baseSpeed}x</span>` : ''}
            </div>`;
    }).join('');
}


// 3. START SYMULACJI (Pancerne ustawienie parametrów)
function startMonsterSimulation(monsterKey) {
    const m = monsterTemplates[monsterKey];
    if (!m) return;

    // 1. USTAWIANIE PARAMETRÓW SYMULACJI
    const slider = document.getElementById('agiSlider');
    const valDisp = document.getElementById('agiValue');

    if (slider) {
        slider.value = m.baseSpeed;
        if (valDisp) valDisp.innerText = parseFloat(m.baseSpeed).toFixed(1) + 'x';
    }

    // 2. WYWOŁANIE GŁÓWNEJ FUNKCJI TRENINGU
    startTraining(m.style, m.name.toUpperCase());

    // --- PANCERNY FIX: Przypisujemy klucz potwora do obiektu monster treningu ---
    // Bez tego monsterTurn nie wiedziałby, że "Kukła" to Gaunter i nie odpaliłby Chaosu
    monster.key = monsterKey;

    // 3. PODMIANA WIZUALNA
    const mImg = document.getElementById('mImg');
    if (mImg) mImg.src = m.img;

    // 4. LOGOWANIE SYSTEMOWE
    addLog(`SYMULACJA: ${m.name}. Styl bazowy: ${BATTLE_STYLES[m.style].name}`, "var(--gold)");
}
















