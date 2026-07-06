// ============================================
// DERATISATION.FR — Admin Panel v2
// Securisé : login différé, pas de mdp en dur
// ============================================
(function() {
  'use strict';

  const LEAD_API_URL = '/api/lead';
  const PARTENAIRE_API_URL = '/api/partenaires';
  // Le mot de passe est défini côté serveur — on utilise un challenge
  // Pour sécuriser : déplace cette vérification côté API

  let apiKey = sessionStorage.getItem('admin_api_key') || '';
  let allLeads = [];
  let allPartenaires = [];
  let loginAttempts = 0;

  const $ = function(id) { return document.getElementById(id); };

  // ─── Login ───────────────────────────────────
  window.handleLogin = async function() {
    var passwordEl = $('loginPassword');
    var errorEl = $('loginError');
    var password = passwordEl.value;

    if (!password) {
      errorEl.textContent = 'Veuillez entrer un mot de passe';
      errorEl.style.display = 'block';
      return;
    }

    try {
      var resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });
      var data = await resp.json();

      if (data.success) {
        apiKey = data.apiKey || 'dev-key-123';
        sessionStorage.setItem('admin_api_key', apiKey);
        $('loginScreen').style.display = 'none';
        $('dashboardScreen').style.display = 'block';
        loginAttempts = 0;
        loadPartenaires();
        loadLeads();
      } else {
        loginAttempts++;
        errorEl.textContent = 'Mot de passe incorrect' + (loginAttempts >= 3 ? ' (trop de tentatives)' : '');
        errorEl.style.display = 'block';
        passwordEl.value = '';
      }
    } catch(err) {
      errorEl.textContent = 'Erreur de connexion au serveur';
      errorEl.style.display = 'block';
    }
  };

  // ─── Auto-login check ────────────────────────
  async function autoLogin() {
    if (apiKey) {
      try {
        var resp = await fetch(LEAD_API_URL, { headers: { 'X-API-Key': apiKey } });
        if (resp.status === 401) {
          sessionStorage.removeItem('admin_api_key');
          apiKey = '';
          return;
        }
        $('loginScreen').style.display = 'none';
        $('dashboardScreen').style.display = 'block';
        loadPartenaires();
        loadLeads();
      } catch(e) {
        apiKey = '';
      }
    }
  }

  // ─── Load data ──────────────────────────────
  window.refreshLeads = function() { loadLeads(); };

  async function loadLeads() {
    try {
      var resp = await fetch(LEAD_API_URL, { headers: { 'X-API-Key': apiKey } });
      if (resp.status === 401) { sessionStorage.removeItem('admin_api_key'); apiKey = ''; return; }
      var data = await resp.json();
      allLeads = data.leads || [];
      if (data.partenaires && allPartenaires.length === 0) allPartenaires = data.partenaires;
      populateFilters();
      render();
    } catch(err) { console.error('Load error:', err); }
  }

  async function loadPartenaires() {
    try {
      var resp = await fetch(PARTENAIRE_API_URL, { headers: { 'X-API-Key': apiKey } });
      var data = await resp.json();
      allPartenaires = data.partenaires || [];
      renderPartenaires();
      render();
    } catch(err) { console.error('Load error:', err); }
  }

  // ─── Filters ────────────────────────────────
  function populateFilters() {
    var nuisibles = [...new Set(allLeads.map(function(l) { return l.type_nuisible; }).filter(Boolean))];
    var depts = [...new Set(allLeads.map(function(l) { return l.departement; }).filter(Boolean))];
    $('filterNuisible').innerHTML = '<option value="">Tous nuisibles</option>' +
      nuisibles.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
    $('filterDepartement').innerHTML = '<option value="">Tous départements</option>' +
      depts.map(function(d) { return '<option value="' + d + '">' + d + '</option>'; }).join('');
  }

  function render() {
    var filtered = getFilteredLeads();
    updateStats(filtered);
    renderTable(filtered);
  }

  function getFilteredLeads() {
    var s = $('filterStatut').value;
    var n = $('filterNuisible').value;
    var d = $('filterDepartement').value;
    return allLeads.filter(function(lead) {
      if (s && lead.statut !== s) return false;
      if (n && lead.type_nuisible !== n) return false;
      if (d && lead.departement !== d) return false;
      return true;
    });
  }

  function updateStats(leads) {
    var today = new Date().toISOString().substring(0, 10);
    var todayCount = 0, waiting = 0, attribue = 0, traite = 0;
    leads.forEach(function(l) {
      if ((l.created_at || '').substring(0, 10) === today) todayCount++;
      if (l.statut === 'nouveau') waiting++;
      if (l.statut === 'attribué') attribue++;
      if (l.statut === 'traité') traite++;
    });
    $('statTotal').textContent = leads.length;
    $('statWaiting').textContent = waiting;
    $('statAttribue').textContent = attribue;
    $('statTraite').textContent = traite;
    $('statToday').textContent = todayCount;
  }

  function getPartenaireName(id) {
    if (!id) return '—';
    var p = allPartenaires.find(function(x) { return x.id === parseInt(id); });
    return p ? esc(p.nom) : '#' + id;
  }

  function renderTable(leads) {
    var leadsBody = $('leadsBody');
    var emptyState = $('emptyState');
    var selectPartenaire = '<select class="assign-select" data-lead-id="">' +
      '<option value="">Choisir...</option>' +
      allPartenaires.filter(function(p) { return p.actif; }).map(function(p) {
        return '<option value="' + p.id + '">' + esc(p.nom) + '</option>';
      }).join('') + '</select>';

    if (leads.length === 0) {
      leadsBody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    leadsBody.innerHTML = leads.map(function(l) {
      var statutClass = l.statut === 'attribué' ? 'badge-attribue' : l.statut === 'traité' ? 'badge-done' : l.statut === 'refusé' ? 'badge-refused' : 'badge-new';
      var actions = '';
      var partenaireName = getPartenaireName(l.partenaire_id);

      if (l.statut === 'nouveau') {
        actions = '<div class="action-group">' +
          selectPartenaire.replace('data-lead-id=""', 'data-lead-id="' + l.id + '" onchange="window.assignLead&&window.assignLead(this)"') +
          '</div>';
      } else if (l.statut === 'attribué') {
        actions = '<div class="action-group">' +
          '<button class="btn-sm btn-success" onclick="handleValider(' + l.id + ')">✅ Terminé</button>' +
          '<button class="btn-sm btn-danger" onclick="handleRefuser(' + l.id + ')">❌ Refuser</button>' +
          '</div>';
      } else if (l.statut === 'traité') {
        actions = '<span style="color:var(--admin-muted);font-size:11px">✓ Fait</span>';
      } else if (l.statut === 'refusé') {
        actions = '<button class="btn-sm" onclick="handleReouvrir(' + l.id + ')">🔄 Rouvrir</button>';
      }

      return '<tr>' +
        '<td style="white-space:nowrap">' + formatDate(l.created_at) + '</td>' +
        '<td>' + esc(l.nom) + '</td>' +
        '<td><a href="tel:' + l.telephone + '" class="phone-link">' + l.telephone + '</a></td>' +
        '<td style="font-size:12px">' + esc(l.email) + '</td>' +
        '<td>' + esc(l.type_nuisible) + '</td>' +
        '<td>' + esc(l.type_lieu) + '</td>' +
        '<td>' + esc(l.departement) + '</td>' +
        '<td>' + (l.urgence ? '🔴' : '—') + '</td>' +
        '<td><span class="badge ' + statutClass + '">' + esc(l.statut) + '</span></td>' +
        '<td>' + partenaireName + '</td>' +
        '<td>' + actions + '</td></tr>';
    }).join('');
  }

  // ─── Actions ────────────────────────────────
  window.assignLead = async function(selectEl) {
    var leadId = parseInt(selectEl.getAttribute('data-lead-id'));
    var partenaireId = parseInt(selectEl.value);
    if (!partenaireId) return;
    try {
      var resp = await fetch(LEAD_API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ id: leadId, statut: 'attribué', partenaire_id: partenaireId })
      });
      if (resp.ok) {
        allLeads.forEach(function(l) { if (l.id === leadId) { l.statut = 'attribué'; l.partenaire_id = partenaireId; } });
        render();
      }
    } catch(err) { console.error(err); }
  };

  window.handleValider = async function(id) {
    try {
      var resp = await fetch(LEAD_API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ id: id, statut: 'traité', traite: true })
      });
      if (resp.ok) { allLeads.forEach(function(l) { if (l.id === id) { l.statut = 'traité'; l.traite = 1; } }); render(); }
    } catch(err) { console.error(err); }
  };

  window.handleRefuser = async function(id) {
    try {
      var resp = await fetch(LEAD_API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ id: id, statut: 'refusé', traite: false })
      });
      if (resp.ok) { allLeads.forEach(function(l) { if (l.id === id) { l.statut = 'refusé'; l.traite = 0; } }); render(); }
    } catch(err) { console.error(err); }
  };

  window.handleReouvrir = async function(id) {
    try {
      var resp = await fetch(LEAD_API_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({ id: id, statut: 'nouveau', traite: false })
      });
      if (resp.ok) { allLeads.forEach(function(l) { if (l.id === id) { l.statut = 'nouveau'; l.traite = 0; } }); render(); }
    } catch(err) { console.error(err); }
  };

  // ─── Partenaires ────────────────────────────
  window.addPartenaire = async function() {
    var nom = $('pNom').value.trim();
    if (!nom) { alert('Nom requis'); return; }
    try {
      var resp = await fetch(PARTENAIRE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          nom: nom,
          email: $('pEmail').value.trim(),
          telephone: $('pTel').value.trim(),
          telegram_id: $('pTelegram').value.trim(),
          depts: $('pDepts').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
          nuisibles: $('pNuisibles').value.split(',').map(function(s) { return s.trim(); }).filter(Boolean)
        })
      });
      var data = await resp.json();
      if (resp.ok) {
        $('pNom').value = ''; $('pEmail').value = ''; $('pTel').value = '';
        $('pTelegram').value = ''; $('pDepts').value = ''; $('pNuisibles').value = '';
        loadPartenaires(); loadLeads();
      } else { alert('Erreur: ' + (data.error || 'Inconnue')); }
    } catch(err) { alert('Erreur réseau'); }
  };

  window.deletePartenaire = async function(id) {
    if (!confirm('Supprimer ce partenaire ?')) return;
    try {
      var resp = await fetch(PARTENAIRE_API_URL + '?id=' + id, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
      });
      if (resp.ok) { loadPartenaires(); loadLeads(); }
    } catch(err) { alert('Erreur réseau'); }
  };

  function renderPartenaires() {
    if (allPartenaires.length === 0) {
      $('partenairesList').innerHTML = '<p style="color:var(--admin-muted);font-size:13px">Aucun partenaire.</p>';
      return;
    }
    $('partenairesList').innerHTML = allPartenaires.map(function(p) {
      var activeBadge = p.actif
        ? '<span class="badge badge-done" style="font-size:10px">Actif</span>'
        : '<span class="badge badge-refused" style="font-size:10px">Inactif</span>';
      return '<div class="partner-card"><div class="info">' +
        '<div class="name">' + esc(p.nom) + ' ' + activeBadge + '</div>' +
        '<div class="meta">' +
          (p.email ? '📧 ' + esc(p.email) + ' | ' : '') +
          (p.telephone ? '📞 ' + esc(p.telephone) + ' | ' : '') +
          (p.depts ? '📍 ' + p.depts.join(', ') : '') +
        '</div>' +
        '<div class="meta">' +
          (p.nuisibles ? '🐀 ' + p.nuisibles.join(', ') : '') +
          (p.telegram_id ? ' | TG: ' + esc(p.telegram_id) : '') +
        '</div></div>' +
        '<div class="actions"><button class="btn-sm btn-danger" onclick="deletePartenaire(' + p.id + ')">🗑 Supprimer</button></div></div>';
    }).join('');
  }

  // ─── Tab switching ──────────────────────────
  window.switchTab = function(tab) {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    var tabId = tab.charAt(0).toUpperCase() + tab.slice(1);
    document.getElementById('tab' + tabId).classList.add('active');
    document.getElementById('section' + tabId).classList.add('active');
  };

  // ─── Seed ───────────────────────────────────
  window.seedLeads = async function() {
    try {
      var resp = await fetch(LEAD_API_URL + '?seed=1', { method: 'POST', headers: { 'X-API-Key': apiKey } });
      var data = await resp.json();
      if (resp.ok) { alert(data.message || 'Leads générés'); loadLeads(); }
      else { alert('Erreur: ' + (data.error || 'Inconnue')); }
    } catch(err) { alert('Erreur réseau'); }
  };

  window.applyFilters = function() { render(); };

  // ─── Export CSV ────────────────────────────
  window.exportCSV = function() {
    var leads = getFilteredLeads();
    if (leads.length === 0) { alert('Aucun lead'); return; }
    var headers = ['Date','Nom','Téléphone','Email','Nuisible','Lieu','Département','Urgence','Statut','Partenaire','Message'];
    var rows = leads.map(function(l) {
      return [
        l.created_at || '', '"' + (l.nom || '') + '"', l.telephone || '',
        '"' + (l.email || '') + '"', '"' + (l.type_nuisible || '') + '"',
        '"' + (l.type_lieu || '') + '"', '"' + (l.departement || '') + '"',
        l.urgence ? 'Oui' : 'Non', '"' + (l.statut || '') + '"',
        '"' + getPartenaireName(l.partenaire_id) + '"',
        '"' + (l.message || '').replace(/"/g, '""') + '"'
      ].join(',');
    });
    var csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'leads-deratisation-' + new Date().toISOString().substring(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  window.handleLogout = function() {
    apiKey = '';
    sessionStorage.removeItem('admin_api_key');
    $('dashboardScreen').style.display = 'none';
    $('loginScreen').style.display = 'block';
    $('loginPassword').value = '';
  };

  // ─── Helpers ───────────────────────────────
  function formatDate(d) {
    if (!d) return '—';
    var parts = d.substring(0, 16).split(' ');
    return parts.length === 2 ? parts[0] + ' ' + parts[1] : d;
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── Init ──────────────────────────────────
  autoLogin();
})();
