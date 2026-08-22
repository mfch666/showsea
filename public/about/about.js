'use strict';

/* 关于页渲染：从 site.aboutPage 读取结构化数据
   模仿 liuhouliang.com/about 前部分（问候 / 关于我 / 关于网站 / 建站历程），
   不包含末尾的 Waline 留言 / 部署挂件。 */
(function () {
  const DATA = window.SITE_DATA || { site: {} };
  const site = DATA.site || {};
  const ap = site.aboutPage || {};
  const $ = function (id) { return document.getElementById(id); };

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  // ---------- Hero ----------
  if (ap.greeting) { const g = $('about-greeting'); if (g) g.textContent = ap.greeting; }
  if (site.author) { const n = $('about-name'); if (n) n.textContent = site.author; }
  if (ap.role) { const r = $('about-role'); if (r) r.textContent = ap.role; }
  if (ap.bio) { const b = $('about-bio'); if (b) b.textContent = ap.bio; }
  if (Array.isArray(ap.tags)) {
    const tr = $('about-tags');
    if (tr) tr.innerHTML = ap.tags.map(function (t) {
      return '<span class="tag-pill">' + escapeHtml(t) + '</span>';
    }).join('');
  }

  // ---------- 标签/值 卡片网格 ----------
  function renderInfo(item) {
    const v = item.value || '';
    const valHtml = item.isLink
      ? '<a href="' + escapeAttr(v) + '">' + escapeHtml(String(v).replace(/^mailto:/, '')) + '</a>'
      : escapeHtml(v);
    return '<div class="info-card">' +
      '<div class="info-label">' + escapeHtml(item.label || '') + '</div>' +
      '<div class="info-value">' + valHtml + '</div>' +
      '</div>';
  }

  if (Array.isArray(ap.profile)) {
    const pg = $('about-profile');
    if (pg) {
      pg.innerHTML = ap.profile.map(renderInfo).join('');
      // Add hover tooltip to each info-card showing QR code
      const cards = pg.querySelectorAll('.info-card');
      cards.forEach(function(card) {
        card.style.cursor = 'default';
        card.addEventListener('mouseenter', function() { console.log('mouseenter on', this);
          let tip = this.querySelector('.about-tooltip');
          if (!tip) {
            tip = document.createElement('div');
            tip.className = 'about-tooltip';
            tip.innerHTML = '<img src="/images/20260818021754_31_511.png" alt="站长联系" style="width:160px;height:160px;display:block;margin:0 auto .3rem;"><p style="margin:0;font-size:.7rem;color:var(--text-muted);text-align:center;">扫码联系站长</p>';
            this.appendChild(tip);
          }
          tip.style.display = 'block';
        });
        card.addEventListener('mouseleave', function() {
          const tip = this.querySelector('.about-tooltip');
          if (tip) tip.style.display = 'none';
        });
      });
    }
  }
  if (Array.isArray(ap.siteInfo)) {
    const sg = $('about-siteinfo');
    if (sg) sg.innerHTML = ap.siteInfo.map(renderInfo).join('');
  }

  // ---------- 时间线 ----------
  if (Array.isArray(ap.timeline)) {
    const tl = $('about-timeline');
    if (tl) tl.innerHTML = ap.timeline.map(function (it) {
      const d = it.date ? '<div class="timeline-date">' + escapeHtml(it.date) + '</div>' : '';
      const t = it.text ? '<div class="timeline-text">' + escapeHtml(it.text) + '</div>' : '';
      return '<div class="timeline-item">' + d + t + '</div>';
    }).join('');
  }

  // 标题：关于 · 作者
  document.title = '关于 · ' + (site.author || '');
})();
