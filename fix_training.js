const fs = require('fs');

const cssOverride = `

/* ========================================================
   FIX DLA PLACU TRENINGOWEGO (PRZYWRÓCENIE ROW)
   ======================================================== */
#training .monster-card {
    min-height: 50px !important;
    padding: 10px 15px !important;
    margin-bottom: 8px !important;
    display: flex !important;
    flex-direction: row !important; /* Nadpisuje globalne flex-direction: column z monster-card */
    justify-content: space-between !important;
    align-items: center !important;
    border-left: 4px solid #4682b4 !important; /* Przywraca stalowy-niebieski kolor treningu */
}

#training .monster-card:hover {
    border-left: 4px solid #5a9cd2 !important;
    transform: translateY(-2px) scale(1.01) !important;
}
`;

fs.appendFileSync('style.css', cssOverride, 'utf8');
console.log('Training grounds CSS override applied!');
