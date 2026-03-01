// ===== Elias Spelportal - App Logic (Supabase) =====

const STORAGE_KEY = 'elias-spelportal-recent';
const THEME_KEY = 'elias-spelportal-theme';
const MAX_RECENT = 6;

const AVATARS_FREE = ['😀','😎','🤩','😈','👻','🤖','🦊','🐱','🐶','🦁','🐸','🐼','🦄','🐲','🎮','⚡','🔥','💎','🌟','🚀'];
const AVATARS_LOCKED = ['🏆','👾','🎪','🧙','🦸','🎭','💀','🍕','🎃','👽','🤠','🦇','🐉','🗿','💩','🧛','🥶','🤯','🫥','🤑'];

// Shop items
const NAME_COLORS = [
  { id: 'red', name: 'Röd', color: '#f87171', price: 50 },
  { id: 'blue', name: 'Blå', color: '#60a5fa', price: 50 },
  { id: 'green', name: 'Grön', color: '#4ade80', price: 50 },
  { id: 'purple', name: 'Lila', color: '#c084fc', price: 75 },
  { id: 'orange', name: 'Orange', color: '#fb923c', price: 75 },
  { id: 'pink', name: 'Rosa', color: '#f472b6', price: 75 },
  { id: 'gold', name: 'Guld', color: '#fbbf24', price: 150 },
  { id: 'rainbow', name: 'Regnbåge', color: 'rainbow', price: 300 },
];

const TITLES = [
  { id: 'pro', name: 'Pro Gamer', price: 100 },
  { id: 'legend', name: 'Legend', price: 200 },
  { id: 'speedrunner', name: 'Speedrunner', price: 150 },
  { id: 'boss', name: 'Boss', price: 250 },
  { id: 'champion', name: 'Champion', price: 300 },
  { id: 'king', name: 'King', price: 500 },
];

const NAME_EFFECTS = [
  { id: 'glow', name: 'Glow-effekt', price: 200 },
  { id: 'bold', name: 'Fet text', price: 50 },
];

const ARROW_SKINS = [
  { id: 'default', name: 'Standard', price: 0, primary: '#00d4ff', secondary: '#ffffff', trail: '#00d4ff', glow: '#00d4ff', glowStyle: 'normal' },
  { id: 'crimson', name: 'Crimson', price: 75, primary: '#ff2d55', secondary: '#ffaacc', trail: '#ff2d55', glow: '#ff2d55', glowStyle: 'normal' },
  { id: 'emerald', name: 'Emerald', price: 75, primary: '#39ff14', secondary: '#ccffcc', trail: '#39ff14', glow: '#39ff14', glowStyle: 'normal' },
  { id: 'sunset', name: 'Sunset', price: 100, primary: '#ff6a00', secondary: '#ffdd44', trail: '#ff8c00', glow: '#ff6a00', glowStyle: 'normal' },
  { id: 'phantom', name: 'Phantom', price: 150, primary: '#a855f7', secondary: '#e0ccff', trail: '#a855f7', glow: '#a855f7', glowStyle: 'pulse' },
  { id: 'arctic', name: 'Arctic', price: 150, primary: '#88eeff', secondary: '#ffffff', trail: '#aaeeff', glow: '#88eeff', glowStyle: 'frost' },
  { id: 'golden', name: 'Golden', price: 200, primary: '#fbbf24', secondary: '#fff8e0', trail: '#fbbf24', glow: '#fbbf24', glowStyle: 'normal' },
  { id: 'inferno', name: 'Inferno', price: 250, primary: '#ff4400', secondary: '#ff8800', trail: '#ff2200', glow: '#ff4400', glowStyle: 'flicker' },
  { id: 'void', name: 'Void', price: 300, primary: '#1a0033', secondary: '#6600cc', trail: '#3300aa', glow: '#6600cc', glowStyle: 'reverse' },
  { id: 'rainbow', name: 'Regnbåge', price: 500, primary: 'rainbow', secondary: '#ffffff', trail: 'rainbow', glow: 'rainbow', glowStyle: 'rainbow' },
];

const EMOJI_PACK_PRICE = 100;

let allGames = [];
let activeCategory = 'all';
let searchQuery = '';
let currentUserData = null;

// ===== Supabase Helpers =====
function usernameToEmail(username) {
  return `${username.toLowerCase()}@spelportal.app`;
}

function mapProfile(row) {
  if (!row) return null;
  return {
    uid: row.id,
    username: row.username,
    avatar: row.avatar || '😀',
    role: row.role || 'user',
    coins: row.coins || 0,
    banned: row.banned || false,
    bannedUntil: row.banned_until,
    favorites: row.favorites || [],
    nameColor: row.name_color,
    nameEffect: row.name_effect,
    title: row.title,
    unlockedColors: row.unlocked_colors || [],
    unlockedTitles: row.unlocked_titles || [],
    unlockedEffects: row.unlocked_effects || [],
    unlockedEmojis: row.unlocked_emojis || [],
    unlockedSkins: row.unlocked_skins || [],
    arrowSkin: row.arrow_skin,
    joined: row.joined_at,
  };
}

function mapToDb(updates) {
  const map = {
    nameColor: 'name_color',
    nameEffect: 'name_effect',
    unlockedColors: 'unlocked_colors',
    unlockedTitles: 'unlocked_titles',
    unlockedEffects: 'unlocked_effects',
    unlockedEmojis: 'unlocked_emojis',
    unlockedSkins: 'unlocked_skins',
    arrowSkin: 'arrow_skin',
    bannedUntil: 'banned_until',
  };
  const result = {};
  for (const [key, value] of Object.entries(updates)) {
    result[map[key] || key] = value;
  }
  return result;
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  setupMobileMenu();
  setupEasterEgg();
  setupAuth();
  setupFeedback();

  await initAuth();

  renderHeaderAuth();
  loadGames();
});

async function initAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
      const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      currentUserData = data ? mapProfile(data) : null;
    }
  } catch (e) {
    console.error('Auth init error:', e);
  }
}

// ===== Theme =====
function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
}
function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// ===== Users & Auth =====
function getCurrentUser() {
  return currentUserData;
}

function isOwner() { const u = getCurrentUser(); return u && u.role === 'owner'; }
function isAdmin() { const u = getCurrentUser(); return u && (u.role === 'admin' || u.role === 'owner'); }
function isStaff() { return isAdmin(); }

function getUserRole(user) { return user.role || 'user'; }
function getRoleBadge(role) {
  if (role === 'owner') return { label: 'Owner', cls: 'badge-owner' };
  if (role === 'admin') return { label: 'Admin', cls: 'badge-admin' };
  return { label: 'Medlem', cls: 'badge-active' };
}

async function registerUser(username, password, avatar) {
  // Check username uniqueness
  const { data: existing } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('username_lower', username.toLowerCase())
    .maybeSingle();

  if (existing) return { ok: false, error: 'Användarnamnet är redan taget' };

  // Sign up with Supabase Auth
  const { data, error } = await supabaseClient.auth.signUp({
    email: usernameToEmail(username),
    password: password,
  });

  if (error) {
    if (error.message.includes('already registered')) return { ok: false, error: 'Användarnamnet är redan taget' };
    if (error.message.includes('Password')) return { ok: false, error: 'Lösenordet måste vara minst 6 tecken' };
    return { ok: false, error: error.message };
  }

  // Create profile
  const { error: profileError } = await supabaseClient.from('profiles').insert({
    id: data.user.id,
    username: username,
    username_lower: username.toLowerCase(),
    avatar: avatar || '😀',
  });

  if (profileError) {
    console.error('Profile creation error:', profileError);
    return { ok: false, error: 'Kunde inte skapa profil' };
  }

  // Cache locally
  currentUserData = mapProfile({
    id: data.user.id,
    username: username,
    username_lower: username.toLowerCase(),
    avatar: avatar || '😀',
    role: 'user',
    coins: 0,
    banned: false,
    banned_until: null,
    favorites: [],
    name_color: null,
    name_effect: null,
    title: null,
    unlocked_colors: [],
    unlocked_titles: [],
    unlocked_effects: [],
    unlocked_emojis: [],
    unlocked_skins: [],
    arrow_skin: null,
    joined_at: new Date().toISOString(),
  });

  return { ok: true };
}

async function authenticateUser(username, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: usernameToEmail(username),
    password: password,
  });

  if (error) return { ok: false, error: 'Fel användarnamn eller lösenord' };

  // Load profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (!profile) {
    await supabaseClient.auth.signOut();
    return { ok: false, error: 'Kontot har tagits bort' };
  }

  // Check ban
  if (profile.banned) {
    if (profile.banned_until && new Date() >= new Date(profile.banned_until)) {
      // Ban expired, auto unban
      await supabaseClient.from('profiles').update({ banned: false, banned_until: null }).eq('id', data.user.id);
      profile.banned = false;
      profile.banned_until = null;
    } else if (profile.banned_until) {
      const until = new Date(profile.banned_until).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      await supabaseClient.auth.signOut();
      return { ok: false, error: `Kontot är bannat till ${until}` };
    } else {
      await supabaseClient.auth.signOut();
      return { ok: false, error: 'Detta konto är permanent bannat' };
    }
  }

  currentUserData = mapProfile(profile);
  return { ok: true };
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUserData = null;
}

async function updateUser(updates) {
  if (!currentUserData) return;
  const dbUpdates = mapToDb(updates);
  await supabaseClient.from('profiles').update(dbUpdates).eq('id', currentUserData.uid);
  Object.assign(currentUserData, updates);
}

async function deleteAccount() {
  if (!currentUserData) return;
  await supabaseClient.from('profiles').delete().eq('id', currentUserData.uid);
  await supabaseClient.auth.signOut();
  currentUserData = null;
}

async function toggleFavorite(gameId) {
  const user = getCurrentUser();
  if (!user) return false;
  const favs = [...(user.favorites || [])];
  const idx = favs.indexOf(gameId);
  if (idx === -1) favs.push(gameId);
  else favs.splice(idx, 1);
  await updateUser({ favorites: favs });
  return favs.includes(gameId);
}

function isFavorite(gameId) {
  const user = getCurrentUser();
  if (!user) return false;
  return (user.favorites || []).includes(gameId);
}

// ===== Coins =====
async function addCoins(amount) {
  if (!currentUserData) return;
  const newCoins = (currentUserData.coins || 0) + amount;
  await supabaseClient.from('profiles').update({ coins: newCoins }).eq('id', currentUserData.uid);
  currentUserData.coins = newCoins;
}

async function spendCoins(amount) {
  if (!currentUserData) return false;
  if ((currentUserData.coins || 0) < amount) return false;
  const newCoins = currentUserData.coins - amount;
  await supabaseClient.from('profiles').update({ coins: newCoins }).eq('id', currentUserData.uid);
  currentUserData.coins = newCoins;
  return true;
}

async function claimGameCoins(gameId) {
  if (!currentUserData) return false;
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabaseClient
    .from('claimed_coins')
    .select('id')
    .eq('user_id', currentUserData.uid)
    .eq('game_id', gameId)
    .eq('claim_date', today)
    .maybeSingle();

  if (existing) return false;

  const { error } = await supabaseClient.from('claimed_coins').insert({
    user_id: currentUserData.uid,
    game_id: gameId,
    claim_date: today,
  });

  if (error) return false;
  await addCoins(25);
  return true;
}

// ===== Styled Username =====
function getStyledName(user) {
  if (!user) return '';
  let name = user.username;
  const color = user.nameColor;
  const effect = user.nameEffect;

  let style = '';
  if (color === 'rainbow') {
    style += 'background:linear-gradient(90deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
  } else if (color) {
    style += `color:${color};`;
  }
  if (effect === 'bold') style += 'font-weight:900;';
  if (effect === 'glow') style += `text-shadow:0 0 8px ${color || '#4a9eff'},0 0 16px ${color || '#4a9eff'};`;

  return `<span class="styled-name" style="${style}">${escapeHtml(name)}</span>`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ===== Available Avatars =====
function getAvailableAvatars(user) {
  const extra = user ? (user.unlockedEmojis || []) : [];
  return [...AVATARS_FREE, ...extra];
}

// ===== Render Header Auth =====
function renderHeaderAuth() {
  const container = document.getElementById('header-auth');
  if (!container) return;
  const user = getCurrentUser();

  if (!user) {
    container.innerHTML = '<button class="auth-btn" id="show-login">Logga in</button>';
    document.getElementById('show-login').addEventListener('click', () => openAuthModal('login'));
    return;
  }

  let adminBtn = '';
  if (isAdmin()) {
    adminBtn = `<a href="admin.html" class="admin-btn">🛡️ Admin<span class="admin-notif" id="admin-notif" style="display:none"></span></a>`;
    // Fetch feedback count async
    supabaseClient.from('feedback').select('id', { count: 'exact', head: true }).then(({ count }) => {
      const notifEl = document.getElementById('admin-notif');
      if (notifEl && count > 0) {
        notifEl.textContent = count;
        notifEl.style.display = '';
      }
    });
  }
  const coinsDisplay = `<a href="shop.html" class="coins-display" title="Öppna shop">🪙 ${user.coins || 0}</a>`;

  container.innerHTML = `
    ${adminBtn}
    ${coinsDisplay}
    <div class="user-menu-wrapper">
      <button class="user-menu-btn" id="user-menu-btn">
        <span class="user-menu-avatar">${user.avatar}</span>
        <span class="user-menu-name">${getStyledName(user)}</span>
        <span class="user-menu-arrow">▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <a href="profile.html" class="dropdown-item">👤 Min profil</a>
        <a href="shop.html" class="dropdown-item">🛒 Shop</a>
        <button class="dropdown-item" id="open-settings">⚙️ Inställningar</button>
        <button class="dropdown-item dropdown-logout" id="header-logout">🚪 Logga ut</button>
      </div>
    </div>`;

  const menuBtn = document.getElementById('user-menu-btn');
  const dropdown = document.getElementById('user-dropdown');
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
  document.getElementById('header-logout').addEventListener('click', async () => { await logoutUser(); window.location.reload(); });
  document.getElementById('open-settings').addEventListener('click', () => { dropdown.classList.remove('open'); openSettingsModal(); });
}

// ===== Auth Modal =====
function setupAuth() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;

  document.getElementById('auth-close').addEventListener('click', () => modal.classList.remove('visible'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });

  modal.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      modal.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
      document.getElementById('login-form').style.display = t === 'login' ? '' : 'none';
      document.getElementById('register-form').style.display = t === 'register' ? '' : 'none';
      document.getElementById('auth-modal-title').textContent = t === 'login' ? 'Logga in' : 'Skapa konto';
      clearAuthErrors();
    });
  });

  const picker = document.getElementById('reg-avatar-picker');
  if (picker) renderAvatarPicker(picker, '😀', AVATARS_FREE);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Loggar in...';
    const r = await authenticateUser(
      document.getElementById('login-username').value.trim(),
      document.getElementById('login-password').value
    );
    if (r.ok) { modal.classList.remove('visible'); window.location.reload(); }
    else { document.getElementById('login-error').textContent = r.error; btn.disabled = false; btn.textContent = 'Logga in'; }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw1 = document.getElementById('reg-password').value;
    const pw2 = document.getElementById('reg-password2').value;
    if (pw1 !== pw2) { document.getElementById('register-error').textContent = 'Lösenorden matchar inte'; return; }
    if (pw1.length < 6) { document.getElementById('register-error').textContent = 'Lösenordet måste vara minst 6 tecken'; return; }
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Skapar konto...';
    const avatar = picker.querySelector('.avatar-option.selected')?.textContent || '😀';
    const r = await registerUser(document.getElementById('reg-username').value.trim(), pw1, avatar);
    if (r.ok) { modal.classList.remove('visible'); window.location.reload(); }
    else { document.getElementById('register-error').textContent = r.error; btn.disabled = false; btn.textContent = 'Skapa konto'; }
  });
}

function openAuthModal(tab) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.add('visible');
  clearAuthErrors();
  const t = tab || 'login';
  modal.querySelectorAll('.auth-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  document.getElementById('login-form').style.display = t === 'login' ? '' : 'none';
  document.getElementById('register-form').style.display = t === 'register' ? '' : 'none';
  document.getElementById('auth-modal-title').textContent = t === 'login' ? 'Logga in' : 'Skapa konto';
}

function clearAuthErrors() {
  const e1 = document.getElementById('login-error'), e2 = document.getElementById('register-error');
  if (e1) e1.textContent = '';
  if (e2) e2.textContent = '';
}

// ===== Avatar Picker =====
function renderAvatarPicker(container, selected, list) {
  container.innerHTML = '';
  (list || AVATARS_FREE).forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option' + (emoji === selected ? ' selected' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      container.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    container.appendChild(btn);
  });
}

// ===== Settings Modal =====
function openSettingsModal() {
  let modal = document.getElementById('settings-modal');
  if (modal) modal.remove();
  const user = getCurrentUser();
  if (!user) return;

  const currentTheme = localStorage.getItem(THEME_KEY) || 'dark';
  const avatars = getAvailableAvatars(user);

  modal = document.createElement('div');
  modal.className = 'modal-overlay visible';
  modal.id = 'settings-modal';
  modal.innerHTML = `
    <div class="modal settings-modal">
      <div class="modal-header">
        <h2>⚙️ Inställningar</h2>
        <button class="modal-close" id="settings-close">&times;</button>
      </div>
      <div class="settings-section">
        <h3 class="settings-heading">Byt avatar</h3>
        <div class="avatar-picker" id="settings-avatar-picker"></div>
      </div>
      <div class="settings-section">
        <h3 class="settings-heading">Byt lösenord</h3>
        <input type="password" id="settings-new-pw" class="modal-input" placeholder="Nytt lösenord (minst 6 tecken)">
        <button class="settings-save-btn" id="save-password">Uppdatera lösenord</button>
      </div>
      <div class="settings-section">
        <h3 class="settings-heading">Tema</h3>
        <div class="theme-picker">
          <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark"><span class="theme-preview dark-preview"></span>Mörkt</button>
          <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light"><span class="theme-preview light-preview"></span>Ljust</button>
        </div>
      </div>
      <div class="settings-section danger-zone">
        <h3 class="settings-heading">Farozon</h3>
        <button class="btn-danger-full" id="settings-delete-account">Ta bort mitt konto</button>
      </div>
      <p class="settings-status" id="settings-status"></p>
    </div>`;
  document.body.appendChild(modal);

  const picker = document.getElementById('settings-avatar-picker');
  renderAvatarPicker(picker, user.avatar, avatars);
  picker.addEventListener('click', async (e) => {
    if (e.target.classList.contains('avatar-option') && e.target.classList.contains('selected')) {
      await updateUser({ avatar: e.target.textContent });
      showSS('Avatar uppdaterad!');
      renderHeaderAuth();
    }
  });

  document.getElementById('settings-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  document.getElementById('save-password').addEventListener('click', async () => {
    const newPw = document.getElementById('settings-new-pw').value;
    if (newPw.length < 6) { showSS('Minst 6 tecken', true); return; }
    const { error } = await supabaseClient.auth.updateUser({ password: newPw });
    if (error) { showSS('Kunde inte uppdatera lösenord', true); return; }
    document.getElementById('settings-new-pw').value = '';
    showSS('Lösenord uppdaterat!');
  });

  modal.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.theme);
      modal.querySelectorAll('.theme-option').forEach(b => b.classList.toggle('active', b.dataset.theme === btn.dataset.theme));
      showSS(`Tema ändrat!`);
    });
  });

  document.getElementById('settings-delete-account').addEventListener('click', async () => {
    if (confirm('Är du säker?')) { await deleteAccount(); window.location.href = 'index.html'; }
  });

  function showSS(msg, err) {
    const el = document.getElementById('settings-status');
    el.textContent = msg;
    el.style.color = err ? '#f87171' : 'var(--accent-green)';
    setTimeout(() => el.textContent = '', 3000);
  }
}

// ===== Load Games =====
async function loadGames() {
  try {
    const r = await fetch('data/games.json?v=' + Date.now());
    allGames = await r.json();
    if (isGamePage()) initGamePage();
    else if (isProfilePage()) initProfilePage();
    else if (isShopPage()) initShopPage();
    else initHomePage();
  } catch (e) { console.error('Kunde inte ladda spel:', e); }
}

function isGamePage() { return document.body.classList.contains('game-page'); }
function isProfilePage() { return document.body.classList.contains('profile-page'); }
function isShopPage() { return document.body.classList.contains('shop-page'); }

// ===== HOME PAGE =====
function initHomePage() {
  renderCategories();
  renderFeaturedGames();
  renderAllGames();
  renderRecentlyPlayed();
  setupSearch();
  setupCategoryFilters();
}

function renderCategories() {
  const c = document.getElementById('categories-container');
  const m = document.getElementById('mobile-categories');
  const cats = [...new Set(allGames.map(g => g.category))];
  const emojis = { 'Action':'💥','Pussel':'🧩','Sport':'⚽','Äventyr':'🌿','Utbildning':'📚' };
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tag';
    btn.dataset.category = cat;
    btn.textContent = `${emojis[cat]||'🎮'} ${cat}`;
    c.appendChild(btn);
    if (m) m.appendChild(btn.cloneNode(true));
  });
}

function renderFeaturedGames() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  g.innerHTML = '';
  allGames.filter(x => x.featured).forEach(x => g.appendChild(createGameCard(x)));
}

function renderAllGames(games) {
  const g = document.getElementById('games-grid');
  if (!g) return;
  g.innerHTML = '';
  (games || allGames).forEach(x => g.appendChild(createGameCard(x)));
}

function createGameCard(game) {
  const card = document.createElement('a');
  card.className = 'game-card';
  card.href = `game.html?id=${game.id}`;
  const favClass = isFavorite(game.id) ? ' is-fav' : '';
  card.innerHTML = `
    <div class="card-thumbnail-wrapper">
      <img class="card-thumbnail" src="${game.thumbnail}" alt="${game.title}" loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%2316213e%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%234a9eff%22 font-size=%2248%22>🎮</text></svg>'">
      <div class="card-play-overlay"><div class="card-play-btn">▶</div></div>
      <button class="card-fav-btn${favClass}" data-game-id="${game.id}" title="Favorit">♥</button>
    </div>
    <div class="card-info">
      <div class="card-title">${game.title}</div>
      <span class="card-category" data-cat="${game.category}">${game.category}</span>
    </div>`;
  card.querySelector('.card-fav-btn').addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!getCurrentUser()) { openAuthModal('login'); return; }
    const f = await toggleFavorite(game.id);
    e.target.classList.toggle('is-fav', f);
  });
  return card;
}

function setupSearch() {
  const s = document.getElementById('search-input'), m = document.getElementById('mobile-search-input');
  if (s) s.addEventListener('input', (e) => { searchQuery = e.target.value; if (m) m.value = searchQuery; filterGames(); });
  if (m) m.addEventListener('input', (e) => { searchQuery = e.target.value; if (s) s.value = searchQuery; filterGames(); });
}

function setupCategoryFilters() {
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('category-tag')) return;
    activeCategory = e.target.dataset.category;
    document.querySelectorAll('.category-tag').forEach(b => b.classList.toggle('active', b.dataset.category === activeCategory));
    filterGames();
    const nav = document.getElementById('mobile-nav'), tog = document.getElementById('menu-toggle');
    if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); tog.classList.remove('active'); }
  });
}

function filterGames() {
  let f = allGames;
  if (activeCategory !== 'all') f = f.filter(g => g.category === activeCategory);
  if (searchQuery.trim()) { const q = searchQuery.toLowerCase().trim(); f = f.filter(g => g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)); }
  const t = document.getElementById('all-games-title');
  if (t) { if (searchQuery.trim()) t.textContent = '🔍 Sökresultat'; else if (activeCategory !== 'all') t.textContent = `🕹️ ${activeCategory}`; else t.textContent = '🕹️ Alla spel'; }
  const fs = document.getElementById('featured-section'), rs = document.getElementById('recently-played-section'), nr = document.getElementById('no-results');
  const isFilt = searchQuery.trim() || activeCategory !== 'all';
  if (fs) fs.style.display = isFilt ? 'none' : '';
  if (rs) rs.style.display = isFilt ? 'none' : '';
  renderAllGames(f);
  if (nr) nr.style.display = f.length === 0 ? 'block' : 'none';
}

function renderRecentlyPlayed() {
  const s = document.getElementById('recently-played-section'), g = document.getElementById('recently-played-grid');
  if (!s || !g) return;
  const rg = getRecentlyPlayed().map(id => allGames.find(x => x.id === id)).filter(Boolean);
  if (!rg.length) { s.style.display = 'none'; return; }
  s.style.display = ''; g.innerHTML = '';
  rg.forEach(x => g.appendChild(createGameCard(x)));
}

function getRecentlyPlayed() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveRecentlyPlayed(id) {
  let r = getRecentlyPlayed(); r = r.filter(x => x !== id); r.unshift(id); r = r.slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
}

function setupMobileMenu() {
  const t = document.getElementById('menu-toggle'), n = document.getElementById('mobile-nav');
  if (t && n) t.addEventListener('click', () => { t.classList.toggle('active'); n.classList.toggle('open'); });
}

// ===== Easter Egg =====
function setupEasterEgg() {
  const logo = document.getElementById('logo'), ov = document.getElementById('easter-egg-overlay'), cb = document.getElementById('easter-egg-close');
  if (!logo || !ov) return;
  let clicks = [];
  logo.addEventListener('click', () => { const n = Date.now(); clicks.push(n); clicks = clicks.filter(t => n - t < 5000); if (clicks.length >= 3) { ov.classList.add('visible'); clicks = []; } });
  if (cb) cb.addEventListener('click', () => ov.classList.remove('visible'));
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('visible'); });
}

// ===== Feedback =====
function setupFeedback() {
  const fab = document.getElementById('feedback-fab'), modal = document.getElementById('feedback-modal');
  const cb = document.getElementById('feedback-close'), form = document.getElementById('feedback-form'), suc = document.getElementById('feedback-success');
  if (!fab || !modal) return;
  fab.addEventListener('click', () => { modal.classList.add('visible'); if (form) form.style.display = ''; if (suc) suc.style.display = 'none'; });
  if (cb) cb.addEventListener('click', () => modal.classList.remove('visible'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await supabaseClient.from('feedback').insert({
      name: document.getElementById('feedback-name').value,
      type: document.getElementById('feedback-type').value,
      message: document.getElementById('feedback-message').value,
    });
    form.style.display = 'none'; if (suc) suc.style.display = ''; form.reset();
  });
}

// ===== GAME PAGE =====
function initGamePage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('id');
  if (!gameId) { window.location.href = 'index.html'; return; }
  const game = allGames.find(g => g.id === gameId);
  if (!game) { window.location.href = 'index.html'; return; }

  document.title = `${game.title} - Elias Spelportal`;
  document.getElementById('game-title').textContent = game.title;
  document.getElementById('game-description').textContent = game.description;
  const cb = document.getElementById('game-category'); cb.textContent = game.category; cb.dataset.cat = game.category;

  const iframe = document.getElementById('game-iframe'), loader = document.getElementById('game-loader');
  iframe.addEventListener('load', () => {
    loader.classList.add('hidden');
    // Send skin data to game iframe
    const user = getCurrentUser();
    if (user && user.arrowSkin) {
      iframe.contentWindow.postMessage({ type: 'skin-data', skinId: user.arrowSkin }, '*');
    }
  });
  iframe.src = game.path;
  saveRecentlyPlayed(game.id);

  // Listen for score-based coin rewards from game iframe
  window.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'game-score' && getCurrentUser()) {
      const score = e.data.score || 0;
      const earned = Math.floor(score / 10);
      if (earned > 0) {
        await addCoins(earned);
        renderHeaderAuth();
      }
    }
  });

  // Favorite
  const favBtn = document.getElementById('fav-btn');
  if (favBtn) {
    const upd = () => { const f = isFavorite(gameId); favBtn.textContent = f ? '♥' : '♡'; favBtn.classList.toggle('is-fav', f); };
    upd();
    favBtn.addEventListener('click', async () => { if (!getCurrentUser()) { openAuthModal('login'); return; } await toggleFavorite(gameId); upd(); });
  }

  document.getElementById('fullscreen-btn').addEventListener('click', () => {
    const w = document.getElementById('game-wrapper');
    if (w.requestFullscreen) w.requestFullscreen(); else if (w.webkitRequestFullscreen) w.webkitRequestFullscreen();
  });

  const mg = document.getElementById('more-games-grid');
  if (mg) allGames.filter(g => g.id !== gameId).slice(0, 4).forEach(g => mg.appendChild(createGameCard(g)));
}

// ===== PROFILE PAGE =====
function initProfilePage() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return; }

  document.getElementById('profile-avatar').textContent = user.avatar;

  const nameEl = document.getElementById('profile-username');
  nameEl.innerHTML = getStyledName(user);
  if (user.title) {
    const titleItem = TITLES.find(t => t.id === user.title);
    document.getElementById('profile-title').textContent = titleItem ? titleItem.name : user.title;
    document.getElementById('profile-title').style.display = '';
  }

  const roleBadge = getRoleBadge(getUserRole(user));
  const roleEl = document.getElementById('profile-role');
  if (roleEl) { roleEl.textContent = roleBadge.label; roleEl.className = 'profile-role-badge ' + roleBadge.cls; }

  document.getElementById('profile-joined').textContent = 'Medlem sedan ' +
    new Date(user.joined).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });

  document.getElementById('stat-favorites').textContent = (user.favorites || []).length;
  document.getElementById('stat-played').textContent = getRecentlyPlayed().length;
  document.getElementById('stat-coins').textContent = user.coins || 0;

  const picker = document.getElementById('profile-avatar-picker');
  if (picker) {
    renderAvatarPicker(picker, user.avatar, getAvailableAvatars(user));
    picker.addEventListener('click', async (e) => {
      if (e.target.classList.contains('avatar-option') && e.target.classList.contains('selected')) {
        await updateUser({ avatar: e.target.textContent });
        document.getElementById('profile-avatar').textContent = e.target.textContent;
        renderHeaderAuth();
      }
    });
  }

  const favGrid = document.getElementById('favorites-grid'), favEmpty = document.getElementById('favorites-empty');
  const favGames = (user.favorites || []).map(id => allGames.find(g => g.id === id)).filter(Boolean);
  if (!favGames.length) { favEmpty.style.display = ''; favGrid.style.display = 'none'; }
  else favGames.forEach(g => favGrid.appendChild(createGameCard(g)));

  const rGrid = document.getElementById('profile-recent-grid'), rEmpty = document.getElementById('recent-empty');
  const rGames = getRecentlyPlayed().map(id => allGames.find(g => g.id === id)).filter(Boolean);
  if (!rGames.length) { rEmpty.style.display = ''; rGrid.style.display = 'none'; }
  else rGames.forEach(g => rGrid.appendChild(createGameCard(g)));

  document.getElementById('logout-btn').addEventListener('click', async () => { await logoutUser(); window.location.href = 'index.html'; });
  document.getElementById('delete-account-btn').addEventListener('click', async () => {
    if (confirm('Är du säker?')) { await deleteAccount(); window.location.href = 'index.html'; }
  });
}

// ===== SHOP PAGE =====
function initShopPage() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return; }
  renderShop(user);
}

function renderShop(user) {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;

  const u = getCurrentUser() || user;
  const coinsEl = document.getElementById('shop-coins');
  if (coinsEl) coinsEl.textContent = u.coins || 0;

  let html = '';

  // Name Colors
  html += '<h3 class="shop-category-title">🎨 Namnfärger</h3><div class="shop-items">';
  NAME_COLORS.forEach(item => {
    const owned = (u.unlockedColors || []).includes(item.id);
    const equipped = u.nameColor === item.color;
    const colorStyle = item.color === 'rainbow'
      ? 'background:linear-gradient(90deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;'
      : `color:${item.color};`;
    html += `<div class="shop-item ${equipped ? 'equipped' : ''}">
      <span class="shop-item-preview" style="${colorStyle}; font-weight:800;">${item.name}</span>
      <span class="shop-item-name">${item.name}</span>
      ${owned
        ? (equipped
          ? '<button class="shop-btn shop-btn-equipped" data-action="unequip-color">Utrustad ✓</button>'
          : `<button class="shop-btn shop-btn-equip" data-action="equip-color" data-id="${item.id}" data-color="${item.color}">Använd</button>`)
        : `<button class="shop-btn shop-btn-buy" data-action="buy-color" data-id="${item.id}" data-color="${item.color}" data-price="${item.price}">🪙 ${item.price}</button>`
      }
    </div>`;
  });
  html += '</div>';

  // Titles
  html += '<h3 class="shop-category-title">🏅 Titlar</h3><div class="shop-items">';
  TITLES.forEach(item => {
    const owned = (u.unlockedTitles || []).includes(item.id);
    const equipped = u.title === item.id;
    html += `<div class="shop-item ${equipped ? 'equipped' : ''}">
      <span class="shop-item-preview">${item.name}</span>
      ${owned
        ? (equipped
          ? '<button class="shop-btn shop-btn-equipped" data-action="unequip-title">Utrustad ✓</button>'
          : `<button class="shop-btn shop-btn-equip" data-action="equip-title" data-id="${item.id}">Använd</button>`)
        : `<button class="shop-btn shop-btn-buy" data-action="buy-title" data-id="${item.id}" data-price="${item.price}">🪙 ${item.price}</button>`
      }
    </div>`;
  });
  html += '</div>';

  // Name Effects
  html += '<h3 class="shop-category-title">✨ Namneffekter</h3><div class="shop-items">';
  NAME_EFFECTS.forEach(item => {
    const owned = (u.unlockedEffects || []).includes(item.id);
    const equipped = u.nameEffect === item.id;
    html += `<div class="shop-item ${equipped ? 'equipped' : ''}">
      <span class="shop-item-preview">${item.name}</span>
      ${owned
        ? (equipped
          ? '<button class="shop-btn shop-btn-equipped" data-action="unequip-effect">Utrustad ✓</button>'
          : `<button class="shop-btn shop-btn-equip" data-action="equip-effect" data-id="${item.id}">Använd</button>`)
        : `<button class="shop-btn shop-btn-buy" data-action="buy-effect" data-id="${item.id}" data-price="${item.price}">🪙 ${item.price}</button>`
      }
    </div>`;
  });
  html += '</div>';

  // Arrow Skins
  html += '<h3 class="shop-category-title">🏹 Arrow Skins <span style="color:var(--text-muted);font-size:14px;">(Neon Dash)</span></h3><div class="shop-items">';
  ARROW_SKINS.filter(s => s.price > 0).forEach(skin => {
    const owned = (u.unlockedSkins || []).includes(skin.id);
    const equipped = u.arrowSkin === skin.id;
    const fillColor = skin.primary === 'rainbow' ? '#a855f7' : skin.primary;
    const glowColor = skin.glow === 'rainbow' ? '#a855f7' : skin.glow;
    html += `<div class="shop-item ${equipped ? 'equipped' : ''}">
      <div class="skin-preview">
        <svg viewBox="0 0 48 48" width="48" height="48" style="filter:drop-shadow(0 0 6px ${glowColor});">
          <polygon points="36,24 12,12 18,24 12,36" fill="${fillColor}"/>
          <polygon points="30,24 18,18 21,24 18,30" fill="${skin.secondary}"/>
        </svg>
      </div>
      <span class="shop-item-name" style="font-weight:700;font-size:14px;">${skin.name}</span>
      ${owned
        ? (equipped
          ? '<button class="shop-btn shop-btn-equipped" data-action="unequip-skin">Utrustad ✓</button>'
          : `<button class="shop-btn shop-btn-equip" data-action="equip-skin" data-id="${skin.id}">Använd</button>`)
        : `<button class="shop-btn shop-btn-buy" data-action="buy-skin" data-id="${skin.id}" data-price="${skin.price}">🪙 ${skin.price}</button>`
      }
    </div>`;
  });
  html += '</div>';

  // Extra Emojis
  html += `<h3 class="shop-category-title">😈 Extra Avatarer <span style="color:var(--text-muted);font-size:14px;">(${EMOJI_PACK_PRICE} coins styck)</span></h3><div class="shop-items emoji-items">`;
  AVATARS_LOCKED.forEach(emoji => {
    const owned = (u.unlockedEmojis || []).includes(emoji);
    html += `<div class="shop-item shop-emoji-item ${owned ? 'owned' : ''}">
      <span class="shop-emoji">${emoji}</span>
      ${owned
        ? '<span class="shop-owned-label">Ägd</span>'
        : `<button class="shop-btn shop-btn-buy shop-btn-sm" data-action="buy-emoji" data-emoji="${emoji}" data-price="${EMOJI_PACK_PRICE}">🪙 ${EMOJI_PACK_PRICE}</button>`
      }
    </div>`;
  });
  html += '</div>';

  grid.innerHTML = html;

  // Event handlers
  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const price = parseInt(btn.dataset.price) || 0;
      const id = btn.dataset.id;
      const emoji = btn.dataset.emoji;
      const color = btn.dataset.color;

      if (action.startsWith('buy-')) {
        if (!await spendCoins(price)) { alert(`Inte tillräckligt med coins! Du behöver ${price} 🪙`); return; }
        if (action === 'buy-color') {
          const colors = [...(currentUserData.unlockedColors || []), id];
          await updateUser({ unlockedColors: colors, nameColor: color });
        }
        if (action === 'buy-title') {
          const titles = [...(currentUserData.unlockedTitles || []), id];
          await updateUser({ unlockedTitles: titles, title: id });
        }
        if (action === 'buy-effect') {
          const effects = [...(currentUserData.unlockedEffects || []), id];
          await updateUser({ unlockedEffects: effects, nameEffect: id });
        }
        if (action === 'buy-emoji') {
          const emojis = [...(currentUserData.unlockedEmojis || []), emoji];
          await updateUser({ unlockedEmojis: emojis });
        }
        if (action === 'buy-skin') {
          const skins = [...(currentUserData.unlockedSkins || []), id];
          await updateUser({ unlockedSkins: skins, arrowSkin: id });
        }
      }
      if (action === 'equip-color') await updateUser({ nameColor: color });
      if (action === 'unequip-color') await updateUser({ nameColor: null });
      if (action === 'equip-title') await updateUser({ title: id });
      if (action === 'unequip-title') await updateUser({ title: null });
      if (action === 'equip-effect') await updateUser({ nameEffect: id });
      if (action === 'unequip-effect') await updateUser({ nameEffect: null });
      if (action === 'equip-skin') await updateUser({ arrowSkin: id });
      if (action === 'unequip-skin') await updateUser({ arrowSkin: null });

      renderShop(getCurrentUser());
      renderHeaderAuth();
    });
  });
}
