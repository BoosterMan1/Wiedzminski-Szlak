const fs = require('fs');
let js = fs.readFileSync('script.js', 'utf8');

// 1. Zastąp renderShop() zielarki
js = js.replace(/} else if \(merchantType === 'herbalist'\) {[\s\S]*?}/, 
`} else if (merchantType === 'herbalist') {
        filtered = shopItems.filter(i => i.type === 'consumable' && i.sub === 'herb');
    }`);

// 2. Napraw bug z buyItem dodającym listę herbs do eq
// Regex by uchwycić koniec instrukcji if w consumablach
js = js.replace(/else if \(item\.sub === 'arm_perm'\) stats\.arm \+= 5;\r?\n\s*\/\/[^\n]*/, 
`else if (item.sub === 'arm_perm') stats.arm += 5;
        else if (item.sub === 'herb') {
            inventory.push({ ...item, uid: Date.now() + Math.random() });
        }`);

// 3. Zaktualizuj useItemFromBattle by dodać "Losowy Wywar"
js = js.replace(/if \(item\.sub === 'pot_full'\) {[\s\S]*?\}[\s\n]*\}/, 
`if (item.sub === 'pot_full') {
            const container = document.getElementById('mainContainer');
            container.classList.add('heal-effect');
            setTimeout(() => container.classList.remove('heal-effect'), 600);
        }
        
        // --- LOSOWY WYWAR ---
        if (item.sub === 'random_pot') {
            if (Math.random() > 0.5) {
                let heal = Math.floor(stats.maxHp * 0.25);
                stats.hp = Math.min(stats.maxHp, stats.hp + heal);
                addLog(\`Wypiłeś \${item.name}. Regeneracja! (+\${heal} HP)\`, "#2ecc71");
            } else {
                let dmg = Math.floor(stats.maxHp * 0.15);
                stats.hp -= dmg;
                addLog(\`Wypiłeś \${item.name}. Trucizna! (-\${dmg} HP)\`, "red");
                if (stats.hp <= 0) stats.hp = 1; 
            }
        }
    }
}`);

// 4. PRZYWRÓCONA ALCHEMIA (Funkcje) ORAZ LOSOWY WYWAR MODYFIKACJA W BREWPOTION
// Zastępujemy cały dział od `let cauldronItems = [];` do konca `function emptyCauldron() { ... }`
const alchemyRestoration = `
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
        let slotEl = document.getElementById(\`alchemy-slot-\${i}\`);
        if (!slotEl) continue;
        let rom = i === 1 ? 'I.' : i === 2 ? 'II.' : i === 3 ? 'III.' : 'IV.';
        if (cauldronItems[i - 1]) {
            slotEl.innerHTML = \`<span style="color:var(--gold);">\${rom} \${cauldronItems[i - 1].name}</span>\`;
            slotEl.style.borderColor = "var(--gold)";
        } else {
            slotEl.innerHTML = \`\${rom} Pusto\`;
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
                return \`<button class="menu-btn" onclick="addToCauldron('\${item.id}', \${globalIndex})" style="font-size:0.7rem; padding: 5px; flex: 1 1 30%; max-width: 30%;">+ \${item.name}</button>\`;
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
                return \`<div style="width: 100%; background: #333; padding: 5px; margin-bottom: 5px; font-size: 0.75rem; border-left: 3px solid var(--gold);">
                    <strong style="color: var(--gold);">\${r.target}</strong>: \${r.seq.join(' + ')}
                </div>\`;
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
                if(isUnlocked) {
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
                newItem = { id: 900+Math.floor(Math.random()*100), name: crafted.target, type: 'consumable', sub: (crafted.target.includes('Olej') ? 'oil' : 'potion'), price: 50, desc: \`Wytworzone samodzielnie w kotle.\` };
            }
            if (crafted.target === "Jaskółka" || newItem.sub === 'potion') stats.pot++;
            if (crafted.target === "Samum" || newItem.sub === 'bomb') stats.bomb++;

            let itemClone = JSON.parse(JSON.stringify(newItem));
            itemClone.uid = Date.now() + Math.random();
            inventory.push(itemClone);

            addLog(\`UWARZYŁEŚ: \${crafted.target}!\`, "#2ecc71");
            showToast(\`Uwarzono: \${crafted.target}\`, "#2ecc71");
        } else {
            // LOSOWY WYWAR!
            let garbage = { id: 999, uid: Date.now(), name: "Losowy Wywar", type: "consumable", sub: "random_pot", price: 1, desc: "Nieznana mieszanka. Pijesz na własne ryzyko.", icon: "🗑️" };
            inventory.push(garbage);
            addLog(\`Porażka! Kocioł wypluł dym i osad. Otrzymujesz Losowy Wywar.\`, "red");
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
}`;

js = js.replace(/\/\/ ------------------- ALCHEMIA SYSTEM -------------------[\s\S]*?function emptyCauldron\(\) \{[\s\S]*?\}/, alchemyRestoration);


// 5. ODTWORZENIE OLEJU I JEGO ZUŻYCIA
const oilRestoration = `function finishBattle() {
    stopDodgeMove();
    signsCooldown = { igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 };
    stats.activeOil = null; // Zresetuj olej po walce`;

js = js.replace(/function finishBattle\(\) \{[\s\S]*?signsCooldown = \{ igni: 0, quen: 0, yrden: 0, axii: 0, aard: 0 \};/, oilRestoration);

const dmgLogicRestoration = `function applyOilBuff(oilName, monsterClass) {
    if (!oilName) return 1.0;
    if (oilName === monsterClass) {
        return 1.5;
    }
    return 1.0;
}

        // --- PANCERNY BALANS DMG (Zasada 10% Przebicia) ---`;

js = js.replace(/\/\/ --- PANCERNY BALANS DMG \(Zasada 10% Przebicia\) ---/, dmgLogicRestoration);

const dmgLogicMultiplier = `// 3. OLEJ (Kluczowa klasyfikacyjna przewaga przez funkcję)
        let oilMultiplier = applyOilBuff(stats.activeOil, monster.classDesc);
        if (oilMultiplier > 1.0) {
            finalDmg = Math.floor(finalDmg * oilMultiplier);
            msg += " (Zabójczy Olej!)";
        }`;
js = js.replace(/\/\/ 3\. OLEJ \(Kluczowa klasyfikacyjna przewaga\)[\s\S]*?msg \+= " \(Zabójczy Olej!\)";\r?\n\s*\}/, dmgLogicMultiplier);

// 6. DEV TOOLS LOGIKa W SCRIPT.JS (ctrl + 6 + 7)
js += `
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
        for(let i=0; i<10; i++){
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
`;

fs.writeFileSync('script.js', js, 'utf8');
console.log("Replacement successful");
