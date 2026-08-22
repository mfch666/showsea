'use strict';

// 采集脚本：读取 config.json 指定的 GitHub 仓库，调用 GitHub API，
// 经文本处理（摘中文 / 译英文）后生成 public/data.js 与 public/data.json。
// 用法：
//   node scripts/sync.js               全量采集 config.json 中的仓库
//   本地服务器 GET /?repo=owner/name    追加采集并落地（见 src/server.js）

const fs = require('fs');
const path = require('path');
const { processText, langLabel } = require('../src/translate');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config.json');
const DATA_JS = path.join(ROOT, 'public', 'data.js');
const DATA_JSON = path.join(ROOT, 'public', 'data.json');

let token = '';

function githubFetch(apiPath) {
  const url = 'https://api.github.com' + apiPath;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'github-showcase-sync'
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(url, { headers }).then(function (r) {
    if (!r.ok) {
      return r.text().then(function (t) {
        throw new Error('GitHub ' + r.status + ' ' + apiPath + ' -> ' + t.slice(0, 200));
      });
    }
    return r.json();
  });
}

function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

async function fetchUser(username) {
  try {
    const u = await githubFetch('/users/' + encodeURIComponent(username));
    return {
      repos: u.public_repos,
      followers: u.followers,
      following: u.following
    };
  } catch (e) {
    console.warn('  ! 用户资料获取失败:', e.message);
    return { repos: null, followers: null, following: null };
  }
}

async function fetchRepo(owner, name) {
  const r = await githubFetch('/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name));
  return {
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    language: r.language,
    languageLabel: langLabel(r.language),
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count || r.watchers_count,
    topics: r.topics || [],
    htmlUrl: r.html_url,
    homepage: r.homepage,
    updatedAt: r.updated_at,
    createdAt: r.created_at
  };
}

// 全量采集 config.json 中的仓库并写文件
async function run() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  token = config.githubToken || process.env.GITHUB_TOKEN || '';
  const site = config.site || {};
  const reposCfg = config.repos || [];
  const owner = site.githubUser;

  console.log('▶ 开始采集 ' + reposCfg.length + ' 个仓库…');

  const repos = [];
  let totalStars = 0;
  let hasHardFailure = false;
  for (const cfg of reposCfg) {
    const [o, n] = (cfg.name && cfg.name.indexOf('/') >= 0) ? cfg.name.split('/') : [cfg.owner || owner, cfg.name];
    if (!o || !n) { console.warn('  ! 跳过无效项:', JSON.stringify(cfg)); continue; }
    try {
      const r = await fetchRepo(o, n);
      r.featured = !!cfg.featured;
      r.descriptionProcessed = processText(r.description);
      totalStars += (r.stars || 0);
      repos.push(r);
      console.log('  ✓ ' + r.fullName + '  ★' + r.stars + '  "' + (r.descriptionProcessed || '').slice(0, 40) + '"');
    } catch (e) {
      const msg = e.message || '';
      // 404 = repo 不存在，属于预期情况（如本地 mock 项目），跳过继续写
      if (/GitHub 404/.test(msg) || /Not Found/.test(msg)) {
        console.warn('  ○ ' + o + '/' + n + ' 不存在，已跳过');
      } else {
        console.warn('  ✗ ' + o + '/' + n + ' 失败: ' + msg);
        hasHardFailure = true;
      }
    }
    await delay(300);
  }

  const stats = { repos: repos.length, stars: totalStars };
  if (owner) {
    const u = await fetchUser(owner);
    if (u.repos != null) stats.repos = u.repos;
    if (u.followers != null) stats.followers = u.followers;
    if (u.following != null) stats.following = u.following;
  }

  // 全部成功才写入，部分失败保留旧数据
  if (repos.length !== reposCfg.length) {
    console.error('✘ 采集失败 ' + (reposCfg.length - repos.length) + ' 个仓库，保留原有 data.js/data.json');
    throw new Error('部分仓库采集失败，数据未更新');
  }

  const out = {
    site: {
      title: site.title,
      author: site.author,
      avatar: site.avatar,
      bio: processText(site.bio || ''),
      github: site.github,
      githubUser: site.githubUser,
      startYear: site.startYear,
      nav: site.nav || [],
      about: site.about || '',
      aboutPage: site.aboutPage || {},
      stats: stats
    },
    lastSync: new Date().toISOString(),
    repos: repos
  };

  // 原子写入：先写临时文件，验证成功后再替换原文件
  const tmpJSON = DATA_JSON + '.tmp';
  const tmpJS = DATA_JS + '.tmp';
  fs.writeFileSync(tmpJSON, JSON.stringify(out, null, 2), 'utf-8');
  fs.writeFileSync(tmpJS, 'window.SITE_DATA = ' + JSON.stringify(out, null, 2) + ';\n', 'utf-8');
  // 验证临时文件可读
  const verify = JSON.parse(fs.readFileSync(tmpJSON, 'utf-8'));
  if (!verify.repos || verify.repos.length === 0) {
    fs.unlinkSync(tmpJSON); fs.unlinkSync(tmpJS);
    throw new Error('生成的数据为空，写入已取消');
  }
  fs.renameSync(tmpJSON, DATA_JSON);
  fs.renameSync(tmpJS, DATA_JS);
  console.log('✔ 已生成 public/data.js / data.json （' + repos.length + ' 个仓库）');
}

// 增量采集单个仓库，只请求 1 次 API，更新 data.json 中对应条目
async function syncRepo(owner, name) {
  const cfg = { owner: owner, name: name };
  const r = await fetchRepo(cfg.owner, cfg.name);
  r.featured = false;
  r.descriptionProcessed = processText(r.description || '');
  console.log('  ✓ ' + r.fullName + '  ★' + r.stars + '  "' + (r.descriptionProcessed || '').slice(0, 40) + '"');
  return r;
}

// 追加采集：把 extraList 里的仓库（"owner/name" 字符串或 {owner,name} 对象）
// 去重写入 config.json，然后增量采集每个新增的仓库（只请求对应 API，不触发全量）。
// 供本地服务器 URL 传参调用。
async function addReposAndSync(extraList) {
  if (!Array.isArray(extraList)) extraList = extraList ? [extraList] : [];
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const existing = Array.isArray(raw.repos) ? raw.repos : [];
  const norm = function (s) { return (s || '').toLowerCase(); };
  const has = function (o, n) {
    return existing.some(function (r) {
      if (typeof r === 'string') return norm(r) === norm(o + '/' + n);
      if (r.name && r.name.indexOf('/') >= 0) return norm(r.name) === norm(o + '/' + n);
      return norm(r.owner) === norm(o) && norm(r.name) === norm(n);
    });
  };
  let added = 0;
  const toSync = [];
  extraList.forEach(function (item) {
    let o, n;
    if (typeof item === 'string' && item.indexOf('/') >= 0) {
      const parts = item.split('/');
      o = parts[0]; n = parts[1];
    } else if (item && item.owner && item.name) {
      o = item.owner; n = item.name;
    } else { return; }
    if (!o || !n) return;
    if (has(o, n)) { console.log('  · 已存在，跳过 ' + o + '/' + n); return; }
    toSync.push({ owner: o, name: n });
    added++;
  });

  if (toSync.length === 0) {
    console.log('▶ 无新增仓库，无需采集');
    return;
  }

  console.log('▶ 开始增量采集 ' + toSync.length + ' 个新仓库…');
  const newRepos = [];
  for (const cfg of toSync) {
    try {
      const r = await syncRepo(cfg.owner, cfg.name);
      newRepos.push(r);
    } catch (e) {
      console.warn('  ✗ ' + cfg.owner + '/' + cfg.name + ' 失败: ' + e.message);
    }
    await delay(300);
  }

  // 所有仓库采集成功后才更新 config.json
  if (newRepos.length > 0) {
    existing.push.apply(existing, toSync);
    raw.repos = existing;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(raw, null, 2), 'utf-8');
    toSync.forEach(function(r) { console.log('  + 新增 ' + r.owner + '/' + r.name + ' 到 config.json'); });
  }

  if (newRepos.length === 0) {
    console.error('✘ 所有仓库采集失败，保留原有配置和数据');
    throw new Error('没有仓库采集成功，数据未更新');
  }

  // 加载现有 data.json，把新仓库追加进去
  let out;
  try {
    out = JSON.parse(fs.readFileSync(DATA_JSON, 'utf-8'));
  } catch (e) {
    out = { site: {}, repos: [], lastSync: '' };
  }
  const existingNames = new Set(out.repos.map(function (r) { return r.fullName.toLowerCase(); }));
  newRepos.forEach(function (r) {
    if (!existingNames.has(r.fullName.toLowerCase())) {
      out.repos.push(r);
    }
  });
  out.lastSync = new Date().toISOString();

  // 原子写入
  const tmpJSON = DATA_JSON + '.tmp';
  const tmpJS = DATA_JS + '.tmp';
  fs.writeFileSync(tmpJSON, JSON.stringify(out, null, 2), 'utf-8');
  fs.writeFileSync(tmpJS, 'window.SITE_DATA = ' + JSON.stringify(out, null, 2) + ';\n', 'utf-8');
  const verify = JSON.parse(fs.readFileSync(tmpJSON, 'utf-8'));
  if (!verify.repos || verify.repos.length === 0) {
    fs.unlinkSync(tmpJSON); fs.unlinkSync(tmpJS);
    throw new Error('生成的数据为空，写入已取消');
  }
  fs.renameSync(tmpJSON, DATA_JSON);
  fs.renameSync(tmpJS, DATA_JS);
  console.log('✔ 增量采集完成，已生成 public/data.js / data.json（共 ' + out.repos.length + ' 个仓库）');
}

if (require.main === module) {
  run().catch(function (e) {
    console.error('同步失败:', e.message);
    process.exit(1);
  });
}

module.exports = { run: run, addReposAndSync: addReposAndSync };
