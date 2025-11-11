// TIERED DEVICE DATABASE
const devices = {
    smartphones: {
        budget: { id: 'phone-budget', tier: 'Budget', name: 'Budget Smartphone', weight: 0.15, basePrice: 100, metals: { gold: 0.025, silver: 0.18, copper: 12, palladium: 0.010, rareEarth: 0.35 } },
        midrange: { id: 'phone-mid', tier: 'Mid-Range', name: 'Mid-Range Smartphone', weight: 0.17, basePrice: 145, metals: { gold: 0.035, silver: 0.28, copper: 18, palladium: 0.015, rareEarth: 0.55 } },
        premium: { id: 'phone-premium', tier: 'Premium', name: 'Premium Smartphone', weight: 0.22, basePrice: 190, metals: { gold: 0.048, silver: 0.38, copper: 24, palladium: 0.022, rareEarth: 0.70 } }
    },
    laptops: {
        budget: { id: 'laptop-budget', tier: 'Budget', name: 'Budget Laptop', weight: 1.75, basePrice: 600, metals: { gold: 0.12, silver: 0.95, copper: 165, palladium: 0.030, rareEarth: 1.3 } },
        midrange: { id: 'laptop-mid', tier: 'Mid-Range', name: 'Mid-Range Laptop', weight: 1.60, basePrice: 950, metals: { gold: 0.28, silver: 2.0, copper: 300, palladium: 0.065, rareEarth: 2.5 } },
        premium: { id: 'laptop-premium', tier: 'Premium', name: 'Premium Laptop', weight: 2.15, basePrice: 1400, metals: { gold: 0.35, silver: 2.8, copper: 420, palladium: 0.09, rareEarth: 3.5 } }
    },
    other: {
        budget: { id: 'other-budget', tier: 'Budget', name: 'Small Device (Hard Drive, Tablet)', weight: 0.55, basePrice: 105, metals: { gold: 0.025, silver: 0.15, copper: 18, palladium: 0.012, rareEarth: 4.5 } },
        midrange: { id: 'other-mid', tier: 'Mid-Range', name: 'Medium Device (Printer)', weight: 5.0, basePrice: 240, metals: { gold: 0.05, silver: 0.4, copper: 150, palladium: 0.008, rareEarth: 0.5 } },
        premium: { id: 'other-premium', tier: 'Premium', name: 'Large Device (Desktop, Server, TV)', weight: 12.0, basePrice: 1800, metals: { gold: 0.5, silver: 2.5, copper: 800, palladium: 0.10, rareEarth: 2.5 } }
    }
};

const metalData = {
    gold: { price: 5395, recovery: 0.82 },
    silver: { price: 70.55, recovery: 0.82 },
    copper: { price: 0.75, recovery: 0.90 },
    palladium: { price: 2656, recovery: 0.70 },
    rareEarth: { price: 9.96, recovery: 0.75 }
};

const conditions = {
    excellent: 1.0,
    good: 0.85,
    fair: 0.70,
    poor: 0.50,
    scrap: 0.40
};

const costPerKg = 105;
const qcPerDevice = 25;
const pickupFeeBulk = 0;
const pickupFeeSmall = 100;
const bulkThreshold = 50;
const customerPayoutPercentage = 0.40;

let selections = {};
let orders = [];
let isAdminLoggedIn = false;

// THEME TOGGLE
function toggleTheme() {
    document.documentElement.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.querySelector('.theme-toggle');
    const isDark = document.documentElement.classList.contains('dark-mode');
    btn.textContent = isDark ? '☀️' : '🌙';
}

// Load theme on startup
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
    }
    updateThemeButton();
    showPage('home');
});

// PAGE NAVIGATION
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(page + '-page');
    if (pageEl) {
        pageEl.classList.add('active');
        if (page === 'app' && !document.querySelector('#smartphones .device-item')) {
            init();
        }
        if (page === 'admin' && isAdminLoggedIn) {
            loadAdminDashboard();
        }
        window.scrollTo(0, 0);
    }
}

// ADMIN FUNCTIONS
function adminLogin() {
    document.getElementById('admin-modal').classList.add('show');
}

function closeAdminModal() {
    document.getElementById('admin-modal').classList.remove('show');
}

function adminLoginSubmit() {
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

function adminLogout() {
    isAdminLoggedIn = false;
    showPage('home');
}

function loadAdminDashboard() {
    let totalOrders = orders.length;
    let totalWeight = orders.reduce((sum, order) => sum + order.totalWeight, 0);
    let totalRevenue = orders.reduce((sum, order) => sum + order.totalMetalValue, 0);
    let totalCustomerPayment = orders.reduce((sum, order) => sum + order.customerPayout, 0);
    let totalCost = orders.reduce((sum, order) => sum + order.operatingCost, 0);
    let totalProfit = orders.reduce((sum, order) => sum + order.netProfit, 0);
    let avgMargin = orders.length > 0 ? (totalProfit / totalRevenue * 100) : 0;

    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('total-revenue').textContent = Math.round(totalRevenue);
    document.getElementById('total-profit').textContent = Math.round(totalProfit);
    document.getElementById('avg-margin').textContent = avgMargin.toFixed(1) + '%';

    const ordersList = document.getElementById('orders-list');
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No orders yet</p>';
        return;
    }

    ordersList.innerHTML = orders.map((order, index) => `
        <div class="order-item">
            <h4>Order #${index + 1}</h4>
            <div class="order-details">
                <div class="order-detail-item">
                    <span>Weight:</span>
                    <strong>${order.totalWeight.toFixed(2)} kg</strong>
                </div>
                <div class="order-detail-item">
                    <span>Devices:</span>
                    <strong>${order.deviceCount}</strong>
                </div>
                <div class="order-detail-item">
                    <span>Metal Value:</span>
                    <strong>₹${Math.round(order.totalMetalValue)}</strong>
                </div>
                <div class="order-detail-item">
                    <span>Customer Payout:</span>
                    <strong>₹${Math.round(order.customerPayout)}</strong>
                </div>
                <div class="order-detail-item">
                    <span>Operating Cost:</span>
                    <strong>₹${Math.round(order.operatingCost)}</strong>
                </div>
                <div class="order-detail-item">
                    <span>NeoOre Profit:</span>
                    <strong>₹${Math.round(order.netProfit)}</strong>
                </div>
                <div class="order-detail-item">
                    <span>Margin:</span>
                    <strong>${(order.profitMargin).toFixed(2)}%</strong>
                </div>
                <div class="order-detail-item">
                    <span>Date:</span>
                    <strong>${order.date}</strong>
                </div>
            </div>
        </div>
    `).join('');
}

// INITIALIZE DEVICES
function init() {
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

// TAB SWITCHING
function switchTab(tab) {
    document.querySelectorAll('.device-list').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tab).classList.add('active');
    event.target.classList.add('active');
}

// QUANTITY CONTROL
function changeQty(deviceId, delta) {
    const input = document.getElementById(`qty-${deviceId}`);
    input.value = Math.max(0, parseInt(input.value || 0) + delta);
    updateCalculations();
}

// MAIN CALCULATION
function updateCalculations() {
    selections = {};
    let totalWeight = 0;
    let deviceCount = 0;
    let totalMetalValue = 0;
    let operatingCost = 0;

    Object.keys(devices).forEach(category => {
        const tiers = devices[category];
        Object.keys(tiers).forEach(tierKey => {
            const device = tiers[tierKey];
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

                selections[device.id] = {
                    name: device.name,
                    tier: device.tier,
                    qty: qty,
                    condition: condition,
                    weight: weight,
                    metalValue: metalValue
                };

                totalWeight += weight;
                deviceCount += qty;
                totalMetalValue += metalValue;
                operatingCost += weight * costPerKg + qty * qcPerDevice;
            }
        });
    });

    const pickupCost = totalWeight > bulkThreshold ? pickupFeeBulk : pickupFeeSmall;
    const totalCustomerPayout = (totalMetalValue * customerPayoutPercentage) - pickupCost;
    const neooreRetention = totalMetalValue * (1 - customerPayoutPercentage);
    const netProfit = neooreRetention - operatingCost - pickupCost;
    const profitMargin = totalMetalValue > 0 ? (netProfit / totalMetalValue * 100) : 0;

    // Update customer display (CUSTOMER CANNOT SEE PROFIT)
    document.getElementById('customer-total').textContent = Math.round(Math.max(0, totalCustomerPayout));
    document.getElementById('customer-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('device-count').textContent = deviceCount;
    document.getElementById('detail-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('pickup-status').textContent = totalWeight > bulkThreshold ? 'Free' : '₹100';
    
    document.getElementById('co2-saved').textContent = (totalWeight * 1.5).toFixed(2);
    document.getElementById('water-saved').textContent = Math.round(totalWeight * 50);
    document.getElementById('energy-saved').textContent = (totalWeight * 8).toFixed(1);

    // Store for receipt/admin
    window.currentOrder = {
        totalWeight,
        deviceCount,
        totalMetalValue,
        customerPayout: totalCustomerPayout,
        operatingCost,
        netProfit,
        profitMargin,
        pickupCost
    };
}

// PDF RECEIPT GENERATOR
function generateReceipt() {
    if (Object.keys(selections).length === 0) {
        alert('Please select at least one device');
        return;
    }

    const order = window.currentOrder;
    let deviceDetails = '';
    Object.keys(selections).forEach(key => {
        const sel = selections[key];
        deviceDetails += `<tr><td>${sel.name} [${sel.tier}]</td><td>${sel.qty}</td><td>${sel.condition}</td><td>₹${Math.round(sel.metalValue)}</td></tr>`;
    });

    const receiptHTML = `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #FC6736; margin: 0;">🌍 NeoOre</h1>
                <p style="margin: 5px 0;">Pickup Pickup Quote & Receipt</p>
                <p style="margin: 5px 0; font-size: 0.9em;">Date: ${new Date().toLocaleDateString()}</p>
            </div>

            <h3 style="color: #333; border-bottom: 2px solid #FC6736; padding-bottom: 10px;">Device Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f5f5f5;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Device</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                    <th style="border: 1px solid #ddd; padding: 8px;">Condition</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Value</th>
                </tr>
                ${deviceDetails}
            </table>

            <h3 style="color: #333; border-bottom: 2px solid #FC6736; padding-bottom: 10px; margin-top: 20px;">Quote Summary</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 8px 0;"><strong>Total Weight:</strong> ${order.totalWeight.toFixed(2)} kg</p>
                <p style="margin: 8px 0;"><strong>Pickup Status:</strong> ${order.totalWeight > bulkThreshold ? 'Free' : '₹100 charge'}</p>
                <p style="margin: 8px 0; font-size: 1.2em; color: #FC6736;"><strong>Your Payout: ₹${Math.round(order.customerPayout)}</strong></p>
            </div>

            <h3 style="color: #333; border-bottom: 2px solid #FC6736; padding-bottom: 10px;">Environmental Impact</h3>
            <p style="margin: 5px 0;">💨 CO₂ Saved: ${(order.totalWeight * 1.5).toFixed(2)} kg</p>
            <p style="margin: 5px 0;">💧 Water Saved: ${Math.round(order.totalWeight * 50)} L</p>
            <p style="margin: 5px 0;">⚡ Energy Saved: ${(order.totalWeight * 8).toFixed(1)} kWh</p>

            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666;">
                <p>Thank you for choosing NeoOre!</p>
                <p>Our team will contact you within 24 hours to schedule pickup.</p>
                <p>Contact: hello@neoore.in</p>
            </div>
        </div>
    `;

    document.getElementById('receipt-body').innerHTML = receiptHTML;
    document.getElementById('receipt-modal').classList.add('show');
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.remove('show');
}

function downloadPDF() {
    const element = document.getElementById('receipt-content');
    const opt = {
        margin: 10,
        filename: `NeoOre-Receipt-${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    html2pdf().set(opt).from(element).save();

    // Save order to admin dashboard
    const order = window.currentOrder;
    orders.push({
        ...order,
        date: new Date().toLocaleDateString()
    });
    
    closeReceiptModal();
    alert('Receipt downloaded! Order saved to admin dashboard.');
}

// CUSTOMER SUBMIT
function customerSubmit() {
    if (Object.keys(selections).length === 0) {
        alert('Please select at least one device');
        return;
    }
    alert('Pickup scheduled! Our team will contact you within 24 hours.');
}

// FAQ TOGGLE
function toggleFaq(element) {
    const p = element.nextElementSibling;
    if (p) {
        p.classList.toggle('active');
    }
}
