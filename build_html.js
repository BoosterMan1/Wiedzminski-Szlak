const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. ODTWORZENIE DEV TOOLS MODAL
const devToolsHTML = `
    <!-- DEV TOOLS MODAL -->
    <div id="dev-tools-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#111; border:2px solid var(--gold); padding:20px; z-index:1000000; border-radius:10px; width:300px; color:white; font-family:Courier, monospace;">
        <h2 style="color:var(--gold); text-align:center;">DEV TOOLS</h2>
        <div style="margin-bottom:10px;"><label>Gold: </label><input type="number" id="dev-gold" style="width:100%;"></div>
        <div style="margin-bottom:10px;"><label>Max HP: </label><input type="number" id="dev-hp" style="width:100%;"></div>
        <div style="margin-bottom:10px;"><label>ATK: </label><input type="number" id="dev-atk" style="width:100%;"></div>
        <div style="margin-bottom:10px;"><label>ARM: </label><input type="number" id="dev-arm" style="width:100%;"></div>
        <div style="margin-bottom:10px;"><label>AGI: </label><input type="number" id="dev-agi" style="width:100%;"></div>
        
        <button onclick="setStats()" style="width:100%; margin-bottom:10px; background:var(--gold); color:black; font-weight:bold; cursor:pointer;">Nadpisz Statystyki</button>
        <button onclick="unlockAllMonsters()" style="width:100%; margin-bottom:10px; cursor:pointer;">Odblokuj Potwory</button>
        <button onclick="giveHerbs()" style="width:100%; margin-bottom:10px; cursor:pointer;">Zioła +10</button>
        <button onclick="instantKill()" style="width:100%; margin-bottom:10px; background:darkred; color:white; cursor:pointer;">Instant Kill (w walce)</button>
        <button onclick="closeDevTools()" style="width:100%; cursor:pointer;">Zamknij</button>
    </div>
`;
if (!html.includes('dev-tools-modal')) {
    html = html.replace('</body>', devToolsHTML + '\n</body>');
}

// 2. ODTWORZENIE ALCHEMY TABS
const alchemyHTML = `
        <div id="alchemy" class="screen" style="display:none; flex-direction:column; height: 100%;">
            <h3 style="color:#2ecc71; text-shadow: 0 0 10px rgba(46,204,113,0.4); text-align:center;">🧪 Warsztat Alchemiczny</h3>
            <p style="font-size:0.85rem; color:#ccc; font-style: italic; text-align:center;">Sprostaj chemii natury. Dobieraj składniki i mieszaj eliksiry.</p>

            <div id="cauldron-slots" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; border: 1px solid #444; padding: 15px; background: #1a1a1a; border-radius: 8px;">
                <div class="alchemy-slot" id="alchemy-slot-1" style="padding: 15px; border: 1px dashed #555; text-align: center; color: #888; font-weight: bold; transition: background-color 0.5s;">I. Pusto</div>
                <div class="alchemy-slot" id="alchemy-slot-2" style="padding: 15px; border: 1px dashed #555; text-align: center; color: #888; font-weight: bold; transition: background-color 0.5s;">II. Pusto</div>
                <div class="alchemy-slot" id="alchemy-slot-3" style="padding: 15px; border: 1px dashed #555; text-align: center; color: #888; font-weight: bold; transition: background-color 0.5s;">III. Pusto</div>
                <div class="alchemy-slot" id="alchemy-slot-4" style="padding: 15px; border: 1px dashed #555; text-align: center; color: #888; font-weight: bold; transition: background-color 0.5s;">IV. Pusto</div>
            </div>

            <div class="alchemy-actions" style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button onclick="brewPotion()" id="btn-brew" class="btn-buy alchemy-brew-btn" style="flex:2; font-weight: bold; padding:15px; font-size:1.1rem; border-radius:8px;">🟢 WARZ MIKSTURĘ 🟢</button>
                <button onclick="emptyCauldron()" class="menu-btn alchemy-empty-btn" style="flex:1; border-radius:8px;">Wyjmij składniki</button>
            </div>

            <div style="display:flex; margin-bottom:10px;">
                <button id="alchemy-tab-herbs" onclick="renderAlchemyTab('herbs')" style="flex:1; padding:10px; border:1px solid var(--gold); background:var(--gold); color:black; font-weight:bold; cursor:pointer;">Twoje Zioła</button>
                <button id="alchemy-tab-recipes" onclick="renderAlchemyTab('recipes')" style="flex:1; padding:10px; border:1px solid var(--gold); background:#222; color:white; font-weight:bold; cursor:pointer;">Księga Receptur</button>
            </div>

            <div id="herbs-list" style="display: flex; flex-wrap: wrap; gap: 5px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 8px; border: 1px solid #333;">
                <!-- js render -->
            </div>
        </div>
`;
// Zastępujemy cały obszar alchemy starą wersją na nową
html = html.replace(/<div id="alchemy" class="screen" style="display:none;">[\s\S]*?<div id="herbs-list" style="display: flex; flex-wrap: wrap; gap: 5px; overflow-y: auto; max-height: 150px; background: rgba\(0,0,0,0.4\); padding: 10px; border-radius: 8px; border: 1px solid #333;">\s*<!-- generowane z js -->\s*<\/div>\s*<\/div>/, alchemyHTML);

fs.writeFileSync('index.html', html, 'utf8');
console.log("HTML modified");
