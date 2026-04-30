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
  const originalContacts = fs.existsSync(contactsFile) ? fs.readFileSync(contactsFile, 'utf8') : '[]';
  const originalApplications = fs.existsSync(applicationsFile) ? fs.readFileSync(applicationsFile, 'utf8') : '[]';
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
      '/admin',
      '/admin/login',
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

    const login = await request(baseUrl, '/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        username: 'admin',
        password: 'PravixaAI@2026'
      })
    });
    assert(login.response.status === 302, `/admin/login returned ${login.response.status}`);
    const cookie = login.response.headers.get('set-cookie');
    assert(cookie, 'Admin login did not set a session cookie');

    for (const path of ['/admin/dashboard', '/admin/contacts', '/admin/applications', '/api/contacts', '/api/applications']) {
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
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
