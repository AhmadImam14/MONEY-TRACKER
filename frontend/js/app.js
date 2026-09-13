async function fetchPeople() {
  const res = await fetch('/api/people');
  if (!res.ok) return [];
  return res.json();
}

function renderPeople(list) {
  const ul = document.getElementById('people-list');
  ul.innerHTML = '';
  if (!list.length) {
    ul.innerHTML = '<li class="muted">No people yet.</li>';
    return;
  }
  list.forEach(async p => {
    // fetch summary for each person
    const sumRes = await fetch(`/api/people/${p._id}/summary`);
    const summary = sumRes.ok ? await sumRes.json() : null;
    const li = document.createElement('li');
    li.innerHTML = `<div>
      <strong>${p.name}</strong>
      <div class="muted">${summary ? summary.formatted.balance : '₦0.00'} • ${summary ? summary.transactions : 0} transactions</div>
    </div>`;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => openPersonDetail(p));
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
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    alert('Network error');
  }
});

load();

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
  const res = await fetch(`/api/people/${personId}/summary`);
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
  const res = await fetch(`/api/people/${personId}/transactions?sort=asc`);
  const listEl = document.getElementById('transactions-list');
  listEl.innerHTML = '';
  if (!res.ok) { listEl.innerHTML = '<div class="muted">No transactions</div>'; return; }
  const txns = await res.json();
  let running = 0;
  txns.forEach(t => {
    running += (t.type === 'received' ? t.amount : -t.amount);
    const row = document.createElement('div');
    row.className = 'txn-row';
    row.innerHTML = `<div>
      <div><strong>${new Date(t.date).toLocaleDateString()}</strong> <span class="muted">${t.reference}</span></div>
      <div class="muted">${t.description || ''}</div>
    </div>
    <div>
      <div class="amount ${t.type}">${formatKobo(t.amount)}</div>
      <div class="muted">Bal: ${formatKobo(running)}</div>
    </div>`;
    listEl.appendChild(row);
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
    const res = await fetch(`/api/people/${personId}/transactions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
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
  } catch (err) { alert('Network error'); }
});
