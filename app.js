import { dbService } from './db-service.js';
import { 
  auth, 
  loginWithEmail, 
  registerWithEmail, 
  logoutUser, 
  loginWithGoogle, 
  onAuthChange 
} from './firebase-config.js';

// State Variables
let medicine = 'Paracetamol 500 mg';
let selectedPharmacy = null;
let activeReservation = null;
let currentUser = null;

const $ = id => document.getElementById(id);

// --- Splash Screen Handler ---
function initSplashScreen() {
  const splash = $('splashScreen');
  if (splash) {
    // Automatically hide splash screen after 1.5s
    const hideTimer = setTimeout(() => {
      splash.classList.add('fade-out');
    }, 1500);

    // Instant skip on click
    splash.onclick = () => {
      clearTimeout(hideTimer);
      splash.classList.add('fade-out');
    };
  }
}

// --- Screen Routing ---
function navigateTo(screenId) {
  document.querySelectorAll('.navBtn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === screenId);
  });
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === screenId);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindNavigation() {
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const targetScreen = btn.dataset.screen;
      
      // Dynamic auth redirection for topbar Sign In button
      if (btn.id === 'authBtn') {
        if (currentUser) {
          navigateTo('profileView');
        } else {
          navigateTo('loginView');
        }
      } else {
        navigateTo(targetScreen);
      }
    };
  });
}

// --- Pharmacy Search & Results Rendering ---
function statusFor(p) {
  return p.state === 'good' ? ['good', `${p.stock} available`] : p.state === 'warn' ? ['warn', `${p.stock} left`] : ['out', 'Out of stock'];
}

async function render(q = medicine) {
  medicine = q;
  $('resultsTitle').textContent = `Pharmacies with ${medicine}`;
  
  const pharmacies = await dbService.getPharmacies(medicine);
  $('context').textContent = `${pharmacies.length} nearby pharmacies · Real-time stock reporting active`;
  
  $('results').innerHTML = pharmacies.map((p, i) => {
    const [cls, label] = statusFor(p);
    const disabled = !p.stock || p.open === 'Closed';
    return `<article class="resultCard">
      <div class="resultTop">
        <div>
          <div class="medicineName">${medicine}</div>
          <div class="pharmacyName">${p.name}</div>
          <div class="sub">${p.distance} · ${p.open}</div>
        </div>
        <span class="pill ${cls}">${label}</span>
      </div>
      <div class="details">
        <div><span>Stock</span><b>${p.stock ? p.stock + ' units' : 'Unavailable'}</b></div>
        <div><span>Last confirmed</span><b>${p.fresh}</b></div>
        <div><span>Price</span><b>${p.price}</b></div>
      </div>
      <div class="cardActions">
        <button class="secondaryBtn" onclick="showToast('Directions preview opened')">Directions</button>
        <button class="primaryBtn" ${disabled ? 'disabled style="opacity:.45;cursor:not-allowed"' : `onclick="openReserve(${i})"`}>Reserve</button>
      </div>
    </article>`;
  }).join('');
}

window.openReserve = async (i) => {
  const pharmacies = await dbService.getPharmacies(medicine);
  selectedPharmacy = pharmacies[i];
  $('mTitle').textContent = medicine;
  $('mPharmacy').textContent = `${selectedPharmacy.name} · ${selectedPharmacy.distance} · ${selectedPharmacy.stock} available`;
  $('qty').value = 1;
  $('modal').classList.remove('hidden');
};

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__to);
  window.__to = setTimeout(() => t.classList.remove('show'), 2200);
}
window.showToast = showToast;

// --- Event Listeners & Actions ---
$('findBtn').onclick = () => render($('search').value.trim() || 'Paracetamol 500 mg');
$('search').addEventListener('keydown', e => { if (e.key === 'Enter') $('findBtn').click(); });
document.querySelectorAll('[data-q]').forEach(b => {
  b.onclick = () => {
    $('search').value = b.dataset.q;
    render(b.dataset.q);
  };
});

$('locationBtn').onclick = () => showToast('Location selector preview: Bengaluru');
$('close').onclick = () => $('modal').classList.add('hidden');
$('minus').onclick = () => { $('qty').value = Math.max(1, +$('qty').value - 1); };
$('plus').onclick = () => { $('qty').value = Math.min(5, +$('qty').value + 1); };

$('confirm').onclick = async () => {
  const qty = +$('qty').value;
  const id = 'MF' + Math.floor(1000 + Math.random() * 9000);
  activeReservation = { id, medicine, qty, pharmacy: selectedPharmacy.name };

  await dbService.addReservation(activeReservation);

  $('reserveId').textContent = id;
  $('reserveStatus').textContent = 'Confirmed • Ready for pickup';
  $('reservationDetail').className = 'reservationDetail';
  $('reservationDetail').innerHTML = `
    <div class="detailRow"><b>${medicine}</b><span>Quantity ${qty}</span></div>
    <div class="detailRow"><b>${selectedPharmacy.name}</b><span>${selectedPharmacy.distance} · Hold for 30 minutes</span></div>
    <div class="detailRow"><b>Show at pickup</b><span>Reservation ${id}</span></div>
  `;
  $('modal').classList.add('hidden');
  showToast(`Reservation ${id} confirmed`);
  navigateTo('savedView');
};

$('multiBtn').onclick = () => showToast('Combined search preview: one pharmacy with multiple medicines');

// --- Pharmacy Inventory & Queue ---
async function renderInventory() {
  const inventory = await dbService.getInventory();
  $('inventory').innerHTML = inventory.map((x, i) => `
    <div class="inventoryRow">
      <div><b>${x.name}</b><div class="sub">Updated ${x.fresh}</div></div>
      <div><b>${x.stock}</b><div class="sub">${x.unit}</div></div>
      <div><span class="tag ${x.state === 'warn' ? 'warn' : ''}">${x.state === 'warn' ? 'Low stock' : 'Available'}</span></div>
      <button class="secondaryBtn" onclick="updateStock(${i})">Update</button>
    </div>
  `).join('');
}

window.updateStock = async (i) => {
  const updated = await dbService.updateStock(i);
  renderInventory();
  updateMetrics();
  showToast(`${updated.name} stock updated`);
};

async function renderRequests() {
  const requests = await dbService.getRequests();
  $('requests').innerHTML = requests.map((r, i) => `
    <div class="requestRow">
      <div><b>${r.id}</b><div class="sub">${r.item}</div></div>
      <div><span class="tag ${r.status === 'Pending' ? 'warn' : ''}">${r.status}</span></div>
      <button class="${r.status === 'Pending' ? 'primaryBtn' : 'secondaryBtn'}" onclick="confirmReq(${i})">${r.status === 'Pending' ? 'Confirm' : 'Open'}</button>
    </div>
  `).join('');
}

window.confirmReq = async (i) => {
  const req = await dbService.confirmRequest(i);
  renderRequests();
  updateMetrics();
  showToast(`${req.id} confirmed`);
};

async function updateMetrics() {
  const inventory = await dbService.getInventory();
  const requests = await dbService.getRequests();
  $('listed').textContent = inventory.length;
  $('low').textContent = inventory.filter(x => x.stock <= 2).length;
  $('pending').textContent = requests.filter(x => x.status === 'Pending').length;
}

$('refresh').onclick = () => {
  renderInventory();
  renderRequests();
  updateMetrics();
  showToast('Inventory refreshed');
};

// --- Firebase Authentication UI Logic ---
const loginSubmitBtn = $('loginSubmitBtn');
const loginGoogleBtn = $('loginGoogleBtn');
const regSubmitBtn = $('regSubmitBtn');
const logoutBtn = $('logoutBtn');

if (loginSubmitBtn) {
  loginSubmitBtn.onclick = async () => {
    const email = $('loginEmail').value.trim();
    const password = $('loginPassword').value;
    if (!email || !password) return showToast('Please enter both email and password.');

    try {
      await loginWithEmail(email, password);
      showToast('Signed in successfully!');
      navigateTo('userView');
    } catch (err) {
      showToast('Login error: ' + (err.message || err.code));
    }
  };
}

if (loginGoogleBtn) {
  loginGoogleBtn.onclick = async () => {
    try {
      await loginWithGoogle();
      showToast('Signed in with Google!');
      navigateTo('userView');
    } catch (err) {
      showToast('Google Auth error: ' + (err.message || err.code));
    }
  };
}

if (regSubmitBtn) {
  regSubmitBtn.onclick = async () => {
    const email = $('regEmail').value.trim();
    const password = $('regPassword').value;
    if (!email || !password) return showToast('Please fill out all required fields.');

    try {
      await registerWithEmail(email, password);
      showToast('Account registered successfully!');
      navigateTo('userView');
    } catch (err) {
      showToast('Registration error: ' + (err.message || err.code));
    }
  };
}

if (logoutBtn) {
  logoutBtn.onclick = async () => {
    try {
      await logoutUser();
      showToast('Signed out successfully');
      navigateTo('userView');
    } catch (err) {
      showToast('Logout error: ' + err.message);
    }
  };
}

// Firebase Auth State Observer
onAuthChange(user => {
  currentUser = user;
  const authBtn = $('authBtn');
  if (user) {
    const displayName = user.displayName || user.email.split('@')[0];
    if (authBtn) {
      authBtn.textContent = displayName;
      authBtn.className = 'secondaryBtn';
    }
    if ($('userName')) $('userName').textContent = displayName;
    if ($('userEmail')) $('userEmail').textContent = user.email;
    if ($('userAvatar')) $('userAvatar').textContent = displayName.charAt(0).toUpperCase();
  } else {
    if (authBtn) {
      authBtn.textContent = 'Sign In';
      authBtn.className = 'primaryBtn';
    }
  }
});

// Initialize Page & Event Listeners
initSplashScreen();
bindNavigation();
render();
renderInventory();
renderRequests();
updateMetrics();