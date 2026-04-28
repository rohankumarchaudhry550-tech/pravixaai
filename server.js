const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'PravixaAI@2026';
const SESSION_SECRET = process.env.SESSION_SECRET || 'pravixa-admin-session';
const DATA_DIR = path.join(__dirname, 'data');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SITE_FILE = path.join(DATA_DIR, 'site.json');

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

app.use(express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));
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

function ensureAdmin(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/admin/login');
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/portfolio', (req, res) => res.sendFile(path.join(__dirname, 'portfolio.html')));
app.get('/careers', (req, res) => res.sendFile(path.join(__dirname, 'careers.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));

app.get('/admin', (req, res) => {
  if (req.session?.authenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/admin/login');
});

app.get('/admin/login', (req, res) => {
  if (req.session?.authenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    return res.redirect('/admin/dashboard');
  }
  res.status(401).render('login', { error: 'Invalid username or password' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/dashboard', ensureAdmin, (req, res) => {
  const contacts = readContacts();
  const siteData = readSiteData();
  res.render('dashboard', {
    contactsCount: contacts.length,
    recentContacts: contacts.slice(-5).reverse(),
    pages: siteData.pages
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
