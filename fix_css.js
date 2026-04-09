const fs = require('fs');

// --- 1. NAPRAWA HTML (Usunięcie inline styles z Alchemii, by CSS działało poprawnie) ---
let html = fs.readFileSync('index.html', 'utf8');

// Usuwamy inline-styles dla cauldron-slots
html = html.replace(/<div id="cauldron-slots" style="[^"]*">/, '<div id="cauldron-slots">');
// Usuwamy inline-styles dla alchemy-slot
html = html.replace(/<div class="alchemy-slot" id="alchemy-slot-1" style="[^"]*">/g, '<div class="alchemy-slot" id="alchemy-slot-1">');
html = html.replace(/<div class="alchemy-slot" id="alchemy-slot-2" style="[^"]*">/g, '<div class="alchemy-slot" id="alchemy-slot-2">');
html = html.replace(/<div class="alchemy-slot" id="alchemy-slot-3" style="[^"]*">/g, '<div class="alchemy-slot" id="alchemy-slot-3">');
html = html.replace(/<div class="alchemy-slot" id="alchemy-slot-4" style="[^"]*">/g, '<div class="alchemy-slot" id="alchemy-slot-4">');

fs.writeFileSync('index.html', html, 'utf8');


// --- 2. DODANIE CSS (NADDPISYWANIE NA KOŃCU PLIKU) ---
let css = fs.readFileSync('style.css', 'utf8');

const premiumOverrides = `

/* ========================================================
   WITCHER DARK PREMIUM THEME OVERRIDES (USER REQUEST)
   ======================================================== */

/* 1. TYPOGRAFIA I NAGŁÓWKI (PISANA CZCIONKA) */
h1, h2, h3 {
    font-family: 'MedievalSharp', cursive, serif !important;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: normal;
}

h2 {
    color: var(--gold);
    text-shadow: 0 0 10px rgba(218, 165, 32, 0.4);
    border-bottom: 1px solid rgba(218, 165, 32, 0.3);
    padding-bottom: 10px;
    margin-bottom: 25px;
}

h3 {
    color: #e2d1b0 !important; /* Stary pergamin/kość */
    margin-bottom: 15px;
    text-shadow: none !important;
}

/* 2. ZDEKOMPRESOWANA I PIĘKNA LISTA POTWORÓW */
.monster-card {
    min-height: 120px !important;
    padding: 25px !important;
    margin-bottom: 15px;
    background: linear-gradient(135deg, #1f1f1f 0%, #151515 100%) !important;
    border: 1px inset #444 !important;
    border-left: 5px solid var(--accent) !important;
    border-radius: 6px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.6);
    transition: all 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
}

.monster-card:hover {
    border-color: var(--gold) !important;
    border-left: 5px solid var(--gold) !important;
    box-shadow: 0 8px 30px rgba(218, 165, 32, 0.2);
    transform: translateY(-3px) scale(1.02);
    background: linear-gradient(135deg, #262626 0%, #1a1a1a 100%) !important;
}

.monster-grid {
    gap: 25px !important;
    padding: 15px;
}

.monster-grid-scrollable {
    height: 550px !important; /* Większe by pomieściło potwory bez ścisku */
}

/* 3. ALCHEMIA – DUŻE WYZWOLONE SLOTY NA ŚRODKU */
#alchemy {
    background: radial-gradient(circle at center, #1b1b1b 0%, #0a0a0a 100%);
    border-radius: 10px;
    box-shadow: inset 0 0 50px rgba(0,0,0,0.9);
}

#cauldron-slots {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 20px;
    max-width: 400px;
    margin: 30px auto;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
}

.alchemy-slot {
    background: linear-gradient(to bottom right, #252525, #111) !important;
    border: 2px solid #555 !important;
    border-radius: 50% !important; /* Kuliste sloty - wyglądają wiedźmińsko! */
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 15px !important;
    font-family: 'MedievalSharp', cursive;
    color: #999 !important;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.5);
    transition: all 0.4s ease;
    font-size: 1.1rem;
}

/* Stan załadowany zmienia kolor i dodaje aurę */
.alchemy-slot span {
    color: #4CAF50 !important; /* Toksyczna jasna zieleń */
    text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    font-weight: bold;
    display: flex;
    flex-direction: column;
}

.alchemy-actions button {
    border-radius: 5px !important;
    letter-spacing: 2px;
}

#herbs-list {
    background: #151515 !important;
    border: 1px inset #333 !important;
    box-shadow: inset 0 5px 20px rgba(0,0,0,0.9) !important;
    padding: 15px !important;
    gap: 10px !important;
}

.menu-btn {
    border-radius: 4px;
}

/* Scrollbary spójne, premium */
::-webkit-scrollbar {
    width: 8px;
}
::-webkit-scrollbar-track {
    background: #111; 
}
::-webkit-scrollbar-thumb {
    background: #444; 
    border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
    background: var(--gold); 
}
`;

fs.appendFileSync('style.css', premiumOverrides, 'utf8');
console.log("CSS Overrides injected!");
