const base = process.env.BASE_URL || 'http://localhost:5174';

async function fetchStatus(path, opts = {}) {
  const res = await fetch(base + path, { redirect: 'manual', ...opts });
  return res.status;
}

async function main() {
  const login = await fetchStatus('/login');
  const root = await fetchStatus('/');
  const dashboard = await fetchStatus('/dashboard');
  const logout = await fetchStatus('/logout');

  const ok =
    login === 200 &&
    root === 302 &&
    dashboard === 302 &&
    logout === 302;

  console.log('GET /login:   ', login, login === 200 ? 'OK' : 'FAIL');
  console.log('GET /:        ', root, root === 302 ? 'OK' : 'FAIL');
  console.log('GET /dashboard:', dashboard, dashboard === 302 ? 'OK' : 'FAIL');
  console.log('GET /logout:  ', logout, logout === 302 ? 'OK' : 'FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
