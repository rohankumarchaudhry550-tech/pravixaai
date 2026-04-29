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
  limits: { fileSize: 5 * 1024 * 1024 }
});

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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

function readContacts() {
  try {
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeContacts(contacts) {
  fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

function readSiteData() {
  try {
    return JSON.parse(fs.readFileSync(SITE_FILE, 'utf8'));
  } catch (error) {
    return { pages: [] };
  }
}

function readAdmins() {
  try {
    return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function readApplications() {
  try {
    return JSON.parse(fs.readFileSync(APPLICATIONS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeApplications(applications) {
  fs.writeFileSync(APPLICATIONS_FILE, JSON.stringify(applications, null, 2));
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
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, 'careers.html')));
app.get('/careers.html', (req, res) => res.redirect(301, '/careers'));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/contact.html', (req, res) => res.redirect(301, '/contact'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/admin.html', (req, res) => res.redirect(301, '/admin'));
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
  res.redirect('/admin');
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
  const contacts = readContacts().filter(contact => contact.id !== id);
  writeContacts(contacts);
  res.redirect('/admin/contacts');
});

app.get('/admin/applications', ensureAdmin, (req, res) => {
  const applications = readApplications().slice().reverse();
  res.render('applications', { applications });
});

app.post('/admin/applications/delete', ensureAdmin, (req, res) => {
  const { id } = req.body;
  const applications = readApplications().filter(application => application.id !== id);
  writeApplications(applications);
  res.redirect('/admin/applications');
});

app.get('/api/contacts', ensureAdmin, (req, res) => {
  res.json(readContacts());
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, company, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  const contacts = readContacts();
  const newContact = {
    id: `c_${Date.now()}`,
    createdAt: new Date().toISOString(),
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone || '').trim(),
    company: String(company || '').trim(),
    service: String(service || '').trim(),
    message: String(message).trim()
  };
  contacts.push(newContact);
  writeContacts(contacts);
  res.json({ success: true, message: 'Message received successfully.' });
});

app.post('/api/application', upload.single('resume'), (req, res) => {
  const { name, email, phone, role, portfolio, message } = req.body;
  if (!name || !email || !role || !message) {
    return res.status(400).json({ error: 'Name, email, role, and message are required.' });
  }
  const applications = readApplications();
  const newApplication = {
    id: `a_${Date.now()}`,
    createdAt: new Date().toISOString(),
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone || '').trim(),
    role: String(role).trim(),
    portfolio: String(portfolio || '').trim(),
    message: String(message).trim(),
    resumePath: req.file ? `/uploads/${req.file.filename}` : null,
    resumeOriginalName: req.file ? req.file.originalname : null
  };
  applications.push(newApplication);
  writeApplications(applications);
  res.json({ success: true, message: 'Application received successfully.' });
});

app.use(express.static(__dirname));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'), err => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

ensureDataDir();
app.listen(PORT, () => {
  console.log(`Pravixa AI backend running on http://localhost:${PORT}`);
});
