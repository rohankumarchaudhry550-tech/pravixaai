const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CONFIGURED_JWT_SECRET = String(process.env.JWT_SECRET || '');
if (IS_PRODUCTION && CONFIGURED_JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production.');
}
const JWT_SECRET = CONFIGURED_JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_COOKIE = 'pravixa_admin_token';
const USER_COOKIE = 'pravixa_user_token';
const AUTH_MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_SECONDS || 60 * 60 * 2);
const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const LOG_FILE = path.join(DATA_DIR, 'app.log');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MAX_TEXT_LENGTH = 1200;
const MAX_SHORT_LENGTH = 160;
const ALLOWED_RESUME_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);
const LEGAL_PAGES = {
  terms: {
    title: 'Terms of Service',
    description: 'Review the terms for using Pravixa AI services, websites, consultations, project delivery, and digital products.',
    heading: 'Terms of Service',
    sections: [
      ['Service Scope', 'Pravixa AI provides AI automation, software development, SaaS, web development, SEO, digital marketing, CRM automation, and consulting services based on agreed project scope.'],
      ['Project Communication', 'Clients are responsible for providing accurate project requirements, timely feedback, required assets, and access needed to complete delivery.'],
      ['Payments and Delivery', 'Pricing, timelines, milestones, and payment terms are confirmed before project work begins. Additional scope may require a separate estimate.'],
      ['Acceptable Use', 'Users may not misuse the website, admin system, contact forms, uploaded files, or any service for illegal, harmful, or abusive activity.']
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Learn how Pravixa AI handles contact inquiries, career applications, uploaded resumes, and business information.',
    heading: 'Privacy Policy',
    sections: [
      ['Information We Collect', 'We collect details submitted through contact and career forms, including name, email, phone, company, service interest, messages, portfolio links, and optional resumes.'],
      ['How We Use Information', 'Submitted information is used to respond to inquiries, review applications, manage leads, and improve our business communication process.'],
      ['Data Storage', 'Contact and application records are stored in backend data files and are accessible only through the admin panel. Resume uploads are stored for application review.'],
      ['Your Choices', 'You can request correction or removal of submitted information by contacting Pravixa AI through the contact page.']
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'Understand how Pravixa AI uses basic browser storage, sessions, and cookies for website and admin functionality.',
    heading: 'Cookie Policy',
    sections: [
      ['Essential Cookies', 'The admin panel uses a secure session cookie so authenticated users can access dashboard features.'],
      ['Browser Storage', 'Some interactive website features may use local browser storage to remember interface state such as chat history.'],
      ['Analytics and Marketing', 'If analytics or advertising tools are added later, this page should be updated with the relevant provider details.'],
      ['Managing Cookies', 'You can manage or clear cookies and local storage from your browser settings.']
    ]
  },
  documentation: {
    title: 'Documentation',
    description: 'Pravixa AI website documentation for services, project inquiries, contact forms, career applications, and admin workflows.',
    heading: 'Website Documentation',
    sections: [
      ['Public Pages', 'The website includes home, about, services, portfolio, careers, contact, and portfolio detail pages.'],
      ['Contact Form', 'The contact form sends validated lead details to the backend and stores them for review inside the admin contacts module.'],
      ['Career Applications', 'The careers page accepts applicant details and optional PDF, DOC, or DOCX resumes up to 5MB.'],
      ['Admin Panel', 'Admins can sign in at /admin or /admin/login to view dashboard metrics, contact leads, applications, and resume downloads.']
    ]
  },
  support: {
    title: 'Support',
    description: 'Pravixa AI customer support and contact guidance for project inquiries, trouble shooting, and service questions.',
    heading: 'Support',
    sections: [
      ['Contact and Support', 'Use the contact page to submit your inquiry, request a service quote, or ask for help with an existing project.'],
      ['Career Questions', 'For resume submissions, role inquiries, and hiring questions, use the Careers page and attach your resume if available.'],
      ['Admin Assistance', 'Authorized users can access the admin panel at /admin for lead review, application management, and site analytics.'],
      ['Quick Response', 'Pravixa AI aims to respond quickly to support requests, with priority given to high-value business automation and AI project inquiries.']
    ]
  }
};
const PORTFOLIO_PROJECTS = {
  'predictive-analytics-platform': {
    title: 'Predictive Analytics Platform',
    category: 'AI Automation',
    summary: 'An AI-powered demand forecasting platform that helps retail teams reduce stockouts and make faster inventory decisions.',
    problem: 'Retail inventory planning was slow, manual, and inaccurate across multiple sales channels.',
    solution: 'We built a machine learning demand prediction system with dashboards, automated alerts, and data pipelines for inventory insights.',
    result: 'The client reduced stockouts by 40%, improved sales by 25%, and gained a repeatable planning workflow.',
    stack: ['Python', 'TensorFlow', 'React', 'Analytics Dashboards']
  },
  'global-saas-website': {
    title: 'Global SaaS Website',
    category: 'Web Development',
    summary: 'A fast, SEO-focused SaaS website redesigned to improve product clarity, performance, and consultation conversions.',
    problem: 'The SaaS website had low conversion rates, unclear messaging, and slow page performance.',
    solution: 'We rebuilt the experience with clearer product pages, stronger SEO structure, faster loading, and conversion-focused calls to action.',
    result: 'The site became faster, clearer, and better structured for consultation requests.',
    stack: ['React', 'Next.js', 'SEO', 'Conversion Optimization']
  },
  'fitness-tracking-app': {
    title: 'Fitness Tracking App',
    category: 'Mobile App Development',
    summary: 'A cross-platform fitness app with AI-based progress tracking and personalized user insights.',
    problem: 'The brand needed a scalable mobile product that could support personalized fitness journeys.',
    solution: 'We developed a React Native app with Firebase, AI tracking logic, progress insights, and clean mobile UX.',
    result: 'The app created a scalable mobile foundation for personalized fitness tracking.',
    stack: ['React Native', 'Firebase', 'AI Tracking', 'Mobile UX']
  },
  'project-management-platform': {
    title: 'Project Management Platform',
    category: 'SaaS Development',
    summary: 'A cloud SaaS platform for team collaboration, task automation, and project visibility.',
    problem: 'Growing teams needed a custom workflow that generic project tools could not support.',
    solution: 'We built a multi-user SaaS platform with task tracking, permissions, automation, and cloud infrastructure.',
    result: 'The platform supports structured task ownership, permissions, automation, and reporting.',
    stack: ['Node.js', 'MongoDB', 'AWS', 'Workflow Automation']
  },
  'luxury-fashion-store': {
    title: 'Luxury Fashion Store',
    category: 'E-commerce',
    summary: 'An e-commerce experience with AI-assisted shopping and AR try-on to reduce cart abandonment.',
    problem: 'The store had high cart abandonment because customers needed more confidence before purchase.',
    solution: 'We improved the buying journey with AR try-on, AI-assisted recommendations, and optimized product flows.',
    result: 'The improved buying journey reduced friction and supported higher-value purchases.',
    stack: ['Shopify', 'AR', 'AI Recommendations', 'E-commerce UX']
  },
  'customer-support-chatbot': {
    title: 'Customer Support Chatbot',
    category: 'AI Automation',
    summary: 'An NLP chatbot integrated with support workflows to reduce repetitive tickets and provide 24/7 answers.',
    problem: 'Support volume was increasing operational costs and slowing response times.',
    solution: 'We built an API-connected NLP chatbot that handles common questions, captures context, and routes complex issues.',
    result: 'The workflow reduced repetitive support load while adding 24/7 self-service coverage.',
    stack: ['NLP', 'Python', 'API Integration', 'Support Automation']
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_RESUME_EXTENSIONS.has(extension) || !ALLOWED_RESUME_MIME_TYPES.has(file.mimetype)) {
      const error = new Error('Only PDF, DOC, and DOCX resume files are allowed.');
      error.status = 400;
      return cb(error);
    }
    cb(null, true);
  }
});

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  const forbidden = ['server.js', 'package.json', '.gitignore', '.env'];
  const normalized = req.path.replace(/^\//, '').toLowerCase();
  if (forbidden.includes(normalized)) {
    return res.status(404).end();
  }
  next();
});

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(bodyParser.json({ limit: '100kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '100kb' }));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(APPLICATIONS_FILE)) {
    fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(ADMINS_FILE)) {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SITE_FILE)) {
    fs.writeFileSync(
      SITE_FILE,
      JSON.stringify({
        pages: [
          { route: '/', file: 'index.html', title: 'Pravixa AI - Leading AI Services USA & Worldwide' },
          { route: '/about', file: 'about.html', title: 'About Us - Pravixa AI' },
          { route: '/services', file: 'services.html', title: 'Services - Pravixa AI' },
          { route: '/portfolio', file: 'portfolio.html', title: 'Solutions - Pravixa AI' },
          { route: '/careers', file: 'careers.html', title: 'Careers - Join Our Team - Pravixa AI' },
          { route: '/contact', file: 'contact.html', title: 'Contact Pravixa AI - Get AI Consulting & Support Today' }
        ]
      }, null, 2)
    );
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
}

function readJsonArray(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function writeJsonFile(filePath, data) {
  const tempFile = `${filePath}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, filePath);
}

function appendLog(level, message, meta = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  try {
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
  } catch (error) {
    if (!IS_PRODUCTION) {
      process.stderr.write(`Log write failed: ${error.message}\n`);
    }
  }
}

function readLogs(limit = 150) {
  try {
    return fs.readFileSync(LOG_FILE, 'utf8')
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          return { time: '', level: 'error', message: line };
        }
      });
  } catch (error) {
    return [];
  }
}

function parseCookies(req) {
  return String(req.headers.cookie || '')
    .split(';')
    .map(cookie => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const index = cookie.indexOf('=');
      if (index > -1) {
        cookies[decodeURIComponent(cookie.slice(0, index))] = decodeURIComponent(cookie.slice(index + 1));
      }
      return cookies;
    }, {});
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + AUTH_MAX_AGE_SECONDS
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyJwt(token) {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedBody, signature] = parts;
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
  const given = Buffer.from(signature);
  const valid = given.length === Buffer.from(expected).length
    && crypto.timingSafeEqual(given, Buffer.from(expected));
  if (!valid) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function setAuthCookie(res, token) {
  setSessionCookie(res, ADMIN_COOKIE, token);
}

function setUserCookie(res, token) {
  setSessionCookie(res, USER_COOKIE, token);
}

function setSessionCookie(res, name, token) {
  const flags = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${AUTH_MAX_AGE_SECONDS}`
  ];
  if (IS_PRODUCTION) {
    flags.push('Secure');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearAuthCookie(res) {
  clearSessionCookie(res, ADMIN_COOKIE);
}

function clearUserCookie(res) {
  clearSessionCookie(res, USER_COOKIE);
}

function clearSessionCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${IS_PRODUCTION ? '; Secure' : ''}`);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('scrypt$')) {
    return false;
  }
  const [, salt, hash] = storedHash.split('$');
  const candidate = hashPassword(password, salt).split('$')[2];
  return Buffer.from(candidate, 'hex').length === Buffer.from(hash, 'hex').length
    && crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function readContacts() {
  return readJsonArray(CONTACTS_FILE);
}

function writeContacts(contacts) {
  writeJsonFile(CONTACTS_FILE, contacts);
}

function readSiteData() {
  try {
    return JSON.parse(fs.readFileSync(SITE_FILE, 'utf8'));
  } catch (error) {
    return { pages: [] };
  }
}

function readAdmins() {
  return readJsonArray(ADMINS_FILE).filter(admin => admin.username && admin.passwordHash);
}

function writeAdmins(admins) {
  writeJsonFile(ADMINS_FILE, admins.map(admin => ({
    id: admin.id || makeId('u'),
    username: cleanText(admin.username, 120),
    passwordHash: admin.passwordHash,
    createdAt: admin.createdAt || new Date().toISOString(),
    role: admin.role || 'administrator'
  })));
}

function readUsers() {
  return readJsonArray(USERS_FILE).filter(user => user.email && user.passwordHash);
}

function writeUsers(users) {
  writeJsonFile(USERS_FILE, users.map(user => ({
    id: user.id || makeId('usr'),
    createdAt: user.createdAt || new Date().toISOString(),
    lastLoginAt: user.lastLoginAt || null,
    name: cleanText(user.name),
    email: cleanText(user.email, 120).toLowerCase(),
    company: cleanText(user.company),
    businessType: cleanText(user.businessType || user.company),
    passwordHash: user.passwordHash,
    status: user.status || 'active',
    role: user.role || 'customer'
  })));
}

function readApplications() {
  return readJsonArray(APPLICATIONS_FILE);
}

function writeApplications(applications) {
  writeJsonFile(APPLICATIONS_FILE, applications);
}

function cleanText(value, maxLength = MAX_SHORT_LENGTH) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function cleanMessage(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_LENGTH);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureAdmin(req, res, next) {
  const token = parseCookies(req)[ADMIN_COOKIE];
  const payload = verifyJwt(token);
  if (payload?.sub) {
    req.admin = payload;
    res.locals.admin = payload;
    return next();
  }
  clearAuthCookie(res);
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in again.' });
  }
  res.redirect('/admin/login');
}

function ensureUser(req, res, next) {
  const token = parseCookies(req)[USER_COOKIE];
  const payload = verifyJwt(token);
  if (payload?.sub && payload.type === 'customer') {
    req.user = payload;
    res.locals.user = payload;
    return next();
  }
  clearUserCookie(res);
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Please log in to continue.' });
  }
  res.redirect('/login');
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildAdminStats(contacts, applications) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return formatDateKey(date);
  });
  const leadTrend = days.map(day => contacts.filter(contact => String(contact.createdAt || '').startsWith(day)).length);
  const applicationTrend = days.map(day => applications.filter(application => String(application.createdAt || '').startsWith(day)).length);
  const serviceCounts = contacts.reduce((counts, contact) => {
    const service = contact.service || 'Not specified';
    counts[service] = (counts[service] || 0) + 1;
    return counts;
  }, {});
  const calls = contacts.filter(contact => contact.phone).length;
  const conversionRate = contacts.length ? Math.round((applications.length / contacts.length) * 100) : 0;
  const costSaved = (contacts.length * 180 + applications.length * 120 + calls * 75);
  return {
    leads: contacts.length,
    calls,
    costSaved,
    conversionRate,
    line: { labels: days.map(day => day.slice(5)), leads: leadTrend, applications: applicationTrend },
    pie: {
      labels: Object.keys(serviceCounts).slice(0, 6),
      values: Object.values(serviceCounts).slice(0, 6)
    }
  };
}

function publicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    name: user.name,
    email: user.email,
    company: user.company,
    businessType: user.businessType,
    status: user.status || 'active',
    role: user.role || 'customer'
  };
}

function ensureEnvAdmin() {
  const envUser = cleanText(process.env.ADMIN_USER, 120).toLowerCase();
  const envPassword = String(process.env.ADMIN_PASSWORD || '');
  if (!envUser || !envPassword || readAdmins().length > 0) {
    return;
  }
  if (!isValidEmail(envUser) || envPassword.length < 12) {
    appendLog('warning', 'ADMIN_USER or ADMIN_PASSWORD is invalid; first admin setup required');
    return;
  }
  writeAdmins([{
    id: makeId('u'),
    username: envUser,
    passwordHash: hashPassword(envPassword),
    createdAt: new Date().toISOString(),
    role: 'administrator'
  }]);
  appendLog('info', 'admin created from environment', { username: envUser });
}

app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) {
      appendLog('info', 'request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - started
      });
    }
  });
  next();
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/about.html', (req, res) => res.redirect(301, '/about'));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/services.html', (req, res) => res.redirect(301, '/services'));
app.get('/portfolio', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/portfolio.html', (req, res) => res.redirect(301, '/portfolio'));
app.get('/portfolio/:slug', (req, res, next) => {
  const project = PORTFOLIO_PROJECTS[req.params.slug];
  if (!project) {
    return next();
  }
  res.render('portfolio-detail', {
    slug: req.params.slug,
    project,
    relatedProjects: Object.entries(PORTFOLIO_PROJECTS)
      .filter(([key]) => key !== req.params.slug)
      .slice(0, 3)
      .map(([key, value]) => ({ slug: key, ...value }))
  });
});
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, 'careers.html')));
app.get('/careers.html', (req, res) => res.redirect(301, '/careers'));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/contact.html', (req, res) => res.redirect(301, '/contact'));
app.get('/consultation', (req, res) => res.sendFile(path.join(__dirname, 'consultation.html')));
app.get('/consultation.html', (req, res) => res.redirect(301, '/consultation'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'signup.html')));
app.get('/signup.html', (req, res) => res.redirect(301, '/signup'));
app.get('/dashboard', ensureUser, (req, res) => {
  const user = readUsers().find(item => item.id === req.user.sub);
  if (!user) {
    clearUserCookie(res);
    return res.redirect('/login');
  }
  res.render('user-dashboard', { user: publicUser(user) });
});
app.get('/logout', (req, res) => {
  clearUserCookie(res);
  res.redirect('/login');
});
app.get('/get-in-touch', (req, res) => res.redirect(301, '/contact'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/terms', (req, res) => res.render('simple-page', { page: LEGAL_PAGES.terms }));
app.get('/privacy', (req, res) => res.render('simple-page', { page: LEGAL_PAGES.privacy }));
app.get('/cookies', (req, res) => res.render('simple-page', { page: LEGAL_PAGES.cookies }));
app.get('/documentation', (req, res) => res.render('simple-page', { page: LEGAL_PAGES.documentation }));
app.get('/support', (req, res) => res.render('simple-page', { page: LEGAL_PAGES.support }));
app.get('/admin.html', (req, res) => res.redirect(301, '/admin'));
app.get('/admin-login', (req, res) => res.redirect(301, '/admin/login'));
app.get('/admin', (req, res) => {
  if (readAdmins().length === 0) {
    return res.redirect('/admin/setup');
  }
  if (verifyJwt(parseCookies(req)[ADMIN_COOKIE])) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

app.get('/admin/setup', (req, res) => {
  if (readAdmins().length > 0) {
    return res.redirect('/admin/login');
  }
  res.render('admin-setup', { error: null });
});

app.post('/admin/setup', (req, res) => {
  try {
    if (readAdmins().length > 0) {
      return res.redirect('/admin/login');
    }
    const username = cleanText(req.body.username, 120).toLowerCase();
    const password = String(req.body.password || '');
    if (!isValidEmail(username) || password.length < 12) {
      return res.status(400).render('admin-setup', {
        error: 'Use a valid email and a password with at least 12 characters.'
      });
    }
    const admin = {
      id: makeId('u'),
      username,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      role: 'administrator'
    };
    writeAdmins([admin]);
    appendLog('info', 'first admin created', { username });
    const token = signJwt({ sub: admin.id, username: admin.username, role: admin.role });
    setAuthCookie(res, token);
    res.redirect('/admin/dashboard');
  } catch (error) {
    appendLog('error', 'admin setup failed', { error: error.message });
    res.status(500).render('admin-setup', { error: 'Unable to create admin account. Please try again.' });
  }
});

app.get('/admin/login', (req, res) => {
  if (readAdmins().length === 0) {
    return res.redirect('/admin/setup');
  }
  if (verifyJwt(parseCookies(req)[ADMIN_COOKIE])) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  try {
    const username = cleanText(req.body.username, 120).toLowerCase();
    const password = String(req.body.password || '');
    const user = readAdmins().find(admin => admin.username.toLowerCase() === username);

    if (user && verifyPassword(password, user.passwordHash)) {
      const token = signJwt({ sub: user.id, username: user.username, role: user.role || 'administrator' });
      setAuthCookie(res, token);
      appendLog('info', 'admin login succeeded', { username });
      return res.redirect('/admin/dashboard');
    }

    appendLog('warning', 'admin login failed', { username });
    res.status(401).render('admin-login', { error: 'Invalid email or password.' });
  } catch (error) {
    appendLog('error', 'admin login error', { error: error.message });
    res.status(500).render('admin-login', { error: 'Sign in is temporarily unavailable. Please try again.' });
  }
});

app.get('/admin/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/admin/login');
});

app.get('/admin/dashboard', ensureAdmin, (req, res) => {
  try {
    const contacts = readContacts();
    const applications = readApplications();
    const users = readUsers();
    const siteData = readSiteData();
    const pages = Array.isArray(siteData.pages) ? siteData.pages : [];
    res.render('dashboard', {
      stats: buildAdminStats(contacts, applications),
      recentContacts: contacts.slice(-5).reverse(),
      recentApplications: applications.slice(-5).reverse(),
      recentUsers: users.slice(-5).reverse().map(publicUser),
      pages
    });
  } catch (error) {
    appendLog('error', 'dashboard render failed', { error: error.message });
    res.status(500).render('dashboard', {
      stats: buildAdminStats([], []),
      recentContacts: [],
      recentApplications: [],
      recentUsers: [],
      pages: [],
      error: 'Dashboard data could not be loaded right now.'
    });
  }
});

app.get('/admin/contacts', ensureAdmin, (req, res) => {
  try {
    const contacts = readContacts().slice().reverse();
    res.render('contacts', { contacts });
  } catch (error) {
    appendLog('error', 'contacts render failed', { error: error.message });
    res.status(500).render('contacts', { contacts: [], error: 'Contacts could not be loaded.' });
  }
});

app.post('/admin/contacts/delete', ensureAdmin, (req, res) => {
  try {
    const { id } = req.body;
    const contacts = readContacts().filter(contact => contact.id !== String(id));
    writeContacts(contacts);
    res.redirect('/admin/contacts');
  } catch (error) {
    appendLog('error', 'contact delete failed', { error: error.message });
    res.redirect('/admin/contacts');
  }
});

app.get('/admin/applications', ensureAdmin, (req, res) => {
  try {
    const applications = readApplications().slice().reverse();
    res.render('applications', { applications });
  } catch (error) {
    appendLog('error', 'applications render failed', { error: error.message });
    res.status(500).render('applications', { applications: [], error: 'Applications could not be loaded.' });
  }
});

app.post('/admin/applications/delete', ensureAdmin, (req, res) => {
  try {
    const { id } = req.body;
    const applications = readApplications().filter(application => application.id !== String(id));
    writeApplications(applications);
    res.redirect('/admin/applications');
  } catch (error) {
    appendLog('error', 'application delete failed', { error: error.message });
    res.redirect('/admin/applications');
  }
});

app.get('/admin/users', ensureAdmin, (req, res) => {
  res.render('users', {
    adminUsers: readAdmins().map(({ passwordHash, ...admin }) => admin),
    customers: readUsers().map(publicUser).reverse()
  });
});

app.get('/admin/logs', ensureAdmin, (req, res) => {
  res.render('logs', { logs: readLogs() });
});

app.get('/admin/settings', ensureAdmin, (req, res) => {
  res.render('settings', {
    settings: {
      environment: process.env.NODE_ENV || 'development',
      sessionMinutes: Math.round(AUTH_MAX_AGE_SECONDS / 60),
      adminsConfigured: readAdmins().length,
      uploadsEnabled: true,
      maxUploadMb: 5
    }
  });
});

app.get('/api/contacts', ensureAdmin, (req, res) => {
  try {
    res.json(readContacts());
  } catch (error) {
    appendLog('error', 'contacts api failed', { error: error.message });
    res.status(500).json({ error: 'Contacts could not be loaded.' });
  }
});

app.get('/api/applications', ensureAdmin, (req, res) => {
  try {
    res.json(readApplications());
  } catch (error) {
    appendLog('error', 'applications api failed', { error: error.message });
    res.status(500).json({ error: 'Applications could not be loaded.' });
  }
});

app.get('/api/users', ensureAdmin, (req, res) => {
  try {
    res.json(readUsers().map(publicUser));
  } catch (error) {
    appendLog('error', 'users api failed', { error: error.message });
    res.status(500).json({ error: 'Users could not be loaded.' });
  }
});

app.get('/api/admin/stats', ensureAdmin, (req, res) => {
  try {
    res.json(buildAdminStats(readContacts(), readApplications()));
  } catch (error) {
    appendLog('error', 'stats api failed', { error: error.message });
    res.status(500).json({ error: 'Analytics could not be loaded.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Pravixa AI backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/me', ensureUser, (req, res) => {
  const user = readUsers().find(item => item.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User account was not found.' });
  }
  res.json(publicUser(user));
});

app.post('/api/signup', (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email, 120).toLowerCase();
    const company = cleanText(req.body.company);
    const businessType = cleanText(req.body.businessType || req.body.company);
    const password = String(req.body.password || '');

    if (!name || !email || !company || !password) {
      return res.status(400).json({ error: 'Please complete name, email, company, and password.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const users = readUsers();
    if (users.some(user => user.email.toLowerCase() === email)) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const user = {
      id: makeId('usr'),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      name,
      email,
      company,
      businessType,
      passwordHash: hashPassword(password),
      status: 'active',
      role: 'customer'
    };
    users.push(user);
    writeUsers(users);
    appendLog('info', 'customer signup', { email, company });

    const token = signJwt({ sub: user.id, email: user.email, name: user.name, type: 'customer' });
    setUserCookie(res, token);
    res.status(201).json({ success: true, user: publicUser(user), redirect: '/dashboard' });
  } catch (error) {
    appendLog('error', 'customer signup failed', { error: error.message });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/login', (req, res) => {
  try {
    const email = cleanText(req.body.email, 120).toLowerCase();
    const password = String(req.body.password || '');
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Please enter a valid email and password.' });
    }

    const users = readUsers();
    const user = users.find(item => item.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    user.lastLoginAt = new Date().toISOString();
    writeUsers(users);
    appendLog('info', 'customer login', { email });

    const token = signJwt({ sub: user.id, email: user.email, name: user.name, type: 'customer' });
    setUserCookie(res, token);
    res.json({ success: true, user: publicUser(user), redirect: '/dashboard' });
  } catch (error) {
    appendLog('error', 'customer login failed', { error: error.message });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/contact', (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const phone = cleanText(req.body.phone);
    const company = cleanText(req.body.company);
    const service = cleanText(req.body.service);
    const message = cleanMessage(req.body.message);

    if (!name || !email || !service || !message) {
      return res.status(400).json({ error: 'Please complete name, email, service, and message.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const contacts = readContacts();
    const newContact = {
      id: makeId('c'),
      createdAt: new Date().toISOString(),
      name,
      email,
      phone,
      company,
      service,
      message
    };
    contacts.push(newContact);
    writeContacts(contacts);
    appendLog('info', 'contact submitted', { service, hasPhone: Boolean(phone) });
    res.json({ success: true, message: 'Message received successfully.' });
  } catch (error) {
    appendLog('error', 'contact submission failed', { error: error.message });
    res.status(500).json({ error: 'We could not send your message right now. Please try again.' });
  }
});

app.post('/api/application', upload.single('resume'), (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const phone = cleanText(req.body.phone);
    const role = cleanText(req.body.role);
    const portfolio = cleanText(req.body.portfolio, 300);
    const message = cleanMessage(req.body.message);

    if (!name || !email || !role || !message) {
      return res.status(400).json({ error: 'Please complete name, email, role, and message.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const applications = readApplications();
    const newApplication = {
      id: makeId('a'),
      createdAt: new Date().toISOString(),
      name,
      email,
      phone,
      role,
      portfolio,
      message,
      resumePath: req.file ? `/uploads/${req.file.filename}` : null,
      resumeOriginalName: req.file ? req.file.originalname : null
    };
    applications.push(newApplication);
    writeApplications(applications);
    appendLog('info', 'application submitted', { role, hasResume: Boolean(req.file) });
    res.json({ success: true, message: 'Application received successfully.' });
  } catch (error) {
    appendLog('error', 'application submission failed', { error: error.message });
    res.status(500).json({ error: 'We could not submit your application right now. Please try again.' });
  }
});

app.use(express.static(__dirname));

app.use((err, req, res, next) => {
  appendLog('error', 'server error', { path: req.path, error: err.message });
  if (!IS_PRODUCTION) {
    process.stderr.write(`Server error: ${err.message}\n`);
  }
  const message = err.code === 'LIMIT_FILE_SIZE'
    ? 'Resume file too large. Maximum size is 5MB.'
    : err.message || 'Internal server error.';
  if (req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ error: message });
  }
  res.status(err.status || 500).sendFile(path.join(__dirname, '404.html'), sendErr => {
    if (sendErr) {
      res.status(500).send('Internal server error');
    }
  });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'), err => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

ensureDataDir();
ensureEnvAdmin();

if (require.main === module) {
  app.listen(PORT, () => {
    if (!IS_PRODUCTION) {
      process.stdout.write(`Pravixa AI backend running on http://localhost:${PORT}\n`);
    }
  });
}

module.exports = app;
