// E-WASTE RECYCLING: NeoOre PAYS customers
// Simplified: No condition selector, fixed payouts
// User Gets = (Base Payout - Delivery Cost)
// NeoOre Profit = Metal Value - Base Payout - Operating Cost

const devices = {
    smartphones: {
        budget: { id: 'phone-budget', tier: 'Budget', name: 'Budget Smartphone', weight: 0.15, payoutPrice: 50, metals: { gold: 0.02, silver: 0.12, copper: 8, palladium: 0.008, rareEarth: 0.25 } },
        midrange: { id: 'phone-mid', tier: 'Mid-Range', name: 'Mid-Range Smartphone', weight: 0.17, payoutPrice: 90, metals: { gold: 0.03, silver: 0.22, copper: 14, palladium: 0.012, rareEarth: 0.40 } },
        premium: { id: 'phone-premium', tier: 'Premium', name: 'Premium Smartphone', weight: 0.22, payoutPrice: 160, metals: { gold: 0.045, silver: 0.35, copper: 22, palladium: 0.020, rareEarth: 0.65 } }
    },
    laptops: {
        budget: { id: 'laptop-budget', tier: 'Budget', name: 'Budget Laptop', weight: 1.75, payoutPrice: 270, metals: { gold: 0.10, silver: 0.80, copper: 140, palladium: 0.025, rareEarth: 1.1 } },
        midrange: { id: 'laptop-mid', tier: 'Mid-Range', name: 'Mid-Range Laptop', weight: 1.60, payoutPrice: 950, metals: { gold: 0.25, silver: 1.8, copper: 270, palladium: 0.060, rareEarth: 2.2 } },
        premium: { id: 'laptop-premium', tier: 'Premium', name: 'Premium Laptop', weight: 2.15, payoutPrice: 1240, metals: { gold: 0.32, silver: 2.5, copper: 380, palladium: 0.082, rareEarth: 3.2 } }
    },
    other: {
        budget: { id: 'other-budget', tier: 'Budget', name: 'Small Device (Hard Drive, Tablet)', weight: 0.55, payoutPrice: 50, metals: { gold: 0.015, silver: 0.10, copper: 12, palladium: 0.010, rareEarth: 0.30 } },
        midrange: { id: 'other-mid', tier: 'Mid-Range', name: 'Medium Device (Printer)', weight: 5.0, payoutPrice: 150, metals: { gold: 0.08, silver: 0.60, copper: 180, palladium: 0.015, rareEarth: 0.80 } },
        premium: { id: 'other-premium', tier: 'Premium', name: 'Large Device (Desktop, Server, TV)', weight: 12.0, payoutPrice: 500, metals: { gold: 0.25, silver: 2.0, copper: 600, palladium: 0.05, rareEarth: 2.0 } }
    }
};

const metalData = {
    gold: { price: 5395, recovery: 0.82 },
    silver: { price: 70.55, recovery: 0.82 },
    copper: { price: 0.75, recovery: 0.90 },
    palladium: { price: 2656, recovery: 0.70 },
    rareEarth: { price: 9.96, recovery: 0.75 }
};

const costPerKg = 105;
const qcPerDevice = 25;
const pickupFeeSmall = 100;
const bulkThreshold = 50;

let orders = [];
let isAdminLoggedIn = false;
let currentOrder = null;

// INIT
document.addEventListener('DOMContentLoaded', () => {
    renderAllDevices();
    showPage('home');
});

// PAGES
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageName + '-page').classList.add('active');
    window.scrollTo(0, 0);
}

// RENDER DEVICES (NO CONDITION SELECTOR)
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

// CALCULATE - NO CONDITION MULTIPLIER
function updateCalculations() {
    let selections = {};
    let totalWeight = 0;
    let deviceCount = 0;
    let totalMetalValue = 0;
    let totalBasePayouts = 0;
    let operatingCost = 0;

    Object.keys(devices).forEach(category => {
        Object.keys(devices[category]).forEach(tierKey => {
            const device = devices[category][tierKey];
            const qty = parseInt(document.getElementById(`qty-${device.id}`).value || 0);
            
            if (qty > 0) {
                // NO CONDITION MULTIPLIER - always 1.0
                const actualWeight = device.weight * qty;
                
                // Calculate metal value
                let metalValue = 0;
                Object.keys(device.metals).forEach(metal => {
                    const content = device.metals[metal];
                    const totalContent = content * qty;
                    const recoverable = totalContent * metalData[metal].recovery;
                    metalValue += recoverable * metalData[metal].price;
                });

                // Fixed base payout
                const basePayout = device.payoutPrice * qty;

                selections[device.id] = { 
                    name: device.name, 
                    tier: device.tier, 
                    qty, 
                    actualWeight,
                    metalValue,
                    payoutPrice: device.payoutPrice,
                    basePayout
                };

                totalWeight += actualWeight;
                deviceCount += qty;
                totalMetalValue += metalValue;
                totalBasePayouts += basePayout;
                operatingCost += (actualWeight * costPerKg) + (qty * qcPerDevice);
            }
        });
    });

    // DELIVERY COST
    const deliveryCost = totalWeight > bulkThreshold ? 0 : pickupFeeSmall;
    const userActuallyGets = totalBasePayouts - deliveryCost;
    const neooreProfit = totalMetalValue - totalBasePayouts - operatingCost;
    const profitMargin = totalMetalValue > 0 ? (neooreProfit / totalMetalValue * 100) : 0;

    // Display to customer
    document.getElementById('customer-total').textContent = Math.round(userActuallyGets);
    document.getElementById('customer-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('device-count').textContent = deviceCount;
    document.getElementById('detail-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('pickup-status').textContent = totalWeight > bulkThreshold ? 'FREE Pickup' : '₹100 Delivery';
    document.getElementById('co2-saved').textContent = (totalWeight * 1.5).toFixed(2);
    document.getElementById('water-saved').textContent = Math.round(totalWeight * 50);
    document.getElementById('energy-saved').textContent = (totalWeight * 8).toFixed(1);

    currentOrder = {
        selections,
        totalWeight,
        deviceCount,
        totalMetalValue,
        totalBasePayouts,
        userActuallyGets,
        deliveryCost,
        operatingCost,
        neooreProfit,
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
        deviceHTML += `<tr><td>${sel.name} [${sel.tier}]</td><td>${sel.qty}</td><td>₹${Math.round(sel.payoutPrice)}</td><td>₹${Math.round(sel.basePayout)}</td></tr>`;
    });

    const receiptHTML = `
        <h2 style="text-align: center; color: #FC6736;">NeoOre Payout Receipt</h2>
        <p style="text-align: center; font-size: 0.9em;">${new Date().toLocaleDateString()}</p>
        
        <h3 style="color: #FC6736; margin-top: 20px;">Devices You're Selling</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
            <tr style="background: #FBF9F6;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Device</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                <th style="border: 1px solid #ddd; padding: 8px;">Unit Price</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total</th>
            </tr>
            ${deviceHTML}
        </table>

        <h3 style="color: #FC6736; margin-top: 20px;">Payout Details</h3>
        <p><strong>Total Devices:</strong> ${currentOrder.deviceCount}</p>
        <p><strong>Total Weight:</strong> ${currentOrder.totalWeight.toFixed(2)} kg</p>
        <p><strong>Base Payout:</strong> ₹${Math.round(currentOrder.totalBasePayouts)}</p>
        ${currentOrder.deliveryCost > 0 ? `<p><strong>Less Delivery Cost:</strong> -₹${currentOrder.deliveryCost}</p>` : '<p><strong>Delivery:</strong> FREE</p>'}
        <p style="font-size: 1.3em; color: #FC6736; margin-top: 20px; padding: 15px; background: #FBF9F6; border-radius: 8px;"><strong>You Will Receive: ₹${Math.round(currentOrder.userActuallyGets)}</strong></p>

        <h3 style="color: #FC6736; margin-top: 20px;">Your Environmental Impact</h3>
        <p>💨 CO₂ Prevented: ${(currentOrder.totalWeight * 1.5).toFixed(2)} kg</p>
        <p>💧 Water Saved: ${Math.round(currentOrder.totalWeight * 50)} L</p>
        <p>⚡ Energy Saved: ${(currentOrder.totalWeight * 8).toFixed(1)} kWh</p>

        <p style="margin-top: 30px; font-size: 0.85em; color: #666;">
            Our team will contact you within 24 hours to schedule pickup.
        </p>
    `;

    document.getElementById('receipt-body').innerHTML = receiptHTML;
    document.getElementById('receipt-modal').classList.add('show');
    orders.push({ date: new Date().toLocaleDateString(), ...currentOrder });
}

function downloadPDF() {
    const element = document.getElementById('receipt-body');
    const opt = {
        margin: 10,
        filename: `NeoOre-Payout-${Date.now()}.pdf`,
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
    const totalMetalValue = orders.reduce((sum, o) => sum + o.totalMetalValue, 0);
    const totalProfit = orders.reduce((sum, o) => sum + o.neooreProfit, 0);
    const profitMargin = totalMetalValue > 0 ? (totalProfit / totalMetalValue * 100) : 0;

    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-weight').textContent = totalWeight.toFixed(2);
    document.getElementById('total-revenue').textContent = Math.round(totalMetalValue);
    document.getElementById('total-profit').textContent = Math.round(totalProfit);
    document.getElementById('avg-margin').textContent = profitMargin.toFixed(1) + '%';

    const ordersList = document.getElementById('orders-list');
    if (orders.length === 0) {
        ordersList.innerHTML = '<p style="text-align: center; color: #666;">No orders yet</p>';
        return;
    }

    ordersList.innerHTML = orders.map((order, i) => `
        <div class="order-item">
            <h4>Order #${i + 1}</h4>
            <div class="order-details">
                <div class="order-detail-item"><span>Weight:</span> <strong>${order.totalWeight.toFixed(2)} kg</strong></div>
                <div class="order-detail-item"><span>Devices:</span> <strong>${order.deviceCount}</strong></div>
                <div class="order-detail-item"><span>Metal Value:</span> <strong>₹${Math.round(order.totalMetalValue)}</strong></div>
                <div class="order-detail-item"><span>Base Payout:</span> <strong>₹${Math.round(order.totalBasePayouts)}</strong></div>
                <div class="order-detail-item"><span>Delivery:</span> <strong>₹${order.deliveryCost}</strong></div>
                <div class="order-detail-item"><span>Customer Gets:</span> <strong>₹${Math.round(order.userActuallyGets)}</strong></div>
                <div class="order-detail-item"><span>Operating Cost:</span> <strong>₹${Math.round(order.operatingCost)}</strong></div>
                <div class="order-detail-item"><span>Profit:</span> <strong style="color: #FC6736;">₹${Math.round(order.neooreProfit)}</strong></div>
                <div class="order-detail-item"><span>Margin:</span> <strong>${order.profitMargin.toFixed(2)}%</strong></div>
                <div class="order-detail-item"><span>Date:</span> <strong>${order.date}</strong></div>
            </div>
        </div>
    `).join('');
}
