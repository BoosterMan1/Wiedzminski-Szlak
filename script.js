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
let signsCooldown = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };
let signsMaxCooldown = { igni: 5, quen: 4, yrden: 4, axii: 4, aard: 4 }; // YRDEN NERF/BUFF: Czas na 10 tur po zakończeniu efektu!
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
    maxUnlockedIndex: 0,
    difficultyMult: 1.0,
    difficultyName: 'Wyzwanie',
    playerName: 'Geralt',
    signUpgrades: { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 },
    signXp: { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 },
    tutorialsSeen: { hunt: false, shop: false, inventory: false, training: false }
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
        update: (f, pos, move, agi) => {
            // Combo porusza się wolniej, ale wymaga 3 kliknięć
            return {
                x: pos.x + move.x * 0.5 * agi,
                y: pos.y + move.y * 0.5 * agi
            };
        }
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
            let speedMult = isBlinking ? (6 * agi) : (2 * agi); // Zmniejszona prędkość mignięcia

            if (dBtn) {
                dBtn.style.opacity = isBlinking ? "0.3" : "1"; // Bardziej widoczny
                dBtn.style.pointerEvents = isBlinking ? "none" : "auto";
                dBtn.style.filter = isBlinking ? "blur(2px)" : "none";
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
    { id: 13, name: "Jaskółka", price: 60, type: 'consumable', sub: 'pot', rarity: 'common', desc: "🧪 Podstawowa regeneracja (+40% HP)." },
    { id: 15, name: "Samum", price: 200, type: 'consumable', sub: 'bomb', rarity: 'common', desc: "💣 Ogłuszająca petarda (150 DMG)." },
    { id: 14, name: "Puszczyk", price: 1500, type: 'consumable', sub: 'atk_perm', rarity: 'rare', desc: "📖 Wiedza o punktach witalnych (+5 Atak)." },
    { id: 17, name: "Grom", price: 1500, type: 'consumable', sub: 'arm_perm', rarity: 'rare', desc: "🧪 Alchemiczne wzmocnienie skóry (+5 Obrona)." },
    { id: 46, name: "Dekokt Raffarda Białego", price: 6000, type: 'consumable', sub: 'pot_full', rarity: 'epic', desc: "✨ Natychmiast leczy wszystkie rany." },
    { id: 16, name: "Kartacz", price: 2500, type: 'consumable', sub: 'bomb_super', rarity: 'rare', desc: "💥 Rozrywa pancerz wrogów (350 DMG)." },
    { id: 47, name: "Filtr Petriego", price: 12000, type: 'consumable', sub: 'sign_perm', rarity: 'epic', desc: "✨ Zwiększa moc znaków na stałe." },
    { id: 48, name: "Eliksir Oczyszczenia", price: 20000, type: 'consumable', sub: 'reset', rarity: 'epic', desc: "🌀 Pozwala zresetować statystyki." },

    // --- ZIOŁA ---
    { id: 101, name: "Jaskółcze ziele", price: 15, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Podstawowe zioło." },
    { id: 102, name: "Arenaria", price: 18, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Biały kwiat rosnący na równinach." },
    { id: 103, name: "Blekot", price: 20, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Roślina o ciemnych liściach." },
    { id: 104, name: "Szytna", price: 25, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Kłujący krzew." },
    { id: 105, name: "Wilczy aloes", price: 30, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Rzadka, zimowa odmiana aloesu." },
    { id: 106, name: "Ginatia", price: 35, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Płatki wykorzystywane w delikatnych eliksirach." },
    { id: 107, name: "Krew ghula", price: 80, type: 'consumable', sub: 'herb', rarity: 'epic', desc: "Składnik monstrualny. Cuchnie padliną." },
    { id: 108, name: "Płatki białego mirtu", price: 40, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Kwiaty o odurzającym zapachu." },
    { id: 109, name: "Korzeń mandragory", price: 100, type: 'consumable', sub: 'herb', rarity: 'epic', desc: "Niezwykle potężny katalizator." },
    { id: 110, name: "Siarka", price: 50, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Alchemiczny minerał o ostrym zapachu." },
    { id: 111, name: "Saletra", price: 45, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Proszek niezbędny do petard i eliksirów." },
    { id: 112, name: "Jad wiwerny", price: 150, type: 'consumable', sub: 'herb', rarity: 'legendary', desc: "Składnik monstrualny. Wysoce toksyczny." },
    { id: 113, name: "Wątroba wilkołaka", price: 180, type: 'consumable', sub: 'herb', rarity: 'legendary', desc: "Składnik monstrualny. Nasycona klątwą." },
    { id: 114, name: "Mózg utopca", price: 60, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Składnik monstrualny. Pokryty mułem." },
    { id: 115, name: "Oczy nekkera", price: 70, type: 'consumable', sub: 'herb', rarity: 'epic', desc: "Składnik monstrualny. Widzą w ciemności." },
    { id: 116, name: "Kordel", price: 15, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Pospolita, twarda roślina." },
    { id: 117, name: "Werbena", price: 20, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Zioło o fioletowych kwiatach." },
    { id: 118, name: "Szyszka chmielu", price: 10, type: 'consumable', sub: 'herb', rarity: 'common', desc: "Zwykle używana do piwa, też do alchemii." },
    { id: 119, name: "Ząb jadowy kikimory", price: 90, type: 'consumable', sub: 'herb', rarity: 'epic', desc: "Składnik monstrualny. Ostry jak brzytwa." },
    { id: 120, name: "Pustyrnik", price: 40, type: 'consumable', sub: 'herb', rarity: 'rare', desc: "Ziele używane do medytacji." },

    // --- OLEJE ---
    { id: 301, name: "Olej na Trupojady", price: 80, type: 'consumable', sub: 'oil', rarity: 'common', desc: "🗡️ +50% ATK przeciwko Trupojadom w najbliższej bitwie.", targetClass: 'Trupojad' },
    { id: 302, name: "Olej na Wampiry", price: 150, type: 'consumable', sub: 'oil', rarity: 'rare', desc: "🗡️ +50% ATK przeciw krwiopijcom w najbliższej bitwie.", targetClass: 'Wampir' },
    { id: 303, name: "Olej na Drakonidy", price: 150, type: 'consumable', sub: 'oil', rarity: 'rare', desc: "🗡️ +50% ATK przeciw bestiom z nieba w najbliższej bitwie.", targetClass: 'Drakonid' },
    { id: 304, name: "Olej na Relikty", price: 300, type: 'consumable', sub: 'oil', rarity: 'epic', desc: "🗡️ +50% ATK przeciw potężnym, wiecznym bestiom w najbliższej bitwie.", targetClass: 'Relikt' },

    // --- TALIZMANY ---
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
;








const monsterTemplates = {
    // POZIOM 1-3: Rozgrzewka
    'utopiec': { name: 'Utopiec', classDesc: 'Trupojad', hp: 200, atk: 20, arm: 5, reward: 80, style: 'normal', baseSpeed: 1.0, img: 'utopiec.webp', isBoss: false },
    'kikimora': { name: 'Kikimora Robotnica', classDesc: 'Istota Owadowata', hp: 320, atk: 28, arm: 8, reward: 110, style: 'combo', baseSpeed: 1.1, img: 'kikimora.webp', isBoss: false },
    'ghul': { name: 'Ghul Alghul', classDesc: 'Trupojad', hp: 450, atk: 35, arm: 15, reward: 160, style: 'charge', baseSpeed: 1.3, img: 'ghul.webp', isBoss: false },
    'baba_cmentarna': { name: 'Baba Cmentarna', classDesc: 'Trupojad', hp: 650, atk: 45, arm: 20, reward: 250, style: 'combo', baseSpeed: 1.4, img: 'baba.webp', isBoss: false },
    'poludnica': { name: 'Południca', classDesc: 'Upiór', hp: 900, atk: 55, arm: 35, reward: 350, style: 'mirage', baseSpeed: 1.5, img: 'polodnica.webp', isBoss: false },

    // POZIOM 4-6: Poważne zlecenia
    'bazyliszek': { name: 'Bazyliszek', classDesc: 'Drakonid', hp: 1600, atk: 80, arm: 55, reward: 750, style: 'blink', baseSpeed: 1.7, img: 'bazyliszek.webp', isBoss: false },
    'golem': { name: 'Golem Ziemi', classDesc: 'Istota Magiczna', hp: 2200, atk: 150, arm: 200, reward: 1000, style: 'normal', baseSpeed: 0.8, img: 'golem.webp', isBoss: false },
    'gryf': { name: 'Gryf Królewski', classDesc: 'Hybryda', hp: 3000, atk: 120, arm: 90, reward: 1400, style: 'charge', baseSpeed: 2.0, img: 'gryf.webp', isBoss: true },
    'wilkolak': { name: 'Wilkołak', classDesc: 'Przeklęty', hp: 5000, atk: 180, arm: 150, reward: 2800, style: 'combo', baseSpeed: 2.3, img: 'wilkolak.webp', isBoss: false },
    'wiwerna': { name: 'Królewska Wiwerna', classDesc: 'Drakonid', hp: 7200, atk: 220, arm: 190, reward: 4000, style: 'orbit', baseSpeed: 2.5, img: 'wiwerna.webp', isBoss: false },
    'leszy': { name: 'Starożytny Leszy', classDesc: 'Relikt', hp: 9500, atk: 280, arm: 250, reward: 5500, style: 'mirage', baseSpeed: 2.6, img: 'leszy.webp', isBoss: true },

    // POZIOM 7-9: Koszmary
    'bies': { name: 'Bies', classDesc: 'Relikt', hp: 22000, atk: 450, arm: 600, reward: 14000, style: 'blink', baseSpeed: 3.0, img: 'bies.webp', isBoss: true },
    'garkain': { name: 'Garkain (Wampir)', classDesc: 'Wampir', hp: 35000, atk: 650, arm: 800, reward: 22000, style: 'charge', baseSpeed: 3.5, img: 'garkain.webp', isBoss: false },
    'stara_przadka': { name: 'Prządka', classDesc: 'Relikt', hp: 45000, atk: 850, arm: 1200, reward: 35000, style: 'orbit', baseSpeed: 3.4, img: 'przadka.webp', isBoss: true },
    'detlaff': { name: 'Dettlaff (Wampir Wyższy)', classDesc: 'Wampir Wyższy', hp: 90000, atk: 1500, arm: 2500, reward: 85000, style: 'blink', baseSpeed: 4.0, img: 'detlaff.webp', isBoss: true },

    // POZIOM 10: Finał
    'ukryty': { name: 'Ukryty Wyższy Wampir', classDesc: 'Wampir Wyższy', hp: 250000, atk: 3500, arm: 6000, reward: 180000, style: 'blink', baseSpeed: 4.8, img: 'ukryty.webp', isBoss: true },
    'pan_lusterko': { name: 'Gaunter o\'Dim', classDesc: 'Demon', hp: 750000, atk: 8000, arm: 15000, reward: 500000, style: 'gaunter', baseSpeed: 5.5, img: 'gaunter.webp', isBoss: true }
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
    }
    if (tabId === 'shop') renderShop('blacksmith');
    if (tabId === 'hunt') renderMonsterBoard();
    if (tabId === 'alchemy') renderAlchemy();
    if (tabId === 'menu' || tabId === 'tutorial') updateUI();

    // TRENING: Tylko generujemy listę potworów "w tle"
    if (tabId === 'training') {
        renderTrainingMonsterList();
    }

    // Dynamiczny Tutorial
    if (stats.tutorialsSeen && tabId !== 'menu') {
        startAdHocTutorial(tabId);
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

    const onStart = () => {
        if (m.isBoss) {
            openModal(
                "⚠️ WALKA Z BOSSEM",
                `Rozpoczynasz walkę z BOSSEM: ${m.name.toUpperCase()}. Z tej walki NIE BĘDZIE UCIECZKI. Czy jesteś gotowy umrzeć?`,
                () => startBattle(monsterKey)
            );
        } else {
            startBattle(monsterKey);
        }
    };

    if (!isReady) {
        openModal(
            "⚠️ OSTRZEŻENIE",
            `Twoja broń może być za słaba na pancerz ${m.name.toUpperCase()}. Zadawane obrażenia będą minimalne. Czy na pewno chcesz podjąć zlecenie?`,
            () => onStart()
        );
    } else {
        onStart();
    }
}


function renderShop(merchantType = 'blacksmith') {
    const list = document.getElementById('shop-list');
    if (!list) return;

    // 1. FILTROWANIE
    let filtered = [];
    if (merchantType === 'blacksmith') {
        filtered = shopItems.filter(i => i.type === 'weapon' || i.type === 'armor');
    } else if (merchantType === 'herbalist') {
        filtered = shopItems.filter(i => i.type === 'consumable' && i.sub === 'herb');
    } else if (merchantType === 'merchant') {
        filtered = shopItems.filter(i => i.type === 'trinket' || (i.type === 'consumable' && i.sub !== 'herb' && i.sub !== 'pot' && i.sub !== 'pot_full' && i.sub !== 'oil'));
    } else {
        filtered = shopItems.filter(i => i.type === merchantType); // fallback
    }

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
        btn.style.borderColor = 'transparent';
        if (btn.getAttribute('onclick').includes(`'${merchantType}'`)) btn.style.borderBottomColor = 'var(--gold)';
    });
}




let currentInvTab = 'equipment';
function changeInvTab(tabName) {
    currentInvTab = tabName;
    document.querySelectorAll('.inv-tabs button').forEach(b => {
        b.style.background = '#222';
        b.style.color = '#fff';
        b.style.fontWeight = 'normal';
    });
    const activeBtn = document.getElementById('tab-' + tabName);
    if (activeBtn) {
        activeBtn.style.background = 'var(--gold)';
        activeBtn.style.color = 'black';
        activeBtn.style.fontWeight = 'bold';
    }
    renderInventory();
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
        return;
    }

    let filteredItems = [];
    if (currentInvTab === 'equipment') {
        filteredItems = inventory.filter(i => i.type === 'weapon' || i.type === 'armor' || i.type === 'trinket');
    } else if (currentInvTab === 'consumable') {
        filteredItems = inventory.filter(i => i.type === 'consumable' && i.sub !== 'herb' && i.sub !== 'recipe');
    } else if (currentInvTab === 'herb') {
        filteredItems = inventory.filter(i => i.type === 'consumable' && i.sub === 'herb');
    }

    if (filteredItems.length === 0) {
        list.innerHTML = "<div style='color:#666; padding:20px; text-align:center;'>Brak przedmiotów w tej kategorii...</div>";
        return;
    }

    list.innerHTML = `<div style="display:flex; flex-direction:column; gap:5px;">` + filteredItems.map(item => {
        const invIndex = inventory.indexOf(item);
        const isEquipped = Object.values(equipped).includes(item);
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');

        let customAction = `onclick="openItemPreview(null, false, ${invIndex})"`;

        return `
            <div class="item-card item-${item.rarity || 'common'}" 
                 style="opacity: ${isEquipped ? '0.5' : '1'}" 
                 ${customAction}
                 onmouseenter="showTooltip(event, 'item', ${itemJson})" 
                 onmousemove="moveTooltip(event)" 
                 onmouseleave="hideTooltip()">
                <div class="item-info">
                    <div class="item-type-icon">${item.rarity || 'common'}</div>
                    <div class="item-name">${item.name} ${isEquipped ? '(ZAŁOŻONO)' : ''} ${item.qty && item.qty > 1 ? 'x' + item.qty : ''}</div>
                </div>
            </div>`;
    }).join('') + `</div>`;
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
        else if (item.sub === 'oil') {
            stats.activeOil = item.targetClass;
            showToast(`Olej nałożono na klingę! (+50% DMG vs ${item.targetClass})`, "#d4af37");
            updateUI();
            saveGame();
            return; // Kończymy akcję dla oleju bez pobierania kopii do ekwipunku
        }
        else if (item.sub === 'atk_perm') stats.atk += 5;
        else if (item.sub === 'arm_perm') stats.arm += 5;
        else if (item.sub === 'herb') {
            inventory.push({ ...item, uid: Date.now() + Math.random() });
        }
    }
    else {
        // Przedmioty trwałe trafiają do juków
        inventory.push({ ...item, instanceId: Date.now() + Math.random() });
    }

    stats.gold -= item.price;
    showToast(`Kupiono: ${item.name}`, "var(--gold)");

    // KLUCZOWY ZAPIS: Po każdej transakcji
    updateUI();
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
    if (item.atk) stats.atk = Math.max(1, stats.atk - item.atk);
    if (item.arm) stats.arm = Math.max(0, stats.arm - item.arm);
    if (item.agi) stats.agi = Math.max(1, stats.agi - item.agi);

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
    signsCooldown = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };

    monster = {
        ...data,
        key: monsterKey,
        maxHp: Math.floor(data.hp * stats.difficultyMult),
        hp: forcedHp !== null ? forcedHp : Math.floor(data.hp * stats.difficultyMult),
        atk: Math.floor(data.atk * stats.difficultyMult),
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
    document.getElementById('exitBattleBtn').style.display = monster.isBoss ? "none" : "flex";
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
    signsCooldown = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };
    stats.activeOil = null; // Zresetuj olej po walce

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
            if (signsCooldown.igni > 0) return showToast(`Znak Igni ładuje się jeszcze ${signsCooldown.igni} tur!`, "gray");
            signsCooldown.igni = signsMaxCooldown.igni;
            stats.signXp.igni = (stats.signXp.igni || 0) + 1;
            openWitcherPanel('none');

            let igniDmg = 20 + Math.floor(stats.atk * 0.4);

            // PANCERNA ZMIANA: Buff trafia do battleState, nie do stats
            battleState.igniBuffTicks = 4;

            addLog("IGNI! Twoje ostrza chłoną żar i zadają +75% DMG!", "#ff8c00");

            applyPlayerDamage(igniDmg, 0.1, "Ogień spala wroga!", "#ff8c00",
                { minSpeed: 2.5, maxSpeed: 4.5, size: 80 });
        },
        'quen': () => {
            if (signsCooldown.quen > 0) return showToast(`Znak Quen ładuje się jeszcze ${signsCooldown.quen} tur!`, "gray");
            signsCooldown.quen = signsMaxCooldown.quen;
            stats.signXp.quen = (stats.signXp.quen || 0) + 1;
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
            if (signsCooldown.yrden > 0) return showToast(`Znak Yrden ładuje się jeszcze ${signsCooldown.yrden} tur!`, "gray");
            signsCooldown.yrden = signsMaxCooldown.yrden;
            stats.signXp.yrden = (stats.signXp.yrden || 0) + 1;
            openWitcherPanel('none');

            monster.yrdenTicks = 5; // WZMOCNIENIE: Z 3 na 5 tur (-50% szybkości)
            addLog("YRDEN! Pułapka ekstremalnie spowalnia bestię na 5 tur (-50% szybkości).", "#8a2be2");

            playerTurnActive = true;
            document.getElementById('battleActions').style.opacity = "1";
        },
        'axii': () => {
            if (signsCooldown.axii > 0) return showToast(`Znak Axii ładuje się jeszcze ${signsCooldown.axii} tur!`, "gray");
            signsCooldown.axii = signsMaxCooldown.axii;
            stats.signXp.axii = (stats.signXp.axii || 0) + 1;
            openWitcherPanel('none');

            monster.axiiTicks = 4; // Czas trwania na nowym poziomie balansowania
            addLog("AXII! Potwór traci rezon. Przerywasz jego szał, a ataki stają się klasyczne!", "#50c878");

            const container = document.getElementById('mainContainer');
            container.classList.add('axii-effect');
            setTimeout(() => container.classList.remove('axii-effect'), 500);

            playerTurnActive = true;
            document.getElementById('battleActions').style.opacity = "1";
        },
        'aard': () => {
            if (signsCooldown.aard > 0) return showToast(`Znak Aard ładuje się jeszcze ${signsCooldown.aard} tur!`, "gray");
            signsCooldown.aard = signsMaxCooldown.aard;
            stats.signXp.aard = (stats.signXp.aard || 0) + 1;
            openWitcherPanel('none');

            // TRWAŁE OSŁABIENIE (Zbalansowane)
            monster.arm = Math.floor(monster.arm * 0.85); // Wróg traci 15% pancerza

            addLog("AARD! Fala uderzeniowa rozbiła pancerz wroga o 15%!", "#87ceeb");

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

        function applyOilBuff(oilName, monsterClass) {
            if (!oilName) return 1.0;
            if (oilName === monsterClass) {
                return 1.5;
            }
            return 1.0;
        }

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

        // 3. OLEJ (Kluczowa klasyfikacyjna przewaga przez funkcję)
        let oilMultiplier = applyOilBuff(stats.activeOil, monster.classDesc);
        if (oilMultiplier > 1.0) {
            finalDmg = Math.floor(finalDmg * oilMultiplier);
            msg += " (Zabójczy Olej!)";
        }

        // 4. Krytyk
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
    if (monster.axiiTicks > 0) activeStyleKey = 'normal'; // AXII OVERRIDE
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

    // Zmniejszenie cooldownów znaków Z PANCERNĄ PAUZĄ (Czekają na zgaśnięcie efektu!)
    if (signsCooldown.igni > 0 && battleState.igniBuffTicks <= 0) signsCooldown.igni--;
    if (signsCooldown.yrden > 0 && monster.yrdenTicks <= 0) signsCooldown.yrden--;
    if (signsCooldown.axii > 0 && monster.axiiTicks <= 0) signsCooldown.axii--;
    if (signsCooldown.quen > 0 && !quenActive) signsCooldown.quen--;
    if (signsCooldown.aard > 0) signsCooldown.aard--; // Aard jest natychmiastowy

    if (isYrdenActive) monster.yrdenTicks--;
    const monsterIndex = Object.keys(monsterTemplates).indexOf(monster.key) || 0;
    let reactionTime = isYrdenActive ? 4000 : Math.max(800, 1600 - (monsterIndex * 100));

    currentTurnTimer = setTimeout(() => {
        if (typeof tutorialState !== 'undefined' && tutorialState.active && tutorialState.freezeDodge) return;
        if (canDodge) { stopDodgeMove(); applyMonsterDamage(); }
    }, reactionTime);
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
        let effectiveSpeed = monster.baseSpeed;
        if (monster.yrdenTicks && monster.yrdenTicks > 0) {
            effectiveSpeed *= 0.5; // Potężne 50% spowolnienia na bossów i potwory!
        }

        const agiBonus = 1 + (stats.agi - 10) * 0.02;
        const reactionWindow = Math.max(400, (1500 / (effectiveSpeed * agiBonus)));

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
            const container = document.getElementById('mainContainer');
            container.classList.add('heal-effect');
            setTimeout(() => container.classList.remove('heal-effect'), 600);
        }

        // --- LOSOWY WYWAR ---
        if (item.sub === 'random_pot') {
            if (Math.random() > 0.5) {
                let heal = Math.floor(stats.maxHp * 0.25);
                stats.hp = Math.min(stats.maxHp, stats.hp + heal);
                addLog(`Wypiłeś ${item.name}. Regeneracja! (+${heal} HP)`, "#2ecc71");
            } else {
                let dmg = Math.floor(stats.maxHp * 0.15);
                stats.hp -= dmg;
                addLog(`Wypiłeś ${item.name}. Trucizna! (-${dmg} HP)`, "red");
                if (stats.hp <= 0) stats.hp = 1;
            }
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
            const cd = signsCooldown[id];
            const isUsed = cd > 0;
            const icon = signIcons[id] || '✨';

            wrapper.innerHTML += `
                <button onclick="${isUsed ? '' : `handleAction('${id}'); closeSideMenu();`}" 
                        onmouseenter="showTooltip(event, 'sign', '${id}')" 
                        onmousemove="moveTooltip(event)" 
                        onmouseleave="hideTooltip()"
                        ${isUsed ? 'disabled' : ''} 
                        style="width:100%; margin-bottom:10px;">
                    <span style="font-size:1.2rem;">${icon}</span>
                    <span>${id.toUpperCase()} ${isUsed ? '(ZA ' + cd + ' TUR)' : ''}</span>
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

        if (stats.maxUnlockedIndex === undefined) stats.maxUnlockedIndex = 0;
        if (stats.playerName === undefined) stats.playerName = 'Geralt';
        if (stats.signUpgrades === undefined) stats.signUpgrades = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };
        if (stats.signXp === undefined) stats.signXp = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };
        const pnInput = document.getElementById('playerName');
        if (pnInput) pnInput.value = stats.playerName;

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
    } else {
        // Jeśli nie było zapisu, pokazujemy modal poziomu trudności
        document.getElementById('difficulty-modal').style.display = 'flex';
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

    // Inicjalizacja sprawdzania samouczków
    if (!stats.tutorialsSeen) {
        stats.tutorialsSeen = { main: false, postBattle: false, shop: false, char: false, training: false, alchemy: false };

        // Pytaj gdy świeża gra lub po prostu gra nie ma rekordu
        setTimeout(() => promptTutorial(), 600);
    }
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

function setDifficulty(name, mult) {
    stats.difficultyName = name;
    stats.difficultyMult = mult;
    document.getElementById('difficulty-modal').style.display = 'none';
    showToast(`Oto Twój szlak: ${name}`, "var(--gold)");
    saveGame();

    // Jeśli świeża gra
    if (!stats.tutorialsSeen || !stats.tutorialsSeen.main) {
        setTimeout(() => promptTutorial(), 600);
    }
}

function openSaveMenu() { document.getElementById('save-modal').style.display = 'flex'; }
function closeSaveMenu() { document.getElementById('save-modal').style.display = 'none'; }
function manualSave() { saveGame(); showToast("Zapis ręczny utworzony!", "#2ecc71"); closeSaveMenu(); }
function manualLoad() { loadGame(); showToast("Zapis wczytany!", "#2ecc71"); closeSaveMenu(); }

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
        maxUnlockedIndex: 0,
        difficultyMult: 1.0,
        difficultyName: 'Wyzwanie',
        playerName: 'Geralt',
        signUpgrades: { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 },
        signXp: { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 },
        tutorialsSeen: { hunt: false, shop: false, inventory: false, training: false }
    };

    const pnInput = document.getElementById('playerName');
    if (pnInput) pnInput.value = "Geralt";

    inventory = [];
    equipped = { weapon: null, armor: null, trinket: null };
    signsCooldown = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };

    updateUI();
    renderInventory();
    renderSignSelection();

    showToast("Zresetowano postęp. Szlak zaczyna się od nowa.", "#8e2727");
    switchTab('menu');
    document.getElementById('difficulty-modal').style.display = 'flex';
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
    // Jeśli potwór ma poniżej 30% HP, wpada w szał (+25% do prędkości). Axii to anuluje.
    const isFrenzy = ((monster.hp / monster.maxHp) <= 0.3) && !(monster.axiiTicks > 0);
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
    addLog(`SYMULACJA: ${m.name}. Klasa: ${m.classDesc || 'Brak'}`, "var(--gold)");
}


// ------------------- ALCHEMIA SYSTEM -------------------
let cauldronItems = [];
let currentAlchemyTab = 'herbs'; // 'herbs' lub 'recipes'

function renderAlchemyTab(tabName) {
    currentAlchemyTab = tabName;
    document.getElementById('alchemy-tab-herbs').style.background = tabName === 'herbs' ? 'var(--gold)' : '#222';
    document.getElementById('alchemy-tab-herbs').style.color = tabName === 'herbs' ? 'black' : '#fff';
    document.getElementById('alchemy-tab-recipes').style.background = tabName === 'recipes' ? 'var(--gold)' : '#222';
    document.getElementById('alchemy-tab-recipes').style.color = tabName === 'recipes' ? 'black' : '#fff';
    renderAlchemy();
}

function renderAlchemy() {
    const list = document.getElementById('herbs-list');
    if (!list) return;

    // Renderowanie slotów kotła
    for (let i = 1; i <= 4; i++) {
        let slotEl = document.getElementById(`alchemy-slot-${i}`);
        if (!slotEl) continue;
        let rom = i === 1 ? 'I.' : i === 2 ? 'II.' : i === 3 ? 'III.' : 'IV.';
        if (cauldronItems[i - 1]) {
            slotEl.innerHTML = `<span style="color:var(--gold);">${rom} ${cauldronItems[i - 1].name}</span>`;
            slotEl.style.borderColor = "var(--gold)";
        } else {
            slotEl.innerHTML = `${rom} Pusto`;
            slotEl.style.borderColor = "#555";
            slotEl.style.color = "#888";
        }
    }

    // Renderowanie zawartości dolnej tablicy
    if (currentAlchemyTab === 'herbs') {
        let herbs = inventory.filter(i => i.sub === 'herb');
        if (herbs.length === 0) {
            list.innerHTML = "<div style='color:gray; width:100%; text-align:center;'>Brak ziół w ekwipunku... Kup coś u Zielarki.</div>";
        } else {
            list.innerHTML = herbs.map((item, index) => {
                const globalIndex = inventory.indexOf(item);
                return `<button class="menu-btn" onclick="addToCauldron('${item.id}', ${globalIndex})" style="font-size:0.7rem; padding: 5px; flex: 1 1 30%; max-width: 30%;">+ ${item.name}</button>`;
            }).join('');
        }
    } else {
        // Obliczamy limit receptur - co 2 odkryte potwory
        let limit = Math.floor((stats.maxUnlockedIndex || 0) / 2);
        let allowedRecipes = RECIPES_BY_NAMES.filter(r => r.unlockIndex <= limit);

        if (allowedRecipes.length === 0) {
            list.innerHTML = "<div style='color:gray; width:100%; text-align:center;'>Nie poznałeś jeszcze żadnych receptur. Poluj dalej!</div>";
        } else {
            list.innerHTML = allowedRecipes.map(r => {
                return `<div style="width: 100%; background: #333; padding: 5px; margin-bottom: 5px; font-size: 0.75rem; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">${r.target}</strong>: ${r.seq.join(' + ')}
                </div>`;
            }).join('');
        }
    }
}

function addToCauldron(id, invIndex) {
    if (cauldronItems.length >= 4) {
        showToast("Kocioł jest pełny! (Max 4 składniki)", "red");
        return;
    }
    const realIndex = inventory.findIndex(i => i.id == id);
    if (realIndex !== -1) {
        cauldronItems.push(inventory[realIndex]);
        inventory.splice(realIndex, 1);
        renderAlchemy();
    }
}

// Baza receptur – unlockIndex oznacza wymagane maxUnlockedIndex potwora / 2.
const RECIPES_BY_NAMES = [
    { target: "Jaskółka", seq: ["Jaskółcze ziele", "Arenaria", "Kordel"], resultId: 13, unlockIndex: 0 },
    { target: "Samum", seq: ["Saletra", "Siarka", "Szyszka chmielu"], resultId: 15, unlockIndex: 0 },
    { target: "Olej na Trupojady", seq: ["Blekot", "Krew ghula", "Mózg utopca"], resultId: 301, unlockIndex: 1 },
    { target: "Olej na Wampiry", seq: ["Korzeń mandragory", "Płatki białego mirtu", "Ginatia"], resultId: 302, unlockIndex: 2 },
    { target: "Olej na Drakonidy", seq: ["Jad wiwerny", "Werbena", "Saletra"], resultId: 303, unlockIndex: 3 },
    { target: "Olej na Relikty", seq: ["Wątroba wilkołaka", "Wilczy aloes", "Ząb jadowy kikimory"], resultId: 304, unlockIndex: 4 },
    { target: "Dekokt Raffarda Białego", seq: ["Jaskółcze ziele", "Korzeń mandragory", "Oczy nekkera", "Pustyrnik"], resultId: 46, unlockIndex: 5 },
    { target: "Grom", seq: ["Arenaria", "Krew ghula", "Werbena", "Szytna"], resultId: 17, unlockIndex: 5 }
];

function brewPotion() {
    if (cauldronItems.length < 2) {
        showToast("Wrzuć co najmniej 2 zioła do Kotła!", "gray");
        return;
    }

    if (tutorialState.active && tutorialState.step === 20) {
        advanceTutorial();
    }

    let btn = document.getElementById('btn-brew');
    let oldBtnText = btn.innerText;
    btn.innerText = "🔥 WARZENIE... 🔥";
    document.querySelectorAll('.alchemy-slot').forEach(s => s.style.backgroundColor = 'rgba(46,204,113,0.3)');

    setTimeout(() => {
        btn.innerText = oldBtnText;
        document.querySelectorAll('.alchemy-slot').forEach(s => s.style.backgroundColor = 'transparent');

        let seqNames = cauldronItems.map(i => i.name).sort().join(',');

        let crafted = null;
        for (let r of RECIPES_BY_NAMES) {
            let limit = Math.floor((stats.maxUnlockedIndex || 0) / 2);
            let isUnlocked = (r.unlockIndex <= limit);
            if (r.seq.slice().sort().join(',') === seqNames) {
                if (isUnlocked) {
                    crafted = r;
                    break;
                } else {
                    crafted = r;
                    break;
                }
            }
        }

        if (crafted) {
            let newItem = shopItems.find(i => i.id === crafted.resultId);
            if (!newItem) {
                newItem = { id: 900 + Math.floor(Math.random() * 100), name: crafted.target, type: 'consumable', sub: (crafted.target.includes('Olej') ? 'oil' : 'potion'), price: 50, desc: `Wytworzone samodzielnie w kotle.` };
            }
            if (crafted.target === "Jaskółka" || newItem.sub === 'potion') stats.pot++;
            if (crafted.target === "Samum" || newItem.sub === 'bomb') stats.bomb++;

            let itemClone = JSON.parse(JSON.stringify(newItem));
            itemClone.uid = Date.now() + Math.random();
            inventory.push(itemClone);

            addLog(`UWARZYŁEŚ: ${crafted.target}!`, "#2ecc71");
            showToast(`Uwarzono: ${crafted.target}`, "#2ecc71");
        } else {
            // LOSOWY WYWAR!
            let garbage = { id: 999, uid: Date.now(), name: "Losowy Wywar", type: "consumable", sub: "random_pot", price: 1, desc: "Nieznana mieszanka. Pijesz na własne ryzyko.", icon: "🗑️" };
            inventory.push(garbage);
            addLog(`Porażka! Kocioł wypluł dym i osad. Otrzymujesz Losowy Wywar.`, "red");
            showToast("Otrzymano: Losowy Wywar!", "red");
        }

        cauldronItems = [];
        renderAlchemy();
        updateUI();
        saveGame();
    }, 800);
}

function emptyCauldron() {
    cauldronItems.forEach(h => inventory.push(h));
    cauldronItems = [];
    renderAlchemy();
}

// ------------------- SKRÓTY KLAWISZOWE -------------------
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Escape') {
        const modal = document.getElementById('custom-modal');
        if (modal && modal.style.display === 'flex') {
            document.getElementById('modal-cancel-btn').click();
            return;
        }

        const difModal = document.getElementById('difficulty-modal');
        if (difModal && difModal.style.display === 'flex') return; // Nie zamknie wyboru trundności

        const saveModal = document.getElementById('save-modal');
        if (saveModal && saveModal.style.display === 'flex') {
            closeSaveMenu();
            return;
        }

        const sideMenu = document.querySelector('.side-panel');
        if (sideMenu && sideMenu.classList.contains('active')) {
            closeSideMenu();
            return;
        }

        const gameContainer = document.getElementById('game');
        if (gameContainer && gameContainer.style.display === 'block') {
            const exitBtn = document.getElementById('exitBattleBtn');
            if (exitBtn && exitBtn.style.display !== 'none') {
                exitBtn.click();
            }
            return;
        }

        const menu = document.getElementById('menu');
        if (menu && menu.style.display !== 'block') {
            switchTab('menu');
        }
    }
});

// ------------------- INNE / WIEDŹMIN -------------------
function saveName(val) {
    stats.playerName = val || "Wiedźmin";
    saveGame();
    showToast(`Witaj, ${stats.playerName}!`, "#4caf50");
}

function tryUpgradeSign(signId) {
    const level = stats.signUpgrades[signId];
    const xp = stats.signXp[signId] || 0;
    const cost = 5 + (level * 5); // Koszt w punktach doświadczenia ZNAKU: najpierw 5 użyć, potem 10, itd.

    if (xp >= cost) {
        if (signsMaxCooldown[signId] <= 1) {
            showToast("Znak osiągnął Maksymalny Poziom Biegłości!", "gray");
            return;
        }
        stats.signXp[signId] -= cost;
        stats.signUpgrades[signId]++;
        signsMaxCooldown[signId]--;
        saveGame();
        updateUI();
        showToast(`Biegłość w znaku ${signId.toUpperCase()} zrosła! Serce wali Wolniej...`, "var(--gold)");
        upgradeSignsUI();
    } else {
        showToast(`Masz zbyt mało biegłości (${xp}/${cost} wymaganych użyć w walce)`, "red");
    }
}

function upgradeSignsUI() {
    const sideMenu = document.getElementById('sideMenuContainer');
    sideMenu.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'panel-content visible';
    wrapper.innerHTML = `<h4>✨ DRZEWKO ZNAKÓW</h4>
    <p style="font-size:0.7rem; color:#ccc; margin-bottom:10px;">Każde użycie znaku to jeden punkt.</p>`;

    Object.keys(signsMaxCooldown).forEach(id => {
        const level = stats.signUpgrades[id];
        const xp = stats.signXp[id] || 0;
        const cost = 5 + (level * 5);
        const maxed = signsMaxCooldown[id] <= 1;

        wrapper.innerHTML += `
            <button onclick="tryUpgradeSign('${id}')" style="width:100%; margin-bottom:10px; padding: 10px; background: ${maxed ? '#111' : (xp >= cost ? 'var(--gold)' : '#222')}; color: ${(xp >= cost && !maxed) ? '#000' : '#fff'}; border: 1px solid ${maxed ? '#111' : 'var(--gold)'}; text-align: left;">
                <div style="font-weight: bold; font-size: 1rem;">${id.toUpperCase()} <span style="font-size:0.7rem;">(Lvl ${level})</span></div>
                <div style="font-size: 0.75rem;">Ponowne użycie po ${signsMaxCooldown[id]} turach.</div>
                <div style="margin-top: 5px; font-size:0.7rem; color:${maxed ? 'gray' : (xp >= cost ? '#000' : '#2ecc71')};">
                    ${maxed ? 'MAKSYMALNA ILOŚĆ PUNKTÓW' : `Wymagane punkty: ${xp} / ${cost} Użyć`}
                </div>
            </button>`;
    });

    wrapper.innerHTML += `<button onclick="closeSideMenu()" class="btn-close" style="width:100%; margin-top:auto;">ZAMKNIJ</button>`;
    sideMenu.appendChild(wrapper);
    sideMenu.classList.add('active');
}

// ------------------- TUTORIAL SYSTEM -------------------
let tutorialState = {
    active: false,
    step: 0,
    bubble: null,
    overlay: null,
    text: null,
    nextBtn: null
};

const TUTORIAL_STEPS = [
    {   // Krok 0
        text: "Witaj w miniaturowym świecie wiedźmina nowicjuszu! Ten samouczek sprawi że nie będziesz już nowicjuszem...",
        highlight: null,
        nextBtn: true,
        action: () => { }
    },
    {   // Krok 1
        text: "Naciśnij przycisk \"Przyjmij zlecenie\" aby stoczyć swój pierwszy pojedynek!",
        highlight: ".btn-hunt",
        nextBtn: false,
        pulseHighlight: true,
        action: () => {
            const btn = document.querySelector(".btn-hunt");
            if (btn) {
                const oldClick = btn.onclick;
                btn.onclick = () => {
                    if (oldClick) oldClick.call(btn);
                    advanceTutorial();
                    btn.onclick = oldClick;
                };
            }
        }
    },
    {   // Krok 2
        text: "To jest lista potworów na których będziesz zarabiać, jak widzisz większość jest zablokowana, ale spokojnie odblokujesz je w swoim czasie.",
        highlight: null,
        nextBtn: true,
        action: () => { }
    },
    {   // Krok 3
        text: "Wybierz swojego pierwszego stwora, nie masz dużego wyboru.",
        highlight: "#monster-board .monster-card:first-child",
        nextBtn: false,
        pulseHighlight: false,
        action: () => {
            const utopiecCard = document.querySelector("#monster-board .monster-card:first-child");
            if (utopiecCard) {
                utopiecCard.classList.add("tutorial-highlight");
                const oldClick = utopiecCard.onclick;
                utopiecCard.onclick = () => {
                    if (oldClick) oldClick.call(utopiecCard);
                    advanceTutorial();
                    utopiecCard.onclick = oldClick;
                }
            }
        }
    },
    {   // Krok 4
        text: "Oto jest ekran walki! To serce twojej rozgrywki, zaatakuj przeciwnika.",
        highlight: "#btn-main-attack",
        nextBtn: false,
        pulseHighlight: true,
        action: () => {
            const btn = document.getElementById("btn-main-attack");
            if (btn) {
                const oldClick = btn.onclick;
                btn.onclick = () => {
                    if (oldClick) oldClick.call(btn);
                    advanceTutorial();
                    btn.onclick = oldClick;
                };
            }
        }
    },
    {   // Krok 5
        text: "Kiedy potwór cię zaatakuje, będziesz mógł zrobić unik by zachować zdrowie. Naciskaj kiedy tylko się pojawi! (Zmniejszam ci wymóg czasu reakcji)",
        highlight: "#dodgeBtn",
        nextBtn: false,
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            tutorialState.freezeDodge = true;
            const btn = document.getElementById("dodgeBtn");
            if (btn) {
                const oldMouse = btn.onmousedown;
                btn.onmousedown = (e) => {
                    if (oldMouse) oldMouse.call(btn, e);
                    setTimeout(() => advanceTutorial(), 500);
                    btn.onmousedown = oldMouse;
                };
            }
        }
    },
    {   // Krok 6
        text: "Super! Pora zapoznać się ze znakami, bardzo się przydają. Naciśnij okrągły przycisk znaków.",
        highlight: "#btn-battle-signs",
        nextBtn: false,
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            tutorialState.freezeDodge = false;
            const btn = document.getElementById("btn-battle-signs");
            if (btn) {
                const oldClick = btn.onclick;
                btn.onclick = () => {
                    if (oldClick) oldClick.call(btn);
                    advanceTutorial();
                    btn.onclick = oldClick;
                };
            }
        }
    },
    {   // Krok 7
        text: "To są twoje znaki. Każdy znak odnawia się co określoną turę. Przeczytaj uważnie opisy by wiedzieć w czym Ci pomogą.",
        highlight: "#sideMenuContainer",
        nextBtn: true,
        position: 'left',
        hideOverlay: true,
        action: () => {
            // Blokujemy klikalność znaków
            document.querySelectorAll("#sideMenuContainer button").forEach(btn => {
                btn.classList.add('tutorial-disable-clicks');
            });
        }
    },
    {   // Krok 8
        text: "Wypróbuj teraz magię na potworze! Wybierz dowolny znak.",
        highlight: "#sideMenuContainer",
        nextBtn: false,
        position: 'left',
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            // Odbanuj przyciski i dodaj przejęcie akcji
            document.querySelectorAll("#sideMenuContainer button").forEach(btn => {
                btn.classList.remove('tutorial-disable-clicks');
                btn.classList.add('tutorial-highlight');
                btn.style.pointerEvents = "auto";

                const oldClick = btn.onclick;
                btn.onclick = (e) => {
                    if (oldClick) oldClick.call(btn, e);
                    advanceTutorial();
                };
            });
        }
    },
    {   // Krok 9
        text: "Zrób unik!",
        highlight: "#dodgeBtn",
        nextBtn: false,
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            tutorialState.freezeDodge = true;
            document.getElementById("tutorial-bubble").style.display = "flex";
            const btn = document.getElementById("dodgeBtn");
            if (btn) {
                const oldMouse = btn.onmousedown;
                btn.onmousedown = (e) => {
                    if (oldMouse) oldMouse.call(btn, e);
                    setTimeout(() => advanceTutorial(), 500);
                    btn.onmousedown = oldMouse;
                };
            }
        }
    },
    {   // Krok 10
        text: "Dobrze. Teraz otwórz ekwipunek, masz tu rzeczy które zakupiłeś na bazarze. Na razie nic tu nie ma.",
        highlight: "#btn-battle-inv",
        nextBtn: false,
        position: 'right',
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            tutorialState.freezeDodge = false;
            const btn = document.getElementById("btn-battle-inv");
            if (btn) {
                const oldClick = btn.onclick;
                btn.onclick = () => {
                    if (oldClick) oldClick.call(btn);
                    advanceTutorial();
                    btn.onclick = oldClick;
                }
            }
        }
    },
    {
        // tu wstaw brakujący krok

    },
    {   // Krok 11
        text: "To tyle z nauki. Ten mroczny i tajemniczy pas to twój inwentarz walki.",
        highlight: "#sideMenuContainer",
        nextBtn: true,
        position: 'right',
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            // Zamknięcie okna itp dla porządku upewniamy że klikanie wyłączone tymczasowo
            document.querySelectorAll("#sideMenuContainer button").forEach(btn => btn.classList.add('tutorial-disable-clicks'));
        }
    },
    {   // Krok 12
        text: "I jeszcze jedno, jeżeli zechcesz stchórzyć, kliknij czerwony przycisk. To wszystko, Powodzenia!",
        highlight: "#exitBattleBtn",
        nextBtn: true,
        position: 'right',
        pulseHighlight: true,
        hideOverlay: true,
        action: () => {
            document.getElementById("btn-battle-inv").classList.remove('tutorial-highlight-pulse');
            // Zeby przycisk wyjscia faktycznie widac (bo normalnie utopiec nie jest bossem wiec widac)
            document.getElementById("exitBattleBtn").style.display = "flex";
        }
    },
    {   // Krok 13
        text: "", // Puste okno znika
        highlight: null,
        nextBtn: false,
        hideOverlay: true,
        action: () => {
            hideTutorialUI(); // ukrywamy samouczek by toczyła się normalna walka 
        }
    },
    {   // Krok 14 - pokazywane z finishBattle()
        text: "To koniec samouczka bitewnego! Reszty gry nauczysz się w czasie rozgrywki, powodzenia na szlaku!",
        highlight: null,
        nextBtn: true,
        action: () => {
            document.getElementById("tutorial-overlay").style.display = "block";
            document.getElementById("tutorial-bubble").style.display = "flex";
        }
    },
    {   // Krok 15
        text: "Zapisuje grę...",
        highlight: null,
        nextBtn: true,
        action: () => {
            hideTutorialUI();
            tutorialState.active = false;
        }
    }
];

// Osobne kroki dla zakladek
const TUTORIAL_AD_HOC = {
    'shop': [
        { text: "To jest Bazar w Novigradzie! Spotkasz tu kupców u których wyposażysz się w odpowiednie do walki przedmioty.\nMają one następujące statystyki:\n🛡️ Pancerz - Chroni przed obrażeniami abyś mógł przyjąć więcej uderzeń.\n⚔️ Atak - Zwiększa obrażenia\n👟 Zwinność - Daje ci więcej czasu na reakcję przy unikach\n❤️ Życie - To po prostu twoje życie.", nextBtn: true },
        { text: "Uważaj!!! Aby skorzystać z przedmiotu musisz założyć go najpierw w ekwipunku.", nextBtn: true, action: hideTutorialUI }
    ],
    'char': [
        { text: "To jest twój ekwipunek, masz tu wszystkie swoje przedmioty, załóż przedmiot aby był aktywny w bitwie.\nMożesz tu również ulepszyć swoje znaki, aby to zrobić musisz z nich skorzystać podczas bitwy określoną ilość razy.", nextBtn: true, action: hideTutorialUI }
    ],
    'training': [
        { text: "To jest Plac Treningowy, tutaj możesz przygotować się do walki z odblokowanymi potworami, bądź ćwiczyć na kukiełce.", nextBtn: true, action: hideTutorialUI }
    ],
    'alchemy': [
        { text: "Tu możesz uwarzyć swoje mikstury do bitwy, aby to zrobić wybierz odpowiednie składniki i uważ miksturę.\nMikstury pojawią się w twoim ekwipunku, będziesz mógł z nich skorzystać podczas bitwy.\nPamiętaj, losowe łączenie przedmiotów jest słabym rozwiązaniem, pokonaj swojego pierwszego Bossa aby odblokować pierwszą Recepturę, będzie to kombinacja ziół potrzebna ci do uwarzenia danej mikstury.", nextBtn: true, action: hideTutorialUI }
    ]
};

function initTutorialDOM() {
    tutorialState.bubble = document.getElementById('tutorial-bubble');
    tutorialState.overlay = document.getElementById('tutorial-overlay');
    tutorialState.text = document.getElementById('tutorial-text');
    tutorialState.nextBtn = document.getElementById('tutorial-next-btn');
}

function promptTutorial() {
    openModal("SAMOUCZEK", "Czy chcesz zainicjować sekwencję samouczka dla nowicjuszy?", () => {
        // TAK
        initTutorialDOM();
        tutorialState.active = true;
        tutorialState.step = 0;
        showTutorialStep(0);

        let t = stats.tutorialsSeen || {};
        t.main = true;
        stats.tutorialsSeen = t;
    }, () => {
        // NIE
        let t = stats.tutorialsSeen || {};
        // Oznacz wszystkie jako zaliczone
        t.main = true; t.shop = true; t.char = true; t.training = true; t.alchemy = true; t.postBattle = true;
        stats.tutorialsSeen = t;
        saveGame();
    });
}

function advanceTutorial() {
    if (!tutorialState.active) return;

    // Zdejmij obecne podswietlenie
    const currentStepConfig = TUTORIAL_STEPS[tutorialState.step];
    if (currentStepConfig && currentStepConfig.highlight) {
        let el = document.querySelector(currentStepConfig.highlight);
        if (el) {
            el.classList.remove('tutorial-highlight');
            el.classList.remove('tutorial-highlight-pulse');
        }
    }

    tutorialState.step++;
    showTutorialStep(tutorialState.step);
}

function showTutorialStep(stepIndex) {
    if (stepIndex >= TUTORIAL_STEPS.length) {
        hideTutorialUI();
        return;
    }
    const config = TUTORIAL_STEPS[stepIndex];
    if (!config) return;

    tutorialState.overlay.style.display = config.hideOverlay ? "none" : "block";
    tutorialState.bubble.style.display = "flex";

    // Format text
    tutorialState.text.innerText = config.text;

    // Position
    if (config.position === 'left') tutorialState.bubble.classList.add('left-side');
    else tutorialState.bubble.classList.remove('left-side');

    // Next Btn
    tutorialState.nextBtn.style.display = config.nextBtn ? "block" : "none";

    // Highlight
    if (config.highlight) {
        const el = document.querySelector(config.highlight);
        if (el) {
            el.classList.add(config.pulseHighlight ? 'tutorial-highlight-pulse' : 'tutorial-highlight');
        }
    }

    // Dodaj pointer-events blokujące resztę ekranu
    document.body.classList.add('tutorial-disable-clicks');

    if (config.action) config.action();
}

function hideTutorialUI() {
    if (tutorialState.overlay) tutorialState.overlay.style.display = "none";
    if (tutorialState.bubble) tutorialState.bubble.style.display = "none";
    document.body.classList.remove('tutorial-disable-clicks');

    // Zdejmij wszystkie ewentualne pozostalosci podswietlen
    document.querySelectorAll('.tutorial-highlight, .tutorial-highlight-pulse').forEach(e => {
        e.classList.remove('tutorial-highlight');
        e.classList.remove('tutorial-highlight-pulse');
    });
}

// Funkcja adhoc dla poszczegolnych okien (punkty 16-21)
let adHocStep = 0;
let currentAdHocQueue = [];
function startAdHocTutorial(tabId) {
    if (!stats.tutorialsSeen) return;
    if (stats.tutorialsSeen[tabId]) return;
    stats.tutorialsSeen[tabId] = true;
    saveGame();

    currentAdHocQueue = TUTORIAL_AD_HOC[tabId];
    if (!currentAdHocQueue) return;

    tutorialState.active = true;
    adHocStep = 0;
    showAdHocStep();
}

function showAdHocStep() {
    if (!tutorialState.overlay) initTutorialDOM();
    if (adHocStep >= currentAdHocQueue.length) {
        tutorialState.active = false;
        hideTutorialUI();
        return;
    }

    const conf = currentAdHocQueue[adHocStep];
    tutorialState.overlay.style.display = "block";
    tutorialState.bubble.style.display = "flex";
    tutorialState.text.innerText = conf.text;
    tutorialState.bubble.classList.remove('left-side');

    tutorialState.nextBtn.style.display = conf.nextBtn ? "block" : "none";
    tutorialState.nextBtn.onclick = () => {
        if (conf.action) conf.action();
        adHocStep++;
        showAdHocStep();
    };

    document.body.classList.add('tutorial-disable-clicks');
}

// ------------------- DEV TOOLS -------------------
let keysPressed = {};
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    if (keysPressed['Control'] && keysPressed['6'] && keysPressed['7']) {
        document.getElementById('dev-tools-modal').style.display = 'block';
    }
});
document.addEventListener('keyup', (e) => {
    delete keysPressed[e.key];
});

function closeDevTools() {
    document.getElementById('dev-tools-modal').style.display = 'none';
}

function unlockAllMonsters() {
    stats.maxUnlockedIndex = Object.keys(monsterTemplates).length - 1;
    saveGame();
    showToast('Odblokowano wszystkie potwory!', 'green');
}

function setStats() {
    stats.gold = parseInt(document.getElementById('dev-gold').value) || stats.gold;
    stats.maxHp = parseInt(document.getElementById('dev-hp').value) || stats.maxHp;
    stats.atk = parseInt(document.getElementById('dev-atk').value) || stats.atk;
    stats.arm = parseInt(document.getElementById('dev-arm').value) || stats.arm;
    stats.agi = parseInt(document.getElementById('dev-agi').value) || stats.agi;
    stats.hp = stats.maxHp;
    updateUI();
    saveGame();
    showToast('Statystyki nadpisane!', 'green');
}

function giveHerbs() {
    const herbs = shopItems.filter(i => i.sub === 'herb');
    herbs.forEach(herb => {
        for (let i = 0; i < 10; i++) {
            inventory.push({ ...herb, uid: Date.now() + Math.random() });
        }
    });
    showToast('Otrzymano po 10 każdego zioła!', 'green');
}

function instantKill() {
    if (!battleState.active) {
        showToast('Brak walki', 'yellow');
        return;
    }
    monster.hp = 0;
    updateMonsterHP();
    checkWinOrContinue();
}
