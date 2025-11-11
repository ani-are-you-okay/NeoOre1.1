// DEVICE DATABASE
const devices = {
    smartphones: {
        budget: { id: 'phone-budget', tier: 'Budget', name: 'Budget Smartphone', weight: 0.15, metals: { gold: 0.025, silver: 0.18, copper: 12, palladium: 0.010, rareEarth: 0.35 } },
        midrange: { id: 'phone-mid', tier: 'Mid-Range', name: 'Mid-Range Smartphone', weight: 0.17, metals: { gold: 0.035, silver: 0.28, copper: 18, palladium: 0.015, rareEarth: 0.55 } },
        premium: { id: 'phone-premium', tier: 'Premium', name: 'Premium Smartphone', weight: 0.22, metals: { gold: 0.048, silver: 0.38, copper: 24, palladium: 0.022, rareEarth: 0.70 } }
    },
    laptops: {
        budget: { id: 'laptop-budget', tier: 'Budget', name: 'Budget Laptop', weight: 1.75, metals: { gold: 0.12, silver: 0.95, copper: 165, palladium: 0.030, rareEarth: 1.3 } },
        midrange: { id: 'laptop-mid', tier: 'Mid-Range', name: 'Mid-Range Laptop', weight: 1.60, metals: { gold: 0.28, silver: 2.0, copper: 300, palladium: 0.065, rareEarth: 2.5 } },
        premium: { id: 'laptop-premium', tier: 'Premium', name: 'Premium Laptop', weight: 2.15, metals: { gold: 0.35, silver: 2.8, copper: 420, palladium: 0.09, rareEarth: 3.5 } }
    },
    other: {
        budget: { id: 'other-budget', tier: 'Budget', name: 'Small Device (Hard Drive, Tablet)', weight: 0.55, metals: { gold: 0.025, silver: 0.15, copper: 18, palladium: 0.012, rareEarth: 4.5 } },
        midrange: { id: 'other-mid', tier: 'Mid-Range', name: 'Medium Device (Printer)', weight: 5.0, metals: { gold: 0.05, silver: 0.4, copper: 150, palladium: 0.008, rareEarth: 0.5 } },
        premium: { id: 'other-premium', tier: 'Premium', name: 'Large Device (Desktop, Server, TV)', weight: 12.0, metals: { gold: 0.5, silver: 2.5, copper: 800, palladium: 0.10, rareEarth: 2.5 } }
    }
};

const metalData = {
    gold: { price: 5395, recovery: 0.82 },
    silver: { price: 70.55, recovery: 0.82 },
    copper: { price: 0.75, recovery: 0.90 },
    palladium: { price: 2656, recovery: 0.70 },
    rareEarth: { price: 9.96, recovery: 0.75 }
};

const conditions = { excellent: 1.0, good: 0.85, fair: 0.70, poor: 0.50, scrap: 0.40 };

const costPerKg = 105;
const qcPerDevice = 25;
const pickupFeeBulk = 0;
const pickupFeeSmall = 100;
const bulkThreshold = 50;
const customerPayoutPercentage = 0.40;

let orders = [];
let isAdminLoggedIn = false;
let currentOrder = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    renderAllDevices();
    showPage('home');
});

// THEME
function toggleTheme() {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeIcon();
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark-mode');
    document.querySelector('.theme-toggle').textContent = isDark ? '☀️' : '🌙';
}

// PAGES
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName + '-page').classList.add('active');
    window.scrollTo(0, 0);
}

// RENDER DEVICES
function renderAllDevices() {
    renderDevices('smartphones');
    renderDevices('laptops');
    renderDevices('other');
}

function renderDevices(category) {
    const container = document.getElementById(category);
    if (!container) return;
    
    container.innerHTML = '';
    const tiers = devices[category];
    
    Object.keys(tiers).forEach(tierKey => {
        const device = tiers[tierKey];
        const html = `
            <div class="device-item">
                <div>
                    <div class="device-name">${device.name}</div>
                    <span class="device-tier">${device.tier}</span>
                </div>
                <div class="device-controls">
                    <div class="qty-control">
                        <button onclick="changeQty('${device.id}', -1)">−</button>
                        <input type="number" id="qty-${device.id}" value="0" min="0" onchange="updateCalculations()">
                        <button onclick="changeQty('${device.id}', 1)">+</button>
                    </div>
                    <select id="cond-${device.id}" class="condition-select" onchange="updateCalculations()">
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                        <option value="scrap">Scrap</option>
                    </select>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

// TAB SWITCH
function switchTab(tab) {
    document.querySelectorAll('.device-list').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    document.querySelector(`[onclick*="switchTab('${tab}')"]`).classList.add('active');
}

// QUANTITY
function changeQty(deviceId, delta) {
    const input = document.getElementById(`qty-${deviceId}`);
    input.value = Math.max(0, parseInt(input.value || 0) + delta);
    updateCalculations();
}

// CALCULATE
function updateCalculations() {
    let selections = {};
    let totalWeight = 0;
    let deviceCount = 0;
    let totalMetalValue = 0;
    let operatingCost = 0;

    Object.keys(devices).forEach(category => {
        Object.keys(devices[category]).forEach(tierKey => {
            const device = devices[category][tierKey];
            const qty = parseInt(document.getElementById(`qty-${device.id}`).value || 0);
            const condition = document.getElementById(`cond-${device.id}`).value;
            
            if (qty > 0) {
                const condMultiplier = conditions[condition];
                const weight = device.weight * qty * condMultiplier;
                
                let metalValue = 0;
                Object.keys(device.metals).forEach(metal => {
                    const content = device.metals[metal];
                    const totalContent = content * qty * condMultiplier;
                    const recoverable = totalContent * metalData[metal].recovery;
                    metalValue += recoverable * metalData[metal].price;
                });

                selections[device.id] = { name: device.name, tier: device.tier, qty, condition, weight, metalValue };
                totalWeight += weight;
                deviceCount += qty;
                totalMetalValue += metalValue;
                operatingCost += weight * costPerKg + qty * qcPerDevice;
            }
        });
    });

    const pickupCost = totalWeight > bulkThreshold ? pickupFeeBulk : pickupFeeSmall;
    const customerPayout = Math.max(0, (totalMetalValue * customerPayoutPercentage) - pickupCost);
    const neooreRetention = totalMetalValue * (1 - customerPayoutPercentage);
    const netProfit = neooreRetention - operatingCost - pickupCost;
    const profitMargin = totalMetalValue > 0 ? (netProfit / totalMetalValue * 100) : 0;

    // UPDATE DISPLAY
    document.getElementById('customer-total').textContent = Math.round(customerPayout);
    document.getElementById('customer-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('device-count').textContent = deviceCount;
    document.getElementById('detail-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('pickup-status').textContent = totalWeight > bulkThreshold ? 'Free' : '₹100';
    document.getElementById('co2-saved').textContent = (totalWeight * 1.5).toFixed(2);
    document.getElementById('water-saved').textContent = Math.round(totalWeight * 50);
    document.getElementById('energy-saved').textContent = (totalWeight * 8).toFixed(1);

    // SAVE FOR RECEIPT
    currentOrder = {
        selections,
        totalWeight,
        deviceCount,
        totalMetalValue,
        customerPayout,
        operatingCost,
        pickupCost,
        netProfit,
        profitMargin
    };
}

// RECEIPT
function generateReceipt() {
    if (!currentOrder || currentOrder.deviceCount === 0) {
        alert('Please select at least one device');
        return;
    }

    let deviceHTML = '';
    Object.keys(currentOrder.selections).forEach(key => {
        const sel = currentOrder.selections[key];
        deviceHTML += `<tr><td>${sel.name} [${sel.tier}]</td><td>${sel.qty}</td><td>${sel.condition}</td><td>₹${Math.round(sel.metalValue)}</td></tr>`;
    });

    const receiptHTML = `
        <h2 style="text-align: center; color: #FC6736;">NeoOre Receipt</h2>
        <p style="text-align: center; font-size: 0.9em;">${new Date().toLocaleDateString()}</p>
        
        <h3 style="color: #FC6736; margin-top: 20px;">Devices</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
            <tr style="background: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Device</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Condition</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Value</th>
            </tr>
            ${deviceHTML}
        </table>

        <h3 style="color: #FC6736; margin-top: 20px;">Summary</h3>
        <p><strong>Total Weight:</strong> ${currentOrder.totalWeight.toFixed(2)} kg</p>
        <p><strong>Pickup:</strong> ${currentOrder.totalWeight > bulkThreshold ? 'Free' : '₹100'}</p>
        <p style="font-size: 1.2em; color: #FC6736;"><strong>Your Payout: ₹${Math.round(currentOrder.customerPayout)}</strong></p>

        <h3 style="color: #FC6736; margin-top: 20px;">Environmental Impact</h3>
        <p>💨 CO₂ Saved: ${(currentOrder.totalWeight * 1.5).toFixed(2)} kg</p>
        <p>💧 Water Saved: ${Math.round(currentOrder.totalWeight * 50)} L</p>
        <p>⚡ Energy Saved: ${(currentOrder.totalWeight * 8).toFixed(1)} kWh</p>

        <p style="margin-top: 30px; font-size: 0.85em; color: #666;">Thank you for choosing NeoOre! Our team will contact you within 24 hours.</p>
    `;

    document.getElementById('receipt-body').innerHTML = receiptHTML;
    document.getElementById('receipt-modal').classList.add('show');
    
    // SAVE ORDER
    orders.push({
        date: new Date().toLocaleDateString(),
        ...currentOrder
    });
}

function downloadPDF() {
    const element = document.getElementById('receipt-body');
    const opt = {
        margin: 10,
        filename: `NeoOre-Receipt-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(element).save();
    closeReceiptModal();
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.remove('show');
}

function resetCalculator() {
    Object.keys(devices).forEach(category => {
        Object.keys(devices[category]).forEach(tierKey => {
            const device = devices[category][tierKey];
            document.getElementById(`qty-${device.id}`).value = 0;
        });
    });
    updateCalculations();
}

// ADMIN
function openAdminModal() {
    document.getElementById('admin-modal').classList.add('show');
    document.getElementById('admin-password').value = '';
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.remove('show');
}

function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    if (password === 'admin123') {
        isAdminLoggedIn = true;
        closeAdminModal();
        showPage('admin');
        loadAdminDashboard();
    } else {
        alert('Invalid password');
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    showPage('home');
}

function loadAdminDashboard() {
    const totalOrders = orders.length;
    const totalWeight = orders.reduce((sum, o) => sum + o.totalWeight, 0);
    const totalRevenue = orders.reduce((sum, o) => sum + o.totalMetalValue, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);
    const avgMargin = orders.length > 0 ? (totalProfit / totalRevenue * 100) : 0;

    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('total-revenue').textContent = Math.round(totalRevenue);
    document.getElementById('total-profit').textContent = Math.round(totalProfit);
    document.getElementById('avg-margin').textContent = avgMargin.toFixed(1) + '%';

    const ordersList = document.getElementById('orders-list');
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align: center;">No orders yet</p>';
        return;
    }

    ordersList.innerHTML = orders.map((order, i) => `
        <div class="order-item">
            <h4>Order #${i + 1}</h4>
            <div class="order-details">
                <div class="order-detail-item"><span>Weight:</span> <strong>${order.totalWeight.toFixed(2)} kg</strong></div>
                <div class="order-detail-item"><span>Devices:</span> <strong>${order.deviceCount}</strong></div>
                <div class="order-detail-item"><span>Metal Value:</span> <strong>₹${Math.round(order.totalMetalValue)}</strong></div>
                <div class="order-detail-item"><span>Customer Payout:</span> <strong>₹${Math.round(order.customerPayout)}</strong></div>
                <div class="order-detail-item"><span>Operating Cost:</span> <strong>₹${Math.round(order.operatingCost)}</strong></div>
                <div class="order-detail-item"><span>NeoOre Profit:</span> <strong>₹${Math.round(order.netProfit)}</strong></div>
                <div class="order-detail-item"><span>Margin:</span> <strong>${order.profitMargin.toFixed(2)}%</strong></div>
                <div class="order-detail-item"><span>Date:</span> <strong>${order.date}</strong></div>
            </div>
        </div>
    `).join('');
}
