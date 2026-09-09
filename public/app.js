'use strict';

(function () {
  const DATA = window.SITE_DATA || { site: {}, repos: [] };
  const site = DATA.site || {};
  const repos = DATA.repos || [];

  // ---------- 主题切换 ----------
  const root = document.documentElement;
  const sun = document.getElementById('icon-sun');
  const moon = document.getElementById('icon-moon');

  function syncIcon() {
    const dark = root.classList.contains('dark');
    if (sun) sun.style.display = dark ? 'none' : 'block';
    if (moon) moon.style.display = dark ? 'block' : 'none';
  }
  function applyTheme(t) {
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem('theme', t); } catch (e) {}
    syncIcon();
  }
  syncIcon();
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.addEventListener('click', function () {
    applyTheme(root.classList.contains('dark') ? 'light' : 'dark');
  });

  // ---------- 移动端菜单 ----------
  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () { mobileMenu.classList.toggle('open'); });
  }

  // ---------- 头部 & 品牌 ----------
  const nav = site.nav || [];
  const navDesktop = document.getElementById('nav-desktop');
  const mobileNav = document.getElementById('mobile-menu');
  if (navDesktop) navDesktop.innerHTML = nav.map(function (n) {
    return '<a href="' + n.href + '">' + escapeHtml(n.label) + '</a>';
  }).join('');
  if (mobileNav) mobileNav.innerHTML = nav.map(function (n) {
    return '<a href="' + n.href + '">' + escapeHtml(n.label) + '</a>';
  }).join('');

  if (site.author) {
    const nameEls = [document.getElementById('hdr-name'), document.getElementById('hero-name')];
    nameEls.forEach(function (el) { if (el) el.textContent = site.author; });
    document.title = site.title || site.author;
  }
  if (site.avatar) {
    const av = site.avatar;
    ['hdr-avatar', 'hero-avatar'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.src = av;
    });
  }
  // ---------- Hero bio ----------
  const bio = document.getElementById('hero-bio');
  if (bio) bio.textContent = site.bio || '';

  // ---------- 统计卡 ----------
  const stats = site.stats || {};
  const statDefs = [
    { key: 'repos', label: 'Repositories', icon: folderIcon() },
    { key: 'stars', label: 'Stars', icon: starIcon() },
    { key: 'followers', label: 'Followers', icon: userIcon() },
    { key: 'following', label: 'Following', icon: usersIcon() }
  ];
  const grid = document.getElementById('stat-grid');
  if (grid) {
    grid.innerHTML = statDefs.map(function (s) {
      const v = stats[s.key];
      if (v === undefined) return '';
      return '<div class="stat-card">' +
        '<div class="stat-icon" style="background:var(--blue-bg);color:var(--blue-text)">' + s.icon + '</div>' +
        '<div class="stat-meta"><div class="num">' + formatNum(v) + '</div>' +
        '<div class="label">' + s.label + '</div></div></div>';
    }).join('');
  }

  // ---------- 项目卡片 ----------
  const pg = document.getElementById('project-grid');
  if (pg) {
    if (!repos.length) {
      pg.innerHTML = '<div class="loading">暂无项目数据，请运行同步脚本。</div>';
    } else {
      pg.innerHTML = repos.slice().reverse().map(renderRepo).join('');
    }
  }

  // ---------- 关于 ----------
  if (site.about) {
    const ab = document.getElementById('about');
    const ac = document.getElementById('about-content');
    if (ab) { ab.style.display = ''; }
    if (ac) { ac.innerHTML = site.about; }
  }

  // ---------- Footer ----------
  const ft = document.getElementById('footer-text');
  if (ft) {
    const y = new Date().getFullYear();
    const start = site.startYear || y;
    ft.textContent = '© ' + start + (start < y ? '–' + y : '') + ' ' + (site.author || 'Your Name');
  }

  // ===== 渲染单个仓库卡片 =====
  function renderRepo(r) {
    const lang = r.language || '';
    const langClass = 'lang-' + langSanitize(lang);
    const langLabel = r.languageLabel || lang || 'Other';
    const featured = r.featured
      ? '<span class="pill pill-featured">精选</span>' : '';
    const updated = r.updatedAt ? formatDate(r.updatedAt) : '';
    const desc = r.descriptionProcessed || r.description || '';
    const stars = r.stars != null ? formatNum(r.stars) : '—';
    const forks = r.forks != null ? formatNum(r.forks) : '—';
    const url = r.htmlUrl || '#';

    // 为 edge-defender 项目添加 hover 提示层
    const tooltip = (r.fullName === 'edge-defender/defend-node')
      ? '<div class="repo-tooltip">' +
          '<img src="images/20260818021754_31_511.png" alt="站长联系" style="width:200px;height:200px;display:block;margin-bottom:.5rem">' +
          '<p style="margin:0;font-size:.75rem;color:var(--text-muted);text-align:center">扫码联系站长</p>' +
        '</div>' : '';
    return '<article class="card-base card-hover repo-card">' +
      '<div>' +
        '<div class="top">' +
          '<div style="display:flex;align-items:center;gap:.375rem;min-width:0">' +
            featured +
            '<span class="pill pill-lang"><span class="lang-dot ' + langClass + '"></span>' + escapeHtml(langLabel) + '</span>' +
          '</div>' +
          '<time class="date">' + updated + '</time>' +
        '</div>' +
        '<h3><a href="' + url + '" target="_blank" rel="noopener">' + escapeHtml(r.fullName || r.name) + '</a></h3>' +
        '<p class="desc">' + escapeHtml(desc) + '</p>' +
      '</div>' +
      '<div class="foot">' +
        '<span class="stat">' + starIcon(true) + stars + '</span>' +
        '<span class="stat">' + forkIcon() + forks + '</span>' +
        '<span class="spacer"></span>' +
        '<a class="go" href="' + url + '" target="_blank" rel="noopener">GitHub ↗</a>' +
      '</div>' +
      + tooltip +
    '</article>';
  }

  // ===== 工具函数 =====
  function langSanitize(lang) {
    const map = {
      'JavaScript': 'JS', 'TypeScript': 'TS', 'Python': 'PY', 'Go': 'GO',
      'Rust': 'RUST', 'C++': 'CPP', 'C': 'C', 'C#': 'C', 'Java': 'JAVA',
      'HTML': 'HTML', 'CSS': 'CSS', 'Vue': 'VUE', 'Shell': 'SH', 'Ruby': 'RB',
      'Dockerfile': 'OTHER'
    };
    return map[lang] || 'OTHER';
  }
  function formatNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k';
    return String(n);
  }
  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '/' + m + '/' + day;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function folderIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
  }
  function starIcon(small) {
    const w = small ? 'width=".85rem" height=".85rem"' : '';
    return '<svg ' + w + ' viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  }
  function userIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  function usersIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>';
  }
  function forkIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M6 8.5v1a3 3 0 003 3h6a3 3 0 003-3v-1M12 12.5V16"/></svg>';
  }
})();
