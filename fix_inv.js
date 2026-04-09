const fs = require('fs');

// 1. Zmiana w index.html
let html = fs.readFileSync('index.html', 'utf8');

// Usuwanie zakładki Receptury
html = html.replace(/<button\s+onclick="changeInvTab\('recipe'\)"\s+id="tab-recipe"[\s\S]*?<\/button>\s*/, '');

fs.writeFileSync('index.html', html, 'utf8');


// 2. Zmiana w script.js
let js = fs.readFileSync('script.js', 'utf8');

const replacementJs = `
let currentInvTab = 'equipment';
function changeInvTab(tabName) {
    currentInvTab = tabName;
    document.querySelectorAll('.inv-tabs button').forEach(b => {
        b.style.background = '#222';
        b.style.color = '#fff';
        b.style.fontWeight = 'normal';
    });
    const activeBtn = document.getElementById('tab-' + tabName);
    if(activeBtn) {
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
    document.getElementById('slot-weapon').innerHTML = equipped.weapon ? \`⚔️ \${equipped.weapon.name}\` : "Brak broni";
    document.getElementById('slot-armor').innerHTML = equipped.armor ? \`🛡️ \${equipped.armor.name}\` : "Brak zbroi";
    document.getElementById('slot-trinket').innerHTML = equipped.trinket ? \`💍 \${equipped.trinket.name}\` : "Brak talizmanu";

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

    list.innerHTML = \`<div style="display:flex; flex-direction:column; gap:5px;">\` + filteredItems.map(item => {
        const invIndex = inventory.indexOf(item);
        const isEquipped = Object.values(equipped).includes(item);
        const itemJson = JSON.stringify(item).replace(/"/g, '&quot;');
        
        let customAction = \`onclick="openItemPreview(null, false, \${invIndex})"\`;

        return \`
            <div class="item-card item-\${item.rarity || 'common'}" 
                 style="opacity: \${isEquipped ? '0.5' : '1'}" 
                 \${customAction}
                 onmouseenter="showTooltip(event, 'item', \${itemJson})" 
                 onmousemove="moveTooltip(event)" 
                 onmouseleave="hideTooltip()">
                <div class="item-info">
                    <div class="item-type-icon">\${item.rarity || 'common'}</div>
                    <div class="item-name">\${item.name} \${isEquipped ? '(ZAŁOŻONO)' : ''} \${item.qty && item.qty > 1 ? 'x'+item.qty : ''}</div>
                </div>
            </div>\`;
    }).join('') + \`</div>\`;
}`;

js = js.replace(/function renderInventory\(\) \{[\s\S]*?function updateUI\(\) \{/, replacementJs + '\n\nfunction updateUI() {');

fs.writeFileSync('script.js', js, 'utf8');
console.log('Fixed tabs!');
