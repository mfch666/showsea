'use strict';

// 文本处理规则（用户要求）：
//   1) 含中文的描述 -> 摘取中文部分（去掉英文/符号噪声）
//   2) 纯英文描述   -> 基于词表做"一些翻译"成中文（未知词保留原文）
//
// 说明：纯英文走的是内置词表翻译（离线、确定性），并非完整机翻。
// 如需完整翻译，可在下方 translateEN 中接入真实翻译 API。

const CJK = /[一-鿿]/;

// ---- 语言 -> 中文标签（用于卡片语言胶囊）----
const LANG_CN = {
  JavaScript: 'JavaScript', TypeScript: 'TypeScript', Python: 'Python',
  Go: 'Go', Rust: 'Rust', 'C++': 'C++', C: 'C', 'C#': 'C#',
  Java: 'Java', HTML: 'HTML', CSS: 'CSS', Vue: 'Vue', Shell: 'Shell',
  PHP: 'PHP', Ruby: 'Ruby', Swift: 'Swift', Kotlin: 'Kotlin',
  Dart: 'Dart', Lua: 'Lua', 'Jupyter Notebook': 'Jupyter', Dockerfile: 'Docker'
};

// ---- 英文 -> 中文 词表（覆盖常见 GitHub 描述用语）----
const GLOSSARY = {
  the: '', a: '一个', an: '一个', and: '与', or: '或', for: '用于', to: '以',
  of: '的', in: '在', on: '在', with: '带有', based: '基于', by: '由', from: '来自',
  is: '是', are: '是', be: '是', this: '这个', that: '那个', it: '它',
  library: '库', libraries: '库', framework: '框架', tool: '工具', tools: '工具',
  toolkit: '工具集', package: '包', module: '模块', modules: '模块',
  plugin: '插件', plugins: '插件', extension: '扩展', component: '组件', components: '组件',
  application: '应用', applications: '应用', app: '应用', apps: '应用',
  system: '系统', systems: '系统', platform: '平台', service: '服务', services: '服务',
  server: '服务端', client: '客户端', frontend: '前端', front: '前端', back: '后端',
  backend: '后端', full: '全', stack: '栈', web: 'Web', mobile: '移动端',
  native: '原生', cross: '跨', platform: '平台', progressive: '渐进式',
  reactive: '响应式', incremental: '增量', adoptable: '可采纳', incrementally: '增量地',
  building: '构建', build: '构建', builder: '构建器', runs: '运行', run: '运行',
  running: '运行', lightweight: '轻量', fast: '快速', simple: '简单', simple: '简洁',
  powerful: '强大', modern: '现代', easy: '易用', easy: '轻巧', small: '小巧',
  open: '开源', source: '源', open: '开放', free: '免费',
  ui: 'UI', ux: 'UX', design: '设计', language: '语言', style: '风格',
  interface: '界面', user: '用户', interfaces: '界面',
  data: '数据', database: '数据库', structure: '结构', structures: '结构',
  algorithm: '算法', algorithms: '算法', collection: '集合', collections: '集合',
  utility: '工具', utilities: '工具', helper: '辅助', helpers: '辅助函数',
  implementation: '实现', implemented: '实现', implementations: '实现',
  documentation: '文档', docs: '文档', guide: '指南', tutorial: '教程',
  example: '示例', examples: '示例', demo: '演示', playground: '演练场',
  command: '命令', cli: '命令行', line: '行', terminal: '终端',
  api: 'API', sdk: 'SDK', rest: 'REST', graphql: 'GraphQL',
  http: 'HTTP', https: 'HTTPS', server: '服务器', proxy: '代理',
  async: '异步', sync: '同步', concurrent: '并发', parallel: '并行',
  state: '状态', store: '存储', cache: '缓存', session: '会话',
  router: '路由', routing: '路由', routing: '路由管理', render: '渲染', rendering: '渲染',
  component: '组件', components: '组件', hook: '钩子', hooks: '钩子',
  reactive: '响应式', declarative: '声明式', functional: '函数式', object: '对象',
  oriented: '导向', class: '类', classes: '类', type: '类型', typed: '类型化',
  typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python',
  rust: 'Rust', golang: 'Go', go: 'Go', node: 'Node', nodejs: 'Node.js',
  react: 'React', vue: 'Vue', angular: 'Angular', svelte: 'Svelte',
  electron: 'Electron', flutter: 'Flutter', android: '安卓', ios: 'iOS',
  windows: 'Windows', linux: 'Linux', macos: 'macOS', docker: 'Docker',
  kubernetes: 'Kubernetes', cloud: '云', distributed: '分布式', realtime: '实时',
  streaming: '流', stream: '流', socket: '套接字', websocket: 'WebSocket',
  security: '安全', auth: '鉴权', authentication: '认证', authorization: '授权',
  encryption: '加密', crypto: '加密', blockchain: '区块链',
  machine: '机器', learning: '学习', ml: '机器学习', ai: 'AI', artificial: '人工',
  intelligence: '智能', neural: '神经', network: '网络', networks: '网络',
  deep: '深度', model: '模型', models: '模型', training: '训练',
  image: '图像', images: '图像', video: '视频', audio: '音频', text: '文本',
  natural: '自然', nlp: '自然语言', generation: '生成', generator: '生成器',
  chat: '聊天', bot: '机器人', agent: '智能体', llm: '大语言模型',
  game: '游戏', engine: '引擎', graphics: '图形', '3d': '3D', '2d': '2D',
  animation: '动画', physics: '物理', rendering: '渲染',
  blog: '博客', cms: '内容管理系统', static: '静态', site: '站点', website: '网站',
  generator: '生成器', markdown: 'Markdown', theme: '主题',
  testing: '测试', test: '测试', unit: '单元', e2e: '端到端', mock: '模拟',
  ci: '持续集成', cd: '持续部署', pipeline: '流水线', deploy: '部署',
  monitoring: '监控', logger: '日志', logging: '日志', debug: '调试',
  performance: '性能', optimization: '优化', benchmark: '基准',
  '3': '3', '2': '2', js: 'JS', ts: 'TS', '++': '++', '#': '#',
  self: '自', hosted: '托管', minimal: '极简', minimalist: '极简',
  beautiful: '美观', elegant: '优雅', clean: '整洁', robust: '健壮',
  scalable: '可扩展', flexible: '灵活', extensible: '可扩展', configurable: '可配置',
  production: '生产', ready: '就绪', ready: '可用', enterprise: '企业级',
  community: '社区', official: '官方', unofficial: '非官方', experimental: '实验性',
  wrapper: '封装', bindings: '绑定', port: '移植', clone: '克隆', fork: '复刻',
  inspired: '灵感来自', like: '类似', similar: '类似', alternative: '替代',
  best: '最佳', popular: '流行', featured: '精选', awesome: 'awesome',
  list: '列表', curated: '精选', collection: '合集', resource: '资源', resources: '资源',
  book: '书', books: '书', notes: '笔记', interview: '面试',
  you: '你', your: '你的', my: '我的', our: '我们的', we: '我们',
  get: '获取', use: '使用', using: '使用', used: '使用', create: '创建',
  creating: '创建', manage: '管理', managing: '管理', handle: '处理', handling: '处理',
  support: '支持', supports: '支持', supported: '支持', provide: '提供',
  provides: '提供', provided: '提供', help: '帮助', helps: '帮助', make: '让',
  made: '制作', written: '编写', built: '构建', written: '用',
  written: '写成', developed: '开发', development: '开发',
  without: '无需', no: '无', not: '不', all: '全部', any: '任意', every: '每个',
  more: '更多', less: '更少', new: '新', old: '旧', first: '首个', next: '下一代',
  high: '高', low: '低', level: '层级', standard: '标准', basic: '基础',
  advanced: '进阶', complete: '完整', core: '核心', main: '主',
  about: '关于', what: '什么', how: '如何', why: '为何', when: '何时',
  with: '带有', into: '到', over: '在', up: '向上', out: '出', down: '下'
};

// 摘取中文：保留中文字符与中文标点，去掉英文/数字/空白噪声
function extractChinese(text) {
  const matches = text.match(/[一-鿿　-〿＀-￯，。、；：？！“”‘’（）【】《》…—·\s]+/g);
  if (!matches) return '';
  return matches
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/([，。、；：！？]){2,}/g, '$1')  // 合并连续重复标点
    .replace(/\s+([，。、；：！？])/g, '$1')
    .trim();
}

// 纯英文 -> 中文（词表翻译，未知词保留）
function translateEN(text) {
  // 按空白切分但保留分隔符位置
  const parts = text.split(/(\s+)/);
  const out = [];
  for (const p of parts) {
    if (p === '' || /^\s+$/.test(p)) { out.push(p); continue; }
    // 去掉首尾标点，记录（注意：. 不在否定组，句号归到 post）
    const m = p.match(/^([^A-Za-z0-9+#]*)(.+?)([^A-Za-z0-9+#]*)$/);
    const pre = m ? m[1] : '';
    const core = m ? m[2] : p;
    const post = m ? m[3] : '';
    const key = core.toLowerCase();
    let tr = GLOSSARY[key];
    if (tr === undefined) {
      // 未知词：保留原文（专有名词/技术词通常保留英文）
      tr = /^[A-Za-z0-9+#.]+$/.test(core) ? core : core;
    } else if (tr === '') {
      tr = ''; // 冠词等省略
    }
    out.push(pre + tr + post);
  }
  return out
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。、；：！？])/g, '$1')
    .replace(/([一-鿿])\s+([一-鿿])/g, '$1$2') // 中文间多余空格
    .trim();
}

// 主入口：根据是否含中文决定处理分支
function processText(text) {
  if (!text || !String(text).trim()) return '';
  text = String(text).trim();
  if (CJK.test(text)) return extractChinese(text);
  return translateEN(text);
}

// 语言标签（中文优先，无映射则保留原文）
function langLabel(lang) {
  if (!lang) return 'Other';
  return LANG_CN[lang] || lang;
}

module.exports = { processText, extractChinese, translateEN, langLabel, LANG_CN };
