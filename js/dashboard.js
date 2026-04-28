
const token = sessionStorage.getItem('token');
const username = sessionStorage.getItem('username');


if (!token) {
  window.location.href = '/login';
}


history.replaceState(null, '', '/dashboard');
window.addEventListener('popstate', () => {
  if (!sessionStorage.getItem('token')) {
    window.location.replace('/login');
  } else {
    history.pushState(null, '', '/dashboard');
  }
});

function logout() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('username');
  window.location.replace('/login');
}


function handle401() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('username');
  window.location.replace('/login');
}


function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === tab + 'Page');
  });
  if (tab === 'history') loadHistory();
}


async function searchWeather() {
  const cityInput = document.getElementById('cityInput');
  const city = cityInput.value.trim();
  if (!city) return;

  const resultEl = document.getElementById('weatherResult');
  const errorEl  = document.getElementById('weatherError');
  errorEl.classList.remove('show');

  const loadingId = `loading-${Date.now()}`;
  const loadingCard = document.createElement('div');
  loadingCard.id = loadingId;
  loadingCard.style.cssText = 'text-align:center;padding:1.5rem;color:#6b7280;background:white;border:1px solid #d1d9f0;border-radius:12px;margin-bottom:1rem;';
  loadingCard.textContent = `Fetching weather for ${city}...`;
  resultEl.prepend(loadingCard);

  const r = await fetch(`/api/weather/search?city=${encodeURIComponent(city)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });


  document.getElementById(loadingId)?.remove();

  if (r.status === 401) { handle401(); return; }

  const data = await r.json();

  if (!r.ok) {
    errorEl.textContent = data.detail || 'City not found.';
    errorEl.classList.add('show');
    return;
  }

  const cardId = `card-${Date.now()}`;

  const card = document.createElement('div');
  card.id = cardId;
  card.style.marginBottom = '1.25rem';
  card.innerHTML = `
    <div style="position:relative">
      <button
        onclick="document.getElementById('${cardId}').remove()"
        style="position:absolute;top:0;right:0;background:none;border:none;font-size:1.1rem;cursor:pointer;color:#6b7ab0;padding:.25rem .5rem;line-height:1;"
        title="Close">✕</button>
      <div class="weather-card">
        <div class="weather-icon">${data.icon}</div>
        <div class="weather-city">${data.city}</div>
        <div class="weather-country">${data.country}</div>
        <div class="weather-temp">${Math.round(data.temperature_c)}°C</div>
        <div class="weather-desc">${data.description}</div>
        <div class="weather-meta">
          <span>🌡 Feels ${Math.round(data.feels_like_c)}°C</span>
          <span>💧 ${data.humidity}%</span>
          <span>💨 ${data.wind_speed_kmh} km/h</span>
          <span>👁 ${(data.visibility_m / 1000).toFixed(1)} km</span>
        </div>
      </div>
      <button
        class="btn btn-save"
        id="saveBtn-${cardId}"
        onclick="saveWeather('${data.city.replace(/'/g, "\\'")}', '${cardId}')">
        💾 Save to My History
      </button>
      <div id="saveMsg-${cardId}" class="msg-success"></div>
    </div>
  `;

  
  resultEl.prepend(card);

  
  cityInput.value = '';
}


async function saveWeather(city, cardId) {
  const btn   = document.getElementById(`saveBtn-${cardId}`);
  const msgEl = document.getElementById(`saveMsg-${cardId}`);

  btn.disabled = true;
  btn.textContent = 'Saving...';

  const r = await fetch(`/api/weather/save?city=${encodeURIComponent(city)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (r.ok) {
    msgEl.textContent = '✓ Saved to your history!';
    msgEl.style.color = '';
    msgEl.classList.add('show');
    btn.textContent = '✓ Saved';
  } else {
    const data = await r.json();
    msgEl.textContent = data.detail || 'Failed to save. Try again.';
    msgEl.style.color = '#dc2626';
    msgEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = '💾 Save to My History';
  }
}


async function loadHistory() {
  const listEl = document.getElementById('historyList');
  listEl.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--muted)">Loading...</div>';

  const r = await fetch('/api/weather/history', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (r.status === 401) { handle401(); return; }

  const data = await r.json();

  if (!data.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌤</div>
        <p>No saved weather yet.<br>Search for a city and save it!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = data.map(item => `
    <div class="history-item" id="item-${item.id}">
      <div class="history-emoji">${item.icon}</div>
      <div class="history-info">
        <div class="city">${item.city}, ${item.country}</div>
        <div class="detail">
          ${item.description} &nbsp;·&nbsp;
          💧 ${item.humidity}% &nbsp;·&nbsp;
          💨 ${item.wind_speed_kmh} km/h &nbsp;·&nbsp;
          👁 ${(item.visibility_m / 1000).toFixed(1)} km
        </div>
        <div class="time">${new Date(item.saved_at).toLocaleString()}</div>
      </div>
      <div class="history-right">
        <div class="temp">${Math.round(item.temperature_c)}°C</div>
        <div class="feels">Feels ${Math.round(item.feels_like_c)}°C</div>
      </div>
      <button class="btn btn-danger" onclick="deleteLog('${item.id}')" title="Delete">Delete</button>
    </div>
  `).join('');
}


async function deleteLog(id) {
  const r = await fetch(`/api/weather/history/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (r.ok) {
    const el = document.getElementById(`item-${id}`);
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s';
      setTimeout(() => { el.remove(); checkEmpty(); }, 200);
    }
  }
}

function checkEmpty() {
  const listEl = document.getElementById('historyList');
  if (!listEl.querySelector('.history-item')) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🌤</div>
        <p>No saved weather yet.<br>Search for a city and save it!</p>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const cityInput = document.getElementById('cityInput');
  if (cityInput) {
    cityInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') searchWeather();
    });
  }

  const greetEl = document.getElementById('greetMsg');
  if (greetEl && username) {
    greetEl.textContent = `👋 Hello, ${username}!`;
  }
});