const app = require('../server');
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    ...options
  });
  const text = await response.text();
  return { response, text };
}

async function main() {
  const contactsFile = path.join(__dirname, '..', 'data', 'contacts.json');
  const applicationsFile = path.join(__dirname, '..', 'data', 'applications.json');
  const adminsFile = path.join(__dirname, '..', 'data', 'admins.json');
  const usersFile = path.join(__dirname, '..', 'data', 'users.json');
  const originalContacts = fs.existsSync(contactsFile) ? fs.readFileSync(contactsFile, 'utf8') : '[]';
  const originalApplications = fs.existsSync(applicationsFile) ? fs.readFileSync(applicationsFile, 'utf8') : '[]';
  const originalAdmins = fs.existsSync(adminsFile) ? fs.readFileSync(adminsFile, 'utf8') : '[]';
  const originalUsers = fs.existsSync(usersFile) ? fs.readFileSync(usersFile, 'utf8') : '[]';
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const publicPaths = [
      '/',
      '/about',
      '/services',
      '/portfolio',
      '/portfolio/predictive-analytics-platform',
      '/portfolio/global-saas-website',
      '/portfolio/fitness-tracking-app',
      '/portfolio/project-management-platform',
      '/portfolio/luxury-fashion-store',
      '/portfolio/customer-support-chatbot',
      '/careers',
      '/contact',
      '/consultation',
      '/login',
      '/signup',
      '/admin',
      '/admin/setup',
      '/documentation',
      '/privacy',
      '/terms',
      '/cookies',
      '/support',
      '/robots.txt',
      '/sitemap.xml'
    ];

    for (const path of publicPaths) {
      const { response } = await request(baseUrl, path);
      assert(response.status >= 200 && response.status < 400, `${path} returned ${response.status}`);
    }

    const health = await request(baseUrl, '/api/health');
    assert(health.response.status === 200, '/api/health failed');
    assert(JSON.parse(health.text).ok === true, '/api/health did not return ok');

    const contact = await request(baseUrl, '/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test Lead',
        email: 'lead@example.com',
        phone: '+1 555 0100',
        company: 'Example Company',
        service: 'AI & Machine Learning Solutions',
        message: 'Testing contact form submission.'
      })
    });
    assert(contact.response.status === 200, `/api/contact returned ${contact.response.status}: ${contact.text}`);

    const applicationForm = new FormData();
    applicationForm.set('name', 'Smoke Test Applicant');
    applicationForm.set('email', 'applicant@example.com');
    applicationForm.set('phone', '+1 555 0110');
    applicationForm.set('role', 'AI Engineer');
    applicationForm.set('portfolio', 'https://example.com');
    applicationForm.set('message', 'Testing application form submission.');
    const application = await request(baseUrl, '/api/application', {
      method: 'POST',
      body: applicationForm
    });
    assert(application.response.status === 200, `/api/application returned ${application.response.status}: ${application.text}`);

    const signup = await request(baseUrl, '/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test Customer',
        email: 'customer@example.com',
        company: 'Example Customer Company',
        businessType: 'SaaS',
        password: 'Customer@2026'
      })
    });
    assert(signup.response.status === 201, `/api/signup returned ${signup.response.status}: ${signup.text}`);
    const signupCookie = signup.response.headers.get('set-cookie');
    assert(signupCookie, 'Signup did not set a user session cookie');

    const userDashboard = await request(baseUrl, '/dashboard', {
      headers: { cookie: signupCookie }
    });
    assert(userDashboard.response.status === 200, `/dashboard returned ${userDashboard.response.status}`);

    const me = await request(baseUrl, '/api/me', {
      headers: { cookie: signupCookie }
    });
    assert(me.response.status === 200, `/api/me returned ${me.response.status}`);
    assert(JSON.parse(me.text).email === 'customer@example.com', '/api/me returned the wrong user');

    const customerLogin = await request(baseUrl, '/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'Customer@2026'
      })
    });
    assert(customerLogin.response.status === 200, `/api/login returned ${customerLogin.response.status}: ${customerLogin.text}`);

    const setup = await request(baseUrl, '/admin/setup', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: 'admin@example.com',
        password: 'PravixaSmoke@2026'
      })
    });
    assert(setup.response.status === 302, `/admin/setup returned ${setup.response.status}`);

    const login = await request(baseUrl, '/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: 'admin@example.com',
        password: 'PravixaSmoke@2026'
      })
    });
    assert(login.response.status === 302, `/admin/login returned ${login.response.status}`);
    const cookie = login.response.headers.get('set-cookie');
    assert(cookie, 'Admin login did not set a session cookie');

    for (const path of ['/admin/dashboard', '/admin/contacts', '/admin/applications', '/admin/users', '/admin/logs', '/admin/settings', '/api/contacts', '/api/applications', '/api/users', '/api/admin/stats']) {
      const { response } = await request(baseUrl, path, {
        headers: { cookie }
      });
      assert(response.status === 200, `${path} returned ${response.status}`);
    }

    console.log('Smoke tests passed: pages, forms, APIs, and admin panel are working.');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(contactsFile, originalContacts);
    fs.writeFileSync(applicationsFile, originalApplications);
    fs.writeFileSync(adminsFile, originalAdmins);
    fs.writeFileSync(usersFile, originalUsers);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
