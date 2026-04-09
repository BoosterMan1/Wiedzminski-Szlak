const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const scrollFix = `

/* ========================================================
   WITCHER ANTI-SCROLL OVERRIDES (USER REQUEST)
   ======================================================== */
body {
    height: 100vh !important;
    max-height: 100vh !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important; /* Blokuje przewijanie całej strony */
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    background: #0a0a0a !important;
}

.game-container {
    height: 100vh !important;
    max-height: 100vh !important;
    width: 100% !important;
    max-width: 650px !important; /* Utrzymuje proporcje telefonu/pionowe */
    overflow-y: auto !important; /* Przewijanie wnętrza gry, a nie całej przeglądarki */
    overflow-x: hidden !important;
    display: flex !important;
    flex-direction: column !important;
    border-radius: 0 !important; /* zeby pasowalo do ekranu, albo mozna zostawic zaokraglenia jesli jest lekki padding, ale przy height 100vh lepiej 0 */
}

@media (min-height: 800px) {
    .game-container {
        height: 95vh !important;
        max-height: 900px !important;
        border-radius: 12px !important;
    }
}

.screen {
    flex-grow: 1 !important;
    overflow-y: visible !important; /* Zawartość strony samej w sobie wylewa się na .game-container */
}
`;

fs.appendFileSync('style.css', scrollFix, 'utf8');
console.log('Scroll fixed in CSS.');
