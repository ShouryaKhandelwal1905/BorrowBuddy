/**
 * BorrowBuddy Real-Time User Activity & Traffic Tracker
 * Logs pageviews, navigation, search, lending, borrowing, and authentication actions.
 */
(function() {
  // Visitor ID
  let visitorId = localStorage.getItem('bb_visitor_id');
  if (!visitorId) {
    visitorId = 'vis_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('bb_visitor_id', visitorId);
  }

  // Device & Browser detection
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Chrome';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

    let os = 'Windows';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua) || window.innerWidth < 768;
    const deviceType = isMobile ? 'Mobile' : (window.innerWidth < 1024 ? 'Tablet' : 'Desktop');

    return { browser, os, deviceType, screen: `${window.innerWidth}x${window.innerHeight}` };
  }

  // Current session user
  function getActiveUser() {
    try {
      const u = JSON.parse(localStorage.getItem('bb_user') || 'null');
      if (u && (u.name || u.email)) {
        return {
          id: u.id || 'usr_anon',
          name: u.name || u.full_name || u.email.split('@')[0],
          email: u.email || 'unknown',
          locality: u.locality || 'Unknown Society'
        };
      }
    } catch (e) {}
    return { id: visitorId, name: 'Guest ' + visitorId.slice(-4), email: 'Guest Visitor', locality: 'Browsing' };
  }

  // Activity logger
  window.BB_TRACK = function(action, details = {}) {
    try {
      const dev = getDeviceInfo();
      const user = getActiveUser();
      const entry = {
        id: 'act_' + Date.now() + '_' + Math.floor(Math.random()*1000),
        action: action,
        details: details,
        user: user,
        device: dev,
        page: window.location.pathname.split('/').pop() || 'index.html',
        referrer: document.referrer ? new URL(document.referrer, location.href).pathname : 'Direct',
        timestamp: new Date().toISOString()
      };

      // Save to localStorage activity logs
      let logs = [];
      try { logs = JSON.parse(localStorage.getItem('bb_activity_logs') || '[]'); } catch (e) { logs = []; }
      logs.unshift(entry);
      if (logs.length > 1000) logs = logs.slice(0, 1000);
      localStorage.setItem('bb_activity_logs', JSON.stringify(logs));

      // Also dispatch an event in case admin panel is open in another tab
      window.dispatchEvent(new CustomEvent('bb_activity_recorded', { detail: entry }));

      // Optional: push to Supabase if connected
      if (window.sb && window.sb.from) {
        window.sb.from('activity_logs').insert([{
          action: entry.action,
          user_email: user.email,
          user_name: user.name,
          details: entry.details,
          page: entry.page,
          device: entry.device.deviceType,
          browser: entry.device.browser,
          created_at: entry.timestamp
        }]).then(() => {}).catch(() => {});
      }
    } catch (err) {
      console.warn('Tracking error:', err);
    }
  };

  // Seed sample analytics if brand new
  function seedInitialDataIfEmpty() {
    let logs = [];
    try { logs = JSON.parse(localStorage.getItem('bb_activity_logs') || '[]'); } catch (e) {}
    if (logs.length >= 25) return;

    const sampleUsers = [
      { name: 'Meera Sharma', email: 'meera.s@example.com', locality: 'Signature Lake City, Sector 116' },
      { name: 'Gurpreet Singh', email: 'gurpreet.singh@gmail.com', locality: 'Bollywood Green City, Sector 113' },
      { name: 'Anita Verma', email: 'anita.v@yahoo.com', locality: 'Ansal Orchard County, Sector 115' },
      { name: 'Vikram Joshi', email: 'vikram.j@gmail.com', locality: 'Realcon Mohali, Sector 113' },
      { name: 'Shourya Khandelwal', email: 'shourya@example.com', locality: 'Sector 112, Mohali' }
    ];

    const sampleActions = [
      { action: 'PAGE_VIEW', details: { path: 'index.html' } },
      { action: 'SEARCH', details: { query: 'ladder' } },
      { action: 'VIEW_ITEM', details: { itemName: 'Folding ladder (8 ft)', category: 'Home repair' } },
      { action: 'REQUEST_LOAN', details: { itemName: 'Folding ladder (8 ft)', days: 2, amt: 160 } },
      { action: 'PAGE_VIEW', details: { path: 'index.html' } },
      { action: 'SEARCH', details: { query: 'camping tent' } },
      { action: 'VIEW_ITEM', details: { itemName: '4-person camping tent', category: 'Camping' } },
      { action: 'FILTER_CATEGORY', details: { category: 'Festival' } },
      { action: 'VIEW_ITEM', details: { itemName: 'Jumbo bouncy castle', category: 'Birthday party' } },
      { action: 'REQUEST_LOAN', details: { itemName: 'Jumbo bouncy castle', days: 1, amt: 800 } },
      { action: 'LEND_ITEM', details: { itemName: 'Drill Machine 750W', price: 150 } },
      { action: 'SUBMIT_REVIEW', details: { itemName: 'Folding ladder', rating: 5, review: 'Super handy and in pristine condition!' } },
      { action: 'LOGIN_SUCCESS', details: { method: 'Google OAuth' } },
      { action: 'PAGE_VIEW', details: { path: 'index.html' } },
      { action: 'VIEW_ITEM', details: { itemName: 'Hand trolley', category: 'Moving house' } }
    ];

    const browsers = ['Chrome', 'Safari', 'Edge', 'Firefox'];
    const devices = ['Desktop', 'Mobile', 'Tablet'];
    const seeded = [];

    const now = Date.now();
    for (let i = 0; i < 40; i++) {
      const u = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
      const act = sampleActions[Math.floor(Math.random() * sampleActions.length)];
      const timeOffset = Math.floor(Math.random() * (7 * 86400 * 1000));
      seeded.push({
        id: 'seed_' + (now - timeOffset),
        action: act.action,
        details: act.details,
        user: { id: 'u_' + i, name: u.name, email: u.email, locality: u.locality },
        device: {
          browser: browsers[Math.floor(Math.random() * browsers.length)],
          os: 'Windows',
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          screen: '1920x1080'
        },
        page: 'index.html',
        referrer: 'Direct',
        timestamp: new Date(now - timeOffset).toISOString()
      });
    }

    seeded.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    localStorage.setItem('bb_activity_logs', JSON.stringify([...logs, ...seeded]));
  }

  seedInitialDataIfEmpty();

  // Automatic pageview tracking on window load
  window.addEventListener('DOMContentLoaded', function() {
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    window.BB_TRACK('PAGE_VIEW', { page: pageName, title: document.title });
  });

})();
