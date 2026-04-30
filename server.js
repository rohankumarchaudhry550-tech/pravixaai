const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'PravixaAI@2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'pravixa-admin-session';
const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
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
    summary: 'A fast, SEO-focused SaaS website redesigned to improve product clarity, performance, and demo conversions.',
    problem: 'The SaaS website had low conversion rates, unclear messaging, and slow page performance.',
    solution: 'We rebuilt the experience with clearer product pages, stronger SEO structure, faster loading, and conversion-focused calls to action.',
    result: 'Demo requests increased by 300% and page speed improved by 60%.',
    stack: ['React', 'Next.js', 'SEO', 'Conversion Optimization']
  },
  'fitness-tracking-app': {
    title: 'Fitness Tracking App',
    category: 'Mobile App Development',
    summary: 'A cross-platform fitness app with AI-based progress tracking and personalized user insights.',
    problem: 'The brand needed a scalable mobile product that could support personalized fitness journeys.',
    solution: 'We developed a React Native app with Firebase, AI tracking logic, progress insights, and clean mobile UX.',
    result: 'The app reached 100K+ downloads and a 4.8-star user rating.',
    stack: ['React Native', 'Firebase', 'AI Tracking', 'Mobile UX']
  },
  'project-management-platform': {
    title: 'Project Management Platform',
    category: 'SaaS Development',
    summary: 'A cloud SaaS platform for team collaboration, task automation, and project visibility.',
    problem: 'Growing teams needed a custom workflow that generic project tools could not support.',
    solution: 'We built a multi-user SaaS platform with task tracking, permissions, automation, and cloud infrastructure.',
    result: 'The platform supports 500+ teams and more than 1M managed tasks.',
    stack: ['Node.js', 'MongoDB', 'AWS', 'Workflow Automation']
  },
  'luxury-fashion-store': {
    title: 'Luxury Fashion Store',
    category: 'E-commerce',
    summary: 'An e-commerce experience with AI-assisted shopping and AR try-on to reduce cart abandonment.',
    problem: 'The store had high cart abandonment because customers needed more confidence before purchase.',
    solution: 'We improved the buying journey with AR try-on, AI-assisted recommendations, and optimized product flows.',
    result: 'Cart abandonment dropped by 45% and average order value doubled.',
    stack: ['Shopify', 'AR', 'AI Recommendations', 'E-commerce UX']
  },
  'customer-support-chatbot': {
    title: 'Customer Support Chatbot',
    category: 'AI Automation',
    summary: 'An NLP chatbot integrated with support workflows to reduce repetitive tickets and provide 24/7 answers.',
    problem: 'Support volume was increasing operational costs and slowing response times.',
    solution: 'We built an API-connected NLP chatbot that handles common questions, captures context, and routes complex issues.',
    result: 'Support costs dropped by 70% while customers gained 24/7 self-service support.',
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
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
  })
);

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
    fs.writeFileSync(
      ADMINS_FILE,
      JSON.stringify([
        {
          username: 'admin',
          password: 'PravixaAI@2026'
        }
      ], null, 2)
    );
  }
  if (!fs.existsSync(SITE_FILE)) {
    fs.writeFileSync(
      SITE_FILE,
      JSON.stringify({
        pages: [
          { route: '/', file: 'index.html', title: 'Pravixa AI - Leading AI Services USA & Worldwide' },
          { route: '/about', file: 'about.html', title: 'About Us - Pravixa AI' },
          { route: '/services', file: 'services.html', title: 'Services - Pravixa AI' },
          { route: '/portfolio', file: 'portfolio.html', title: 'Portfolio - Pravixa AI' },
          { route: '/careers', file: 'careers.html', title: 'Careers - Join Our Team - Pravixa AI' },
          { route: '/contact', file: 'contact.html', title: 'Contact Pravixa AI - Get AI Consulting & Support Today' }
        ]
      }, null, 2)
    );
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
  return readJsonArray(ADMINS_FILE);
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
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/admin/login');
}

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
  if (req.session?.authenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/login', (req, res) => {
  if (req.session?.authenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admins = readAdmins();
  const user = admins.find(admin => admin.username === String(username).trim());

  if ((user && user.password === password) || (username === ADMIN_USER && password === ADMIN_PASS)) {
    req.session.authenticated = true;
    return res.redirect('/admin/dashboard');
  }

  res.redirect('/admin?error=1');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/dashboard', ensureAdmin, (req, res) => {
  const contacts = readContacts();
  const applications = readApplications();
  const siteData = readSiteData();
  const pages = Array.isArray(siteData.pages) ? siteData.pages : [];
  res.render('dashboard', {
    contactsCount: contacts.length,
    applicationCount: applications.length,
    recentContacts: contacts.slice(-5).reverse(),
    recentApplications: applications.slice(-5).reverse(),
    pages
  });
});

app.get('/admin/contacts', ensureAdmin, (req, res) => {
  const contacts = readContacts().slice().reverse();
  res.render('contacts', { contacts });
});

app.post('/admin/contacts/delete', ensureAdmin, (req, res) => {
  const { id } = req.body;
  const contacts = readContacts().filter(contact => contact.id !== String(id));
  writeContacts(contacts);
  res.redirect('/admin/contacts');
});

app.get('/admin/applications', ensureAdmin, (req, res) => {
  const applications = readApplications().slice().reverse();
  res.render('applications', { applications });
});

app.post('/admin/applications/delete', ensureAdmin, (req, res) => {
  const { id } = req.body;
  const applications = readApplications().filter(application => application.id !== String(id));
  writeApplications(applications);
  res.redirect('/admin/applications');
});

app.get('/api/contacts', ensureAdmin, (req, res) => {
  res.json(readContacts());
});

app.get('/api/applications', ensureAdmin, (req, res) => {
  res.json(readApplications());
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Pravixa AI backend',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/contact', (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const phone = cleanText(req.body.phone);
  const company = cleanText(req.body.company);
  const service = cleanText(req.body.service);
  const message = cleanMessage(req.body.message);

  if (!name || !email || !service || !message) {
    return res.status(400).json({ error: 'Name, email, service, and message are required.' });
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
  res.json({ success: true, message: 'Message received successfully.' });
});

app.post('/api/application', upload.single('resume'), (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const phone = cleanText(req.body.phone);
  const role = cleanText(req.body.role);
  const portfolio = cleanText(req.body.portfolio, 300);
  const message = cleanMessage(req.body.message);

  if (!name || !email || !role || !message) {
    return res.status(400).json({ error: 'Name, email, role, and message are required.' });
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
  res.json({ success: true, message: 'Application received successfully.' });
});

app.use(express.static(__dirname));

app.use((err, req, res, next) => {
  console.error('Server error:', err);
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Pravixa AI backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
