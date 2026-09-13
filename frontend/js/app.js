// ---------- Auth ----------
const TOKEN_KEY = 'money_tracker_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    // Token invalid/expired — force logout
    clearToken();
    showLogin();
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

// ---------- Login / Logout ----------
const loginPage = document.getElementById('login-page');
const dashboard = document.getElementById('dashboard');

function showLogin() {
  loginPage.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function showDashboard() {
  loginPage.classList.add('hidden');
  dashboard.classList.remove('hidden');
  load();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username.value.trim(), password: form.password.value })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.classList.remove('hidden');
      return;
    }
    setToken(data.token);
    form.reset();
    showDashboard();
  } catch (err) {
    errorEl.textContent = 'Network error. Please try again.';
    errorEl.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  clearToken();
  showLogin();
});

// On page load: if token exists, show dashboard; otherwise show login
if (getToken()) {
  showDashboard();
} else {
  showLogin();
}

// ---------- People ----------
async function fetchPeople() {
  const res = await apiFetch('/api/people', { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

function renderPeople(list) {
  const ul = document.getElementById('people-list');
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML = '<li class="muted">No people yet. Add your first person above.</li>';
    return;
  }
  list.forEach(async p => {
    // fetch summary for each person
    const sumRes = await apiFetch(`/api/people/${p._id}/summary`, { headers: authHeaders() });
    const summary = sumRes.ok ? await sumRes.json() : null;
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="person-info">
        <strong>${p.name}</strong>
        <div class="muted">${summary ? summary.formatted.balance : '₦0.00'} • ${summary ? summary.transactions : 0} transactions</div>
      </div>
      <div class="person-actions">
        <button class="btn small delete" data-id="${p._id}" title="Delete person">Delete</button>
      </div>`;
    li.querySelector('.person-info').addEventListener('click', () => openPersonDetail(p));
    li.querySelector('.btn.delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete ${p.name}? This will also delete all their transactions.`)) return;
      try {
        const res = await apiFetch(`/api/people/${p._id}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to delete person');
          return;
        }
        load();
      } catch (err) {
        alert(err.message || 'Network error');
      }
    });
    ul.appendChild(li);
  });
}

async function load() {
  const people = await fetchPeople();
  renderPeople(people);
}

document.getElementById('add-person-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim() || null,
    email: form.email.value.trim() || null,
  };
  try {
    const res = await apiFetch('/api/people', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to add person');
      return;
    }
    form.reset();
    load();
  } catch (err) {
    alert(err.message || 'Network error');
  }
});

// Person detail logic
const detailSection = document.getElementById('person-detail');
const backBtn = document.getElementById('back-to-people');
backBtn.addEventListener('click', () => { detailSection.classList.add('hidden'); document.getElementById('people-section').classList.remove('hidden'); });

async function openPersonDetail(person) {
  document.getElementById('people-section').classList.add('hidden');
  detailSection.classList.remove('hidden');
  document.getElementById('detail-name').textContent = person.name;
  document.getElementById('add-transaction-form').dataset.personId = person._id;
  await loadPersonSummary(person._id);
  await loadPersonTransactions(person._id);
}

async function loadPersonSummary(personId) {
  const res = await apiFetch(`/api/people/${personId}/summary`, { headers: authHeaders() });
  const el = document.getElementById('summary');
  if (!res.ok) { el.innerHTML = '<div class="muted">No summary</div>'; return; }
  const s = await res.json();
  el.innerHTML = `
    <div class="item"><strong>Currently Holding</strong><div>${s.formatted.balance}</div></div>
    <div class="item"><strong>Total Received</strong><div>${s.formatted.totalReceived}</div></div>
    <div class="item"><strong>Total Returned</strong><div>${s.formatted.totalReturned}</div></div>
    <div class="item"><strong>Transactions</strong><div>${s.transactions}</div></div>
  `;
}

async function loadPersonTransactions(personId) {
  // get transactions sorted oldest->newest for running balance
  const res = await apiFetch(`/api/people/${personId}/transactions?sort=asc`, { headers: authHeaders() });
  const listEl = document.getElementById('transactions-list');
  listEl.innerHTML = '';
  if (!res.ok) { listEl.innerHTML = '<div class="muted">No transactions</div>'; return; }
  const txns = await res.json();
  if (!txns.length) {
    listEl.innerHTML = '<div class="muted">No transactions yet. Add one above.</div>';
    return;
  }
  let running = 0;
  txns.forEach(t => {
    running += (t.type === 'received' ? t.amount : -t.amount);
    const row = document.createElement('div');
    row.className = 'txn-row';
    row.innerHTML = `<div>
      <div><strong>${new Date(t.date).toLocaleDateString()}</strong> <span class="muted">${t.reference}</span></div>
      <div class="muted">${t.description || ''}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <div style="text-align:right">
        <div class="amount ${t.type}">${formatKobo(t.amount)}</div>
        <div class="muted">Bal: ${formatKobo(running)}</div>
      </div>
      <div class="txn-actions">
        <button class="btn small delete" data-id="${t._id}" title="Delete transaction">Delete</button>
      </div>
    </div>`;
    listEl.appendChild(row);
  });

  // Wire up delete buttons
  listEl.querySelectorAll('.btn.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const txnId = btn.dataset.id;
      if (!confirm('Delete this transaction? This cannot be undone.')) return;
      try {
        const res = await apiFetch(`/api/transactions/${txnId}`, { method: 'DELETE', headers: authHeaders() });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to delete transaction');
          return;
        }
        // Refresh summary, transactions, and people list
        await loadPersonSummary(personId);
        await loadPersonTransactions(personId);
        load();
      } catch (err) {
        alert(err.message || 'Network error');
      }
    });
  });
}

function formatKobo(kobo) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format((kobo || 0) / 100);
}

// Add transaction form handler
document.getElementById('add-transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const personId = form.dataset.personId;
  const data = {
    type: form.type.value,
    amount: parseFloat(form.amount.value),
    date: form.date.value,
    description: form.description.value,
  };
  try {
    const res = await apiFetch(`/api/people/${personId}/transactions`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'Failed to add transaction');
      return;
    }
    form.reset();
    // refresh summary and transactions
    await loadPersonSummary(personId);
    await loadPersonTransactions(personId);
    load(); // refresh people list balances
  } catch (err) { alert(err.message || 'Network error'); }
});