/* ============================================
   SKYE WEATHER APP — JavaScript (Improved)
   Changes:
   ✅ Geo lookup (city → lat/lon → weather)
   ✅ Current location button
   ✅ OWM weather icons (not emoji)
   ✅ Skeleton loader
   ✅ API key safety note
   ✅ Robust error handling
============================================ */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// 🔑 IMPORTANT: Never commit a real API key to a public repo.
// For production, use a backend proxy or environment variable (e.g. Netlify Functions).
// Get a free key at: https://openweathermap.org/api
const API_KEY = 'YOUR_API_KEY_HERE';

const GEO_URL     = 'https://api.openweathermap.org/geo/1.0/direct';
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const ICON_URL    = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const cityInput      = document.getElementById('cityInput');
const searchBtn      = document.getElementById('searchBtn');
const locBtn         = document.getElementById('locBtn');
const themeToggle    = document.getElementById('themeToggle');
const errorMsg       = document.getElementById('errorMsg');
const errorText      = document.getElementById('errorText');
const loader         = document.getElementById('loader');
const skeletonCard   = document.getElementById('skeletonCard');
const weatherSection = document.getElementById('weatherSection');

const cityName       = document.getElementById('cityName');
const countryName    = document.getElementById('countryName');
const dateText       = document.getElementById('dateText');
const timeText       = document.getElementById('timeText');
const tempValue      = document.getElementById('tempValue');
const feelsLike      = document.getElementById('feelsLike');
const conditionText  = document.getElementById('conditionText');
const weatherIconImg = document.getElementById('weatherIconImg');
const humidity       = document.getElementById('humidity');
const humidityBar    = document.getElementById('humidityBar');
const windSpeed      = document.getElementById('windSpeed');
const compassArrow   = document.getElementById('compassArrow');
const visibility     = document.getElementById('visibility');
const pressure       = document.getElementById('pressure');
const sunrise        = document.getElementById('sunrise');
const sunset         = document.getElementById('sunset');
const cloudiness     = document.getElementById('cloudiness');
const lastUpdated    = document.getElementById('lastUpdated');

// ─── THEME ────────────────────────────────────────────────────────────────────
let isDark = localStorage.getItem('skye-theme') !== 'light';
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

themeToggle.addEventListener('click', () => {
  isDark = !isDark;
  const theme = isDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('skye-theme', theme);
});

// ─── TIME / DATE ──────────────────────────────────────────────────────────────
function formatTime(unixTs, tzOffset) {
  const d = new Date((unixTs + tzOffset) * 1000);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDate(unixTs, tzOffset) {
  const d = new Date((unixTs + tzOffset) * 1000);
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function windDegToDir(deg) {
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}

// ─── UI STATE ─────────────────────────────────────────────────────────────────
function showError(msg) {
  errorText.textContent = msg;
  errorMsg.classList.add('visible');
  skeletonCard.classList.remove('visible');
  loader.classList.remove('visible');
  weatherSection.classList.remove('visible');
  setTimeout(() => errorMsg.classList.remove('visible'), 5000);
}

function hideError() { errorMsg.classList.remove('visible'); }

function showSkeleton() {
  skeletonCard.classList.add('visible');
  loader.classList.remove('visible');
  weatherSection.classList.remove('visible');
  hideError();
}

function hideSkeleton() { skeletonCard.classList.remove('visible'); }

// ─── RENDER ───────────────────────────────────────────────────────────────────
function renderWeather(data) {
  const now = Math.floor(Date.now() / 1000);
  const tz  = data.timezone;

  cityName.textContent    = data.name;
  countryName.textContent = data.sys.country;
  dateText.textContent    = formatDate(now, tz);
  timeText.textContent    = `${formatTime(now, tz)} local time`;

  tempValue.textContent   = Math.round(data.main.temp);
  feelsLike.textContent   = `feels like ${Math.round(data.main.feels_like)}°`;

  const w = data.weather[0];
  conditionText.textContent = w.description;
  weatherIconImg.src        = ICON_URL(w.icon);
  weatherIconImg.alt        = w.description;

  const hum = data.main.humidity;
  humidity.textContent    = `${hum}%`;
  humidityBar.style.width = `${hum}%`;

  const kph = (data.wind.speed * 3.6).toFixed(1);
  const dir = data.wind.deg !== undefined ? windDegToDir(data.wind.deg) : '';
  windSpeed.textContent = `${kph} km/h ${dir}`;
  if (data.wind.deg !== undefined) {
    compassArrow.style.transform = `translate(-50%, -100%) rotate(${data.wind.deg}deg)`;
  }

  visibility.textContent  = data.visibility !== undefined
    ? `${(data.visibility / 1000).toFixed(1)} km` : 'N/A';
  pressure.textContent    = `${data.main.pressure} hPa`;
  sunrise.textContent     = formatTime(data.sys.sunrise, tz);
  sunset.textContent      = formatTime(data.sys.sunset, tz);
  cloudiness.textContent  = `${data.clouds.all}%`;
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;

  hideSkeleton();
  loader.classList.remove('visible');
  weatherSection.classList.add('visible');
}

// ─── FETCH BY COORDS ──────────────────────────────────────────────────────────
async function fetchWeatherByCoords(lat, lon) {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    setTimeout(() => renderWeather(getDemoData('Your Location')), 900);
    return;
  }
  try {
    const res = await fetch(
      `${WEATHER_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    renderWeather(await res.json());
  } catch (err) {
    showError('Failed to fetch weather. Please try again.');
    console.error(err);
  }
}

// ─── FETCH BY CITY NAME (geo → coords → weather) ─────────────────────────────
async function fetchWeather(city) {
  if (!city.trim()) { showError('Please enter a city name.'); return; }

  if (API_KEY === 'YOUR_API_KEY_HERE') {
    showSkeleton();
    setTimeout(() => renderWeather(getDemoData(city)), 1100);
    return;
  }

  showSkeleton();

  try {
    // Step 1: Geocode city name → lat/lon
    const geoRes = await fetch(
      `${GEO_URL}?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
    );
    if (geoRes.status === 401) { showError('Invalid API key. Update API_KEY in script.js.'); return; }
    if (!geoRes.ok) throw new Error(`Geo HTTP ${geoRes.status}`);

    const geoData = await geoRes.json();
    if (!geoData.length) {
      showError(`City "${city}" not found. Check spelling and try again.`);
      return;
    }

    // Step 2: Fetch weather using precise coordinates
    const { lat, lon } = geoData[0];
    await fetchWeatherByCoords(lat, lon);

  } catch (err) {
    showError(
      err.name === 'TypeError'
        ? 'Network error. Check your internet connection.'
        : 'Something went wrong. Please try again.'
    );
    console.error('Weather fetch error:', err);
  }
}

// ─── CURRENT LOCATION ────────────────────────────────────────────────────────
locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  locBtn.classList.add('loading');
  showSkeleton();

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      locBtn.classList.remove('loading');
      await fetchWeatherByCoords(coords.latitude, coords.longitude);
    },
    (err) => {
      locBtn.classList.remove('loading');
      hideSkeleton();
      const msgs = {
        1: 'Location access denied. Allow location in your browser settings.',
        2: 'Location unavailable. Try searching by city name.',
        3: 'Location request timed out. Try again.',
      };
      showError(msgs[err.code] || 'Could not get your location.');
    },
    { timeout: 10000 }
  );
});

// ─── SEARCH EVENTS ────────────────────────────────────────────────────────────
function doSearch() {
  const city = cityInput.value.trim();
  if (city) localStorage.setItem('skye-last-city', city);
  fetchWeather(city);
}

searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
cityInput.addEventListener('input', hideError);

// ─── DEMO DATA ────────────────────────────────────────────────────────────────
function getDemoData(city) {
  const now = Math.floor(Date.now() / 1000);
  return {
    name: city,
    sys: { country: 'IN', sunrise: now - 21600, sunset: now + 21600 },
    timezone: 19800,
    main: { temp: 34, feels_like: 38, humidity: 62, pressure: 1008 },
    weather: [{ id: 801, description: 'few clouds', icon: '02d' }],
    wind: { speed: 4.2, deg: 215 },
    visibility: 8000,
    clouds: { all: 18 },
  };
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('skye-last-city') || 'London';
  cityInput.value = lastCity;
  fetchWeather(lastCity);
});
