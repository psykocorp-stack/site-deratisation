// ============================================
// DERATISATION.FR — Formulaire 4 Étapes v2
// Amélioré : validation temps réel, loading, toast
// ============================================
(function() {
  'use strict';

  const formEl = document.getElementById('leadForm');
  if (!formEl) return;

  const steps = formEl.querySelectorAll('.form-step');
  const indicators = document.querySelectorAll('.step-indicator');
  const progressBar = document.querySelector('.form-progress-bar');
  const totalSteps = steps.length;

  let currentStep = 0;
  const formData = {
    type_nuisible: '',
    type_lieu: '',
    departement: '',
    urgence: false,
    nom: '',
    telephone: '',
    email: '',
    message: ''
  };

  function init() {
    showStep(0);
    setupSelection('.nuisible-option', 'type_nuisible');
    setupSelection('.lieu-option', 'type_lieu');
    setupNavigation();
    setupLiveValidation();
  }

  function showStep(index) {
    steps.forEach(function(step, i) {
      step.classList.toggle('active', i === index);
    });
    indicators.forEach(function(ind, i) {
      ind.classList.remove('active', 'done');
      if (i === index) ind.classList.add('active');
      else if (i < index) ind.classList.add('done');
    });
    currentStep = index;
    updateProgress();
    updateNavButtons();
  }

  function updateProgress() {
    if (!progressBar) return;
    progressBar.style.width = ((currentStep / (totalSteps - 1)) * 100) + '%';
  }

  function updateNavButtons() {
    var backBtn = formEl.querySelector('.btn-back');
    var nextBtn = formEl.querySelector('.btn-next');
    var submitBtn = formEl.querySelector('.btn-submit');

    if (backBtn) backBtn.style.display = currentStep === 0 ? 'none' : 'inline-flex';
    if (nextBtn && submitBtn) {
      nextBtn.style.display = currentStep === totalSteps - 1 ? 'none' : 'inline-flex';
      submitBtn.style.display = currentStep === totalSteps - 1 ? 'inline-flex' : 'none';
    }
  }

  function setupSelection(selector, key) {
    var options = formEl.querySelectorAll(selector);
    options.forEach(function(opt) {
      opt.addEventListener('click', function() {
        options.forEach(function(o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        formData[key] = opt.dataset.value;
      });
    });
  }

  function setupNavigation() {
    formEl.querySelectorAll('.btn-back').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (currentStep > 0) showStep(currentStep - 1);
      });
    });

    formEl.querySelectorAll('.btn-next').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (currentStep === 2) gatherStep3();
        if (currentStep === 3) gatherFormData();
        if (validateStep(currentStep) && currentStep < totalSteps - 1) {
          showStep(currentStep + 1);
        }
      });
    });

    formEl.querySelector('.btn-submit').addEventListener('click', function(e) {
      e.preventDefault();
      gatherFormData();
      if (validateStep(currentStep)) submitForm();
    });
  }

  function gatherStep3() {
    var depSelect = document.getElementById('departement');
    var urgenceCheck = document.getElementById('urgence');
    if (depSelect) formData.departement = depSelect.value;
    if (urgenceCheck) formData.urgence = urgenceCheck.checked;
  }

  function gatherFormData() {
    gatherStep3();
    formData.nom = (document.getElementById('nom') || {}).value || '';
    formData.telephone = (document.getElementById('telephone') || {}).value || '';
    formData.email = (document.getElementById('email') || {}).value || '';
    formData.message = (document.getElementById('message') || {}).value || '';
  }

  function setupLiveValidation() {
    var phoneInput = document.getElementById('telephone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9\s\+\-\.]/g, '');
        var parent = this.closest('.form-group');
        if (parent) {
          var isValid = this.value.length >= 10;
          parent.classList.toggle('error', !isValid && this.value.length > 3);
        }
      });
    }

    var emailInput = document.getElementById('email');
    if (emailInput) {
      emailInput.addEventListener('input', function() {
        var parent = this.closest('.form-group');
        if (parent && this.value.length > 3) {
          parent.classList.toggle('error', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value));
        }
      });
    }
  }

  function validateStep(step) {
    var errorMsg = '';

    switch (step) {
      case 0:
        if (!formData.type_nuisible) errorMsg = 'Veuillez sélectionner un type de nuisible.';
        break;
      case 1:
        if (!formData.type_lieu) errorMsg = 'Veuillez sélectionner un type de lieu.';
        break;
      case 2:
        if (!formData.departement) errorMsg = 'Veuillez sélectionner un département.';
        break;
      case 3:
        if (!formData.nom || formData.nom.trim() === '') {
          errorMsg = 'Veuillez saisir votre nom.';
          highlightField('nom');
        } else if (!formData.telephone || formData.telephone.trim() === '') {
          errorMsg = 'Veuillez saisir votre numéro de téléphone.';
          highlightField('telephone');
        } else if (formData.telephone.replace(/[^0-9]/g, '').length < 10) {
          errorMsg = 'Numéro de téléphone invalide (10 chiffres requis).';
          highlightField('telephone');
        } else if (!formData.email || formData.email.trim() === '') {
          errorMsg = 'Veuillez saisir votre adresse email.';
          highlightField('email');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errorMsg = 'Adresse email invalide.';
          highlightField('email');
        }
        break;
    }

    if (errorMsg) {
      var errorEl = formEl.querySelector('.form-error');
      if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.style.display = 'block';
        setTimeout(function() { errorEl.style.display = 'none'; }, 4000);
      }
      return false;
    }
    return true;
  }

  function highlightField(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('error');
      setTimeout(function() { el.classList.remove('error'); }, 3000);
    }
  }

  function submitForm() {
    var submitBtn = formEl.querySelector('.btn-submit');
    var originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');
    submitBtn.innerHTML = '<span class="btn-spinner"></span><span class="btn-text">Envoi en cours...</span>';

    var payload = {
      nom: formData.nom.trim(),
      telephone: formData.telephone.trim(),
      email: formData.email.trim(),
      type_nuisible: formData.type_nuisible,
      type_lieu: formData.type_lieu,
      departement: formData.departement,
      urgence: formData.urgence,
      message: formData.message.trim()
    };

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    })
    .then(function() {
      saveToLocal(payload);
      showSuccess();
    })
    .catch(function(err) {
      console.warn('API error, saving locally:', err);
      saveToLocal(payload);
      showToast('Demande sauvegardée. Nous vous contacterons rapidement.', 'success');
      showSuccess();
    })
    .finally(function() {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-loading');
      submitBtn.innerHTML = originalText;
    });
  }

  function saveToLocal(data) {
    try {
      var leads = JSON.parse(localStorage.getItem('deratisation_leads') || '[]');
      leads.push(Object.assign({}, data, {
        created_at: new Date().toISOString(),
        id: Date.now()
      }));
      localStorage.setItem('deratisation_leads', JSON.stringify(leads));
    } catch(e) { console.warn('localStorage save failed:', e); }
  }

  function showSuccess() {
    formEl.style.display = 'none';
    var successEl = document.getElementById('formSuccess');
    if (successEl) successEl.classList.add('show');
    var formSection = document.getElementById('devis');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showToast(msg, type) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'toast ' + (type || 'success');
    requestAnimationFrame(function() {
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 5000);
    });
  }

  // Expo pour admin panel
  window.showToast = showToast;

  init();
})();
