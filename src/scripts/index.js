import '../styles/styles.css';
import App from './pages/app';
import StoryApiService from './data/api';
import AuthService from './data/auth';
import { registerServiceWorker, subscribeToPush } from './utils/push-notification';

let appInstance = null;

function showOfflineBanner() {
  let banner = document.getElementById('offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'offline-banner';
    banner.textContent = 'Anda sedang offline. Beberapa fitur mungkin tidak tersedia.';
    document.body.appendChild(banner);
  }
  banner.classList.add('show');
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('show');
}

window.addEventListener('online', hideOfflineBanner);
window.addEventListener('offline', showOfflineBanner);

if (!navigator.onLine) showOfflineBanner();

async function initPushNotifications() {
  try {
    const registration = await registerServiceWorker();
    if (registration) {
      const token = AuthService.getToken();
      if (token) {
        const subscription = await subscribeToPush(registration);
        await StoryApiService.subscribeWebPush(token, subscription);
      }
    }
  } catch (error) {
    console.error('Push notification setup failed:', error);
  }
}

function updateNavigation() {
  const navList = document.getElementById('nav-list');
  const isAuthenticated = AuthService.isAuthenticated();
  
  if (navList) {
    const authItem = Array.from(navList.children).find(item => {
      const link = item.querySelector('a');
      return link && (link.getAttribute('href') === '#/login' || link.getAttribute('href') === '#/logout');
    });
    
    if (authItem) {
      const authLink = authItem.querySelector('a');
      
      if (isAuthenticated) {
        authLink.textContent = 'Logout';
        authLink.setAttribute('href', '#/logout');
        authLink.setAttribute('id', 'logout-button');
      } else {
        authLink.textContent = 'Login';
        authLink.setAttribute('href', '#/login');
        authLink.removeAttribute('id');
      }
    }
  }
}

window.updateNavigation = updateNavigation;

function setupLogoutButton() {
  document.addEventListener('click', (event) => {
    if (event.target.id === 'logout-button' || event.target.closest('#logout-button')) {
      event.preventDefault();
      AuthService.logout();
      window.location.hash = '#/';
      updateNavigation();
    }
  });
}

async function createBellButton() {
  if (document.getElementById('subscribe-bell')) return;

  // Cek status subscribe
  let isSubscribed = false;
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = !!subscription;
      }
    } catch (e) {
      isSubscribed = false;
    }
  }

  const bell = document.createElement('button');
  bell.id = 'subscribe-bell';
  bell.title = isSubscribed ? 'Nonaktifkan notifikasi cerita baru' : 'Aktifkan notifikasi cerita baru';
  bell.setAttribute('aria-label', bell.title);
  bell.style.position = 'fixed';
  bell.style.bottom = '32px';
  bell.style.right = '32px';
  bell.style.zIndex = '9999';
  bell.style.background = '#4285F4';
  bell.style.border = 'none';
  bell.style.borderRadius = '50%';
  bell.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  bell.style.width = '56px';
  bell.style.height = '56px';
  bell.style.display = 'flex';
  bell.style.alignItems = 'center';
  bell.style.justifyContent = 'center';
  bell.style.cursor = 'pointer';
  bell.style.transition = 'box-shadow 0.2s';

  // SVG: lonceng biasa atau lonceng dicoret
  function setBellIcon(subscribed) {
    bell.innerHTML = subscribed
      ? `<svg width="32" height="32" fill="none" stroke="#FFD600" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 16v-5a6 6 0 1 0-12 0v5a2 2 0 0 1-2 2h16a2 2 0 0 1-2-2z"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          <line x1="4" y1="4" x2="20" y2="20" stroke="#FFD600" stroke-width="2"/>
        </svg>`
      : `<svg width="32" height="32" fill="none" stroke="#FFD600" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 16v-5a6 6 0 1 0-12 0v5a2 2 0 0 1-2 2h16a2 2 0 0 1-2-2z"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>`;
    bell.title = subscribed ? 'Nonaktifkan notifikasi cerita baru' : 'Aktifkan notifikasi cerita baru';
    bell.setAttribute('aria-label', bell.title);
  }
  setBellIcon(isSubscribed);

  bell.addEventListener('click', async () => {
    try {
      const token = AuthService.getToken();
      if (!token) {
        alert('Silakan login terlebih dahulu untuk subscribe notifikasi.');
        window.location.hash = '#/login';
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (!registration) {
        alert('Service worker tidak tersedia.');
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Sudah subscribe, lakukan unsubscribe
        await subscription.unsubscribe();
        try {
          await StoryApiService.unsubscribeWebPush(token, subscription.endpoint);
          alert('Berhasil unsubscribe notifikasi!');
        } catch (err) {
          if (err.message && err.message.includes('CORS')) {
            // CORS error, jangan tampilkan alert error teknis
            alert('Berhasil unsubscribe notifikasi di perangkat ini. (CORS error, server tidak merespons)');
          } else {
            alert('Berhasil unsubscribe notifikasi di perangkat ini. (Server tidak merespons)');
          }
        }
        setBellIcon(false);
      } else {
        // Belum subscribe, lakukan subscribe
        const newSubscription = await subscribeToPush(registration);
        try {
          await StoryApiService.subscribeWebPush(token, newSubscription);
          alert('Berhasil subscribe notifikasi cerita baru!');
        } catch (err) {
          if (err.message && err.message.includes('CORS')) {
            alert('Berhasil subscribe notifikasi di perangkat ini. (CORS error, server tidak merespons)');
          } else {
            alert('Berhasil subscribe notifikasi di perangkat ini. (Server tidak merespons)');
          }
        }
        setBellIcon(true);
      }
    } catch (err) {
      let subscribedNow = false;
      try {
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          subscribedNow = !!subscription;
        }
      } catch {}
      setBellIcon(subscribedNow);
      alert('Gagal mengubah status notifikasi: ' + (err.message || err));
    }
  });

  document.body.appendChild(bell);
}

async function initApp() {
  console.log('Starting app initialization...');

  const elements = {
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer')
  };

  console.log('DOM Elements:', elements);

  try {
    console.log('Testing API connection...');
    const apiStatus = await StoryApiService.testConnection();
    console.log('API Status:', apiStatus);
  } catch (error) {
    console.warn('API Check Warning:', error.message);
  }

  const footer = document.querySelector('footer');
  if (footer) {
    footer.classList.add('app-footer');
    footer.innerHTML = `
      <div class="container footer-content">
        <div class="footer-copyright">
          <p>&copy; 2025 Story App. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  const wasLoggedIn = AuthService.isAuthenticated();
  console.log('Initial auth state:', wasLoggedIn ? 'Logged in' : 'Not logged in');

  updateNavigation();
  setupLogoutButton();
  await createBellButton();

  appInstance = new App({
    content: elements.content,
    drawerButton: elements.drawerButton,
    navigationDrawer: elements.navigationDrawer
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'user') {
      const isLoggedIn = AuthService.isAuthenticated();
      const wasChange = isLoggedIn !== wasLoggedIn;
      
      console.log('Auth state changed:', isLoggedIn ? 'Logged in' : 'Not logged in', 
                  'Changed:', wasChange);

      updateNavigation();
      
      if (wasChange && appInstance) {
        console.log('Forcing page re-render after auth change');
        appInstance.renderPage();
      }
    }
  });

    if ('serviceWorker' in navigator && 'PushManager' in window) {
    initPushNotifications();
  }

  console.log('App initialized successfully');
}

if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

window.refreshApp = function() {
  if (appInstance) {
    console.log('Manual app refresh requested');
    appInstance.renderPage();
    updateNavigation();
    return true;
  }
  return false;
};