// ===== Elias Spelportal - App Logic (Supabase) =====

const STORAGE_KEY = 'elias-spelportal-recent';
const THEME_KEY = 'elias-spelportal-theme';
const MAX_RECENT = 6;

const AVATARS_FREE = ['😀','😎','🤩','😈','👻','🤖','🦊','🐱','🐶','🦁','🐸','🐼','🦄','🐲','🎮','⚡','🔥','💎','🌟','🚀'];

const CORNY_IMAGE_URL = 'images/corny.jpg';

// Titlar som visas på profilen
const TITLES = [
  { id: 'pro', name: 'Pro Gamer' },
  { id: 'legend', name: 'Legend' },
  { id: 'speedrunner', name: 'Speedrunner' },
  { id: 'boss', name: 'Boss' },
  { id: 'champion', name: 'Champion' },
  { id: 'king', name: 'King' },
];

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
    unlockedBirdSkins: row.unlocked_bird_skins || [],
    unlockedCarSkins: row.unlocked_car_skins || [],
    arrowSkin: row.arrow_skin,
    birdSkin: row.bird_skin,
    carSkin: row.car_skin,
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
    unlockedBirdSkins: 'unlocked_bird_skins',
    unlockedCarSkins: 'unlocked_car_skins',
    arrowSkin: 'arrow_skin',
    birdSkin: 'bird_skin',
    carSkin: 'car_skin',
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
  checkServerStatus();

  // Spelen ska aldrig behöva vänta på Supabase: vänta max 4 s på inloggningen,
  // blir den klar senare uppdateras headern då
  const authDone = initAuth();
  await Promise.race([authDone, sleep(4000)]);

  renderHeaderAuth();
  loadGames();
  authDone.then(renderHeaderAuth);
});

const SERVER_DOWN_MSG = 'Servern är inte tillgänglig just nu. Spelen funkar ändå!';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function withTimeout(promise, ms) {
  return Promise.race([promise, sleep(ms).then(() => { throw new Error('timeout'); })]);
}

// Visar en banner om Supabase är nere/pausad (inloggning och event funkar då inte)
async function checkServerStatus() {
  let ok = false;
  if (supabaseClient) {
    try {
      const r = await withTimeout(fetch(SUPABASE_URL + '/auth/v1/health', { headers: { apikey: SUPABASE_ANON_KEY } }), 6000);
      ok = r.ok;
    } catch (e) { ok = false; }
  }
  if (ok || document.getElementById('server-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'server-banner';
  banner.className = 'server-banner';
  banner.textContent = '⚠️ Inloggning och event är tillfälligt nere. Alla spel funkar som vanligt!';
  document.body.prepend(banner);
}

async function initAuth() {
  try {
    if (!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      currentUserData = data ? mapProfile(data) : null;
    }

    // Also listen for auth changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        currentUserData = data ? mapProfile(data) : null;
        renderHeaderAuth();
      } else if (event === 'SIGNED_OUT') {
        currentUserData = null;
        renderHeaderAuth();
      }
    });
  } catch (e) {
    console.error('Auth init error:', e);
  }
}

// ===== Theme =====
function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'light';
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
    unlocked_car_skins: [],
    arrow_skin: null,
    car_skin: null,
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

// Weekly event challenges - must match event.html
const WEEKLY_CHALLENGES = [
  'neon-dash', 'neon-bird', 'neon-rex', 'neon-snake',
  'corny-jump', 'block-blast', 'idle-clicker', 'neon-wordle'
];

function getEventWeekGameId() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length];
}

async function addEventScore(points, gameId) {
  if (!currentUserData) return;
  // Only count points from this week's challenge game
  if (gameId && gameId !== getEventWeekGameId()) return;
  try {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const weekId = monday.toISOString().split('T')[0];

    const { data: existing } = await supabaseClient
      .from('weekly_event_scores')
      .select('score')
      .eq('user_id', currentUserData.uid)
      .eq('week_id', weekId)
      .single();

    if (existing) {
      await supabaseClient
        .from('weekly_event_scores')
        .update({ score: existing.score + points })
        .eq('user_id', currentUserData.uid)
        .eq('week_id', weekId);
    }
  } catch (e) {}
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

  return `<span class="styled-name" style="${style}">${escapeHtml(name)}</span>`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ===== Render Avatar =====
const CORNY_AVATAR_FLAVORS = [
  { id: 'corny-choklad', name: 'Corny Choklad', img: 'images/corny-choklad.png' },
  { id: 'corny-mork', name: 'Corny M\u00f6rk Choklad', img: 'images/corny-mork.png' },
  { id: 'corny-vit', name: 'Corny Vit Choklad', img: 'images/corny-vit.png' },
  { id: 'corny-kokos', name: 'Corny Kokos', img: 'images/corny-kokos.png' },
  { id: 'corny-banan', name: 'Corny Banan', img: 'images/corny-banan.png' },
  { id: 'corny-jordnot', name: 'Corny Jordn\u00f6t', img: 'images/corny-jordnot.png' },
  { id: 'corny-jordgubb', name: 'Corny Jordgubb', img: 'images/corny-jordgubb.png' },
  { id: 'corny-brownie', name: 'Corny Brownie', img: 'images/corny-brownie.png' },
  { id: 'corny-karamell', name: 'Corny Salted Caramel', img: 'images/corny-karamell.png' },
];

function getCornyAvatarImg(avatar) {
  if (avatar === 'corny') return CORNY_IMAGE_URL;
  const f = CORNY_AVATAR_FLAVORS.find(f => f.id === avatar);
  return f ? f.img : null;
}

function renderAvatar(avatar, size) {
  const cornyImg = getCornyAvatarImg(avatar);
  if (cornyImg) {
    const s = size || 32;
    return `<img src="${cornyImg}" alt="Corny" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:contain;background:#1a1a2e;vertical-align:middle;">`;
  }
  return avatar || '\ud83d\ude00';
}

// ===== Available Avatars =====
function getAvailableAvatars(user) {
  const extra = user ? (user.unlockedEmojis || []).filter(e => e !== 'corny' && !e.startsWith('corny-')) : [];
  const avatars = [...AVATARS_FREE, ...extra];
  if (user && (user.unlockedEmojis || []).includes('corny')) {
    avatars.push('corny');
    CORNY_AVATAR_FLAVORS.forEach(f => avatars.push(f.id));
  }
  return avatars;
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
    adminBtn = `<a href="admin.html" class="admin-btn">Admin<span class="admin-notif" id="admin-notif" style="display:none"></span></a>`;
    // Fetch feedback count async
    supabaseClient.from('feedback').select('id', { count: 'exact', head: true }).then(({ count }) => {
      const notifEl = document.getElementById('admin-notif');
      if (notifEl && count > 0) {
        notifEl.textContent = count;
        notifEl.style.display = '';
      }
    });
  }
  const eventBtn = `<a href="event.html" class="event-btn">Event</a>`;

  container.innerHTML = `
    ${eventBtn}
    ${adminBtn}
    <div class="user-menu-wrapper">
      <button class="user-menu-btn" id="user-menu-btn">
        <span class="user-menu-avatar">${renderAvatar(user.avatar, 28)}</span>
        <span class="user-menu-name">${getStyledName(user)}</span>
        <span class="user-menu-arrow">▾</span>
      </button>
      <div class="user-dropdown" id="user-dropdown">
        <a href="profile.html" class="dropdown-item">Min profil</a>
        <a href="event.html" class="dropdown-item">Veckans event</a>
        <button class="dropdown-item" id="open-settings">Inställningar</button>
        <button class="dropdown-item dropdown-logout" id="header-logout">Logga ut</button>
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

  // Attach click listener to the initial login button in HTML
  const initialLoginBtn = document.getElementById('show-login');
  if (initialLoginBtn) initialLoginBtn.addEventListener('click', () => openAuthModal('login'));

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
    const r = await withTimeout(authenticateUser(
      document.getElementById('login-username').value.trim(),
      document.getElementById('login-password').value
    ), 10000).catch(() => ({ ok: false, error: SERVER_DOWN_MSG }));
    if (r.ok) { modal.classList.remove('visible'); }
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
    const avatar = picker.querySelector('.avatar-option.selected')?.dataset.avatar || '😀';
    const r = await withTimeout(registerUser(document.getElementById('reg-username').value.trim(), pw1, avatar), 10000)
      .catch(() => ({ ok: false, error: SERVER_DOWN_MSG }));
    if (r.ok) { modal.classList.remove('visible'); renderHeaderAuth(); }
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
  (list || AVATARS_FREE).forEach(avatar => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-option' + (avatar === selected ? ' selected' : '');
    btn.dataset.avatar = avatar;
    const cornyImg = getCornyAvatarImg(avatar);
    if (cornyImg) {
      btn.innerHTML = `<img src="${cornyImg}" alt="Corny" style="width:100%;height:100%;border-radius:50%;object-fit:contain;background:#1a1a2e;">`;
    } else {
      btn.textContent = avatar;
    }
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

  const currentTheme = localStorage.getItem(THEME_KEY) || 'light';
  const avatars = getAvailableAvatars(user);

  modal = document.createElement('div');
  modal.className = 'modal-overlay visible';
  modal.id = 'settings-modal';
  modal.innerHTML = `
    <div class="modal settings-modal">
      <div class="modal-header">
        <h2>Inställningar</h2>
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
    const btn = e.target.closest('.avatar-option');
    if (btn && btn.classList.contains('selected')) {
      await updateUser({ avatar: btn.dataset.avatar });
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

// Blandar en lista slumpmässigt (Fisher–Yates) — körs vid varje sidladdning
function shuffleGames(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ===== Load Games =====
async function loadGames() {
  try {
    const r = await fetch('data/games.json?v=' + Date.now());
    allGames = await r.json();
    // Tidsbegränsade sidor (t.ex. födelsedagshälsningar) försvinner efter sitt "expires"-datum
    const today = new Date().toISOString().slice(0, 10);
    allGames = allGames.filter(g => !g.expires || g.expires >= today);
    // Blanda ordningen så portalen ser ny ut varje gång
    shuffleGames(allGames);
    if (isGamePage()) initGamePage();
    else if (isProfilePage()) initProfilePage();
    else initHomePage();
  } catch (e) { console.error('Kunde inte ladda spel:', e); }
}

function isGamePage() { return document.body.classList.contains('game-page'); }
function isProfilePage() { return document.body.classList.contains('profile-page'); }

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
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-tag';
    btn.dataset.category = cat;
    btn.textContent = cat;
    c.appendChild(btn);
    if (m) m.appendChild(btn.cloneNode(true));
  });
}

function renderFeaturedGames() {
  const g = document.getElementById('featured-grid');
  if (!g) return;
  g.innerHTML = '';
  // Om en sida är "soloFeatured" (t.ex. en aktiv födelsedagshälsning) visas BARA den.
  // När den utgår faller listan automatiskt tillbaka till de vanliga utvalda spelen.
  const solo = allGames.filter(x => x.featured && x.soloFeatured);
  const list = solo.length ? solo : allGames.filter(x => x.featured);
  list.forEach(x => g.appendChild(createGameCard(x)));
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
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23e7e5e4%22 width=%22400%22 height=%22300%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%2378716c%22 font-size=%2232%22>Spel</text></svg>'">
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
  if (t) { if (searchQuery.trim()) t.textContent = 'Sökresultat'; else if (activeCategory !== 'all') t.textContent = activeCategory; else t.textContent = 'Alla spel'; }
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
    try {
      const { error } = await withTimeout(supabaseClient.from('feedback').insert({
        name: document.getElementById('feedback-name').value,
        type: document.getElementById('feedback-type').value,
        message: document.getElementById('feedback-message').value,
      }), 10000);
      if (error) throw error;
    } catch (err) { alert(SERVER_DOWN_MSG); return; }
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
    if (user) {
      const skinId = gameId === 'neon-bird' ? user.birdSkin : gameId === 'neon-league' ? user.carSkin : user.arrowSkin;
      if (skinId) iframe.contentWindow.postMessage({ type: 'skin-data', skinId }, '*');
    }
  });
  iframe.src = game.path + '?v=' + Date.now();
  saveRecentlyPlayed(game.id);

  // Score from the game iframe counts toward the weekly event (only for this week's game)
  window.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'game-score' && getCurrentUser()) {
      const points = Math.floor((e.data.score || 0) / 10);
      if (points > 0) await addEventScore(points, e.data.game || '');
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
async function initProfilePage() {
  let user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return; }
  // Re-fetch profile to get latest data
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', user.uid).single();
  if (data) { currentUserData = mapProfile(data); user = currentUserData; }

  document.getElementById('profile-avatar').innerHTML = renderAvatar(user.avatar, 80);

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

  const picker = document.getElementById('profile-avatar-picker');
  if (picker) {
    renderAvatarPicker(picker, user.avatar, getAvailableAvatars(user));
    picker.addEventListener('click', async (e) => {
      const btn = e.target.closest('.avatar-option');
      if (btn && btn.classList.contains('selected')) {
        await updateUser({ avatar: btn.dataset.avatar });
        document.getElementById('profile-avatar').innerHTML = renderAvatar(btn.dataset.avatar, 80);
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
