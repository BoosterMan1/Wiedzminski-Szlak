const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Find the start of #training
const trainingStartStr = '<div id="training" class="screen" style="display:none;">';
const trainingStartIndex = html.indexOf(trainingStartStr);

if (trainingStartIndex === -1) {
    console.log("Could not find #training block.");
    process.exit(1);
}

// Find the end of #training (it ends before </body>)
const menuScreenRegex = /<div id="game"\s/; // next sibling? no, #training is the last one
// Let's just crop from trainingStartIndex to the end but before </body>
const htmlBeforeTraining = html.substring(0, trainingStartIndex);
const htmlFromTraining = html.substring(trainingStartIndex);

// We need to cut out the "</div> <!-- KONIEC game-container -->" from htmlBeforeTraining
// and place it AFTER our new training block.
const endContainerStr = '    </div> <!-- KONIEC game-container -->';
if (!htmlBeforeTraining.includes(endContainerStr)) {
    console.log("Could not find game-container end comment.");
    process.exit(1);
}

const cleanHtmlBeforeTraining = htmlBeforeTraining.replace(endContainerStr, '');

const newTrainingHtml = `
        <!-- Menu Treningu -->
        <div id="training" class="screen" style="display:none;">
            <h3 class="witcher-title">⚔️ Plac Treningowy Kaer Morhen</h3>

            <!-- PODSEKCJA 1: KLASYCZNA KUKŁA -->
            <div id="training-classic">
                <p style="font-size:0.8rem; color:#888; margin-bottom: 20px;">Ręczne ustawianie parametrów kukły treningowej.</p>

                <div class="training-slider-container" style="background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <label style="color: #aaa; font-size: 0.75rem; text-transform: uppercase;">Poziom Trudności</label>
                        <span id="agiValue" style="color: var(--gold); font-weight: bold;">1.0</span>
                    </div>
                    <input type="range" id="agiSlider" min="0.5" max="8.0" value="1.0" step="0.1" style="width: 100%;"
                        oninput="document.getElementById('agiValue').innerText = parseFloat(this.value).toFixed(1) + 'x'">
                </div>

                <div id="training-list" class="monster-grid">
                    <div class="monster-card witcher-card" onclick="startTraining('normal')"><b>Klasyczny atak</b></div>
                    <div class="monster-card witcher-card" onclick="startTraining('charge')"><b>Szarża</b></div>
                    <div class="monster-card witcher-card" onclick="startTraining('mirage')"><b>Iluzja</b></div>
                    <div class="monster-card witcher-card" onclick="startTraining('combo')"><b>Grad ciosów</b></div>
                    <div class="monster-card witcher-card" onclick="startTraining('orbit')"><b>Spirala</b></div>
                    <div class="monster-card witcher-card" onclick="startTraining('blink')"><b>Teleportacja</b></div>
                </div>

                <button onclick="toggleTrainingMode('monsters')" class="witcher-btn action-btn full-width" style="margin-top:20px;">
                    ⚔️ Ćwicz na stworach
                </button>
            </div>

            <!-- PODSEKCJA 2: SYMULACJA POTWORÓW -->
            <div id="training-monsters" style="display:none;">
                <p style="font-size:0.8rem; color:#888; margin-bottom: 20px;">Symulacja walki z konkretną bestią (statystyki automatyczne).</p>

                <div id="training-monster-list" class="monster-grid" style="max-height: 400px; overflow-y: auto;">
                    <!-- Generowane przez JS -->
                </div>

                <button onclick="toggleTrainingMode('classic')" class="witcher-btn cancel-btn full-width" style="margin-top:20px;">
                    ↩ Powrót do ćwiczenia na kukiełce
                </button>
            </div>

            <button onclick="switchTab('menu')" class="witcher-btn cancel-btn full-width" style="margin-top:20px;">Wróć do zamku</button>
        </div>

    </div> <!-- KONIEC game-container -->
`;

// Extract whatever came AFTER training in original file (mainly body/html closing tags and scripts)
// The original training block ends with </div> just before textContent end or scripts.
const scriptTagIndex = htmlFromTraining.indexOf('<script'); // If there's script after it
let htmlAfterTraining = '';
if (scriptTagIndex !== -1) {
    htmlAfterTraining = htmlFromTraining.substring(scriptTagIndex);
} else {
    // just close tags
    htmlAfterTraining = '\n</body>\n</html>';
}

const finalHtml = cleanHtmlBeforeTraining + newTrainingHtml + htmlAfterTraining;

fs.writeFileSync('index.html', finalHtml);
console.log('index.html fixes applied');

// NOW UPDATE CSS for agiSlider & training cards explicitly
const cssOverrides = `

/* ========================================================
   WITCHER TRAINING GROUND FIXES (USER REQUEST)
   ======================================================== */
.witcher-title {
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 1px solid #333;
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.witcher-btn {
    background: #111;
    color: #eee;
    border: 1px solid #333;
    padding: 12px 20px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.3s;
    border-radius: 4px;
    text-transform: uppercase;
    font-size: 0.85rem;
}

.witcher-btn.action-btn {
    border-left: 4px solid var(--gold);
}

.witcher-btn.cancel-btn {
    border-left: 4px solid #555;
}

.witcher-btn:hover {
    background: #1a1a1a;
    border-color: var(--gold);
}

.full-width {
    width: 100%;
}

/* agiSlider Styling */
input[type=range]#agiSlider {
    -webkit-appearance: none;
    width: 100%;
    background: transparent;
}

input[type=range]#agiSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 16px;
    width: 16px;
    background: var(--gold);
    cursor: pointer;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(218, 165, 32, 0.5);
    margin-top: -6px; /* offset for track */
}

input[type=range]#agiSlider::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: #333;
    border-radius: 2px;
}

/* Strict training-list & monster-card theming */
#training-list .monster-card {
    background: #1a1a1a !important;
    border: 1px solid #333 !important;
    border-left: 4px solid #4682b4 !important; /* Steel-blue */
    color: #eee;
}

#training-list .monster-card:hover {
    background: #252525 !important;
    border-color: #5a9cd2 !important;
    border-left: 4px solid #5a9cd2 !important;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(70, 130, 180, 0.2);
}
`;

fs.appendFileSync('style.css', cssOverrides);
console.log('style.css fixes applied');
