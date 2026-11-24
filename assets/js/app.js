/* --- InvoiceFlex Progressive Interactive Engine --- */
window.IFCloud.ready.catch(function () {}).then(function () {
  'use strict';

  const THEME_KEY = 'invoiceflex_theme';
  const NOTIF_READ_KEY = 'invoiceflex_notif_read';
  const ACCOUNTS_KEY = 'invoiceflex_accounts_v1';
  const SESSION_KEY = 'invoiceflex_session_v1';
  const COMPANY_EMAIL_BACKUP_KEY = 'invoiceflex_company_by_email_v1';
  const COMPANY_LOGO_KEY = 'invoiceflex_company_logo';
  const COMPANY_SIGNATURE_KEY = 'invoiceflex_company_signature';
  const ADMIN_AVATAR_KEY = 'invoiceflex_admin_avatar';
  const COMPANY_INFO_KEY = 'invoiceflex_company_info';
  const ADMIN_INFO_KEY = 'invoiceflex_admin_info';
  const BILLBOOK_DATA_KEY = 'invoiceflex_billbook_v1';
  const QUOTATIONS_KEY = 'invoiceflex_quotations_v1';
  const CUSTOMERS_KEY = 'invoiceflex_customers_v1';
  const INVOICES_KEY = 'invoiceflex_invoices_v1';
  const PAYMENTS_KEY = 'invoiceflex_payments_v1';

  const PLAN_LIMITS = {
    Free: {
      label: 'Free',
      invoicesDaily: 4,
      customers: 10,
      watermark: true,
      price: 0,
      blurb: '4 invoices a day, 10 customers, watermark on every bill',
      tagline: 'Try it out',
      features: ['4 invoices a day', '10 customers', 'InvoiceFlex watermark on every PDF']
    },
    Pro: {
      label: 'Pro',
      invoicesDaily: 10,
      customers: 200,
      watermark: true,
      price: 499,
      blurb: '10 invoices a day, 200 customers, watermark on every bill',
      tagline: 'For growing workshops',
      features: ['10 invoices a day', '200 customers', 'InvoiceFlex watermark on every PDF', 'Payment tracking']
    },
    Enterprise: {
      label: 'Enterprise',
      invoicesDaily: 20,
      customers: null,
      watermark: false,
      price: 1499,
      blurb: '20 invoices a day, unlimited customers, no watermark',
      tagline: 'For full-time billing',
      features: ['20 invoices a day', 'Unlimited customers', 'No watermark on invoices', 'Payment tracking']
    }
  };

  /* --------------------------------------------------------------------------
     1. Dual Appearance (Light / Dark) Manager
     -------------------------------------------------------------------------- */
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeIcons(theme);
    // Sync segmented appearance controls if present
    document.querySelectorAll('[data-theme-choice]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === theme);
    });
  }

  function updateThemeIcons(theme) {
    const isDark = theme === 'dark';
    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
      btn.setAttribute('aria-label', isDark ? 'Switch to Light Appearance' : 'Switch to Dark Appearance');
      btn.setAttribute('title', isDark ? 'Light Appearance' : 'Dark Appearance');
      btn.innerHTML = isDark
        ? '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    });
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(next === 'dark' ? 'Dark Appearance enabled' : 'Light Appearance enabled', 'info');
  }

  // Apply immediately
  applyTheme(getPreferredTheme());

  /* --------------------------------------------------------------------------
     2. iOS Toast & Modal Sheet API
     -------------------------------------------------------------------------- */
  let toastStack = null;
  function ensureToastStack() {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'ios-toast-stack';
      document.body.appendChild(toastStack);
    }
    return toastStack;
  }

  function toast(message, type = 'success', undoCallback = null) {
    const stack = ensureToastStack();
    const el = document.createElement('div');
    el.className = 'ios-toast';

    const dot = document.createElement('span');
    dot.className = `ios-toast-dot ${type}`;
    el.appendChild(dot);

    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);

    if (typeof undoCallback === 'function') {
      const undoBtn = document.createElement('button');
      undoBtn.type = 'button';
      undoBtn.className = 'ios-toast-undo';
      undoBtn.textContent = 'Undo';
      undoBtn.addEventListener('click', () => {
        undoCallback();
        dismiss();
      });
      el.appendChild(undoBtn);
    }

    stack.appendChild(el);

    let removed = false;
    function dismiss() {
      if (removed) return;
      removed = true;
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 220);
    }

    setTimeout(dismiss, undoCallback ? 4500 : 2800);
  }

  function confirmSheet({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false
  }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'ios-modal-backdrop';
      backdrop.innerHTML = `
        <div class="ios-modal-card" role="dialog" aria-modal="true">
          <h3 class="ios-modal-title">${escapeHtml(title)}</h3>
          <p class="ios-modal-message">${escapeHtml(message)}</p>
          <div class="ios-modal-actions">
            <button type="button" class="btn btn-secondary" data-modal-cancel>${escapeHtml(cancelText)}</button>
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-modal-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);

      requestAnimationFrame(() => backdrop.classList.add('is-open'));

      function close(result) {
        backdrop.classList.remove('is-open');
        setTimeout(() => {
          backdrop.remove();
          resolve(result);
        }, 200);
      }

      backdrop.querySelector('[data-modal-cancel]').addEventListener('click', () => close(false));
      backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => close(true));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close(false);
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatINR(num) {
    const val = Number(num) || 0;
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPlainINR(num) {
    const val = Number(num) || 0;
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDisplayDate(dateStr) {
    const raw = String(dateStr || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return `${d}.${m}.${y}`;
    }
    return raw || '01.05.2026';
  }

  function amountInWordsINR(num) {
    const val = Math.max(0, Number(num) || 0);
    const whole = Math.floor(val);
    const paise = Math.round((val - whole) * 100);
    if (whole === 0 && paise === 0) return 'Rupees Zero Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function twoDigits(n) {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }

    function convertInt(n) {
      if (n === 0) return '';
      const parts = [];
      const crore = Math.floor(n / 10000000);
      n %= 10000000;
      const lakh = Math.floor(n / 100000);
      n %= 100000;
      const thousand = Math.floor(n / 1000);
      n %= 1000;
      const hundred = Math.floor(n / 100);
      const rest = n % 100;

      if (crore) parts.push(`${convertInt(crore)} Crore`);
      if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
      if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
      if (hundred) parts.push(`${ones[hundred]} Hundred`);
      if (rest) parts.push(twoDigits(rest));
      return parts.join(' ').trim();
    }

    let words = whole > 0 ? `Rupees ${convertInt(whole)}` : 'Rupees Zero';
    if (paise > 0) {
      words += ` and ${twoDigits(paise)} Paise`;
    }
    return `${words} Only`;
  }

  window.InvoiceFlexUI = { toast, confirm: confirmSheet, toggleTheme, applyTheme, formatINR, amountInWordsINR };

  /* --------------------------------------------------------------------------
     2B. Multi-Account Session, Registration -> Setup -> Dashboard & Auth Guard
     -------------------------------------------------------------------------- */
  function readAccountsRaw() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getDemoCompanyInfo() {
    return {
      name: 'Anuyog Engineering',
      gstin: '24IVTPP6141P1ZJ',
      pan: 'IVTPP6141P',
      stateCode: '24',
      stateName: 'Gujarat',
      city: 'Vapi',
      email: 'anuyog.engineering@gmail.com',
      phone: '+91 8141015605, +91 7046778251',
      address: 'Plot No. 925, Opp. Swaraj Eng. Compoud B/H Aarti Ind., 4th Phase, G.I.D.C., Vapi - 396 195',
      bankName: 'PUNJAB NATIONAL BANK',
      bankAccount: '0008302100001876',
      bankBranchIfsc: 'SILVASSA ROAD & PUNB0000830',
      bankType: 'Current Account',
      invoicePrefix: 'AE001/2026-2027',
      quotePrefix: 'QTN/2026-2027/',
      defaultGst: '18',
      terms: '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days\n2. 18% GST extra\n3. Transport extra'
    };
  }

  function createBlankCompanyInfo(email = '', phone = '') {
    return {
      name: '',
      gstin: '',
      pan: '',
      stateCode: '24',
      stateName: 'Gujarat',
      city: '',
      email: email || '',
      phone: phone || '',
      address: '',
      bankName: '',
      bankAccount: '',
      bankBranchIfsc: '',
      bankType: 'Current Account',
      invoicePrefix: 'INV001/2026-2027',
      quotePrefix: 'QTN/2026-2027/',
      defaultGst: '18',
      terms: '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days\n2. 18% GST extra\n3. Transport extra'
    };
  }

  const SAMPLE_DEMO_USER_ID = 'usr-sample-demo';

  function hasCompanySetup(user) {
    if (!user) return false;
    if (user.companySetupComplete === true) return true;
    const name = String(user.companyInfo?.name || '').trim();
    return name.length > 0;
  }

  // Accounts live in Supabase Auth; IFCloud keeps the signed-in user in memory.
  function readCompanyEmailBackups() { return {}; }
  function getCompanyEmailBackup() { return null; }
  function saveCompanyEmailBackup() { /* data is stored in Supabase now */ }
  function migrateScopedStorageKeys() { /* not needed any more */ }
  function mergeCompanyInfoObjects(primary, fallback, email = '', phone = '') {
    return { ...createBlankCompanyInfo(email, phone), ...(fallback || {}), ...(primary || {}) };
  }
  function findBestAccountByEmail() { return null; }

  function getAccounts() {
    const u = getCurrentUser();
    return u ? [u] : [];
  }

  function saveAccounts() { /* accounts are managed by Supabase Auth */ }

  function getActiveSession() {
    const u = window.IFCloud.getUser();
    return u ? { userId: u.id, email: u.email } : null;
  }

  function getCurrentUser() {
    const u = window.IFCloud.getUser();
    if (!u) return null;
    if (!u.companyInfo) u.companyInfo = createBlankCompanyInfo(u.email, u.phone);
    return u;
  }

  function syncActiveUserCache(user) {
    if (!user) return;
    try {
      localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(user.companyInfo || createBlankCompanyInfo(user.email, user.phone)));
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      if (user.companyLogo) localStorage.setItem(COMPANY_LOGO_KEY, user.companyLogo);
      else localStorage.removeItem(COMPANY_LOGO_KEY);

      if (user.companySignature) localStorage.setItem(COMPANY_SIGNATURE_KEY, user.companySignature);
      else localStorage.removeItem(COMPANY_SIGNATURE_KEY);

      if (user.adminAvatar) localStorage.setItem(ADMIN_AVATAR_KEY, user.adminAvatar);
      else localStorage.removeItem(ADMIN_AVATAR_KEY);
    } catch (err) {
      // Local image cache is optional; Supabase holds the real copy.
    }
  }

  function updateCurrentUser(mutator) {
    const current = getCurrentUser();
    if (!current) return null;
    const updated = mutator({ ...current });
    if (!updated.companySetupComplete && hasCompanySetup(updated)) {
      updated.companySetupComplete = true;
    }
    window.IFCloud.setUser(updated);
    syncActiveUserCache(updated);
    return updated;
  }

  function setSessionForUser(user) {
    if (!user) return;
    syncActiveUserCache(user);
  }

  function clearSession() {
    try {
      localStorage.removeItem(COMPANY_INFO_KEY);
      localStorage.removeItem(ADMIN_INFO_KEY);
      localStorage.removeItem(COMPANY_LOGO_KEY);
      localStorage.removeItem(COMPANY_SIGNATURE_KEY);
      localStorage.removeItem(ADMIN_AVATAR_KEY);
    } catch (err) { /* ignore */ }
  }

  function getScopedStorageKey(baseKey) {
    const user = getCurrentUser();
    if (!user) return `${baseKey}_anon`;
    return `${baseKey}_${user.id}`;
  }

  function isPublicAuthPage() {
    const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return page === '' || page === 'index.html' || page === 'index' || page === 'register.html' || page === 'register' || page === '404.html' || page === '404';
  }

  function enforceAuthGuard() {
    if (isPublicAuthPage()) return true;
    let user = getCurrentUser();
    if (!user) {
      clearSession();
      window.location.replace('index.html');
      return false;
    }
    if (!user.companySetupComplete) {
      const emailBackup = getCompanyEmailBackup(user.email);
      if (hasCompanySetup(user)) {
        user = updateCurrentUser((u) => ({ ...u, companySetupComplete: true })) || user;
      } else if (emailBackup && (emailBackup.companySetupComplete || String(emailBackup.companyInfo?.name || '').trim())) {
        user = updateCurrentUser((u) => ({
          ...u,
          companySetupComplete: true,
          companyInfo: mergeCompanyInfoObjects(u.companyInfo, emailBackup.companyInfo, u.email, u.phone),
          companyLogo: u.companyLogo || emailBackup.companyLogo || null,
          companySignature: u.companySignature || emailBackup.companySignature || null,
          adminAvatar: u.adminAvatar || emailBackup.adminAvatar || null
        })) || user;
      }
    }
    const page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!hasCompanySetup(user) && !page.includes('company-settings')) {
      window.location.replace('company-settings.html?onboarding=1');
      return false;
    }
    syncActiveUserCache(user);
    return true;
  }

  // Immediate guard before rendering protected page content
  const canProceedRender = enforceAuthGuard();

  // Global delegated logout handler (Sidebar Logout & Popover Sign Out)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.logout-link, [data-logout], .ios-popover a[href="index.html"]');
    if (target) {
      e.preventDefault();
      clearSession();
      window.IFCloud.signOut().then(() => window.location.replace('index.html'));
    }
  });

  /* --------------------------------------------------------------------------
     2C. Customers, Invoices, Payments & Plan Limits Ledger Engine (from minorpjc)
     -------------------------------------------------------------------------- */
  function getUserPlan() {
    const user = getCurrentUser();
    const key = user && user.plan && PLAN_LIMITS[user.plan] ? user.plan : (user && user.id === SAMPLE_DEMO_USER_ID ? 'Enterprise' : 'Free');
    return { key, ...PLAN_LIMITS[key] };
  }

  function getDefaultDemoCustomers() {
    return [
      { id: '1', contactName: 'Abhishek Sharma', role: 'Billing Contact', name: 'Acme Corporation', email: 'billing@acme.com', phone: '9876543210', gstin: '27AAAAA1111A1Z1', pan: 'AAAAA1111A', state: 'Maharashtra', code: '27', city: 'Mumbai', address: '402, Trade Centre, Bandra Kurla Complex, Mumbai, MH - 400051', zip: '400051', status: 'Active' },
      { id: '2', contactName: 'Meera Nair', role: 'Procurement Officer', name: 'TechSolutions Group', email: 'finance@techsolutions.com', phone: '9123456789', gstin: '27BBBBB2222B2Z2', pan: 'BBBBB2222B', state: 'Maharashtra', code: '27', city: 'Pune', address: 'Tech Park Tower B, Pune, MH - 411001', zip: '411001', status: 'Active' },
      { id: '3', contactName: 'Rajesh Patel', role: 'Director', name: 'Apex Labs India', email: 'accounts@apexlabs.in', phone: '9345678901', gstin: '29CCCCC3333C3Z3', pan: 'CCCCC3333C', state: 'Karnataka', code: '29', city: 'Bengaluru', address: 'Indiranagar 100ft Rd, Bengaluru, KA - 560038', zip: '560038', status: 'Active' },
      { id: '4', contactName: 'Karan Johar', role: 'Accounts Lead', name: 'Innovative Media Labs', email: 'billing@innovativemedia.com', phone: '9456789012', gstin: '07DDDDD4444D4Z4', pan: 'DDDDD4444D', state: 'Delhi', code: '07', city: 'New Delhi', address: 'Connaught Place, Block C, New Delhi - 110001', zip: '110001', status: 'Active' },
      { id: '5', contactName: 'Neha Patel', role: 'Finance Head', name: 'Vertex Media', email: 'payments@vertexmedia.net', phone: '9567890123', gstin: '24EEEEE5555E5Z5', pan: 'EEEEE5555E', state: 'Gujarat', code: '24', city: 'Surat', address: 'Ring Road, Industrial Hub, Surat, GJ - 395002', zip: '395002', status: 'Active' }
    ];
  }

  function getDefaultDemoInvoices() {
    return [
      {
        id: '005',
        docType: 'tax',
        invNo: 'AE001/2026-2027',
        issueDate: '2026-07-20',
        dueDate: '2026-08-04',
        terms: '50% advance, balance against delivery',
        poNo: 'PO-9982',
        poDate: '18.07.2026',
        vehicleNo: 'GJ-15-XX-1234',
        ewayNo: '-',
        buyerId: '1',
        buyer: { name: 'Acme Corporation', email: 'billing@acme.com', gstin: '27AAAAA1111A1Z1', state: 'Maharashtra', code: '27', city: 'Mumbai', address: '402, Trade Centre, Bandra Kurla Complex, Mumbai, MH - 400051', contact: 'Abhishek Sharma (+91 9876543210)' },
        rows: [
          { desc: 'S.S. 316 BUCKET\nPrecision fabricated stainless steel industrial hopper unit', hsn: '72199011', qty: 10, rate: 4000, gst: 18 },
          { desc: 'HIGH-PRESSURE FLANGE KIT\nMachined CNC mounting bolts & gasket set', hsn: '730791', qty: 1, rate: 7627.12, gst: 18 }
        ],
        totalAmount: 56200,
        status: 'sent',
        requireSign: true
      },
      {
        id: '004',
        docType: 'tax',
        invNo: 'AE002/2026-2027',
        issueDate: '2026-07-18',
        dueDate: '2026-08-01',
        terms: 'Net 15 Days',
        poNo: 'PO-8840',
        poDate: '15.07.2026',
        vehicleNo: 'MH-04-AB-9921',
        ewayNo: '121000987654',
        buyerId: '2',
        buyer: { name: 'TechSolutions Group', email: 'finance@techsolutions.com', gstin: '27BBBBB2222B2Z2', state: 'Maharashtra', code: '27', city: 'Pune', address: 'Tech Park Tower B, Pune, MH - 411001', contact: 'Meera Nair (+91 9123456789)' },
        rows: [
          { desc: 'CNC INDUSTRIAL MANIFOLD ASSEMBLY\nTurnkey automation panel & mounting rack', hsn: '848180', qty: 5, rate: 24491.53, gst: 18 }
        ],
        totalAmount: 144500,
        status: 'paid',
        requireSign: true
      },
      {
        id: '003',
        docType: 'tax',
        invNo: 'AE003/2026-2027',
        issueDate: '2026-07-15',
        dueDate: '2026-07-30',
        terms: '50% advance, balance against delivery',
        poNo: 'PO-7712',
        poDate: '12.07.2026',
        vehicleNo: '-',
        ewayNo: '-',
        buyerId: '3',
        buyer: { name: 'Apex Labs India', email: 'accounts@apexlabs.in', gstin: '29CCCCC3333C3Z3', state: 'Karnataka', code: '29', city: 'Bengaluru', address: 'Indiranagar 100ft Rd, Bengaluru, KA - 560038', contact: 'Rajesh Patel (+91 9345678901)' },
        rows: [
          { desc: 'PNEUMATIC CONTROL VALVE UNIT\nSS-316 tested assembly with calibration certificate', hsn: '848190', qty: 10, rate: 6983.05, gst: 18 }
        ],
        totalAmount: 82400,
        status: 'partial',
        requireSign: true
      },
      {
        id: '002',
        docType: 'tax',
        invNo: 'AE004/2026-2027',
        issueDate: '2026-07-10',
        dueDate: '2026-07-24',
        terms: 'Net 15 Days',
        poNo: '-',
        poDate: '-',
        vehicleNo: '-',
        ewayNo: '-',
        buyerId: '4',
        buyer: { name: 'Innovative Media Labs', email: 'billing@innovativemedia.com', gstin: '07DDDDD4444D4Z4', state: 'Delhi', code: '07', city: 'New Delhi', address: 'Connaught Place, Block C, New Delhi - 110001', contact: 'Karan Johar (+91 9456789012)' },
        rows: [
          { desc: 'CUSTOM FABRICATED ENCLOSURE\nPowder coated steel chassis', hsn: '853710', qty: 10, rate: 15677.97, gst: 18 }
        ],
        totalAmount: 185000,
        status: 'draft',
        requireSign: true
      },
      {
        id: '001',
        docType: 'tax',
        invNo: 'AE005/2026-2027',
        issueDate: '2026-07-01',
        dueDate: '2026-07-15',
        terms: 'Due on Receipt',
        poNo: '-',
        poDate: '-',
        vehicleNo: '-',
        ewayNo: '-',
        buyerId: '5',
        buyer: { name: 'Vertex Media', email: 'payments@vertexmedia.net', gstin: '24EEEEE5555E5Z5', state: 'Gujarat', code: '24', city: 'Surat', address: 'Ring Road, Industrial Hub, Surat, GJ - 395002', contact: 'Neha Patel (+91 9567890123)' },
        rows: [
          { desc: 'S.S. 316 SUPPORT BRACKETS\nHeavy-duty laser cut industrial brackets', hsn: '730890', qty: 4, rate: 2711.86, gst: 18 }
        ],
        totalAmount: 12800,
        status: 'overdue',
        requireSign: true
      }
    ];
  }

  function getDefaultDemoPayments() {
    return [
      { id: 'pay-1', invoiceId: '004', amount: 144500, paidOn: '2026-07-19', method: 'Bank transfer', note: 'Full NEFT settlement' },
      { id: 'pay-2', invoiceId: '003', amount: 41200, paidOn: '2026-07-15', method: 'UPI', note: '50% advance at billing' }
    ];
  }

  function loadCustomers() {
    return window.IFCloud.getData('customers');
  }

  function saveCustomers(list) {
    window.IFCloud.setData('customers', list);
  }

  function loadInvoices() {
    return window.IFCloud.getData('invoices');
  }

  function saveInvoices(list) {
    window.IFCloud.setData('invoices', list);
  }

  function loadPayments() {
    return window.IFCloud.getData('payments');
  }

  function savePayments(list) {
    window.IFCloud.setData('payments', list);
  }

  function computeInvoiceTotals(inv) {
    let subtotal = 0;
    let totalTax = 0;
    (inv.rows || []).forEach((r) => {
      const val = (Number(r.qty) || 0) * (Number(r.rate) || 0);
      subtotal += val;
      totalTax += val * ((Number(r.gst ?? 18)) / 100);
    });
    const computed = Math.round((subtotal + totalTax) * 100) / 100;
    const hasExplicit = inv.totalAmount !== undefined && inv.totalAmount !== null && inv.totalAmount !== '';
    const grand = hasExplicit ? Number(inv.totalAmount) : computed;
    return { subtotal, totalTax, grand: isNaN(grand) ? computed : grand };
  }

  function getInvoicePaidTotal(invoiceId) {
    return loadPayments()
      .filter((p) => String(p.invoiceId) === String(invoiceId))
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }

  function computePaymentState(inv, paidOverride = null) {
    const total = Number(computeInvoiceTotals(inv).grand || 0);
    const paid = paidOverride !== null ? Number(paidOverride) : getInvoicePaidTotal(inv.id);
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
    const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : (paid > 0 ? 100 : 0);
    const todayIso = new Date().toISOString().slice(0, 10);
    const overdue = Boolean(inv.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(inv.dueDate) && inv.dueDate < todayIso && balance > 0.01);

    let key = 'unpaid';
    let label = overdue ? 'Overdue' : 'Payment pending';
    let badgeClass = overdue ? 'overdue' : 'sent';

    if (inv.status === 'draft' && paid <= 0.01) {
      key = 'draft';
      label = 'Draft';
      badgeClass = 'draft';
    } else if (total > 0 && balance <= 0.01) {
      key = 'paid';
      label = 'Paid';
      badgeClass = 'paid';
    } else if (paid <= 0.01) {
      key = 'unpaid';
      label = overdue ? 'Overdue' : 'Payment pending';
      badgeClass = overdue ? 'overdue' : 'sent';
    } else if (percent >= 45 && percent <= 55) {
      key = 'advance';
      label = `${percent}% advance`;
      badgeClass = 'partial';
    } else {
      key = 'partial';
      label = `${percent}% received`;
      badgeClass = 'partial';
    }

    return { key, label, badgeClass, total, paid, balance, percent, overdue };
  }

  function getFinancialYearLabel(dateStr = null) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const valid = !isNaN(d.getTime()) ? d : new Date();
    const y = valid.getFullYear();
    const m = valid.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }

  function computeNextInvoiceNo(companyName, invoices = null) {
    const words = String(companyName || '').trim().split(/\s+/).filter(Boolean);
    let prefix = words.map((w) => w.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase()).join('');
    if (!prefix) prefix = 'INV';
    prefix = prefix.slice(0, 3);
    const fy = getFinancialYearLabel();
    const list = invoices || loadInvoices();
    let maxSeq = 0;
    list.forEach((inv) => {
      const no = String(inv.invNo || '');
      if (no.startsWith(prefix) && no.includes(fy)) {
        const match = no.match(/(\d+)/);
        if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
      }
    });
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}/${fy}`;
  }

  function getMissingCompanyFields(compInfo) {
    const req = [
      ['name', 'Company Legal Name'],
      ['gstin', 'GSTIN'],
      ['pan', 'PAN Number'],
      ['address', 'Registered Address'],
      ['phone', 'Mobile Number'],
      ['email', 'Business Email'],
      ['bankName', 'Bank Name'],
      ['bankAccount', 'Account Number'],
      ['bankBranchIfsc', 'Branch & IFSC Code']
    ];
    return req.filter(([k]) => !String(compInfo[k] || '').trim()).map(([, label]) => label);
  }

  function openRecordPaymentModal(invoiceId, onUpdated = null) {
    const inv = loadInvoices().find((x) => String(x.id) === String(invoiceId));
    if (!inv) {
      toast('Invoice not found', 'warning');
      return;
    }

    const existing = document.querySelector('.ios-sheet-backdrop[data-pay-modal="1"]');
    if (existing) existing.remove();

    const state = computePaymentState(inv);
    const history = loadPayments()
      .filter((p) => String(p.invoiceId) === String(inv.id))
      .sort((a, b) => String(b.paidOn || '').localeCompare(String(a.paidOn || '')));
    const todayIso = new Date().toISOString().slice(0, 10);

    const backdrop = document.createElement('div');
    backdrop.className = 'ios-sheet-backdrop';
    backdrop.setAttribute('data-pay-modal', '1');
    backdrop.innerHTML = `
      <div class="ios-sheet-modal" role="dialog" aria-modal="true" style="max-width:520px;max-height:90vh;overflow-y:auto;">
        <div class="ios-sheet-title">${state.balance > 0.01 ? 'Record Payment' : 'Payment History'}</div>
        <div class="ios-sheet-msg" style="margin-bottom:14px;">${escapeHtml(inv.invNo)} · ${escapeHtml(inv.buyer?.name || 'Client')}</div>

        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:16px;">
          <div style="padding:10px 12px;border-radius:12px;background:var(--bg-app);border:1px solid var(--border);text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Amount</div>
            <div class="col-mono" style="font-size:0.95rem;font-weight:700;margin-top:2px;">${formatINR(state.total)}</div>
          </div>
          <div style="padding:10px 12px;border-radius:12px;background:var(--bg-app);border:1px solid var(--border);text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Received</div>
            <div class="col-mono" style="font-size:0.95rem;font-weight:700;color:var(--success);margin-top:2px;">${formatINR(state.paid)}</div>
          </div>
          <div style="padding:10px 12px;border-radius:12px;background:var(--bg-app);border:1px solid var(--border);text-align:center;">
            <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Balance</div>
            <div class="col-mono" style="font-size:0.95rem;font-weight:700;color:var(--danger);margin-top:2px;">${formatINR(state.balance)}</div>
          </div>
        </div>

        ${state.balance > 0.01 ? `
          <form id="ios-pay-form" style="display:flex;flex-direction:column;gap:12px;">
            <div class="form-group">
              <label class="form-label" for="pm-amount">Amount Received (₹)</label>
              <input id="pm-amount" type="number" step="0.01" min="0.01" max="${state.balance.toFixed(2)}" class="form-control col-mono" value="${state.balance.toFixed(2)}" required>
              <div class="btn-group" style="margin-top:8px;">
                <button type="button" class="btn btn-secondary btn-sm" data-fill-pct="0.5">50% advance</button>
                <button type="button" class="btn btn-secondary btn-sm" data-fill-pct="0.25">25%</button>
                <button type="button" class="btn btn-secondary btn-sm" data-fill-full="1">Full balance</button>
              </div>
            </div>
            <div class="form-grid" style="gap:10px;">
              <div class="form-group">
                <label class="form-label" for="pm-date">Received On</label>
                <input id="pm-date" type="date" class="form-control" value="${todayIso}" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="pm-method">Method</label>
                <select id="pm-method" class="form-select">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="pm-note">Note</label>
              <input id="pm-note" type="text" class="form-control" placeholder="Advance against delivery, cheque number, etc.">
            </div>
            <div class="ios-sheet-actions" style="margin-top:4px;">
              <button type="button" class="btn btn-secondary" data-pm-close="1">Close</button>
              <button type="submit" class="btn btn-primary">Save Payment</button>
            </div>
          </form>
        ` : `
          <div class="ios-sheet-actions" style="margin-bottom:8px;">
            <button type="button" class="btn btn-secondary" style="flex:1;" data-pm-close="1">Close</button>
          </div>
        `}

        ${history.length ? `
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;">Already Received</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${history.map((p) => `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-app);border:1px solid var(--border);border-radius:12px;">
                  <div>
                    <div style="font-weight:700;font-size:0.875rem;">${formatINR(p.amount)} · ${escapeHtml(p.method || 'UPI')}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(formatDisplayDate(p.paidOn))}${p.note ? ` · ${escapeHtml(p.note)}` : ''}</div>
                  </div>
                  <button type="button" class="btn btn-secondary btn-sm" style="color:var(--danger);" data-pm-undo="${escapeHtml(p.id)}">Undo</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));

    const close = () => {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 220);
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-pm-close]')) close();
    });

    const amtEl = backdrop.querySelector('#pm-amount');
    backdrop.querySelectorAll('[data-fill-pct]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pct = parseFloat(btn.getAttribute('data-fill-pct')) || 0.5;
        if (amtEl) amtEl.value = Math.min(state.balance, Math.round(state.total * pct * 100) / 100).toFixed(2);
      });
    });
    const fullBtn = backdrop.querySelector('[data-fill-full]');
    if (fullBtn && amtEl) {
      fullBtn.addEventListener('click', () => {
        amtEl.value = state.balance.toFixed(2);
      });
    }

    const payForm = backdrop.querySelector('#ios-pay-form');
    if (payForm) {
      payForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amt = Math.round((parseFloat(amtEl?.value || '0') || 0) * 100) / 100;
        if (amt <= 0) {
          toast('Enter an amount greater than zero', 'warning');
          return;
        }
        if (amt > state.balance + 0.01) {
          toast(`Amount exceeds remaining ${formatINR(state.balance)}`, 'warning');
          return;
        }
        const paidOn = backdrop.querySelector('#pm-date')?.value || todayIso;
        const method = backdrop.querySelector('#pm-method')?.value || 'UPI';
        const note = backdrop.querySelector('#pm-note')?.value.trim() || '';

        const payments = loadPayments();
        payments.unshift({
          id: window.IFCloud.uuid(),
          invoiceId: inv.id,
          amount: amt,
          paidOn,
          method,
          note
        });
        savePayments(payments);

        const newPaid = getInvoicePaidTotal(inv.id);
        const newStatus = newPaid >= state.total - 0.01 ? 'paid' : (newPaid > 0.01 ? 'partial' : 'sent');
        const invoices = loadInvoices();
        const iIdx = invoices.findIndex((x) => String(x.id) === String(inv.id));
        if (iIdx >= 0) {
          invoices[iIdx].status = newStatus;
          saveInvoices(invoices);
        }

        close();
        toast(`${formatINR(amt)} recorded against ${inv.invNo}`, 'success');
        sendRealAppNotification({
          title: `Payment Received · #${inv.invNo}`,
          body: `${inv.buyer?.name || 'Client'} settled ${formatINR(amt)} (${method})`,
          url: `/invoice-view.html?id=${encodeURIComponent(inv.id)}`,
          tag: `pay-${inv.id}`
        });
        if (typeof onUpdated === 'function') onUpdated();
      });
    }

    backdrop.querySelectorAll('[data-pm-undo]').forEach((undoBtn) => {
      undoBtn.addEventListener('click', () => {
        const pid = undoBtn.getAttribute('data-pm-undo');
        const remaining = loadPayments().filter((p) => String(p.id) !== String(pid));
        savePayments(remaining);
        const newPaid = getInvoicePaidTotal(inv.id);
        const newStatus = newPaid >= state.total - 0.01 ? 'paid' : (newPaid > 0.01 ? 'partial' : 'sent');
        const invoices = loadInvoices();
        const iIdx = invoices.findIndex((x) => String(x.id) === String(inv.id));
        if (iIdx >= 0) {
          invoices[iIdx].status = newStatus;
          saveInvoices(invoices);
        }
        close();
        toast('Payment entry removed', 'info');
        if (typeof onUpdated === 'function') onUpdated();
      });
    });
  }

  function ensureSidebarNavLinks() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const path = (window.location.pathname.split('/').pop() || '').toLowerCase();

    if (!nav.querySelector('a[href="payments.html"]')) {
      const invLink = nav.querySelector('a[href="invoice-list.html"]');
      const payEl = document.createElement('a');
      payEl.href = 'payments.html';
      payEl.className = `nav-link${path.includes('payments') ? ' active' : ''}`;
      payEl.innerHTML = `
        <span class="nav-link-icon"><svg class="icon-svg" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></span>
        <span class="nav-link-text">Payments</span>
      `;
      if (invLink) invLink.insertAdjacentElement('afterend', payEl);
      else nav.appendChild(payEl);
    }

    if (!nav.querySelector('a[href="plans.html"]')) {
      const settingsLink = nav.querySelector('a[href="company-settings.html"]');
      const planEl = document.createElement('a');
      planEl.href = 'plans.html';
      planEl.className = `nav-link${path.includes('plans') ? ' active' : ''}`;
      planEl.innerHTML = `
        <span class="nav-link-icon"><svg class="icon-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
        <span class="nav-link-text">Plans</span>
      `;
      if (settingsLink) settingsLink.insertAdjacentElement('afterend', planEl);
      else nav.appendChild(planEl);
    }
  }

  /* --------------------------------------------------------------------------
     3. DOM Ready Initialization
     -------------------------------------------------------------------------- */
  function onDomReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onDomReady(() => {
    if (!canProceedRender) return;
    try {
    ensureSidebarNavLinks();
    injectTopbarThemeToggle();
    injectMobileTabbar();
    initBrandMediaAndIdentity();
    initPopovers();
    initSpotlightSearch();
    initDashboardPage();
    initCustomersModule();
    initInvoicesListModule();
    initListFiltering();
    initDeleteActions();
    initSelectAllCheckboxes();
    initPaginationButtons();
    initQuotationsModule();
    initInvoiceBuilder();
    initInvoicePreviewHydration();
    initInvoiceViewActions();
    initPaymentsModule();
    initPlansModule();
    initReportsModule();
    initCustomerValidation();
    initSignatureUpload();
    initSettingsAndProfileForms();
    initBillBook();
    initHelpModule();
    initAuthPages();
    initMobileTableLabels();
    initRealNotifications();
    } finally {
      document.documentElement.classList.remove('if-loading');
    }
  });

  /* --------------------------------------------------------------------------
     3B. Real App Device Notifications (via Service Worker & Notification API)
     -------------------------------------------------------------------------- */
  let swRegistrationPromise = null;

  function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    if (!swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => null);
    }
    return swRegistrationPromise;
  }

  async function sendRealAppNotification({ title, body, url = '/dashboard.html', tag = 'invoiceflex-alert' }) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
      const reg = await ensureServiceWorker();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/assets/icons/pwa-192x192.png',
          badge: '/assets/icons/pwa-192x192.png',
          tag,
          vibrate: [120, 60, 120],
          data: { url }
        });
        return true;
      }
      const n = new Notification(title, {
        body,
        icon: '/assets/icons/pwa-192x192.png',
        tag
      });
      n.onclick = () => {
        window.focus();
        if (url) window.location.href = url;
      };
      return true;
    } catch {
      return false;
    }
  }

  async function enableRealAppNotifications(sendTest = false) {
    if (!('Notification' in window)) {
      toast('System notifications are not supported in this browser', 'warning');
      return false;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      toast('Notifications blocked in browser settings — please allow Notifications for this site', 'warning');
      return false;
    }
    await ensureServiceWorker();
    if (sendTest) {
      const ok = await sendRealAppNotification({
        title: 'InvoiceFlex Alerts Enabled',
        body: 'You will receive real device notifications for new invoices, payments & overdue alerts.',
        url: '/dashboard.html',
        tag: 'invoiceflex-welcome'
      });
      if (ok) toast('Real notification sent to your device!', 'success');
    } else {
      toast('Real app notifications enabled', 'success');
    }
    document.dispatchEvent(new CustomEvent('invoiceflex:notif-perm-changed'));
    return true;
  }

  function initRealNotifications() {
    ensureServiceWorker();

    // Daily overdue invoice alert via real system notification when permitted
    if ('Notification' in window && Notification.permission === 'granted' && getCurrentUser()) {
      const todayIso = new Date().toISOString().slice(0, 10);
      const alertKey = getScopedStorageKey('invoiceflex_overdue_notified_day');
      if (localStorage.getItem(alertKey) !== todayIso) {
        const overdueList = loadInvoices().filter((inv) => computePaymentState(inv).overdue);
        if (overdueList.length > 0) {
          const first = overdueList[0];
          const pState = computePaymentState(first);
          sendRealAppNotification({
            title: `${overdueList.length} Overdue Invoice${overdueList.length > 1 ? 's' : ''}`,
            body: `#${first.invNo} (${first.buyer?.name || 'Client'}) · ${formatINR(pState.balance)} pending`,
            url: `/invoice-view.html?id=${encodeURIComponent(first.id)}`,
            tag: `overdue-${todayIso}`
          });
          localStorage.setItem(alertKey, todayIso);
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     4. Topbar Appearance Button, Mobile iPhone Tab Bar & Table Card Labels
     -------------------------------------------------------------------------- */
  function injectTopbarThemeToggle() {
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight && !topbarRight.querySelector('.theme-toggle-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topbar-icon-btn theme-toggle-btn';
      btn.addEventListener('click', toggleTheme);
      const bell = topbarRight.querySelector('.notification-bell');
      if (bell) {
        topbarRight.insertBefore(btn, bell);
      } else {
        topbarRight.prepend(btn);
      }
      updateThemeIcons(getPreferredTheme());
    }

    const previewActions = document.querySelector('.actions-panel-right');
    if (previewActions && !previewActions.querySelector('.theme-toggle-btn')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'topbar-icon-btn theme-toggle-btn';
      btn.addEventListener('click', toggleTheme);
      previewActions.prepend(btn);
      updateThemeIcons(getPreferredTheme());
    }
  }

  function injectMobileTabbar() {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer || document.querySelector('.mobile-tabbar')) return;

    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    const isDashboard = path === 'dashboard.html' || path === 'dashboard';
    const isCustomers = path.includes('customer');
    const isInvoices = path.includes('invoice') || path.includes('quotation') || path.includes('payment');
    const isBillBook = path.includes('bill-book');
    const isSettings = path.includes('settings') || path.includes('profile') || path.includes('help') || path.includes('reports') || path.includes('plans');

    const nav = document.createElement('nav');
    nav.className = 'mobile-tabbar no-print';
    nav.setAttribute('aria-label', 'Mobile Navigation');
    nav.innerHTML = `
      <a href="dashboard.html" class="mobile-tab-item ${isDashboard ? 'active' : ''}">
        <svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        <span>Home</span>
      </a>
      <a href="customers.html" class="mobile-tab-item ${isCustomers ? 'active' : ''}">
        <svg class="icon-svg" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>Clients</span>
      </a>
      <a href="invoice-list.html" class="mobile-tab-item ${isInvoices ? 'active' : ''}">
        <svg class="icon-svg" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span>Invoices</span>
      </a>
      <a href="bill-book.html" class="mobile-tab-item ${isBillBook ? 'active' : ''}">
        <svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span>Bill Book</span>
      </a>
      <a href="company-settings.html" class="mobile-tab-item ${isSettings ? 'active' : ''}">
        <svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>Settings</span>
      </a>
    `;
    appContainer.appendChild(nav);
  }

  function applyTableLabels(table) {
    if (!table || table.classList.contains('invoice-items-table')) return;
    const headers = Array.from(table.querySelectorAll('thead th')).map((th, idx, arr) => {
      const txt = th.textContent.trim();
      if (txt) return txt;
      if (idx === arr.length - 1) return 'Action';
      return '';
    });
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cells = Array.from(tr.children);
      cells.forEach((td, idx) => {
        if (td.hasAttribute('colspan')) return;
        const label = headers[idx] || '';
        if (label) td.setAttribute('data-label', label);
      });
    });
  }

  function initMobileTableLabels() {
    document.querySelectorAll('table.enterprise-table').forEach(applyTableLabels);
  }

  /* --------------------------------------------------------------------------
     4B. Fast Cached Storage, Company Logo, Admin Avatar & Identity Persistence
     -------------------------------------------------------------------------- */
  const __jsonReadCache = new Map();
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', () => __jsonReadCache.clear());
  }

  // Load Google Fonts non-blockingly so first paint is instant
  (function loadFontsAsync() {
    if (typeof document === 'undefined' || document.getElementById('if-async-fonts')) return;
    const link = document.createElement('link');
    link.id = 'if-async-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    link.media = 'print';
    link.onload = () => { link.media = 'all'; };
    document.head.appendChild(link);
  })();

  function readSavedJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const cached = __jsonReadCache.get(key);
      let parsed;
      if (cached && cached.raw === raw) {
        parsed = cached.value;
      } else {
        parsed = JSON.parse(raw);
        __jsonReadCache.set(key, { raw, value: parsed });
      }
      return Array.isArray(parsed) ? [...parsed] : parsed;
    } catch {
      return fallback;
    }
  }

  function compressImageFile(file, maxDim = 360) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => resolve(ev.target.result);
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(mime, 0.88));
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function getDefaultCompanyInfo() {
    const user = getCurrentUser();
    if (user && user.id === SAMPLE_DEMO_USER_ID) {
      return getDemoCompanyInfo();
    }
    return createBlankCompanyInfo(user ? user.email : '', user ? user.phone : '');
  }

  function getCompanyInfo() {
    const user = getCurrentUser();
    if (user && user.companyInfo && user.companyInfo.name) {
      return { ...createBlankCompanyInfo(user.email, user.phone), ...user.companyInfo };
    }
    if (user && user.id === SAMPLE_DEMO_USER_ID) {
      return getDemoCompanyInfo();
    }
    return createBlankCompanyInfo(user ? user.email : '', user ? user.phone : '');
  }

  function getAdminInfo() {
    const user = getCurrentUser();
    if (user) {
      return {
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      };
    }
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    };
  }

  function getInitials(name, fallback = 'IF') {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return fallback;
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function hydrateGlobalAvatarsAndLogos() {
    const user = getCurrentUser();
    const adminAvatar = user ? user.adminAvatar : localStorage.getItem(ADMIN_AVATAR_KEY);
    const adminInfo = getAdminInfo();
    const adminFullName = `${adminInfo.firstName} ${adminInfo.lastName}`.trim() || 'Administrator';
    const adminInitials = getInitials(adminFullName, 'IF');

    document.querySelectorAll('.topbar .avatar').forEach((el) => {
      if (adminAvatar) {
        el.innerHTML = `<img src="${adminAvatar}" alt="${escapeHtml(adminFullName)}">`;
      } else {
        el.textContent = adminInitials;
      }
    });

    document.querySelectorAll('.topbar .user-name').forEach((el) => {
      el.textContent = adminFullName;
    });

    const companyLogo = user ? user.companyLogo : localStorage.getItem(COMPANY_LOGO_KEY);
    const companyInfo = getCompanyInfo();
    const displayCompanyName = companyInfo.name || 'Your Business';
    const companyInitials = getInitials(companyInfo.name || adminFullName, 'IF');

    const compLogoPrev = document.getElementById('company-logo-preview');
    if (compLogoPrev) {
      if (companyLogo) {
        compLogoPrev.innerHTML = `<img src="${companyLogo}" alt="${escapeHtml(displayCompanyName)}">`;
      } else {
        compLogoPrev.textContent = companyInitials;
      }
    }

    const adminPrev = document.getElementById('admin-avatar-preview');
    if (adminPrev) {
      if (adminAvatar) {
        adminPrev.innerHTML = `<img src="${adminAvatar}" alt="${escapeHtml(adminFullName)}">`;
      } else {
        adminPrev.textContent = adminInitials;
      }
    }

    document.querySelectorAll('[data-company-logo-slot]').forEach((slot) => {
      if (companyLogo) {
        slot.innerHTML = `<img src="${companyLogo}" alt="${escapeHtml(displayCompanyName)}">`;
      } else {
        slot.textContent = companyInitials;
      }
    });

    const previewBrand = document.getElementById('preview-company-brand');
    if (previewBrand) {
      if (companyLogo) {
        previewBrand.innerHTML = `
          <img src="${companyLogo}" alt="${escapeHtml(displayCompanyName)}" class="invoice-company-logo-img">
          <span>${escapeHtml(displayCompanyName)}</span>
        `;
      } else {
        previewBrand.innerHTML = `
          <div class="invoice-logo-dot"></div>
          <span>${escapeHtml(displayCompanyName)}</span>
        `;
      }
    }

    // Dynamic dashboard greeting
    const pagePath = window.location.pathname.toLowerCase();
    if (pagePath.includes('dashboard')) {
      const greetHeading = document.querySelector('.main-content h2');
      if (greetHeading && greetHeading.textContent.includes('Welcome back')) {
        greetHeading.textContent = `Welcome back, ${adminInfo.firstName || 'there'}!`;
        const sub = greetHeading.nextElementSibling;
        if (sub && sub.tagName === 'P') {
          sub.textContent = companyInfo.name
            ? `${companyInfo.name} · Here's an overview of your invoices & GST activity.`
            : `Complete your Business Setup anytime to customize invoices & quotations.`;
        }
      }
    }

    // Dynamic Help page contact form pre-fill
    if (pagePath.includes('help')) {
      const helpName = document.getElementById('help-name');
      const helpEmail = document.getElementById('help-email');
      if (helpName) helpName.value = adminFullName;
      if (helpEmail) helpEmail.value = adminInfo.email || '';
    }
  }

  function initBrandMediaAndIdentity() {
    hydrateGlobalAvatarsAndLogos();

    // Hydrate Business Setup (Company Settings) inputs
    const compNameEl = document.getElementById('comp-name');
    if (compNameEl) {
      const info = getCompanyInfo();
      const mapVal = {
        'comp-name': info.name || '',
        'comp-gstin': info.gstin || '',
        'comp-pan': info.pan || '',
        'comp-city': info.city || '',
        'comp-email': info.email || '',
        'comp-phone': info.phone || '',
        'comp-address': info.address || '',
        'bank-name': info.bankName || '',
        'bank-account': info.bankAccount || '',
        'bank-branch-ifsc': info.bankBranchIfsc || '',
        'bank-type': info.bankType || 'Current Account',
        'def-gst': info.defaultGst || '18',
        'prefix': info.invoicePrefix || computeNextInvoiceNo(info.name, loadInvoices()),
        'quote-prefix': info.quotePrefix || 'QTN/2026-2027/',
        'comp-terms': info.terms || ''
      };
      Object.entries(mapVal).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
      });
      const stateOriginEl = document.getElementById('state-origin');
      if (stateOriginEl && info.stateCode) {
        const targetPrefix = `${info.stateCode}|`;
        const opt = Array.from(stateOriginEl.options).find((o) => o.value.startsWith(targetPrefix));
        if (opt) stateOriginEl.value = opt.value;
      }
    }

    const uploadCompBtn = document.getElementById('btn-upload-company-logo');
    const resetCompBtn = document.getElementById('btn-reset-company-logo');
    if (uploadCompBtn) {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
      picker.style.display = 'none';
      uploadCompBtn.parentElement.appendChild(picker);

      uploadCompBtn.addEventListener('click', () => picker.click());
      picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;
        const dataUrl = await compressImageFile(file, 360);
        const updated = updateCurrentUser((u) => ({ ...u, companyLogo: dataUrl }));
        localStorage.setItem(COMPANY_LOGO_KEY, dataUrl);
        hydrateGlobalAvatarsAndLogos();
        if (updated && hasCompanySetup(updated) && window.__ifLegacyCloud?.saveCompany) {
          window.__ifLegacyCloud.saveCompany(updated.id, updated.companyInfo, { companyLogo: dataUrl }).catch(() => {});
        }
        toast('Company logo updated for profile & invoices', 'success');
      });
    }
    if (resetCompBtn) {
      resetCompBtn.addEventListener('click', () => {
        const updated = updateCurrentUser((u) => ({ ...u, companyLogo: null }));
        localStorage.removeItem(COMPANY_LOGO_KEY);
        hydrateGlobalAvatarsAndLogos();
        if (updated && hasCompanySetup(updated) && window.__ifLegacyCloud?.saveCompany) {
          window.__ifLegacyCloud.saveCompany(updated.id, updated.companyInfo, { companyLogo: null }).catch(() => {});
        }
        toast('Company logo reset to default monogram', 'info');
      });
    }

    // Hydrate Personal Profile inputs & uploader
    const firstNameEl = document.getElementById('first-name');
    if (firstNameEl) {
      const info = getAdminInfo();
      firstNameEl.value = info.firstName || '';
      const lastEl = document.getElementById('last-name');
      const emailEl = document.getElementById('admin-email');
      const telEl = document.getElementById('admin-tel');
      if (lastEl) lastEl.value = info.lastName || '';
      if (emailEl) emailEl.value = info.email || '';
      if (telEl) telEl.value = info.phone || '';
    }

    const uploadAdminBtn = document.getElementById('btn-upload-admin-avatar');
    const resetAdminBtn = document.getElementById('btn-reset-admin-avatar');
    if (uploadAdminBtn) {
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/png,image/jpeg,image/webp';
      picker.style.display = 'none';
      uploadAdminBtn.parentElement.appendChild(picker);

      uploadAdminBtn.addEventListener('click', () => picker.click());
      picker.addEventListener('change', async () => {
        const file = picker.files && picker.files[0];
        if (!file) return;
        const dataUrl = await compressImageFile(file, 320);
        updateCurrentUser((u) => ({ ...u, adminAvatar: dataUrl }));
        localStorage.setItem(ADMIN_AVATAR_KEY, dataUrl);
        hydrateGlobalAvatarsAndLogos();
        toast('Administrator profile photo updated', 'success');
      });
    }
    if (resetAdminBtn) {
      resetAdminBtn.addEventListener('click', () => {
        updateCurrentUser((u) => ({ ...u, adminAvatar: null }));
        localStorage.removeItem(ADMIN_AVATAR_KEY);
        hydrateGlobalAvatarsAndLogos();
        toast('Profile photo reset', 'info');
      });
    }
  }

  /* --------------------------------------------------------------------------
     5. Topbar Notification & Profile Popovers
     -------------------------------------------------------------------------- */
  function initPopovers() {
    const bell = document.querySelector('.notification-bell');
    const profileMenu = document.querySelector('.user-profile-menu');
    if (!bell && !profileMenu) return;

    const notifRead = localStorage.getItem(NOTIF_READ_KEY) === 'true';
    const dot = bell ? bell.querySelector('.notification-dot') : null;
    if (dot && notifRead) dot.classList.add('is-hidden');

    let notifPop = null;
    let profPop = null;

    if (bell) {
      const compInfo = getCompanyInfo();
      const missingFields = getMissingCompanyFields(compInfo);
      const invoices = loadInvoices();
      const payments = loadPayments();
      const notifItems = [];

      if (missingFields.length > 0) {
        notifItems.push({
          href: 'company-settings.html',
          dot: 'info',
          title: 'Complete Business & GST Setup',
          desc: `${missingFields.slice(0, 2).join(', ')}${missingFields.length > 2 ? ` +${missingFields.length - 2} more` : ''}`
        });
      }

      const sortedPayments = [...payments].sort((a, b) => String(b.paidOn || '').localeCompare(String(a.paidOn || '')));
      if (sortedPayments.length > 0) {
        const latestPay = sortedPayments[0];
        const pInv = invoices.find((x) => String(x.id) === String(latestPay.invoiceId));
        notifItems.push({
          href: pInv ? `invoice-view.html?id=${encodeURIComponent(pInv.id)}` : 'payments.html',
          dot: 'success',
          title: `Payment Received · ${pInv ? `#${pInv.invNo}` : (latestPay.method || 'Receipt')}`,
          desc: `${pInv?.buyer?.name || 'Client'} settled ${formatINR(latestPay.amount)}`
        });
      }

      const overdueInv = invoices.find((inv) => computePaymentState(inv).overdue);
      const pendingInv = overdueInv || invoices.find((inv) => computePaymentState(inv).balance > 0.01);
      if (pendingInv) {
        const pState = computePaymentState(pendingInv);
        notifItems.push({
          href: `invoice-view.html?id=${encodeURIComponent(pendingInv.id)}`,
          dot: pState.overdue ? 'danger' : 'warning',
          title: `${pState.overdue ? 'Invoice Overdue' : 'Payment Pending'} · #${pendingInv.invNo}`,
          desc: `${pendingInv.buyer?.name || 'Client'} · ${formatINR(pState.balance)} ${pendingInv.dueDate ? `due ${formatDisplayDate(pendingInv.dueDate)}` : 'balance'}`
        });
      }

      if (invoices.length > 0) {
        notifItems.push({
          href: 'reports.html',
          dot: 'info',
          title: 'GST & Cash-Flow Summary Ready',
          desc: `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} tracked in your ledger`
        });
      }

      if (dot && (notifRead || notifItems.length === 0)) {
        dot.classList.add('is-hidden');
      }

      const permSupported = 'Notification' in window;
      const permState = permSupported ? Notification.permission : 'unsupported';

      notifPop = document.createElement('div');
      notifPop.className = 'ios-popover';
      notifPop.innerHTML = `
        <div class="ios-popover-header">
          <span class="ios-popover-title">Notifications</span>
          ${notifItems.length ? '<button type="button" class="ios-popover-action" data-mark-read>Mark all read</button>' : ''}
        </div>
        ${permSupported ? `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--bg-app);">
            <div style="min-width:0;">
              <div style="font-size:0.76rem;font-weight:700;color:var(--text-main);" data-real-notif-status>
                ${permState === 'granted' ? 'Device Push Alerts: Active' : permState === 'denied' ? 'Device Alerts Blocked' : 'Enable Real Device Alerts'}
              </div>
              <div style="font-size:0.69rem;color:var(--text-muted);">Phone &amp; desktop system notifications</div>
            </div>
            <button type="button" class="btn btn-primary btn-sm" style="padding:5px 10px;font-size:0.72rem;white-space:nowrap;" data-enable-real-notif>
              ${permState === 'granted' ? 'Send Test' : 'Turn On'}
            </button>
          </div>
        ` : ''}
        ${notifItems.length
          ? notifItems.map((n) => `
            <a href="${n.href}" class="ios-popover-item">
              <span class="ios-toast-dot ${n.dot}" style="margin-top:6px;"></span>
              <div>
                <div style="font-size:0.8125rem;font-weight:600;color:var(--text-main);">${escapeHtml(n.title)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(n.desc)}</div>
              </div>
            </a>
          `).join('')
          : `<div style="padding:18px 16px;text-align:center;font-size:0.8125rem;color:var(--text-muted);">All caught up! New invoice and payment alerts will appear here.</div>`
        }
      `;
      document.body.appendChild(notifPop);

      const realNotifBtn = notifPop.querySelector('[data-enable-real-notif]');
      const realNotifStatus = notifPop.querySelector('[data-real-notif-status]');
      if (realNotifBtn) {
        const refreshNotifControl = () => {
          const p = 'Notification' in window ? Notification.permission : 'unsupported';
          if (realNotifStatus) {
            realNotifStatus.textContent = p === 'granted' ? 'Device Push Alerts: Active' : p === 'denied' ? 'Device Alerts Blocked' : 'Enable Real Device Alerts';
          }
          realNotifBtn.textContent = p === 'granted' ? 'Send Test' : 'Turn On';
        };
        realNotifBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await enableRealAppNotifications(true);
          refreshNotifControl();
        });
        document.addEventListener('invoiceflex:notif-perm-changed', refreshNotifControl);
      }

      const markReadBtn = notifPop.querySelector('[data-mark-read]');
      if (markReadBtn) {
        markReadBtn.addEventListener('click', () => {
          localStorage.setItem(NOTIF_READ_KEY, 'true');
          if (dot) dot.classList.add('is-hidden');
          notifPop.classList.remove('is-open');
          toast('All notifications marked as read', 'info');
        });
      }

      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (profPop) profPop.classList.remove('is-open');
        notifPop.classList.toggle('is-open');
      });
    }

    if (profileMenu) {
      const activeAdmin = getAdminInfo();
      const activeFullName = `${activeAdmin.firstName} ${activeAdmin.lastName}`.trim() || 'Administrator';
      profPop = document.createElement('div');
      profPop.className = 'ios-popover';
      profPop.style.width = '250px';
      profPop.innerHTML = `
        <div class="ios-popover-header">
          <div>
            <div style="font-size:0.85rem;font-weight:700;color:var(--text-main);">${escapeHtml(activeFullName)}</div>
            <div style="font-size:0.725rem;color:var(--text-muted);">${escapeHtml(activeAdmin.email || 'user@company.com')}</div>
          </div>
        </div>
        <a href="profile.html" class="ios-popover-item" style="align-items:center;">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span style="font-size:0.835rem;font-weight:600;">Personal Profile</span>
        </a>
        <a href="company-settings.html" class="ios-popover-item" style="align-items:center;">
          <svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span style="font-size:0.835rem;font-weight:600;">Business Setup</span>
        </a>
        <button type="button" class="ios-popover-item" style="width:100%;border:none;background:none;align-items:center;" data-pop-theme>
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <span style="font-size:0.835rem;font-weight:600;">Switch Appearance</span>
        </button>
        <div class="ios-popover-divider"></div>
        <a href="index.html" data-logout class="ios-popover-item" style="align-items:center;color:var(--danger);">
          <svg class="icon-svg" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span style="font-size:0.835rem;font-weight:600;">Sign Out</span>
        </a>
      `;
      document.body.appendChild(profPop);

      profPop.querySelector('[data-pop-theme]').addEventListener('click', () => {
        toggleTheme();
        profPop.classList.remove('is-open');
      });

      profileMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifPop) notifPop.classList.remove('is-open');
        profPop.classList.toggle('is-open');
      });
    }

    document.addEventListener('click', (e) => {
      if (notifPop && !notifPop.contains(e.target)) notifPop.classList.remove('is-open');
      if (profPop && !profPop.contains(e.target)) profPop.classList.remove('is-open');
    });
  }

  /* --------------------------------------------------------------------------
     6. Global Topbar Spotlight Quick-Jump Search
     -------------------------------------------------------------------------- */
  function initSpotlightSearch() {
    const topSearch = document.querySelector('.topbar .search-input');
    if (!topSearch) return;

    const baseNavItems = [
      { label: 'Dashboard Overview', meta: 'Page', href: 'dashboard.html' },
      { label: 'Quotations Ledger & Estimates', meta: 'Quotes', href: 'quotations.html' },
      { label: 'Create New Quotation', meta: 'Quotation', href: 'invoice-create.html?type=quotation' },
      { label: 'Create New Tax Invoice', meta: 'Invoice', href: 'invoice-create.html?type=tax' },
      { label: 'Create Delivery Challan', meta: 'Challan', href: 'invoice-create.html?type=challan' },
      { label: 'Record Raw Material Bill', meta: 'Purchase', href: 'invoice-create.html?type=raw' },
      { label: 'Bill Book & Document Folders', meta: 'Folders', href: 'bill-book.html' },
      { label: 'Payments & Receipts', meta: 'Page', href: 'payments.html' },
      { label: 'Business Setup, Logo & Bank Details', meta: 'Setup', href: 'company-settings.html' },
      { label: 'Add New Customer', meta: 'Action', href: 'customer-add.html' },
      { label: 'All Invoices Ledger', meta: 'Page', href: 'invoice-list.html' },
      { label: 'Financial & GST Reports', meta: 'Page', href: 'reports.html' }
    ];

    function getSpotlightItems() {
      const dynamicItems = [];
      loadInvoices().slice(0, 12).forEach((inv) => {
        const pay = computePaymentState(inv);
        dynamicItems.push({
          label: `#${inv.invNo} · ${inv.buyer?.name || 'Client'}`,
          meta: `${formatINR(pay.total)} · ${pay.label}`,
          href: `invoice-view.html?id=${encodeURIComponent(inv.id)}`
        });
      });
      loadQuotations().slice(0, 8).forEach((qt) => {
        dynamicItems.push({
          label: `${qt.quoteNo} · ${qt.buyer?.name || 'Client'}`,
          meta: `Quotation · ${qt.status || 'Draft'}`,
          href: `invoice-preview.html?type=quotation&qid=${encodeURIComponent(qt.id)}`
        });
      });
      loadCustomers().slice(0, 10).forEach((c) => {
        dynamicItems.push({
          label: `${c.name}${c.contactName ? ` · ${c.contactName}` : ''}`,
          meta: 'Client',
          href: `customer-view.html?id=${encodeURIComponent(c.id)}`
        });
      });
      return [...baseNavItems, ...dynamicItems];
    }

    const pop = document.createElement('div');
    pop.className = 'ios-popover';
    pop.style.right = 'auto';
    pop.style.width = '340px';
    document.body.appendChild(pop);

    function render(query) {
      const q = query.trim().toLowerCase();
      const indexItems = getSpotlightItems();
      const matches = (q
        ? indexItems.filter((item) => item.label.toLowerCase().includes(q) || item.meta.toLowerCase().includes(q))
        : indexItems.slice(0, 6)
      ).slice(0, 6);

      const rect = topSearch.getBoundingClientRect();
      pop.style.top = `${rect.bottom + 8}px`;
      pop.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 352))}px`;

      if (!matches.length) {
        pop.innerHTML = `<div style="padding:14px;text-align:center;font-size:0.8125rem;color:var(--text-muted);">No quick matches for "${escapeHtml(query)}"</div>`;
      } else {
        pop.innerHTML = `
          <div class="ios-popover-header">
            <span class="ios-popover-title">Quick Jump</span>
            <span style="font-size:0.7rem;color:var(--text-light);">ESC to close</span>
          </div>
          ${matches
            .map(
              (m) => `
            <a href="${m.href}" class="ios-popover-item" style="justify-content:space-between;align-items:center;">
              <span style="font-size:0.8125rem;font-weight:600;color:var(--text-main);">${escapeHtml(m.label)}</span>
              <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;">${escapeHtml(m.meta)}</span>
            </a>`
            )
            .join('')}
        `;
      }
      pop.classList.add('is-open');
    }

    topSearch.addEventListener('focus', () => render(topSearch.value));
    topSearch.addEventListener('input', () => render(topSearch.value));
    topSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        pop.classList.remove('is-open');
        topSearch.blur();
      }
    });
    document.addEventListener('click', (e) => {
      if (!pop.contains(e.target) && e.target !== topSearch) {
        pop.classList.remove('is-open');
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Live Table Search & Status Filter (Customers & Invoices)
     -------------------------------------------------------------------------- */
  function initListFiltering() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('customers') || path.includes('invoice-list')) return;
    const bar = document.querySelector('.table-header-bar');
    const table = document.querySelector('.enterprise-table');
    if (!bar || !table) return;

    const searchInput = bar.querySelector('.search-input');
    const statusSelect = bar.querySelector('select');
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr'));
    const paginationText = document.querySelector('.pagination-text');

    let emptyRow = document.createElement('tr');
    emptyRow.style.display = 'none';
    emptyRow.innerHTML = `
      <td colspan="10">
        <div class="table-empty-state">
          <div class="table-empty-title">No matching records found</div>
          <div class="table-empty-desc">Try clearing your search query or selecting a different status filter.</div>
        </div>
      </td>
    `;
    tbody.appendChild(emptyRow);

    function filterRows() {
      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const status = (statusSelect ? statusSelect.value : '').trim().toLowerCase();

      let visibleCount = 0;
      rows.forEach((row) => {
        if (row.dataset.deleted === 'true') {
          row.style.display = 'none';
          return;
        }
        const text = row.textContent.toLowerCase();
        const badge = row.querySelector('.status-badge');
        const badgeText = badge ? badge.textContent.trim().toLowerCase() : '';
        const matchesQuery = !q || text.includes(q);
        const matchesStatus = !status || badgeText.includes(status);

        const show = matchesQuery && matchesStatus;
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });

      emptyRow.style.display = visibleCount === 0 ? '' : 'none';
      if (paginationText) {
        paginationText.innerHTML = `Showing <strong>${visibleCount}</strong> matching record${visibleCount === 1 ? '' : 's'}`;
      }
    }

    if (searchInput) searchInput.addEventListener('input', filterRows);
    if (statusSelect) statusSelect.addEventListener('change', filterRows);
  }

  /* --------------------------------------------------------------------------
     8. Smooth Delete Confirmation with Undo Toast
     -------------------------------------------------------------------------- */
  function initDeleteActions() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('customers') || path.includes('invoice-list') || path.includes('invoice-create') || path.includes('quotations') || path.includes('bill-book')) return;

    document.querySelectorAll('.table-action-icon-btn.delete-hover').forEach((btn) => {
      if (btn.closest('tr.item-row')) return;
      btn.removeAttribute('onclick');
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const isInvoice = window.location.pathname.includes('invoice');
        const labelEl = row ? row.querySelector('.col-bold') : null;
        const label = labelEl ? labelEl.textContent.trim().split('\n')[0] : 'this record';

        const ok = await confirmSheet({
          title: isInvoice ? 'Delete Invoice?' : 'Remove Customer?',
          message: `Are you sure you want to remove ${label}? You can undo this immediately afterward.`,
          confirmText: 'Delete',
          danger: true
        });

        if (ok && row) {
          row.dataset.deleted = 'true';
          row.style.display = 'none';
          toast(`Removed ${label}`, 'warning', () => {
            delete row.dataset.deleted;
            row.style.display = '';
            toast(`Restored ${label}`, 'success');
          });
        }
      });
    });
  }

  /* --------------------------------------------------------------------------
     8B. Per-User Scoped Dashboard, Customers, Invoices, Payments & Plans
     -------------------------------------------------------------------------- */
  function parseFlexibleDate(str) {
    const raw = String(str || '').trim();
    if (!raw) return null;
    const isoPrefix = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoPrefix) {
      const dt = new Date(Number(isoPrefix[1]), Number(isoPrefix[2]) - 1, Number(isoPrefix[3]));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dmy = raw.match(/^(\d{2})[.\/-](\d{2})[.\/-](\d{4})$/);
    if (dmy) {
      const dt = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(raw);
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatCompactINR(val) {
    const num = Number(val) || 0;
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
    return `₹${Math.round(num)}`;
  }

  function renderMonthlyBarChart(containerEl, buckets) {
    if (!containerEl) return;
    const maxVal = Math.max(0, ...buckets.map((b) => Number(b.val) || 0));
    const MAX_BAR_PX = 148;
    const MIN_BAR_PX = 10;

    containerEl.style.minWidth = buckets.length > 8 ? `${buckets.length * 40}px` : '100%';

    containerEl.innerHTML = buckets
      .map((b) => {
        const val = Math.max(0, Number(b.val) || 0);
        const isZero = val <= 0 || maxVal <= 0;
        const ratio = !isZero ? val / maxVal : 0;
        const targetPx = !isZero ? Math.max(MIN_BAR_PX, Math.round(ratio * MAX_BAR_PX)) : 3;
        const shortVal = formatCompactINR(val);
        return `
          <div class="mock-chart-bar-wrapper" title="${escapeHtml(b.fullLabel || b.label)}: ${escapeHtml(formatINR(val))}">
            <div class="chart-bar-track">
              ${!isZero ? `<span class="mock-chart-val">${escapeHtml(shortVal)}</span>` : '<span class="mock-chart-val" style="opacity:0;">0</span>'}
              <div class="chart-bar-stage">
                <div class="mock-chart-bar${isZero ? ' is-zero' : ''}" data-target-px="${targetPx}" style="height: ${isZero ? 3 : 4}px;" data-value="${escapeHtml(shortVal)}"></div>
              </div>
            </div>
            <span class="mock-chart-label">${escapeHtml(b.label)}</span>
          </div>
        `;
      })
      .join('');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        containerEl.querySelectorAll('.mock-chart-bar[data-target-px]').forEach((bar) => {
          if (bar.classList.contains('is-zero')) return;
          const px = Number(bar.getAttribute('data-target-px')) || 10;
          bar.style.height = `${px}px`;
        });
      });
    });
  }

  function initDashboardPage() {
    if (!window.location.pathname.toLowerCase().includes('dashboard')) return;
    const statsGrid = document.querySelector('.stats-grid');
    if (!statsGrid) return;

    const invoices = loadInvoices();
    const customers = loadCustomers();
    const payments = loadPayments();
    const plan = getUserPlan();
    const todayIso = new Date().toISOString().slice(0, 10);

    // Build fast O(1) paid lookup map per invoice
    const paidByInv = new Map();
    payments.forEach((p) => {
      const k = String(p.invoiceId);
      paidByInv.set(k, (paidByInv.get(k) || 0) + (Number(p.amount) || 0));
    });

    let billed = 0;
    let received = 0;
    let owingCount = 0;
    let overdueVal = 0;
    let draftVal = 0;
    let paidCount = 0;
    let todayUsed = 0;

    invoices.forEach((inv) => {
      const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
      billed += pay.total;
      received += pay.paid;
      if (pay.balance > 0.01) owingCount++;
      if (pay.overdue) overdueVal += pay.balance;
      if (inv.status === 'draft') draftVal += pay.total;
      if (pay.key === 'paid') paidCount++;
      if (String(inv.issueDate || '') === todayIso) todayUsed++;
    });

    const outstanding = Math.max(0, Math.round((billed - received) * 100) / 100);
    const pctCollected = billed > 0 ? Math.round((received / billed) * 100) : 0;

    const cards = statsGrid.querySelectorAll('.stat-card');
    if (cards.length >= 4) {
      cards[0].querySelector('.stat-title').textContent = 'Total Billed';
      cards[0].querySelector('.stat-value').textContent = formatINR(billed);
      cards[0].querySelector('.stat-footer').innerHTML = `<span class="stat-period">${invoices.length} invoice${invoices.length === 1 ? '' : 's'} total</span>`;

      cards[1].querySelector('.stat-title').textContent = 'Received';
      cards[1].querySelector('.stat-value').textContent = formatINR(received);
      cards[1].querySelector('.stat-value').style.color = 'var(--success)';
      cards[1].querySelector('.stat-footer').innerHTML = `<span class="stat-period">${pctCollected}% of everything billed</span>`;

      cards[2].querySelector('.stat-title').textContent = 'Outstanding';
      cards[2].querySelector('.stat-value').textContent = formatINR(outstanding);
      cards[2].querySelector('.stat-value').style.color = outstanding > 0 ? 'var(--danger)' : 'var(--text-main)';
      cards[2].querySelector('.stat-footer').innerHTML = `<span class="stat-period">${owingCount} invoice${owingCount === 1 ? '' : 's'} still owing</span>`;

      const cap = plan.invoicesDaily;
      cards[3].querySelector('.stat-title').textContent = `Today (${plan.label})`;
      cards[3].querySelector('.stat-value').textContent = cap ? `${todayUsed} / ${cap}` : `${todayUsed}`;
      cards[3].querySelector('.stat-footer').innerHTML = cap
        ? `<span class="stat-period">${Math.max(0, cap - todayUsed)} left today · <a href="plans.html" style="color:var(--primary);font-weight:600;">${customers.length}${plan.customers ? '/' + plan.customers : ''} clients</a></span>`
        : `<span class="stat-period">Unlimited · ${customers.length} clients</span>`;
    }

    // Hydrate Live Monthly Sales Analytics Bar Chart
    const dashChartEl = document.getElementById('dash-sales-chart') || document.querySelector('.mock-chart-visual');
    const dashSubEl = document.getElementById('dash-sales-subtitle');
    const dashRangeBtns = document.querySelectorAll('#dash-chart-range [data-chart-range]');
    let activeRange = '7m';

    function updateDashboardChart() {
      if (!dashChartEl) return;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();

      // Anchor latest month cleanly so any current-year or latest invoice month appears
      let anchor = new Date(now.getFullYear(), now.getMonth(), 1);
      const dated = invoices
        .map((inv) => ({ inv, dt: parseFlexibleDate(inv.issueDate) }))
        .filter((x) => x.dt !== null);

      if (dated.length > 0) {
        const latestDt = dated.reduce((max, x) => (x.dt > max ? x.dt : max), dated[0].dt);
        // If no invoices fall in the 7m window ending today, anchor around the latest invoice month
        const sevenMonthsAgo = new Date(anchor.getFullYear(), anchor.getMonth() - 6, 1);
        const hasRecent = dated.some((x) => x.dt >= sevenMonthsAgo && x.dt <= new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
        if (!hasRecent) {
          anchor = new Date(latestDt.getFullYear(), latestDt.getMonth(), 1);
        }
      }

      const buckets = [];
      if (activeRange === '12m') {
        const yr = anchor.getFullYear();
        for (let m = 0; m < 12; m++) {
          buckets.push({
            year: yr,
            month: m,
            label: monthNames[m],
            fullLabel: `${monthNames[m]} ${yr}`,
            val: 0
          });
        }
      } else {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
          buckets.push({
            year: d.getFullYear(),
            month: d.getMonth(),
            label: monthNames[d.getMonth()],
            fullLabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            val: 0
          });
        }
      }

      dated.forEach(({ inv, dt }) => {
        const target = buckets.find((b) => b.year === dt.getFullYear() && b.month === dt.getMonth());
        if (target) {
          target.val += computeInvoiceTotals(inv).grand;
        }
      });

      renderMonthlyBarChart(dashChartEl, buckets);

      if (dashSubEl) {
        const rangeTotal = buckets.reduce((sum, b) => sum + b.val, 0);
        const peak = buckets.reduce((best, b) => (b.val > best.val ? b : best), { label: '—', val: 0 });
        dashSubEl.textContent = rangeTotal > 0
          ? `${activeRange === '12m' ? anchor.getFullYear() : 'Last 7 months'} · Total ${formatINR(rangeTotal)} · Peak ${peak.label}`
          : `Monthly revenue trends for ${anchor.getFullYear()}`;
      }
    }

    dashRangeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeRange = btn.getAttribute('data-chart-range') || '7m';
        dashRangeBtns.forEach((b) => b.classList.toggle('active', b === btn));
        updateDashboardChart();
      });
    });
    updateDashboardChart();

    // Quota notice bar if close to or over daily limit
    const mainEl = document.querySelector('.main-content');
    if (mainEl && plan.invoicesDaily && todayUsed >= plan.invoicesDaily - 1 && !document.getElementById('dash-quota-notice')) {
      const notice = document.createElement('div');
      notice.id = 'dash-quota-notice';
      notice.className = 'card';
      const exhausted = todayUsed >= plan.invoicesDaily;
      notice.style.cssText = `margin-bottom:20px;padding:14px 18px;border-color:${exhausted ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.35)'};background:${exhausted ? 'rgba(239,68,68,0.06)' : 'var(--primary-light)'};`;
      notice.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="font-size:0.875rem;color:var(--text-main);">
            <strong>${exhausted ? 'Daily invoice limit reached:' : 'Daily quota alert:'}</strong> ${todayUsed} of ${plan.invoicesDaily} invoices used today on ${escapeHtml(plan.label)}.
          </div>
          <a href="plans.html" class="btn btn-primary btn-sm">Upgrade Plan</a>
        </div>
      `;
      mainEl.insertBefore(notice, statsGrid);
    }

    // Hydrate Recent Activity timeline dynamically from real ledger
    const timelineEl = document.querySelector('.dashboard-grid .timeline');
    if (timelineEl) {
      const events = [];
      payments.slice(0, 2).forEach((p) => {
        const inv = invoices.find((x) => String(x.id) === String(p.invoiceId));
        events.push({
          tone: 'success',
          title: `Payment received for <strong>${escapeHtml(inv ? inv.invNo : 'Invoice')}</strong>`,
          desc: `${formatINR(p.amount)} via ${escapeHtml(p.method || 'UPI')}`,
          time: formatDisplayDate(p.paidOn)
        });
      });
      invoices.slice(0, 3).forEach((inv) => {
        const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
        events.push({
          tone: pay.key === 'paid' ? 'success' : pay.overdue ? 'danger' : 'primary',
          title: `Invoice <strong>${escapeHtml(inv.invNo)}</strong> · ${escapeHtml(pay.label)}`,
          desc: `${escapeHtml(inv.buyer?.name || 'Customer')} (${formatINR(pay.total)})`,
          time: formatDisplayDate(inv.issueDate)
        });
      });

      if (!events.length) {
        timelineEl.innerHTML = `
          <div class="table-empty-state" style="padding:24px 12px;">
            <div class="table-empty-title">No activity yet</div>
            <div class="table-empty-desc">Add a customer and raise your first Tax Invoice to see live activity here.</div>
          </div>
        `;
      } else {
        timelineEl.innerHTML = events.slice(0, 4).map((ev) => `
          <div class="timeline-item">
            <span class="timeline-marker ${ev.tone}"></span>
            <div class="timeline-content">
              <div>
                <p class="timeline-title">${ev.title}</p>
                <p class="timeline-desc">${ev.desc}</p>
              </div>
              <span class="timeline-time">${escapeHtml(ev.time)}</span>
            </div>
          </div>
        `).join('');
      }
    }

    // Hydrate Recent Invoices Table
    const recentTable = document.querySelector('.main-content > .card table.enterprise-table');
    const recentTbody = recentTable ? recentTable.querySelector('tbody') : null;
    if (recentTbody) {
      if (!invoices.length) {
        recentTbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="table-empty-state">
                <div class="table-empty-title">No invoices yet</div>
                <div class="table-empty-desc">Add a customer, then raise your first GST bill.</div>
                <div class="btn-group" style="justify-content:center;margin-top:12px;">
                  <a href="customer-add.html" class="btn btn-secondary btn-sm">Add a Customer</a>
                  <a href="invoice-create.html" class="btn btn-primary btn-sm">Create Invoice</a>
                </div>
              </div>
            </td>
          </tr>
        `;
      } else {
        recentTbody.innerHTML = invoices.slice(0, 8).map((inv) => {
          const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
          return `
            <tr>
              <td class="col-bold col-mono"><a href="invoice-view.html?id=${encodeURIComponent(inv.id)}">${escapeHtml(inv.invNo)}</a></td>
              <td>
                <div style="font-weight:600;">${escapeHtml(inv.buyer?.name || 'Client')}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(inv.buyer?.email || inv.buyer?.gstin || '')}</div>
              </td>
              <td>${escapeHtml(formatDisplayDate(inv.issueDate))}</td>
              <td>${escapeHtml(inv.dueDate ? formatDisplayDate(inv.dueDate) : '—')}</td>
              <td class="col-bold col-align-right col-mono">${formatINR(pay.total)}</td>
              <td><span class="status-badge ${pay.badgeClass}">${escapeHtml(pay.label)}</span></td>
              <td class="col-align-right">
                <div class="table-action-links" style="justify-content:flex-end;">
                  <a href="invoice-view.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn" title="View Detail"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
                  <a href="invoice-preview.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn" title="A4 Print Sheet"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></a>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        applyTableLabels(recentTable);
      }
    }
  }

  function initCustomersModule() {
    const path = window.location.pathname.toLowerCase();

    // 1. Customers Directory (customers.html)
    if (path.includes('customers.html') || path.endsWith('/customers')) {
      const table = document.querySelector('table.enterprise-table');
      const tbody = table ? table.querySelector('tbody') : null;
      const bar = document.querySelector('.table-header-bar');
      const searchInput = bar ? bar.querySelector('.search-input') : null;
      const statusSelect = bar ? bar.querySelector('select') : null;
      const paginationText = document.querySelector('.pagination-text');
      if (!tbody) return;

      function renderDirectory() {
        const list = loadCustomers();
        const invoices = loadInvoices();
        const plan = getUserPlan();
        const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
        const st = (statusSelect ? statusSelect.value : '').trim().toLowerCase();

        const filtered = list.filter((c) => {
          const hay = `${c.name} ${c.contactName} ${c.gstin} ${c.email} ${c.phone} ${c.city} ${c.state}`.toLowerCase();
          const cSt = (c.status || 'Active').toLowerCase();
          return (!q || hay.includes(q)) && (!st || cSt === st);
        });

        if (paginationText) {
          const capLabel = plan.customers ? ` / ${plan.customers} slots (${plan.label})` : ` saved (${plan.label})`;
          paginationText.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${list.length}</strong>${capLabel}`;
        }

        if (!filtered.length) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="table-empty-state">
                  <div class="table-empty-title">${list.length ? 'No matching customers found' : 'No customers yet'}</div>
                  <div class="table-empty-desc">${list.length ? 'Clear your search or status filter.' : 'Add your first buyer or business partner to start creating GST invoices.'}</div>
                  ${!list.length ? '<a href="customer-add.html" class="btn btn-primary btn-sm" style="margin-top:12px;">+ Add Customer</a>' : ''}
                </div>
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = filtered.map((c) => {
          const custInv = invoices.filter((inv) => String(inv.buyerId) === String(c.id) || (inv.buyer?.name && inv.buyer.name.toLowerCase() === String(c.name || '').toLowerCase()));
          const outstanding = custInv.reduce((acc, inv) => acc + computePaymentState(inv).balance, 0);
          const isActive = (c.status || 'Active').toLowerCase() !== 'inactive';

          return `
            <tr data-cust-id="${escapeHtml(c.id)}">
              <td>
                <label class="checkbox-group" style="gap:0;">
                  <input type="checkbox">
                  <span class="custom-checkbox"><svg class="icon-svg" viewBox="0 0 24 24" style="width:10px;height:10px;color:white;"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" fill="none"/></svg></span>
                </label>
              </td>
              <td class="col-bold">
                <a href="customer-view.html?id=${encodeURIComponent(c.id)}" style="color:var(--primary);">${escapeHtml(c.contactName || c.name)}</a>
                <div style="font-size:0.75rem;color:var(--text-light);font-weight:400;">${escapeHtml(c.role || 'Billing Contact')}</div>
              </td>
              <td>
                <div>${escapeHtml(c.name)}</div>
                <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml([c.city, c.state].filter(Boolean).join(', '))}</div>
              </td>
              <td class="col-mono">${escapeHtml(c.gstin || '—')}</td>
              <td>
                <div style="font-weight:500;">${escapeHtml(c.email || '—')}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(c.phone || '—')}</div>
              </td>
              <td class="col-bold col-align-right col-mono" style="color:${outstanding > 0.01 ? 'var(--danger)' : 'var(--text-muted)'};">${formatINR(outstanding)}</td>
              <td><span class="status-badge ${isActive ? 'paid' : 'draft'}">${isActive ? 'Active' : 'Inactive'}</span></td>
              <td class="col-align-right">
                <div class="table-action-links" style="justify-content:flex-end;">
                  <a href="customer-view.html?id=${encodeURIComponent(c.id)}" class="table-action-icon-btn" title="View Customer Profile"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
                  <a href="customer-edit.html?id=${encodeURIComponent(c.id)}" class="table-action-icon-btn" title="Edit Customer"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></a>
                  <button type="button" class="table-action-icon-btn delete-hover" data-cust-delete="${escapeHtml(c.id)}" title="Delete Customer"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        applyTableLabels(table);

        tbody.querySelectorAll('[data-cust-delete]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const cid = btn.getAttribute('data-cust-delete');
            const allCust = loadCustomers();
            const cust = allCust.find((x) => String(x.id) === String(cid));
            if (!cust) return;

            const linkedCount = loadInvoices().filter((inv) => String(inv.buyerId) === String(cid)).length;
            if (linkedCount > 0) {
              toast(`Cannot delete ${cust.name} — linked to ${linkedCount} invoice${linkedCount === 1 ? '' : 's'}`, 'warning');
              return;
            }

            const ok = await confirmSheet({
              title: 'Remove Customer?',
              message: `Remove ${cust.name} from your customer directory?`,
              confirmText: 'Remove',
              danger: true
            });
            if (!ok) return;

            const backup = [...allCust];
            saveCustomers(allCust.filter((x) => String(x.id) !== String(cid)));
            renderDirectory();
            toast(`Removed ${cust.name}`, 'warning', () => {
              saveCustomers(backup);
              renderDirectory();
              toast(`Restored ${cust.name}`, 'success');
            });
          });
        });
      }

      if (searchInput) searchInput.addEventListener('input', renderDirectory);
      if (statusSelect) statusSelect.addEventListener('change', renderDirectory);
      renderDirectory();
      return;
    }

    // 2. Customer Add & Customer Edit (customer-add.html / customer-edit.html)
    if (path.includes('customer-add') || path.includes('customer-edit')) {
      const form = document.querySelector('form[action="customers.html"]');
      if (!form) return;

      const isEdit = path.includes('customer-edit');
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('id');
      const customers = loadCustomers();
      const plan = getUserPlan();

      if (!isEdit && plan.customers && customers.length >= plan.customers) {
        const warnCard = document.createElement('div');
        warnCard.className = 'card';
        warnCard.style.cssText = 'margin-bottom:18px;border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.08);padding:14px 18px;';
        warnCard.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <span style="font-size:0.875rem;color:var(--text-main);"><strong>Customer slot limit reached:</strong> Your ${escapeHtml(plan.label)} plan allows up to ${plan.customers} customers.</span>
            <a href="plans.html" class="btn btn-primary btn-sm">Upgrade Plan</a>
          </div>
        `;
        form.parentElement.insertBefore(warnCard, form);
      }

      if (isEdit) {
        const target = customers.find((x) => String(x.id) === String(editId)) || customers[0];
        if (target) {
          const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
          setVal('cust-name', target.contactName || target.name);
          setVal('cust-role', target.role || '');
          setVal('cust-email', target.email || '');
          setVal('cust-phone', target.phone || '');
          setVal('company-name', target.name || '');
          setVal('gstin', target.gstin || '');
          setVal('pan-number', target.pan || '');
          setVal('bill-address', target.address || '');
          setVal('bill-city', target.city || '');
          setVal('bill-zip', target.zip || '');
          const stateEl = document.getElementById('cust-state');
          if (stateEl && target.code) {
            const opt = Array.from(stateEl.options).find((o) => o.value.startsWith(`${target.code}-`));
            if (opt) stateEl.value = opt.value;
          }
        }
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentList = loadCustomers();
        if (!isEdit && plan.customers && currentList.length >= plan.customers) {
          toast(`Customer limit (${plan.customers}) reached on ${plan.label}. Upgrade plan to add more.`, 'warning');
          return;
        }

        const contactName = (document.getElementById('cust-name')?.value || '').trim();
        const role = (document.getElementById('cust-role')?.value || '').trim();
        const email = (document.getElementById('cust-email')?.value || '').trim();
        let phone = (document.getElementById('cust-phone')?.value || '').replace(/\s+/g, '');
        if (phone.startsWith('+91')) phone = phone.slice(3);
        const companyName = (document.getElementById('company-name')?.value || '').trim();
        const gstin = (document.getElementById('gstin')?.value || '').trim().toUpperCase();
        const pan = (document.getElementById('pan-number')?.value || '').trim().toUpperCase();
        const stateRaw = document.getElementById('cust-state')?.value || '24-Gujarat';
        const [code, stateLabel] = stateRaw.split('-');
        const state = stateLabel === 'TamilNadu' ? 'Tamil Nadu' : stateLabel === 'UttarPradesh' ? 'Uttar Pradesh' : stateLabel === 'MadhyaPradesh' ? 'Madhya Pradesh' : stateLabel === 'DamanAndDiu' ? 'Daman & Diu' : (stateLabel || 'Gujarat');
        const address = (document.getElementById('bill-address')?.value || '').trim();
        const city = (document.getElementById('bill-city')?.value || '').trim();
        const zip = (document.getElementById('bill-zip')?.value || '').trim();

        if (!/^[6-9][0-9]{9}$/.test(phone)) {
          toast('Enter a valid 10-digit Indian mobile number', 'warning');
          return;
        }
        if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)) {
          toast('Check the GSTIN format (e.g. 24AAAAA1111A1Z5)', 'warning');
          return;
        }
        if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
          toast('Check the PAN format (e.g. ABCDE1234F)', 'warning');
          return;
        }

        const rec = {
          id: isEdit && editId ? editId : window.IFCloud.uuid(),
          contactName: contactName || companyName,
          role: role || 'Billing Contact',
          name: companyName || contactName,
          email,
          phone,
          gstin,
          pan,
          state,
          code: code || (gstin ? gstin.slice(0, 2) : '24'),
          city,
          address,
          zip,
          status: 'Active'
        };

        if (isEdit && editId) {
          const idx = currentList.findIndex((x) => String(x.id) === String(editId));
          if (idx >= 0) currentList[idx] = { ...currentList[idx], ...rec };
          else currentList.unshift(rec);
        } else {
          currentList.unshift(rec);
        }
        saveCustomers(currentList);
        toast(isEdit ? 'Customer updated!' : 'Customer saved!', 'success');
        setTimeout(() => {
          window.location.href = 'customers.html';
        }, 400);
      });
      return;
    }

    // 3. Customer View Ledger (customer-view.html)
    if (path.includes('customer-view')) {
      const params = new URLSearchParams(window.location.search);
      const cid = params.get('id');
      const customers = loadCustomers();
      const cust = customers.find((x) => String(x.id) === String(cid)) || customers[0];
      const mainEl = document.querySelector('.main-content');
      if (!mainEl) return;

      if (!cust) {
        mainEl.innerHTML = `
          <div class="card">
            <div class="table-empty-state">
              <div class="table-empty-title">No customer selected</div>
              <div class="table-empty-desc">Add a customer first to inspect their GST ledger and billing history.</div>
              <a href="customer-add.html" class="btn btn-primary btn-sm" style="margin-top:12px;">+ Add Customer</a>
            </div>
          </div>
        `;
        return;
      }

      const editLink = mainEl.querySelector('a[href*="customer-edit"]');
      if (editLink) editLink.href = `customer-edit.html?id=${encodeURIComponent(cust.id)}`;
      const createLink = mainEl.querySelector('a[href*="invoice-create"]');
      if (createLink) createLink.href = `invoice-create.html?customer_id=${encodeURIComponent(cust.id)}`;

      const avatarEl = mainEl.querySelector('.profile-avatar');
      if (avatarEl) avatarEl.textContent = getInitials(cust.name, 'CU');
      const nameHeading = mainEl.querySelector('.profile-header-grid h2');
      if (nameHeading) nameHeading.textContent = cust.name;
      const contactLine = mainEl.querySelector('.profile-header-grid p');
      if (contactLine) {
        contactLine.innerHTML = `Primary Billing Contact: <strong style="color:var(--text-main)">${escapeHtml(cust.contactName || cust.name)}</strong>${cust.role ? ` (${escapeHtml(cust.role)})` : ''}`;
      }

      const custInvoices = loadInvoices().filter((inv) =>
        String(inv.buyerId) === String(cust.id) || (inv.buyer?.name && inv.buyer.name.toLowerCase() === cust.name.toLowerCase())
      );
      let invoiced = 0;
      let received = 0;
      custInvoices.forEach((inv) => {
        const pay = computePaymentState(inv);
        invoiced += pay.total;
        received += pay.paid;
      });
      const outstanding = Math.max(0, invoiced - received);

      const metricVals = mainEl.querySelectorAll('.metric-value');
      if (metricVals.length >= 3) {
        metricVals[0].textContent = formatINR(outstanding);
        metricVals[1].textContent = formatINR(invoiced);
        metricVals[2].textContent = formatINR(received);
      }

      const detailValues = mainEl.querySelectorAll('.form-grid .form-group > :last-child');
      if (detailValues.length >= 5) {
        detailValues[0].textContent = cust.gstin || '—';
        detailValues[1].textContent = cust.email || '—';
        detailValues[2].textContent = cust.phone || '—';
        detailValues[3].textContent = `${cust.state || 'Gujarat'} (GST State Code ${cust.code || '24'})`;
        detailValues[4].textContent = [cust.address, cust.city, cust.zip].filter(Boolean).join(', ') || '—';
      }

      const histDesc = mainEl.querySelector('.card:last-child .card-description');
      if (histDesc) histDesc.textContent = `Chronological ledger of invoices generated for ${cust.name}`;

      const tbody = mainEl.querySelector('.enterprise-table tbody');
      if (tbody) {
        if (!custInvoices.length) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="table-empty-state">
                  <div class="table-empty-title">No invoices for ${escapeHtml(cust.name)} yet</div>
                  <div class="table-empty-desc">Raise a new Tax Invoice linked to this buyer.</div>
                  <a href="invoice-create.html?customer_id=${encodeURIComponent(cust.id)}" class="btn btn-primary btn-sm" style="margin-top:10px;">Create GST Invoice</a>
                </div>
              </td>
            </tr>
          `;
        } else {
          tbody.innerHTML = custInvoices.map((inv) => {
            const t = computeInvoiceTotals(inv);
            const pay = computePaymentState(inv);
            return `
              <tr>
                <td class="col-bold col-mono"><a href="invoice-view.html?id=${encodeURIComponent(inv.id)}">${escapeHtml(inv.invNo)}</a></td>
                <td>${escapeHtml(formatDisplayDate(inv.issueDate))}</td>
                <td>${escapeHtml(inv.dueDate ? formatDisplayDate(inv.dueDate) : '—')}</td>
                <td class="col-align-right col-mono">${formatINR(t.subtotal)}</td>
                <td class="col-align-right col-mono">${inv.rows?.[0]?.gst ?? 18}% GST</td>
                <td class="col-bold col-align-right col-mono">${formatINR(pay.total)}</td>
                <td><span class="status-badge ${pay.badgeClass}">${escapeHtml(pay.label)}</span></td>
                <td class="col-align-right">
                  <div class="table-action-links" style="justify-content:flex-end;">
                    <a href="invoice-view.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
                    <a href="invoice-preview.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></a>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  }

  function initInvoicesListModule() {
    if (!window.location.pathname.toLowerCase().includes('invoice-list')) return;
    const flatWrapper = document.getElementById('invoice-flat-wrapper');
    const monthlyGroupsEl = document.getElementById('invoice-monthly-groups');
    const monthlySummaryEl = document.getElementById('invoice-monthly-summary');
    const table = document.querySelector('#invoice-flat-wrapper table.enterprise-table') || document.querySelector('table.enterprise-table');
    const tbody = table ? table.querySelector('tbody') : null;
    const searchInput = document.getElementById('invoice-search-input') || document.querySelector('.table-header-bar .search-input');
    const monthSelect = document.getElementById('invoice-month-filter');
    const statusSelect = document.getElementById('invoice-status-filter') || document.querySelector('.table-header-bar select');
    const viewModeBtns = document.querySelectorAll('#invoice-view-mode [data-view-mode]');
    const paginationText = document.querySelector('.pagination-text');
    const paginationBtnsEl = document.getElementById('invoice-pagination-buttons');
    if (!tbody) return;

    let viewMode = 'monthly';
    let currentPage = 1;
    const PAGE_SIZE = 15;
    const urlMonthParam = new URLSearchParams(window.location.search).get('month') || '';
    let initialMonthApplied = false;
    const typeLabelMap = { tax: 'Tax Invoice', challan: 'Delivery Challan', raw: 'Raw Material Bill' };

    function getMonthKey(inv) {
      const dt = parseFlexibleDate(inv.issueDate);
      if (!dt) return 'undated';
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    }

    function formatMonthLabel(monthKey) {
      if (!monthKey || monthKey === 'undated') return 'Undated';
      const [yr, mo] = monthKey.split('-').map(Number);
      const dt = new Date(yr, (mo || 1) - 1, 1);
      return dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    }

    function formatMonthShort(monthKey) {
      if (!monthKey || monthKey === 'undated') return 'Undated';
      const [yr, mo] = monthKey.split('-').map(Number);
      const dt = new Date(yr, (mo || 1) - 1, 1);
      return dt.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }

    function buildRowHtml(inv, pay) {
      const typeLabel = typeLabelMap[inv.docType] || 'Tax Invoice';
      return `
        <tr data-inv-id="${escapeHtml(inv.id)}">
          <td>
            <label class="checkbox-group" style="gap:0;">
              <input type="checkbox">
              <span class="custom-checkbox"><svg class="icon-svg" viewBox="0 0 24 24" style="width:10px;height:10px;color:white;"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" fill="none"/></svg></span>
            </label>
          </td>
          <td class="col-bold col-mono">
            <a href="invoice-view.html?id=${encodeURIComponent(inv.id)}" style="color:var(--primary);">${escapeHtml(inv.invNo)}</a>
            <div style="font-size:0.7rem;color:var(--text-muted);font-family:var(--font-sans);font-weight:500;">${escapeHtml(typeLabel)}</div>
          </td>
          <td>
            <div style="font-weight:600;">${escapeHtml(inv.buyer?.name || 'Client')}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">${escapeHtml(inv.buyer?.email || inv.buyer?.gstin || '')}</div>
          </td>
          <td>${escapeHtml(formatDisplayDate(inv.issueDate))}</td>
          <td>${escapeHtml(inv.dueDate ? formatDisplayDate(inv.dueDate) : '—')}</td>
          <td class="col-bold col-align-right col-mono">
            <div>${formatINR(pay.total)}</div>
            ${pay.balance > 0.01 && pay.paid > 0.01 ? `<div style="font-size:0.7rem;color:var(--danger);font-weight:500;">Due ${formatINR(pay.balance)}</div>` : ''}
          </td>
          <td><span class="status-badge ${pay.badgeClass}">${escapeHtml(pay.label)}</span></td>
          <td class="col-align-right">
            <div class="table-action-links" style="justify-content:flex-end;">
              <a href="invoice-view.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn" title="View Detail"><svg class="icon-svg" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></a>
              <a href="invoice-preview.html?id=${encodeURIComponent(inv.id)}" class="table-action-icon-btn" title="Print A4 Sheet"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></a>
              ${pay.balance > 0.01 ? `<button type="button" class="table-action-icon-btn" data-inv-pay="${escapeHtml(inv.id)}" title="Record Payment"><svg class="icon-svg" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></button>` : ''}
              <button type="button" class="table-action-icon-btn delete-hover" data-inv-delete="${escapeHtml(inv.id)}" title="Delete Invoice"><svg class="icon-svg" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
            </div>
          </td>
        </tr>
      `;
    }

    function wireRowActions(scopeEl) {
      if (!scopeEl) return;
      scopeEl.querySelectorAll('[data-inv-pay]').forEach((btn) => {
        btn.addEventListener('click', () => {
          openRecordPaymentModal(btn.getAttribute('data-inv-pay'), renderList);
        });
      });

      scopeEl.querySelectorAll('[data-inv-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const iid = btn.getAttribute('data-inv-delete');
          const allInv = loadInvoices();
          const inv = allInv.find((x) => String(x.id) === String(iid));
          if (!inv) return;

          const ok = await confirmSheet({
            title: 'Delete Invoice?',
            message: `Delete invoice ${inv.invNo}? Its payment records go too.`,
            confirmText: 'Delete',
            danger: true
          });
          if (!ok) return;

          const invBackup = [...allInv];
          const payBackup = [...loadPayments()];
          saveInvoices(allInv.filter((x) => String(x.id) !== String(iid)));
          savePayments(payBackup.filter((p) => String(p.invoiceId) !== String(iid)));
          renderList();
          toast(`Deleted ${inv.invNo}`, 'warning', () => {
            saveInvoices(invBackup);
            savePayments(payBackup);
            renderList();
            toast(`Restored ${inv.invNo}`, 'success');
          });
        });
      });
    }

    function syncMonthDropdown(list, paidByInv) {
      if (!monthSelect) return;
      const prevVal = monthSelect.value;
      const monthBuckets = new Map();
      list.forEach((inv) => {
        const mk = getMonthKey(inv);
        const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
        const cur = monthBuckets.get(mk) || { count: 0, total: 0, paid: 0, balance: 0 };
        cur.count += 1;
        cur.total += pay.total;
        cur.paid += pay.paid;
        cur.balance += pay.balance;
        monthBuckets.set(mk, cur);
      });

      const sortedKeys = Array.from(monthBuckets.keys()).sort((a, b) => b.localeCompare(a));
      monthSelect.innerHTML = `<option value="">All Months (${list.length})</option>` + sortedKeys.map((mk) => {
        const info = monthBuckets.get(mk);
        return `<option value="${escapeHtml(mk)}">${escapeHtml(formatMonthLabel(mk))} (${info.count} · ${formatCompactINR(info.total)})</option>`;
      }).join('');
      if (!initialMonthApplied && urlMonthParam && sortedKeys.includes(urlMonthParam)) {
        monthSelect.value = urlMonthParam;
        initialMonthApplied = true;
      } else if (prevVal && sortedKeys.includes(prevVal)) {
        monthSelect.value = prevVal;
      }

      if (monthlySummaryEl) {
        if (sortedKeys.length > 0) {
          const totalAll = list.reduce((s, inv) => s + computePaymentState(inv, paidByInv.get(String(inv.id)) || 0).total, 0);
          monthlySummaryEl.style.display = 'block';
          monthlySummaryEl.innerHTML = `
            <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;">
              <button type="button" class="btn btn-sm ${!monthSelect.value ? 'btn-primary' : 'btn-secondary'}" data-pick-month="" style="white-space:nowrap;">
                All Months · ${list.length} (${formatCompactINR(totalAll)})
              </button>
              ${sortedKeys.map((mk) => {
                const info = monthBuckets.get(mk);
                const active = monthSelect.value === mk;
                return `
                  <button type="button" class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}" data-pick-month="${escapeHtml(mk)}" style="white-space:nowrap;">
                    ${escapeHtml(formatMonthShort(mk))} · ${info.count} (${formatCompactINR(info.total)})
                  </button>
                `;
              }).join('')}
            </div>
          `;
          monthlySummaryEl.querySelectorAll('[data-pick-month]').forEach((chip) => {
            chip.addEventListener('click', () => {
              monthSelect.value = chip.getAttribute('data-pick-month') || '';
              currentPage = 1;
              renderList();
            });
          });
        } else {
          monthlySummaryEl.style.display = 'none';
        }
      }
    }

    function renderList() {
      const list = loadInvoices();
      const payments = loadPayments();
      const paidByInv = new Map();
      payments.forEach((p) => {
        const k = String(p.invoiceId);
        paidByInv.set(k, (paidByInv.get(k) || 0) + (Number(p.amount) || 0));
      });

      syncMonthDropdown(list, paidByInv);

      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const filterVal = (statusSelect ? statusSelect.value : '').trim().toLowerCase();
      const monthFilter = (monthSelect ? monthSelect.value : '').trim();

      const enriched = list
        .map((inv) => ({
          inv,
          monthKey: getMonthKey(inv),
          pay: computePaymentState(inv, paidByInv.get(String(inv.id)) || 0)
        }))
        .filter(({ inv, monthKey, pay }) => {
          const hay = `${inv.invNo} ${inv.buyer?.name || ''} ${inv.buyer?.email || ''} ${inv.buyer?.gstin || ''} ${pay.label} ${inv.docType || ''}`.toLowerCase();
          const matchesQ = !q || hay.includes(q);
          const matchesMonth = !monthFilter || monthKey === monthFilter;
          let matchesStatus = true;
          if (filterVal === 'paid') matchesStatus = pay.key === 'paid';
          else if (filterVal === 'sent') matchesStatus = pay.key === 'unpaid' && !pay.overdue;
          else if (filterVal === 'partial') matchesStatus = pay.key === 'advance' || pay.key === 'partial';
          else if (filterVal === 'draft') matchesStatus = pay.key === 'draft';
          else if (filterVal === 'overdue') matchesStatus = pay.overdue;
          return matchesQ && matchesMonth && matchesStatus;
        });

      const shownTotal = enriched.reduce((acc, x) => acc + x.pay.total, 0);

      if (viewMode === 'monthly' && monthlyGroupsEl) {
        if (flatWrapper) flatWrapper.style.display = 'none';
        monthlyGroupsEl.style.display = 'block';

        if (!enriched.length) {
          monthlyGroupsEl.innerHTML = `
            <div class="card">
              <div class="table-empty-state">
                <div class="table-empty-title">${list.length ? 'No matching invoices found' : 'No invoices created yet'}</div>
                <div class="table-empty-desc">${list.length ? 'Try clearing your search, month, or status filter.' : 'Create your first GST Tax Invoice, Delivery Challan, or Raw Material Bill.'}</div>
                ${!list.length ? '<a href="invoice-create.html" class="btn btn-primary btn-sm" style="margin-top:12px;">+ Create Invoice</a>' : ''}
              </div>
            </div>
          `;
          return;
        }

        const groups = new Map();
        enriched.forEach((item) => {
          if (!groups.has(item.monthKey)) groups.set(item.monthKey, []);
          groups.get(item.monthKey).push(item);
        });
        const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

        monthlyGroupsEl.innerHTML = sortedGroupKeys.map((mk) => {
          const items = groups.get(mk);
          const mTotal = items.reduce((s, x) => s + x.pay.total, 0);
          const mPaid = items.reduce((s, x) => s + x.pay.paid, 0);
          const mDue = items.reduce((s, x) => s + x.pay.balance, 0);
          return `
            <div class="card" style="padding:0;overflow:hidden;margin-bottom:18px;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg-subtle);">
                <div>
                  <div style="font-size:1rem;font-weight:800;color:var(--text-main);">${escapeHtml(formatMonthLabel(mk))}</div>
                  <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">${items.length} document${items.length === 1 ? '' : 's'}</div>
                </div>
                <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:0.8rem;font-family:var(--font-mono);">
                  <span>Total: <strong style="color:var(--text-main);">${formatINR(mTotal)}</strong></span>
                  <span>Received: <strong style="color:var(--success);">${formatINR(mPaid)}</strong></span>
                  <span>Due: <strong style="color:${mDue > 0.01 ? 'var(--danger)' : 'var(--text-muted)'};">${formatINR(mDue)}</strong></span>
                </div>
              </div>
              <div class="table-responsive-wrapper" style="border:none;border-radius:0;box-shadow:none;">
                <table class="enterprise-table zebra">
                  <thead>
                    <tr>
                      <th style="width:40px;">#</th>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th class="col-align-right">Total Amount</th>
                      <th>Status</th>
                      <th class="col-align-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(({ inv, pay }) => buildRowHtml(inv, pay)).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('');

        monthlyGroupsEl.querySelectorAll('table.enterprise-table').forEach(applyTableLabels);
        wireRowActions(monthlyGroupsEl);
        return;
      }

      // Flat "All List" Mode with Real Pagination
      if (monthlyGroupsEl) monthlyGroupsEl.style.display = 'none';
      if (flatWrapper) flatWrapper.style.display = 'block';

      const totalPages = Math.max(1, Math.ceil(enriched.length / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      const startIdx = (currentPage - 1) * PAGE_SIZE;
      const pageItems = enriched.slice(startIdx, startIdx + PAGE_SIZE);

      if (paginationText) {
        paginationText.innerHTML = `Showing <strong>${pageItems.length}</strong> of <strong>${enriched.length}</strong> documents · <strong>${formatINR(shownTotal)}</strong>`;
      }

      if (paginationBtnsEl) {
        if (totalPages <= 1) {
          paginationBtnsEl.innerHTML = '';
        } else {
          let pHtml = `<button type="button" class="pagination-btn${currentPage === 1 ? ' disabled' : ''}" data-page="${currentPage - 1}">&laquo;</button>`;
          for (let p = 1; p <= totalPages; p++) {
            pHtml += `<button type="button" class="pagination-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
          }
          pHtml += `<button type="button" class="pagination-btn${currentPage === totalPages ? ' disabled' : ''}" data-page="${currentPage + 1}">&raquo;</button>`;
          paginationBtnsEl.innerHTML = pHtml;
          paginationBtnsEl.querySelectorAll('[data-page]').forEach((btn) => {
            btn.addEventListener('click', () => {
              if (btn.classList.contains('disabled')) return;
              const target = Number(btn.getAttribute('data-page')) || 1;
              currentPage = Math.max(1, Math.min(totalPages, target));
              renderList();
            });
          });
        }
      }

      if (!pageItems.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8">
              <div class="table-empty-state">
                <div class="table-empty-title">${list.length ? 'No matching invoices found' : 'No invoices yet'}</div>
                <div class="table-empty-desc">${list.length ? 'Try clearing your search, month, or status filter.' : 'Create your first GST Tax Invoice, Delivery Challan, or Raw Material Bill.'}</div>
                ${!list.length ? '<a href="invoice-create.html" class="btn btn-primary btn-sm" style="margin-top:12px;">+ Create Invoice</a>' : ''}
              </div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = pageItems.map(({ inv, pay }) => buildRowHtml(inv, pay)).join('');
      applyTableLabels(table);
      wireRowActions(tbody);
    }

    viewModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        viewMode = btn.getAttribute('data-view-mode') || 'monthly';
        viewModeBtns.forEach((b) => b.classList.toggle('active', b === btn));
        renderList();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        currentPage = 1;
        renderList();
      });
    }
    if (monthSelect) {
      monthSelect.addEventListener('change', () => {
        currentPage = 1;
        renderList();
      });
    }
    if (statusSelect) {
      statusSelect.addEventListener('change', () => {
        currentPage = 1;
        renderList();
      });
    }
    renderList();
  }

  function initPaymentsModule() {
    const root = document.getElementById('payments-root');
    if (!root) return;

    const compTbody = document.getElementById('payments-company-tbody');
    const invTbody = document.getElementById('payments-invoice-tbody');
    const filterTabs = document.querySelectorAll('#payments-filter-tabs [data-pay-filter]');
    let currentFilter = 'all';

    function render() {
      const invoices = loadInvoices();
      let billed = 0;
      let received = 0;
      let overdueCount = 0;
      const byCompany = {};

      const enriched = invoices.map((inv) => {
        const pay = computePaymentState(inv);
        billed += pay.total;
        received += pay.paid;
        if (pay.overdue) overdueCount++;

        const cname = inv.buyer?.name || 'Unnamed customer';
        if (!byCompany[cname]) {
          byCompany[cname] = { name: cname, billed: 0, paid: 0, count: 0, overdue: 0 };
        }
        byCompany[cname].billed += pay.total;
        byCompany[cname].paid += pay.paid;
        byCompany[cname].count += 1;
        if (pay.overdue) byCompany[cname].overdue += 1;
        return { inv, pay };
      });

      const outstanding = Math.max(0, billed - received);
      const pctCollected = billed > 0 ? Math.round((received / billed) * 100) : 0;
      const companiesList = Object.values(byCompany).sort((a, b) => (b.billed - b.paid) - (a.billed - a.paid));
      const owingCompanies = companiesList.filter((c) => c.billed - c.paid > 0.01).length;

      const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      setTxt('payments-sub', `${formatINR(outstanding)} still to collect across active bills`);
      setTxt('pay-stat-billed', formatINR(billed));
      setTxt('pay-stat-count', `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`);
      setTxt('pay-stat-received', formatINR(received));
      setTxt('pay-stat-pct', `${pctCollected}% collected`);
      setTxt('pay-stat-outstanding', formatINR(outstanding));
      setTxt('pay-stat-firms', `${owingCompanies} compan${owingCompanies === 1 ? 'y' : 'ies'} owing`);
      setTxt('pay-stat-overdue', String(overdueCount));

      if (compTbody) {
        if (!companiesList.length) {
          compTbody.innerHTML = `<tr><td colspan="5"><div class="table-empty-state"><div class="table-empty-title">No invoices yet</div><div class="table-empty-desc">Create an invoice to track company receivables.</div></div></td></tr>`;
        } else {
          compTbody.innerHTML = companiesList.map((c) => {
            const bal = Math.max(0, Math.round((c.billed - c.paid) * 100) / 100);
            const pct = c.billed > 0 ? Math.round((c.paid / c.billed) * 100) : 0;
            let badge = 'paid';
            let label = 'Fully paid';
            if (bal > 0.01) {
              if (c.paid <= 0.01) {
                badge = c.overdue ? 'overdue' : 'sent';
                label = c.overdue ? 'Overdue' : 'Payment pending';
              } else if (pct >= 45 && pct <= 55) {
                badge = 'partial';
                label = `${pct}% advance paid`;
              } else {
                badge = 'partial';
                label = `${pct}% received`;
              }
            }
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div class="avatar" style="width:34px;height:34px;font-size:0.75rem;">${escapeHtml(getInitials(c.name, 'CO'))}</div>
                    <div>
                      <div style="font-weight:700;">${escapeHtml(c.name)}</div>
                      <div style="font-size:0.75rem;color:var(--text-muted);">${c.count} invoice${c.count === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                </td>
                <td class="col-align-right col-mono">${formatINR(c.billed)}</td>
                <td class="col-align-right col-mono">${formatINR(c.paid)}</td>
                <td class="col-bold col-align-right col-mono">${bal > 0.01 ? formatINR(bal) : '—'}</td>
                <td><span class="status-badge ${badge}">${escapeHtml(label)}</span></td>
              </tr>
            `;
          }).join('');
        }
      }

      const visible = enriched.filter(({ pay }) => {
        if (currentFilter === 'unpaid') return pay.key === 'unpaid';
        if (currentFilter === 'part') return pay.key === 'advance' || pay.key === 'partial';
        if (currentFilter === 'paid') return pay.key === 'paid';
        return true;
      });

      if (invTbody) {
        if (!visible.length) {
          invTbody.innerHTML = `<tr><td colspan="8"><div class="table-empty-state"><div class="table-empty-title">Nothing sits in this group right now</div><div class="table-empty-desc">Switch filters above or create a new invoice.</div></div></td></tr>`;
        } else {
          invTbody.innerHTML = visible.map(({ inv, pay }) => `
            <tr>
              <td class="col-bold col-mono"><a href="invoice-preview.html?id=${encodeURIComponent(inv.id)}" style="color:var(--primary);">${escapeHtml(inv.invNo)}</a></td>
              <td>${escapeHtml(inv.buyer?.name || 'Client')}</td>
              <td style="${pay.overdue ? 'color:var(--danger);font-weight:600;' : ''}">${escapeHtml(inv.dueDate ? formatDisplayDate(inv.dueDate) : '—')}</td>
              <td class="col-align-right col-mono">${formatINR(pay.total)}</td>
              <td class="col-align-right col-mono">${formatINR(pay.paid)}</td>
              <td class="col-bold col-align-right col-mono">${pay.balance > 0.01 ? formatINR(pay.balance) : '—'}</td>
              <td><span class="status-badge ${pay.badgeClass}">${escapeHtml(pay.label)}</span></td>
              <td class="col-align-right">
                <button type="button" class="btn btn-secondary btn-sm" data-pay-open="${escapeHtml(inv.id)}">${pay.balance > 0.01 ? 'Record Payment' : 'View'}</button>
              </td>
            </tr>
          `).join('');

          invTbody.querySelectorAll('[data-pay-open]').forEach((btn) => {
            btn.addEventListener('click', () => {
              openRecordPaymentModal(btn.getAttribute('data-pay-open'), render);
            });
          });
        }
      }

      root.querySelectorAll('table.enterprise-table').forEach(applyTableLabels);
    }

    filterTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-pay-filter') || 'all';
        filterTabs.forEach((b) => b.classList.toggle('active', b === btn));
        render();
      });
    });

    render();

    const payParam = new URLSearchParams(window.location.search).get('pay');
    if (payParam) {
      openRecordPaymentModal(payParam, render);
    }
  }

  function initPlansModule() {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;

    const welcomeBanner = document.getElementById('plans-welcome-banner');
    const subEl = document.getElementById('plans-current-sub');
    const isWelcome = new URLSearchParams(window.location.search).get('welcome') === '1';

    function openPlanCheckoutModal(planKey, p) {
      const backdrop = document.createElement('div');
      backdrop.className = 'ios-sheet-backdrop';
      backdrop.innerHTML = `
        <div class="ios-sheet-modal" role="dialog" aria-modal="true" style="max-width:440px;">
          <div style="font-size:0.72rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.06em;">Confirm &amp; Activate</div>
          <div class="ios-sheet-title" style="margin-top:4px;">${escapeHtml(p.label)} Plan — ₹${p.price.toLocaleString('en-IN')}/month</div>
          <ul class="plan-features" style="margin:12px 0 16px;">
            ${p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
          <form id="plan-pay-form" style="display:flex;flex-direction:column;gap:12px;">
            <div class="form-group">
              <label class="form-label" for="plan-upi">UPI ID or Card Reference</label>
              <input id="plan-upi" type="text" class="form-control" placeholder="name@bank or card ending 4242" required>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);background:var(--bg-app);padding:10px 12px;border-radius:10px;border:1px solid var(--border);">
              Instant preview mode: your reference is saved locally and plan benefits apply immediately across invoices &amp; prints.
            </div>
            <div class="ios-sheet-actions">
              <button type="button" class="btn btn-secondary" data-plan-cancel="1">Cancel</button>
              <button type="submit" class="btn btn-primary">Pay ₹${p.price.toLocaleString('en-IN')} &amp; Activate</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('show'));

      const close = () => {
        backdrop.classList.remove('show');
        setTimeout(() => backdrop.remove(), 220);
      };
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop || e.target.closest('[data-plan-cancel]')) close();
      });
      backdrop.querySelector('#plan-pay-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const ref = backdrop.querySelector('#plan-upi')?.value.trim() || 'DEMO-UPI';
        updateCurrentUser((u) => ({ ...u, plan: planKey, planPayRef: ref }));
        close();
        toast(`Switched to ${p.label} plan!`, 'success');
        render();
        if (isWelcome) {
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 550);
        }
      });
    }

    function render() {
      const current = getUserPlan();
      if (subEl) {
        subEl.textContent = `Currently on ${current.label} · ${current.blurb}. Free & Pro print with the InvoiceFlex watermark; Enterprise prints clean.`;
      }

      if (welcomeBanner) {
        welcomeBanner.innerHTML = isWelcome ? `
          <div class="card" style="background:linear-gradient(135deg, rgba(0,122,255,0.12) 0%, rgba(10,132,255,0.06) 100%);border:1px solid rgba(0,122,255,0.28);margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--primary);letter-spacing:0.06em;">Final Onboarding Step</div>
                <div style="font-size:1.05rem;font-weight:800;color:var(--text-main);margin-top:2px;">Pick your billing tier or continue on Free</div>
                <div style="font-size:0.84rem;color:var(--text-muted);margin-top:2px;">You can switch tiers anytime from the Plans tab.</div>
              </div>
              <a href="dashboard.html" class="btn btn-primary btn-sm">Continue to Dashboard →</a>
            </div>
          </div>
        ` : '';
      }

      grid.innerHTML = Object.entries(PLAN_LIMITS).map(([key, p]) => {
        const isCurrent = current.key === key;
        const isPop = key === 'Pro';
        return `
          <div class="plan-card${isCurrent ? ' is-current' : ''}${isPop ? ' is-popular' : ''}">
            ${isPop ? '<div class="plan-badge">Most Popular</div>' : ''}
            <div class="plan-name">${escapeHtml(p.label)}</div>
            <div class="plan-tagline">${escapeHtml(p.tagline)}</div>
            <div class="plan-price">
              ${p.price > 0
                ? `<span class="amt">₹${p.price.toLocaleString('en-IN')}</span><span class="per">/month</span>`
                : `<span class="amt">Free</span>`
              }
            </div>
            <ul class="plan-features">
              ${p.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
            </ul>
            ${isCurrent
              ? `<button type="button" class="btn btn-secondary" style="width:100%;" disabled>Current Plan</button>`
              : `<button type="button" class="btn btn-primary" style="width:100%;" data-choose-plan="${escapeHtml(key)}">Choose ${escapeHtml(p.label)}</button>`
            }
          </div>
        `;
      }).join('');

      grid.querySelectorAll('[data-choose-plan]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const k = btn.getAttribute('data-choose-plan');
          const p = PLAN_LIMITS[k];
          if (!p) return;
          if (p.price === 0) {
            updateCurrentUser((u) => ({ ...u, plan: 'Free' }));
            toast('Switched to Free plan', 'success');
            render();
            if (isWelcome) {
              setTimeout(() => { window.location.href = 'dashboard.html'; }, 450);
            }
          } else {
            openPlanCheckoutModal(k, p);
          }
        });
      });
    }

    render();
  }

  /* --------------------------------------------------------------------------
     9. Checkboxes & Pagination
     -------------------------------------------------------------------------- */
  function initSelectAllCheckboxes() {
    const theadCheck = document.querySelector('.enterprise-table thead input[type="checkbox"]');
    if (!theadCheck) return;
    const rowChecks = document.querySelectorAll('.enterprise-table tbody input[type="checkbox"]');
    theadCheck.addEventListener('change', () => {
      rowChecks.forEach((cb) => {
        cb.checked = theadCheck.checked;
      });
    });
  }

  function initPaginationButtons() {
    const btns = document.querySelectorAll('.pagination-btn:not(.disabled)');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.textContent.trim() === '«' || btn.textContent.trim() === '»') return;
        document.querySelectorAll('.pagination-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /* --------------------------------------------------------------------------
     9B. Quotations Store & Ledger Module (quotations.html)
     -------------------------------------------------------------------------- */
  function getDefaultQuotations() {
    return [
      {
        id: 'q-101',
        quoteNo: 'QTN/2026-2027/001',
        date: '01.05.2026',
        status: 'Accepted',
        buyerId: '1',
        buyer: {
          name: 'Acme Corporation',
          gstin: '27AAAAA1111A1Z1',
          state: 'Maharashtra',
          code: '27',
          address: '402, Trade Centre, Bandra Kurla Complex, Mumbai, MH - 400051',
          contact: 'Abhishek Sharma (+91 98765 43210)'
        },
        rows: [
          { desc: 'Precision CNC Machined Industrial Manifold Assembly', hsn: '848180', qty: 10, rate: 10000, gst: 18 }
        ],
        notes: '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days\n2. 18% GST Extra\n3. Transport Extra'
      },
      {
        id: 'q-102',
        quoteNo: 'QTN/2026-2027/002',
        date: '14.07.2026',
        status: 'Sent',
        buyerId: '3',
        buyer: {
          name: 'Apex Labs India',
          gstin: '29CCCCC3333C3Z3',
          state: 'Karnataka',
          code: '29',
          address: 'Indiranagar 100ft Rd, Bengaluru, KA - 560038',
          contact: 'Rajesh Patel (+91 93456 78901)'
        },
        rows: [
          { desc: 'Stainless Steel Pneumatic Valve Unit (SS-316)', hsn: '848190', qty: 20, rate: 5500, gst: 18 },
          { desc: 'High-Pressure Hydraulic Flange Kit', hsn: '730791', qty: 16, rate: 2000, gst: 18 }
        ],
        notes: '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days\n2. 18% GST Extra\n3. Transport Extra'
      },
      {
        id: 'q-103',
        quoteNo: 'QTN/2026-2027/003',
        date: '19.07.2026',
        status: 'Draft',
        buyerId: '2',
        buyer: {
          name: 'TechSolutions Group',
          gstin: '27BBBBB2222B2Z2',
          state: 'Maharashtra',
          code: '27',
          address: 'Tech Park Tower B, Pune, MH - 411001',
          contact: 'Meera Nair (+91 91234 56789)'
        },
        rows: [
          { desc: 'Custom Fabricated Control Panel Enclosure', hsn: '853710', qty: 5, rate: 14000, gst: 18 }
        ],
        notes: '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days\n2. 18% GST Extra\n3. Transport Extra'
      }
    ];
  }

  function loadQuotations() {
    return window.IFCloud.getData('quotations');
  }

  function saveQuotations(list) {
    window.IFCloud.setData('quotations', list);
  }

  function getQuotationSubtotal(q) {
    return (q.rows || []).reduce((acc, r) => acc + (Number(r.qty) || 0) * (Number(r.rate) || 0), 0);
  }

  function initQuotationsModule() {
    const root = document.getElementById('quotations-root');
    const tbody = document.getElementById('quotations-tbody');
    const table = document.getElementById('quotations-table');
    if (!root || !tbody || !table) return;

    const compInfo = getCompanyInfo();
    const compNameEl = document.getElementById('q-company-name');
    if (compNameEl) compNameEl.textContent = compInfo.name;

    const searchInp = document.getElementById('quotation-search');
    const statusSel = document.getElementById('quotation-status-filter');

    function render() {
      const all = loadQuotations();
      const q = (searchInp ? searchInp.value : '').trim().toLowerCase();
      const statusFilter = (statusSel ? statusSel.value : '').trim().toLowerCase();

      const totalVal = all.reduce((sum, item) => sum + getQuotationSubtotal(item), 0);
      const acceptedCount = all.filter((item) => (item.status || '').toLowerCase() === 'accepted').length;

      const countEl = document.getElementById('q-stat-count');
      const valEl = document.getElementById('q-stat-value');
      const accEl = document.getElementById('q-stat-accepted');
      if (countEl) countEl.textContent = String(all.length);
      if (valEl) valEl.textContent = formatINR(totalVal);
      if (accEl) accEl.textContent = String(acceptedCount);

      const filtered = all.filter((item) => {
        const itemsText = (item.rows || []).map((r) => r.desc).join(' ');
        const hay = `${item.quoteNo} ${item.buyer?.name || ''} ${item.buyer?.state || ''} ${itemsText}`.toLowerCase();
        const matchesQ = !q || hay.includes(q);
        const matchesStatus = !statusFilter || (item.status || '').toLowerCase() === statusFilter;
        return matchesQ && matchesStatus;
      });

      if (!filtered.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="table-empty-state">
                <div class="table-empty-title">No matching quotations found</div>
                <div class="table-empty-desc">Create a new quotation or adjust your search filter.</div>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      const statusBadgeMap = {
        accepted: 'paid',
        sent: 'sent',
        draft: 'draft'
      };

      tbody.innerHTML = filtered
        .map((item) => {
          const subtotal = getQuotationSubtotal(item);
          const stKey = (item.status || 'Sent').toLowerCase();
          const badgeCls = statusBadgeMap[stKey] || 'sent';
          const firstItem = item.rows && item.rows[0] ? item.rows[0].desc : 'Quotation Items';

          return `
            <tr data-qid="${escapeHtml(item.id)}">
              <td class="col-bold col-mono">
                <a href="invoice-preview.html?type=quotation&qid=${encodeURIComponent(item.id)}" style="color:var(--primary);">${escapeHtml(item.quoteNo)}</a>
              </td>
              <td>
                <div class="col-bold">${escapeHtml(item.buyer?.name || 'Client')}</div>
                <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(firstItem)}${item.rows && item.rows.length > 1 ? ` +${item.rows.length - 1} more` : ''}</div>
              </td>
              <td>${escapeHtml(formatDisplayDate(item.date))}</td>
              <td>${escapeHtml(item.buyer?.state || compInfo.stateName)}</td>
              <td class="col-align-right col-bold col-mono">${formatINR(subtotal)}</td>
              <td><span class="status-badge ${badgeCls}">${escapeHtml(item.status || 'Sent')}</span></td>
              <td class="col-align-right">
                <div class="table-actions-cell">
                  <a href="invoice-preview.html?type=quotation&qid=${encodeURIComponent(item.id)}" class="table-action-icon-btn" title="Preview & Print Quotation">
                    <svg class="icon-svg" style="width:15px;height:15px;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </a>
                  <a href="invoice-create.html?fromQuote=${encodeURIComponent(item.id)}" class="table-action-icon-btn" title="Convert to Tax Invoice">
                    <svg class="icon-svg" style="width:15px;height:15px;" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  </a>
                  <button type="button" class="table-action-icon-btn" data-q-billbook="${escapeHtml(item.id)}" title="File in Bill Book">
                    <svg class="icon-svg" style="width:15px;height:15px;" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  </button>
                  <button type="button" class="table-action-icon-btn delete-hover" data-q-delete="${escapeHtml(item.id)}" title="Delete Quotation">
                    <svg class="icon-svg" style="width:15px;height:15px;" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');

      applyTableLabels(table);

      tbody.querySelectorAll('[data-q-billbook]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-q-billbook');
          const found = loadQuotations().find((x) => x.id === id);
          if (!found) return;
          openSaveToBillBookModal({
            billNo: found.quoteNo,
            party: found.buyer?.name || 'Client',
            date: formatDisplayDate(found.date),
            amount: getQuotationSubtotal(found),
            type: 'gst',
            notes: `Quotation #${found.quoteNo} (${found.rows?.[0]?.desc || 'Estimate'})`
          });
        });
      });

      tbody.querySelectorAll('[data-q-delete]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-q-delete');
          const allList = loadQuotations();
          const found = allList.find((x) => x.id === id);
          if (!found) return;
          const ok = await confirmSheet({
            title: 'Delete Quotation?',
            message: `Remove Quotation #${found.quoteNo} for ${found.buyer?.name || 'client'}?`,
            confirmText: 'Delete',
            danger: true
          });
          if (!ok) return;
          const backup = [...allList];
          saveQuotations(allList.filter((x) => x.id !== id));
          render();
          toast(`Removed #${found.quoteNo}`, 'warning', () => {
            saveQuotations(backup);
            render();
            toast(`Restored #${found.quoteNo}`, 'success');
          });
        });
      });
    }

    if (searchInp) searchInp.addEventListener('input', render);
    if (statusSel) statusSel.addEventListener('change', render);
    render();
  }

  /* --------------------------------------------------------------------------
     10. Live Interactive GST Invoice & Quotation Builder (invoice-create.html)
     -------------------------------------------------------------------------- */
  function initInvoiceBuilder() {
    const form = document.querySelector('form[action="invoice-preview.html"]');
    if (!form) return;

    const buyerSelect = document.getElementById('select-buyer');
    const itemsTbody = form.querySelector('.enterprise-table tbody');
    const addRowBtn = form.querySelector('button.btn-secondary.btn-sm');
    const compInfo = getCompanyInfo();
    const customers = loadCustomers();
    const invoicesList = loadInvoices();
    const plan = getUserPlan();
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayUsed = invoicesList.filter((inv) => String(inv.issueDate || '') === todayIso).length;

    // 1. Missing company profile gate notice + daily plan quota notice
    const gateSlot = document.getElementById('profile-gate-slot');
    const missingFields = getMissingCompanyFields(compInfo);
    if (gateSlot) {
      let banners = '';
      if (missingFields.length) {
        banners += `
          <div class="card" style="margin-bottom:18px;border-color:rgba(245,158,11,0.5);background:rgba(245,158,11,0.08);padding:14px 18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div style="font-size:0.875rem;color:var(--text-main);">
                <strong>Complete Business Setup before billing:</strong> Missing ${escapeHtml(missingFields.slice(0, 4).join(', '))}${missingFields.length > 4 ? ` (+${missingFields.length - 4} more)` : ''}.
              </div>
              <a href="company-settings.html" class="btn btn-primary btn-sm">Complete Setup →</a>
            </div>
          </div>
        `;
      }
      if (plan.invoicesDaily && todayUsed >= plan.invoicesDaily) {
        banners += `
          <div class="card" style="margin-bottom:18px;border-color:rgba(239,68,68,0.45);background:rgba(239,68,68,0.08);padding:14px 18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div style="font-size:0.875rem;color:var(--text-main);">
                <strong>Daily limit reached (${todayUsed}/${plan.invoicesDaily}):</strong> Upgrade your plan to issue more Tax Invoices today.
              </div>
              <a href="plans.html" class="btn btn-primary btn-sm">Upgrade Plan</a>
            </div>
          </div>
        `;
      }
      gateSlot.innerHTML = banners;
    }

    // 2. Build buyer lookup dictionary from real user-scoped customers
    const buyerMap = {};
    customers.forEach((c) => {
      buyerMap[String(c.id)] = {
        id: String(c.id),
        name: c.name,
        email: c.email || '',
        gstin: c.gstin || '',
        state: c.state || compInfo.stateName || 'Gujarat',
        code: c.code || (c.gstin ? c.gstin.slice(0, 2) : (compInfo.stateCode || '24')),
        city: c.city || '',
        address: [c.address, c.city, c.zip].filter(Boolean).join(', '),
        contact: [c.contactName, c.phone].filter(Boolean).join(' · ')
      };
    });

    if (buyerSelect) {
      if (!customers.length) {
        buyerSelect.innerHTML = `<option value="">No customers yet — click + New Customer</option>`;
      } else {
        buyerSelect.innerHTML = `<option value="">Choose registered customer</option>` + customers.map((c) =>
          `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.gstin ? ` (GSTIN: ${escapeHtml(c.gstin)})` : ''}</option>`
        ).join('');
      }
    }

    const docTypeInput = document.getElementById('doc-type-input');
    const docTypeBtns = document.querySelectorAll('#doc-type-selector [data-doc-type]');
    const partyFromLabel = document.getElementById('party-from-label');
    const invoiceDispatchFields = document.getElementById('invoice-dispatch-fields');
    const challanFields = document.getElementById('challan-extra-fields');
    const rawFields = document.getElementById('raw-extra-fields');
    const advanceCard = document.getElementById('advance-payment-card');
    const advanceAmtInput = document.getElementById('advance-amount');
    const advanceHalfBtn = document.getElementById('btn-adv-half');
    const advanceClearBtn = document.getElementById('btn-adv-clear');
    const dueDateGroup = document.getElementById('due-date-group');
    const dueDateInput = document.getElementById('due-date');
    const issueDateInput = document.getElementById('issue-date');
    const payTermsGroup = document.getElementById('pay-terms-group');
    const invNoInput = document.getElementById('inv-no');
    const invNoLabel = document.getElementById('inv-no-label');
    const issueDateLabel = document.getElementById('issue-date-label');
    const saveQuoteBtn = document.getElementById('btn-save-quotation');
    const saveDraftLink = document.getElementById('btn-save-draft-link');
    const topPageTitle = document.querySelector('.topbar .page-title');
    const notesTextarea = form.querySelector('.card:has(textarea.form-textarea) textarea') || document.querySelector('textarea.form-textarea');

    if (issueDateInput && !issueDateInput.value) issueDateInput.value = todayIso;
    if (dueDateInput && !dueDateInput.value) {
      const d = new Date();
      d.setDate(d.getDate() + 15);
      dueDateInput.value = d.toISOString().slice(0, 10);
    }

    // Hydrate Bill From section
    const compSelectOpt = form.querySelector('select[disabled] option');
    if (compSelectOpt) compSelectOpt.textContent = compInfo.name || 'Your Business (Complete Business Setup)';
    const builderMeta = document.getElementById('builder-company-meta');
    if (builderMeta) {
      const gstDisplay = compInfo.gstin ? escapeHtml(compInfo.gstin) : 'Not configured (<a href="company-settings.html" style="color:var(--primary);text-decoration:underline;">Setup</a>)';
      const addrDisplay = compInfo.address ? escapeHtml(compInfo.address) : 'Add business address in Business Setup';
      const stateDisplay = compInfo.stateName ? `${escapeHtml(compInfo.stateName)} (Code ${escapeHtml(compInfo.stateCode || '24')})` : 'State not configured';
      builderMeta.innerHTML = `<strong>GSTIN:</strong> ${gstDisplay}${compInfo.pan ? ` · <strong>PAN:</strong> ${escapeHtml(compInfo.pan)}` : ''}<br>${addrDisplay}<br>${stateDisplay}`;
    }
    if (notesTextarea && compInfo.terms) {
      notesTextarea.value = compInfo.terms;
    }

    const quoteSeq = String(loadQuotations().length + 1).padStart(3, '0');
    const nextTaxNo = computeNextInvoiceNo(compInfo.name, invoicesList);
    const docConfigs = {
      tax: {
        title: 'Create GST Invoice',
        defaultNo: nextTaxNo,
        fromLabel: 'Bill From (Seller)',
        noLabel: 'Invoice Number',
        dateLabel: 'Invoice Date'
      },
      quotation: {
        title: 'Create Quotation',
        defaultNo: `${compInfo.quotePrefix || 'QTN/2026-2027/'}${quoteSeq}`,
        fromLabel: 'Quotation From (Supplier)',
        noLabel: 'Quotation Number',
        dateLabel: 'Quotation Date'
      },
      challan: {
        title: 'Create Delivery Challan',
        defaultNo: `DC-${new Date().getFullYear()}-${String(invoicesList.length + 1).padStart(3, '0')}`,
        fromLabel: 'Consigner (Dispatcher)',
        noLabel: 'Challan Number',
        dateLabel: 'Dispatch Date'
      },
      raw: {
        title: 'Record Raw Material Bill',
        defaultNo: `PUR-${new Date().getFullYear()}-${String(invoicesList.length + 1).padStart(3, '0')}`,
        fromLabel: 'Supplier / Purchase Record',
        noLabel: 'Purchase Bill #',
        dateLabel: 'Bill Date'
      }
    };

    function setDocType(type) {
      const cfg = docConfigs[type] || docConfigs.tax;
      if (docTypeInput) docTypeInput.value = type;
      docTypeBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-doc-type') === type));
      if (partyFromLabel) partyFromLabel.textContent = cfg.fromLabel;
      if (topPageTitle) topPageTitle.textContent = cfg.title;
      if (invNoLabel) invNoLabel.innerHTML = `${cfg.noLabel} <span class="required-star">*</span>`;
      if (issueDateLabel) issueDateLabel.innerHTML = `${cfg.dateLabel} <span class="required-star">*</span>`;

      if (invoiceDispatchFields) invoiceDispatchFields.style.display = type === 'tax' ? 'flex' : 'none';
      if (challanFields) challanFields.style.display = type === 'challan' ? 'flex' : 'none';
      if (rawFields) rawFields.style.display = type === 'raw' ? 'flex' : 'none';

      const showDue = type === 'tax' || type === 'raw';
      if (dueDateGroup) dueDateGroup.style.display = showDue ? 'flex' : 'none';
      if (dueDateInput) dueDateInput.required = showDue;
      if (payTermsGroup) payTermsGroup.style.display = showDue ? 'flex' : 'none';
      if (advanceCard) advanceCard.style.display = showDue ? 'block' : 'none';

      if (saveQuoteBtn) saveQuoteBtn.style.display = type === 'quotation' ? 'inline-flex' : 'none';
      if (saveDraftLink) {
        saveDraftLink.href = type === 'quotation' ? 'quotations.html' : 'invoice-list.html';
        saveDraftLink.textContent = type === 'quotation' ? 'View All Quotations' : 'Save as Draft';
      }

      if (invNoInput) invNoInput.value = cfg.defaultNo;
    }

    docTypeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-doc-type');
        setDocType(t);
        toast(`Switched to ${btn.textContent.trim()}`, 'info');
      });
    });

    const supplyBox = buyerSelect ? buyerSelect.closest('div').nextElementSibling : null;
    const summaryRows = form.querySelectorAll('.calc-row');
    let lastGrandTotal = 0;

    function recalculate() {
      const buyerId = buyerSelect ? buyerSelect.value : '';
      const buyer = buyerMap[buyerId] || customers[0] || {
        state: compInfo.stateName || 'Gujarat',
        code: compInfo.stateCode || '24'
      };
      const sellerStateCode = compInfo.stateCode || '24';
      const isIntrastate = (buyer.code || sellerStateCode) === sellerStateCode;

      if (supplyBox) {
        if (!buyerId && !customers.length) {
          supplyBox.innerHTML = `<span style="color:var(--danger);">Please add a customer first before creating a bill.</span>`;
        } else {
          supplyBox.innerHTML = `<strong>Place of Supply:</strong> ${escapeHtml(buyer.state || 'Gujarat')} (State Code ${escapeHtml(buyer.code || sellerStateCode)}) <span class="status-badge ${isIntrastate ? 'paid' : 'sent'}" style="font-size:0.7rem;padding:2px 8px;margin-left:4px;">${isIntrastate ? 'Intrastate · CGST + SGST' : 'Interstate · IGST Applies'}</span>`;
        }
      }

      let subtotal = 0;
      let totalTax = 0;
      const rows = itemsTbody ? Array.from(itemsTbody.querySelectorAll('tr.item-row')) : [];
      rows.forEach((tr) => {
        const qtyInput = tr.querySelector('input[name*="qty"]');
        const rateInput = tr.querySelector('input[name*="rate"]');
        const gstSelect = tr.querySelector('select');
        const valCell = tr.querySelector('td.col-bold');

        const qty = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
        const rate = parseFloat(rateInput ? rateInput.value : 0) || 0;
        const gstRate = parseFloat(gstSelect ? gstSelect.value : (compInfo.defaultGst || 18)) || 0;

        const taxable = qty * rate;
        const tax = taxable * (gstRate / 100);
        subtotal += taxable;
        totalTax += tax;

        if (valCell) valCell.textContent = formatINR(taxable);
      });

      const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;
      lastGrandTotal = grandTotal;

      if (summaryRows.length >= 5) {
        summaryRows[0].querySelector('span:last-child').textContent = formatINR(subtotal);
        if (isIntrastate) {
          summaryRows[1].style.display = 'flex';
          summaryRows[2].style.display = 'flex';
          summaryRows[1].querySelector('span:first-child').textContent = 'CGST (9%)';
          summaryRows[1].querySelector('span:last-child').textContent = formatINR(totalTax / 2);
          summaryRows[2].querySelector('span:first-child').textContent = 'SGST (9%)';
          summaryRows[2].querySelector('span:last-child').textContent = formatINR(totalTax / 2);
        } else {
          summaryRows[1].style.display = 'flex';
          summaryRows[2].style.display = 'none';
          summaryRows[1].querySelector('span:first-child').textContent = 'Interstate IGST (18%)';
          summaryRows[1].querySelector('span:last-child').textContent = formatINR(totalTax);
        }
        summaryRows[3].querySelector('span:last-child').textContent = formatINR(totalTax);
        summaryRows[4].querySelector('span:last-child').textContent = formatINR(grandTotal);
      }
    }

    if (advanceHalfBtn && advanceAmtInput) {
      advanceHalfBtn.addEventListener('click', () => {
        recalculate();
        advanceAmtInput.value = (Math.round((lastGrandTotal * 0.5) * 100) / 100).toFixed(2);
      });
    }
    if (advanceClearBtn && advanceAmtInput) {
      advanceClearBtn.addEventListener('click', () => {
        advanceAmtInput.value = '';
      });
    }

    function createItemRowHtml(idx, item = {}) {
      const defGst = String(item.gst ?? compInfo.defaultGst ?? '18');
      return `
        <td><textarea rows="2" class="form-control" name="item_desc_${idx}" placeholder="Product Name&#10;Specs or size on next line (optional)" required>${escapeHtml(item.desc || '')}</textarea></td>
        <td><input type="text" class="form-control col-mono" name="item_hsn_${idx}" value="${escapeHtml(item.hsn || '848180')}" placeholder="HSN/SAC"></td>
        <td><input type="number" min="1" step="1" class="form-control col-align-right" name="item_qty_${idx}" value="${item.qty ?? 1}" required style="padding:10px 8px;"></td>
        <td><input type="number" min="0" step="0.01" class="form-control col-align-right" name="item_rate_${idx}" value="${item.rate ?? 5000}" required style="padding:10px 8px;"></td>
        <td>
          <select class="form-select" name="item_gst_${idx}" style="padding:10px 6px;">
            <option value="18" ${defGst === '18' ? 'selected' : ''}>18% GST</option>
            <option value="12" ${defGst === '12' ? 'selected' : ''}>12% GST</option>
            <option value="5" ${defGst === '5' ? 'selected' : ''}>5% GST</option>
            <option value="28" ${defGst === '28' ? 'selected' : ''}>28% GST</option>
            <option value="0" ${defGst === '0' ? 'selected' : ''}>0% Exempt</option>
          </select>
        </td>
        <td class="col-bold col-align-right col-mono" style="padding-top:24px;">₹0.00</td>
        <td>
          <button type="button" class="table-action-icon-btn delete-hover" style="border:none;" title="Delete row">
            <svg class="icon-svg" viewBox="0 0 24 24" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </td>
      `;
    }

    function bindRowEvents(tr) {
      tr.querySelectorAll('input, select, textarea').forEach((inp) => {
        inp.addEventListener('input', recalculate);
        inp.addEventListener('change', recalculate);
      });
      const delBtn = tr.querySelector('.delete-hover');
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          const allRows = itemsTbody.querySelectorAll('tr.item-row');
          if (allRows.length <= 1) {
            toast('Document must have at least one line item', 'warning');
            return;
          }
          tr.remove();
          recalculate();
          toast('Line item removed', 'info');
        });
      }
    }

    if (itemsTbody) {
      itemsTbody.querySelectorAll('tr.item-row').forEach(bindRowEvents);
    }

    if (addRowBtn && itemsTbody) {
      addRowBtn.addEventListener('click', () => {
        const idx = itemsTbody.querySelectorAll('tr.item-row').length + 1;
        const tr = document.createElement('tr');
        tr.className = 'item-row';
        tr.innerHTML = createItemRowHtml(idx, { hsn: '848180', qty: 1, rate: 5000 });
        itemsTbody.appendChild(tr);
        bindRowEvents(tr);
        applyTableLabels(form.querySelector('table.enterprise-table'));
        recalculate();
        tr.querySelector('textarea, input')?.focus();
      });
    }

    if (buyerSelect) {
      buyerSelect.addEventListener('change', recalculate);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlDocType = urlParams.get('type');
    const urlCustId = urlParams.get('customer_id');
    const fromQuoteId = urlParams.get('fromQuote');

    if (buyerSelect && urlCustId && buyerMap[urlCustId]) {
      buyerSelect.value = urlCustId;
    } else if (buyerSelect && customers.length && !buyerSelect.value) {
      buyerSelect.value = String(customers[0].id);
    }

    if (fromQuoteId) {
      let quoteObj = null;
      if (fromQuoteId === 'draft') {
        quoteObj = readSavedJson('invoiceflex_convert_quote_draft', null);
      } else {
        quoteObj = loadQuotations().find((x) => x.id === fromQuoteId) || null;
      }
      setDocType('tax');
      if (quoteObj) {
        if (buyerSelect && quoteObj.buyerId && buyerMap[quoteObj.buyerId]) {
          buyerSelect.value = quoteObj.buyerId;
        }
        const poInput = document.getElementById('po-no');
        if (poInput && quoteObj.quoteNo) poInput.value = quoteObj.quoteNo;
        if (notesTextarea && quoteObj.notes) notesTextarea.value = quoteObj.notes;
        if (itemsTbody && Array.isArray(quoteObj.rows) && quoteObj.rows.length) {
          itemsTbody.innerHTML = '';
          quoteObj.rows.forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.className = 'item-row';
            tr.innerHTML = createItemRowHtml(i + 1, r);
            itemsTbody.appendChild(tr);
            bindRowEvents(tr);
          });
          applyTableLabels(form.querySelector('table.enterprise-table'));
        }
        toast(`Converted Quotation #${quoteObj.quoteNo || quoteObj.invNo} into Tax Invoice`, 'success');
      }
    } else if (urlDocType && docConfigs[urlDocType]) {
      setDocType(urlDocType);
    } else {
      setDocType('tax');
    }

    recalculate();

    function collectFormDraft() {
      const buyerId = buyerSelect ? buyerSelect.value : '';
      const buyer = buyerMap[buyerId] || customers[0] || {
        name: 'Walk-in Buyer',
        gstin: '',
        state: compInfo.stateName || 'Gujarat',
        code: compInfo.stateCode || '24',
        address: '',
        contact: ''
      };
      const rows = Array.from(itemsTbody.querySelectorAll('tr.item-row')).map((tr) => ({
        desc: tr.querySelector('[name*="desc"]')?.value.trim() || 'Engineering Goods / Services',
        hsn: tr.querySelector('input[name*="hsn"]')?.value.trim() || '848180',
        qty: parseFloat(tr.querySelector('input[name*="qty"]')?.value) || 1,
        rate: parseFloat(tr.querySelector('input[name*="rate"]')?.value) || 0,
        gst: parseFloat(tr.querySelector('select')?.value) || 18
      }));
      const docType = docTypeInput ? docTypeInput.value : 'tax';
      const advanceAmount = Math.round((parseFloat(advanceAmtInput?.value || '0') || 0) * 100) / 100;
      const advanceMethod = document.getElementById('advance-method')?.value || 'UPI';

      return {
        docType,
        invNo: document.getElementById('inv-no')?.value.trim() || nextTaxNo,
        issueDate: document.getElementById('issue-date')?.value || todayIso,
        dueDate: document.getElementById('due-date')?.value || '',
        terms: document.getElementById('pay-terms')?.selectedOptions[0]?.textContent || 'Net 15 Days',
        poNo: document.getElementById('po-no')?.value.trim() || '-',
        poDate: document.getElementById('po-date')?.value.trim() || '-',
        vehicleNo: (docType === 'challan' ? document.getElementById('vehicle-no')?.value : document.getElementById('inv-vehicle-no')?.value)?.trim() || '-',
        ewayNo: document.getElementById('eway-no')?.value.trim() || '-',
        challanReason: document.getElementById('challan-reason')?.value || '',
        supplierRef: document.getElementById('supplier-ref')?.value || '',
        materialCat: document.getElementById('material-cat')?.value || '',
        notes: notesTextarea?.value || compInfo.terms || '',
        requireSign: document.getElementById('require-sign') ? document.getElementById('require-sign').checked : true,
        buyerId,
        buyer,
        rows,
        advanceAmount,
        advanceMethod
      };
    }

    function upsertQuotationFromDraft(draft, status = 'Sent') {
      const list = loadQuotations();
      const idx = list.findIndex((x) => x.quoteNo === draft.invNo);
      const record = {
        id: idx >= 0 ? list[idx].id : window.IFCloud.uuid(),
        quoteNo: draft.invNo,
        date: draft.issueDate,
        status: idx >= 0 ? list[idx].status : status,
        buyerId: draft.buyerId || '',
        buyer: draft.buyer,
        rows: draft.rows,
        notes: draft.notes
      };
      if (idx >= 0) list[idx] = record;
      else list.unshift(record);
      saveQuotations(list);
      return record;
    }

    function saveInvoiceToLedger(draft, statusOverride = null) {
      const list = loadInvoices();
      const totals = computeInvoiceTotals(draft);
      const adv = Math.min(totals.grand, Math.max(0, Number(draft.advanceAmount) || 0));
      const newId = window.IFCloud.uuid();
      const status = statusOverride || (adv >= totals.grand - 0.01 && totals.grand > 0 ? 'paid' : adv > 0.01 ? 'partial' : 'sent');

      const record = {
        id: newId,
        docType: draft.docType,
        invNo: draft.invNo,
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
        terms: draft.terms,
        poNo: draft.poNo,
        poDate: draft.poDate,
        vehicleNo: draft.vehicleNo,
        ewayNo: draft.ewayNo,
        challanReason: draft.challanReason,
        supplierRef: draft.supplierRef,
        materialCat: draft.materialCat,
        notes: draft.notes,
        requireSign: draft.requireSign,
        buyerId: draft.buyerId,
        buyer: draft.buyer,
        rows: draft.rows,
        totalAmount: totals.grand,
        status
      };

      list.unshift(record);
      saveInvoices(list);

      if (adv > 0.01 && draft.docType !== 'challan') {
        const payments = loadPayments();
        payments.unshift({
          id: window.IFCloud.uuid(),
          invoiceId: newId,
          amount: adv,
          paidOn: draft.issueDate || todayIso,
          method: draft.advanceMethod || 'UPI',
          note: 'Advance at billing'
        });
        savePayments(payments);
      }

      sendRealAppNotification({
        title: `${draft.docType === 'challan' ? 'Delivery Challan' : draft.docType === 'raw' ? 'Raw Material Bill' : 'Tax Invoice'} #${draft.invNo}`,
        body: `${draft.buyer?.name || 'Client'} · Total ${formatINR(totals.grand)}${adv > 0.01 ? ` (Adv: ${formatINR(adv)})` : ''}`,
        url: `/invoice-view.html?id=${encodeURIComponent(newId)}`,
        tag: `inv-${newId}`
      });

      return record;
    }

    if (saveQuoteBtn) {
      saveQuoteBtn.addEventListener('click', () => {
        if (!form.reportValidity()) return;
        const draft = collectFormDraft();
        draft.docType = 'quotation';
        const qRecord = upsertQuotationFromDraft(draft, 'Sent');
        sendRealAppNotification({
          title: `Quotation #${draft.invNo} Saved`,
          body: `Prepared for ${draft.buyer?.name || 'Client'}`,
          url: `/invoice-preview.html?type=quotation&qid=${encodeURIComponent(qRecord.id)}`,
          tag: `quote-${qRecord.id}`
        });
        toast(`Quotation #${draft.invNo} saved to Quotations ledger`, 'success');
        setTimeout(() => {
          window.location.href = 'quotations.html';
        }, 550);
      });
    }

    if (saveDraftLink) {
      saveDraftLink.addEventListener('click', (e) => {
        const currentType = docTypeInput ? docTypeInput.value : 'tax';
        if (currentType === 'quotation') return;
        e.preventDefault();
        if (!buyerSelect?.value) {
          toast('Select or add a customer first', 'warning');
          return;
        }
        const draft = collectFormDraft();
        saveInvoiceToLedger(draft, 'draft');
        toast(`Draft ${draft.invNo} saved to Invoices`, 'success');
        setTimeout(() => { window.location.href = 'invoice-list.html'; }, 450);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!buyerSelect?.value) {
        toast('Please select or add a customer before generating an invoice', 'warning');
        return;
      }
      const draft = collectFormDraft();
      if (draft.docType === 'quotation') {
        const savedQuote = upsertQuotationFromDraft(draft, 'Sent');
        draft.qid = savedQuote.id;
        sessionStorage.setItem('invoiceflex_preview_draft', JSON.stringify(draft));
        window.location.href = `invoice-preview.html?type=quotation&qid=${encodeURIComponent(savedQuote.id)}`;
        return;
      }

      if (draft.docType === 'tax' && plan.invoicesDaily && todayUsed >= plan.invoicesDaily) {
        toast(`Daily limit of ${plan.invoicesDaily} invoices reached on ${plan.label}. Upgrade on Plans page.`, 'warning');
        return;
      }

      const totals = computeInvoiceTotals(draft);
      if (draft.advanceAmount > totals.grand + 0.01) {
        toast(`Advance (${formatINR(draft.advanceAmount)}) cannot exceed invoice total (${formatINR(totals.grand)})`, 'warning');
        return;
      }

      const savedInv = saveInvoiceToLedger(draft);
      draft.id = savedInv.id;
      sessionStorage.setItem('invoiceflex_preview_draft', JSON.stringify(draft));
      toast(`${draft.invNo} saved & opening A4 preview`, 'success');
      setTimeout(() => {
        window.location.href = `invoice-preview.html?id=${encodeURIComponent(savedInv.id)}`;
      }, 300);
    });
  }

  /* --------------------------------------------------------------------------
     11. Classic & Modern Invoice/Quotation Preview Hydration (invoice-preview.html)
     -------------------------------------------------------------------------- */
  function renderClassicDocumentSheet(container, docData, compInfo, companyLogo, signatureUrl, options = {}) {
    if (!container) return;
    const docType = docData.docType || 'tax';
    const isQuote = docType === 'quotation';
    const buyer = docData.buyer || {};
    const rows = docData.rows || [];
    const sellerStateCode = compInfo.stateCode || '24';
    const isIntrastate = (buyer.code || sellerStateCode) === sellerStateCode;

    let subtotal = 0;
    let totalTax = 0;
    rows.forEach((r) => {
      const taxable = (Number(r.qty) || 0) * (Number(r.rate) || 0);
      subtotal += taxable;
      totalTax += taxable * ((Number(r.gst ?? compInfo.defaultGst ?? 18)) / 100);
    });
    const grandTotal = docData.totalAmount !== undefined ? Number(docData.totalAmount) : (subtotal + totalTax);
    const paidAmount = Math.max(0, Number(options.paidAmount || 0));
    const balanceDue = Math.max(0, Math.round((grandTotal - paidAmount) * 100) / 100);
    const paidPercent = grandTotal > 0 ? Math.min(100, Math.round((paidAmount / grandTotal) * 100)) : 0;
    const showWatermark = options.showWatermark ?? getUserPlan().watermark;

    const companyDisplayName = compInfo.name || 'Your Company Name';
    const logoInner = companyLogo
      ? `<img src="${companyLogo}" alt="${escapeHtml(companyDisplayName)}">`
      : escapeHtml(getInitials(companyDisplayName, 'IF'));

    const docHeadingMap = {
      tax: 'Tax Invoice',
      quotation: 'Quotation',
      challan: 'Delivery Challan',
      raw: 'Raw Material Bill'
    };
    const docHeading = docHeadingMap[docType] || 'Tax Invoice';

    const showSig = docData.requireSign !== false && signatureUrl;
    const sigHtml = showSig
      ? `<img src="${signatureUrl}" alt="Authorised Signatory" class="classic-sign-img">`
      : `<div style="height:40px;"></div>`;

    const termsLines = String(docData.notes || compInfo.terms || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const rowsHtml = rows
      .map((item, idx) => {
        const lineTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
        const descLines = String(item.desc || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        const prodTitle = descLines[0] || 'Product / Service';
        const prodSub = descLines.slice(1).map((l) => escapeHtml(l)).join('<br>');
        return `
          <tr>
            <td style="font-weight:700;">${idx + 1}}</td>
            <td>
              <span class="classic-product-title">${escapeHtml(prodTitle)}</span>
              ${prodSub ? `<span class="classic-product-desc">${prodSub}</span>` : ''}
            </td>
            <td class="col-mono">${escapeHtml(item.hsn || '-')}</td>
            <td class="col-align-right col-mono">${item.qty}</td>
            <td class="col-align-right col-mono">${formatPlainINR(item.rate)}</td>
            <td class="col-align-right col-mono col-bold">${formatPlainINR(lineTotal)}</td>
          </tr>
        `;
      })
      .join('');

    const fillerRowHtml = `<tr class="classic-filler-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
    const watermarkHtml = showWatermark ? `<div class="classic-watermark">INVOICE FLEX</div>` : '';

    const topHeaderHtml = `
      ${watermarkHtml}
      <div class="classic-top-header">
        <div class="classic-brand-row">
          <div class="classic-logo-box">${logoInner}</div>
          <div class="classic-company-title">${escapeHtml(companyDisplayName)}</div>
        </div>
        <div class="classic-copy-boxes">
          <label class="classic-copy-label"><input type="checkbox" checked> Original For Recipient</label>
          <label class="classic-copy-label"><input type="checkbox"> Duplicate For Supplier</label>
          <label class="classic-copy-label"><input type="checkbox"> Triplicate For Supplier</label>
        </div>
      </div>
      <div class="classic-company-sub">
        Address: ${escapeHtml(compInfo.address || 'Configure business address in Business Setup')}<br>
        (M): ${escapeHtml(compInfo.phone || '—')}, Email: ${escapeHtml(compInfo.email || '—')}
      </div>
    `;

    if (isQuote) {
      const firstCond = termsLines[0] || '1. 50% advance balance payment against delivery & after delivery payment should be done within 5 days';
      const extraConds = termsLines.slice(1);
      if (!extraConds.length) {
        extraConds.push('2. 18% GST Extra', '3. Transport Extra');
      }

      container.innerHTML = `
        ${topHeaderHtml}
        <div class="classic-box-frame">
          <div class="classic-section-box">
            <div class="classic-band-row is-quote-header">
              <span>GSTIN: <span class="col-mono">${escapeHtml(compInfo.gstin || '—')}</span></span>
              <span>PAN No : <span class="col-mono">${escapeHtml(compInfo.pan || '—')}</span></span>
              <span class="classic-doc-badge">Quotation</span>
            </div>
            <div class="classic-meta-grid">
              <div class="classic-meta-col">
                <div class="classic-kv"><span>Quotation No.</span><span class="col-mono">${escapeHtml(docData.invNo)}</span></div>
                <div class="classic-kv"><span>Quotation Date.</span><span>${escapeHtml(formatDisplayDate(docData.issueDate))}</span></div>
                ${buyer.name ? `<div class="classic-kv"><span>Quotation To</span><span>${escapeHtml(buyer.name)}</span></div>` : ''}
              </div>
              <div class="classic-meta-col">
                <div class="classic-kv"><span>State</span><span>${escapeHtml(compInfo.stateName || 'Gujarat')}</span></div>
                <div class="classic-kv"><span>State Code</span><span class="col-mono">${escapeHtml(compInfo.stateCode || '24')}</span></div>
                ${buyer.gstin ? `<div class="classic-kv"><span>Client GSTIN</span><span class="col-mono">${escapeHtml(buyer.gstin)}</span></div>` : ''}
              </div>
            </div>
          </div>

          <div class="classic-section-box is-items-box">
            <div class="classic-items-wrap">
              <table class="classic-items-table">
                <thead>
                  <tr>
                    <th style="width:7%;">Sr.<br>No</th>
                    <th style="width:45%;">Name of Product</th>
                    <th style="width:12%;">HSN</th>
                    <th style="width:9%;text-align:right;">Qty.</th>
                    <th style="width:13%;text-align:right;">Rate</th>
                    <th style="width:14%;text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                  ${fillerRowHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div class="classic-section-box">
            <div class="classic-quote-cond-head" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <span>Condition -</span>
              <span style="font-size:0.78rem;font-family:var(--font-mono);">Quoted Subtotal: ${formatINR(subtotal)} <span style="font-weight:500;font-family:var(--font-sans);">(+ GST Extra · Est. ${formatINR(grandTotal)})</span></span>
            </div>
            <div class="classic-quote-cond-row">${escapeHtml(firstCond)}</div>
            <div class="classic-quote-footer-split">
              <div>
                ${extraConds.map((c) => `<div class="classic-quote-cond-row">${escapeHtml(c)}</div>`).join('')}
              </div>
              <div class="classic-stamp-col">
                ${showSig ? `<img src="${signatureUrl}" alt="Stamp" style="max-height:42px;max-width:90px;object-fit:contain;margin-bottom:4px;opacity:0.9;">` : ''}
                <span>Stamp</span>
              </div>
              <div class="classic-signatory-box">
                <div>For, <strong>${escapeHtml(companyDisplayName)}</strong></div>
                ${sigHtml}
                <div>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const noLabel = docType === 'challan' ? 'Challan No.' : docType === 'raw' ? 'Bill No.' : 'Invoice No.';
    const dateLabel = docType === 'challan' ? 'Challan Date.' : docType === 'raw' ? 'Bill Date.' : 'Invoice Date.';
    const receiverTitle = docType === 'challan'
      ? 'Details of Receiver / Consignee:'
      : docType === 'raw'
        ? 'Details of Supplier / Vendor:'
        : 'Details of Receiver / billed to:';
    const wordsLabel = docType === 'challan'
      ? 'Total Challan Value in Words :'
      : docType === 'raw'
        ? 'Total Bill Amount in Words :'
        : 'Total Invoice Amount in Words :';

    container.innerHTML = `
      ${topHeaderHtml}
      <div class="classic-box-frame">
        <div class="classic-section-box">
          <div class="classic-band-row is-split-header">
            <span>GSTIN: <span class="col-mono">${escapeHtml(compInfo.gstin || '—')}</span></span>
            <span class="classic-doc-badge">${escapeHtml(docHeading)}</span>
          </div>

          <div class="classic-meta-grid">
            <div class="classic-meta-col">
              <div class="classic-kv"><span>${noLabel}</span><span class="col-mono">${escapeHtml(docData.invNo)}</span></div>
              <div class="classic-kv"><span>${dateLabel}</span><span>${escapeHtml(formatDisplayDate(docData.issueDate))}</span></div>
              <div class="classic-kv"><span>State</span><span>${escapeHtml(compInfo.stateName || 'Gujarat')}</span></div>
              <div class="classic-kv"><span>State Code</span><span class="col-mono">${escapeHtml(compInfo.stateCode || '24')}</span></div>
            </div>
            <div class="classic-meta-col">
              <div class="classic-kv"><span>PO No.</span><span class="col-mono">${escapeHtml(docData.poNo || docData.supplierRef || '-')}</span></div>
              <div class="classic-kv"><span>${docType === 'challan' ? 'Challan Type' : 'PO Date.'}</span><span>${escapeHtml(docType === 'challan' ? (docData.challanReason || 'Supply of Goods') : (docData.poDate || '-'))}</span></div>
              <div class="classic-kv"><span>Vehicle Number</span><span class="col-mono">${escapeHtml(docData.vehicleNo || '-')}</span></div>
              <div class="classic-kv"><span>E-WAY Bill No.</span><span class="col-mono">${escapeHtml(docData.ewayNo || docData.materialCat || '-')}</span></div>
            </div>
          </div>
        </div>

        <div class="classic-section-box">
          <div class="classic-receiver-band">
            <span>${receiverTitle}</span>
            <span>PAN No : <span class="col-mono">${escapeHtml(compInfo.pan || '—')}</span></span>
          </div>
          <div class="classic-receiver-body">
            <div class="classic-receiver-row-label is-first">Name</div>
            <div class="classic-receiver-row-val is-first" style="font-weight:700;text-transform:uppercase;">${escapeHtml(buyer.name || '')}</div>
            <div class="classic-receiver-row-label">Address</div>
            <div class="classic-receiver-row-val">${escapeHtml(buyer.address || '')}${buyer.contact ? `<br>${escapeHtml(buyer.contact)}` : ''}</div>
            <div class="classic-receiver-row-label">GSTIN</div>
            <div class="classic-receiver-row-val col-mono">${escapeHtml(buyer.gstin || '-')}</div>
            <div class="classic-receiver-row-label is-last">State</div>
            <div class="classic-receiver-row-val is-last">${escapeHtml(buyer.state || compInfo.stateName || 'Gujarat')}${buyer.code ? ` (Code ${escapeHtml(buyer.code)})` : ''}</div>
          </div>
        </div>

        <div class="classic-section-box is-items-box">
          <div class="classic-items-wrap">
            <table class="classic-items-table">
              <thead>
                <tr>
                  <th style="width:7%;">Sr.<br>No</th>
                  <th style="width:45%;">Name of Product</th>
                  <th style="width:12%;">HSN</th>
                  <th style="width:9%;text-align:right;">Qty.</th>
                  <th style="width:13%;text-align:right;">Rate</th>
                  <th style="width:14%;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                ${fillerRowHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="classic-section-box">
          <div class="classic-bottom-grid">
            <div class="classic-bottom-left">
              <div class="classic-bank-head">Company Bank Details</div>
              <div class="classic-bank-body">
                Bank Name : <strong>${escapeHtml(compInfo.bankName || '—')}</strong><br>
                A/c No. : <strong class="col-mono">${escapeHtml(compInfo.bankAccount || '—')}</strong><br>
                Branch &amp; IFSC Code : <strong class="col-mono">${escapeHtml(compInfo.bankBranchIfsc || '—')}</strong>
              </div>
              <div class="classic-words-row">
                ${wordsLabel} <span style="font-weight:600;">${escapeHtml(amountInWordsINR(grandTotal).replace(/^Rupees\s+/i, '').toUpperCase())}</span>
              </div>
              ${paidAmount > 0.01 ? `
                <div class="classic-total-row is-paid-row" style="grid-template-columns:1fr;border-left:none;border-bottom:1px solid #B89352;padding:4px 10px;">
                  <span style="text-align:left;font-weight:500;border-right:none;padding:0;"><strong>Received:</strong> ₹${formatPlainINR(paidAmount)} (${paidPercent}%) on this invoice</span>
                </div>
              ` : ''}
              <div class="classic-terms-sign-grid">
                <div class="classic-terms-col">
                  <strong>Terms &amp; Conditions :</strong><br>
                  ${termsLines.map((line) => escapeHtml(line)).join('<br>')}
                </div>
                <div class="classic-stamp-col">
                  ${showSig ? `<img src="${signatureUrl}" alt="Stamp" style="max-height:38px;max-width:85px;object-fit:contain;margin-bottom:4px;opacity:0.9;">` : ''}
                  <span>Stamp</span>
                </div>
              </div>
            </div>

            <div class="classic-totals-col">
              <div class="classic-total-row">
                <span>Total Amount</span>
                <span>${formatPlainINR(subtotal)}</span>
              </div>
              <div class="classic-total-row">
                <span>Add : CGST</span>
                <span>${isIntrastate ? formatPlainINR(totalTax / 2) : '-'}</span>
              </div>
              <div class="classic-total-row">
                <span>Add : SGST</span>
                <span>${isIntrastate ? formatPlainINR(totalTax / 2) : '-'}</span>
              </div>
              <div class="classic-total-row">
                <span>Add : IGST</span>
                <span>${!isIntrastate ? formatPlainINR(totalTax) : '-'}</span>
              </div>
              <div class="classic-total-row is-grand">
                <span>Grand Amount</span>
                <span>${formatPlainINR(grandTotal)}</span>
              </div>
              ${paidAmount > 0.01 ? `
                <div class="classic-total-row is-paid-row">
                  <span>Balance Due</span>
                  <span>${formatPlainINR(balanceDue)}</span>
                </div>
              ` : ''}
              <div class="classic-signatory-box">
                <div>For, <strong>${escapeHtml(companyDisplayName)}</strong></div>
                ${sigHtml}
                <div>Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function initInvoicePreviewHydration() {
    const classicRoot = document.getElementById('classic-sheet-root');
    const sheet = document.getElementById('modern-sheet-root') || document.querySelector('.invoice-sheet');
    if (!sheet && !classicRoot) return;

    const compInfo = getCompanyInfo();
    const activeUser = getCurrentUser();
    const companyLogo = activeUser ? activeUser.companyLogo : localStorage.getItem(COMPANY_LOGO_KEY);
    const signatureUrl = activeUser ? activeUser.companySignature : localStorage.getItem(COMPANY_SIGNATURE_KEY);
    const plan = getUserPlan();

    const params = new URLSearchParams(window.location.search);
    const presetType = params.get('type');
    const qid = params.get('qid');
    const invIdParam = params.get('id');
    let activeDocData = null;

    if (invIdParam) {
      const foundInv = loadInvoices().find((x) => String(x.id) === String(invIdParam));
      if (foundInv) activeDocData = foundInv;
    }

    if (!activeDocData && qid) {
      const foundQuote = loadQuotations().find((x) => x.id === qid);
      if (foundQuote) {
        activeDocData = {
          docType: 'quotation',
          qid: foundQuote.id,
          invNo: foundQuote.quoteNo,
          issueDate: foundQuote.date,
          buyerId: foundQuote.buyerId,
          buyer: foundQuote.buyer,
          rows: foundQuote.rows,
          notes: foundQuote.notes || compInfo.terms,
          requireSign: true
        };
      }
    }

    if (!activeDocData && presetType === 'quotation') {
      activeDocData = {
        docType: 'quotation',
        invNo: `${compInfo.quotePrefix || 'QTN/2026-2027/'}001`,
        issueDate: '01.05.2026',
        buyerId: '1',
        buyer: {
          name: 'Acme Corporation',
          gstin: '27AAAAA1111A1Z1',
          state: 'Maharashtra',
          code: '27',
          address: '402, Trade Centre, Bandra Kurla Complex, Mumbai, MH - 400051',
          contact: 'Abhishek Sharma (+91 98765 43210)'
        },
        rows: [
          { desc: 'PRECISION CNC MANIFOLD ASSEMBLY\nSS-316 machined industrial unit', hsn: '848180', qty: 10, rate: 10000, gst: 18 }
        ],
        notes: compInfo.terms,
        requireSign: true
      };
    } else if (!activeDocData && presetType === 'challan') {
      activeDocData = {
        docType: 'challan',
        invNo: 'DC-2026-012',
        issueDate: '21.07.2026',
        dueDate: 'Supply on Approval',
        terms: 'GJ-15-CD-4820',
        challanReason: 'Supply of Goods on Approval',
        vehicleNo: 'GJ-15-CD-4820',
        buyer: {
          name: 'Acme Corporation',
          gstin: '27AAAAA1111A1Z1',
          state: 'Maharashtra',
          code: '27',
          address: '402, Trade Centre, Bandra Kurla Complex, Mumbai, MH - 400051',
          contact: 'Abhishek Sharma (+91 98765 43210)'
        },
        rows: [
          { desc: 'SERVER RACK ENCLOSURES (42U)\nModular lockable steel cabinet', hsn: '853710', qty: 2, rate: 14500, gst: 18 },
          { desc: 'CAT6A PATCH ASSEMBLIES\nPack of 24 shielded jumpers', hsn: '854442', qty: 4, rate: 1250, gst: 18 }
        ],
        notes: compInfo.terms,
        requireSign: true
      };
    } else if (!activeDocData && presetType === 'raw') {
      activeDocData = {
        docType: 'raw',
        invNo: 'PUR-2026-009',
        issueDate: '19.07.2026',
        dueDate: 'SUP-8841',
        terms: 'Steel Sheets & Stock',
        supplierRef: 'SUP-8841',
        materialCat: 'Steel Sheets & Stock',
        buyer: {
          name: 'Bharat Steel & Alloys (Vendor)',
          gstin: '24FFFFF6666F6Z6',
          state: 'Gujarat',
          code: '24',
          address: 'G.I.D.C. Industrial Estate, Plot B-14, Vapi, GJ - 396195',
          contact: 'Vikram Deshmukh (+91 98201 77442)'
        },
        rows: [
          { desc: 'COLD ROLLED MILD STEEL SHEETS\n2mm industrial gauge sheet', hsn: '720916', qty: 12, rate: 4100, gst: 18 },
          { desc: 'PROTECTIVE PACKAGING CRATES\nHeavy-duty wooden transport box', hsn: '441510', qty: 8, rate: 1100, gst: 18 }
        ],
        notes: compInfo.terms,
        requireSign: true
      };
    } else if (!activeDocData && !invIdParam) {
      const raw = sessionStorage.getItem('invoiceflex_preview_draft');
      if (raw) {
        try {
          activeDocData = JSON.parse(raw);
        } catch {
          activeDocData = null;
        }
      }
    }

    if (!activeDocData) {
      const firstInv = loadInvoices()[0];
      if (firstInv) {
        activeDocData = firstInv;
      } else {
        const previewRoot = document.querySelector('.invoice-preview-container') || document.querySelector('.main-content');
        if (previewRoot) {
          previewRoot.innerHTML = `
            <div class="card" style="max-width:540px;margin:60px auto;text-align:center;padding:48px 24px;">
              <div class="table-empty-state">
                <div class="table-empty-title">No invoice or document to preview</div>
                <div class="table-empty-desc">Create your first invoice or quotation to view and print your official A4 Tax Invoice sheet.</div>
                <div class="btn-group" style="justify-content:center;margin-top:18px;">
                  <a href="invoice-create.html" class="btn btn-primary btn-sm">+ Create First Invoice</a>
                  <a href="dashboard.html" class="btn btn-secondary btn-sm">Dashboard</a>
                </div>
              </div>
            </div>
          `;
          return;
        }
      }
    }

    const docType = activeDocData.docType || 'tax';
    const paidAmount = activeDocData.id ? getInvoicePaidTotal(activeDocData.id) : (Number(activeDocData.advanceAmount) || 0);
    const payState = computePaymentState(activeDocData, paidAmount);

    document.title = `${docType === 'quotation' ? 'Quotation' : 'Invoice'} Preview - #${activeDocData.invNo}`;

    const previewActionLabel = document.querySelector('.actions-panel-left span');
    if (previewActionLabel) {
      const wmNote = plan.watermark ? ` · Watermarked (${plan.label}) <a href="plans.html" style="color:var(--primary);text-decoration:underline;">Remove on Enterprise</a>` : '';
      const balNote = docType !== 'quotation' && payState.balance > 0.01 ? ` · <span class="status-badge ${payState.badgeClass}" style="font-size:0.7rem;">${escapeHtml(payState.label)} (${formatINR(payState.balance)} owing)</span>` : '';
      previewActionLabel.innerHTML = `Previewing <strong>#${escapeHtml(activeDocData.invNo)}</strong>${balNote}${wmNote}`;
    }

    if (classicRoot) {
      renderClassicDocumentSheet(classicRoot, activeDocData, compInfo, companyLogo, signatureUrl, {
        paidAmount,
        showWatermark: plan.watermark
      });
    }

    // Hydrate Modern SaaS Sheet as well
    if (sheet) {
      const companyAddr = sheet.querySelector('.invoice-company-address');
      if (companyAddr) {
        companyAddr.innerHTML = `
          <strong>${escapeHtml(compInfo.name)}</strong><br>
          ${escapeHtml(compInfo.address)}<br>
          ${escapeHtml(compInfo.stateName)} (Code ${escapeHtml(compInfo.stateCode)}) · PAN: ${escapeHtml(compInfo.pan || '—')}<br>
          Email: ${escapeHtml(compInfo.email)} | Phone: ${escapeHtml(compInfo.phone)}
        `;
      }
      const gstinBadge = sheet.querySelector('.invoice-gstin-badge');
      if (gstinBadge && compInfo.gstin) gstinBadge.textContent = `GSTIN: ${compInfo.gstin}`;
      const sigComp = sheet.querySelector('.signature-company');
      if (sigComp) sigComp.textContent = compInfo.name;

      const infoRows = sheet.querySelectorAll('.invoice-payment-info-box .info-box-row');
      if (infoRows.length >= 4) {
        infoRows[0].querySelector('span:last-child').textContent = compInfo.bankName;
        infoRows[1].querySelector('span:last-child').textContent = compInfo.bankBranchIfsc;
        infoRows[2].querySelector('span:last-child').textContent = compInfo.bankAccount;
        infoRows[3].querySelector('span:last-child').textContent = compInfo.bankType || 'Current Account';
      }

      const notesBody = sheet.querySelector('.invoice-terms-notes .notes-body');
      if (notesBody) {
        const lines = String(activeDocData.notes || compInfo.terms || '').split(/\r?\n/).filter(Boolean);
        notesBody.innerHTML = lines.map((l) => escapeHtml(l)).join('<br>');
      }

      if (signatureUrl && activeDocData.requireSign !== false) {
        const sigBlock = sheet.querySelector('.invoice-signature-block');
        if (sigBlock && !sigBlock.querySelector('.modern-sig-img')) {
          const lineEl = sigBlock.querySelector('.signature-line');
          if (lineEl) {
            lineEl.style.marginTop = '10px';
            const img = document.createElement('img');
            img.src = signatureUrl;
            img.alt = 'Authorized Signature';
            img.className = 'modern-sig-img';
            img.style.cssText = 'max-height:46px;max-width:150px;object-fit:contain;margin:8px auto 0 auto;';
            sigBlock.insertBefore(img, lineEl);
          }
        }
      }

      const titleMap = {
        tax: 'TAX INVOICE',
        quotation: 'QUOTATION',
        challan: 'DELIVERY CHALLAN',
        proforma: 'PROFORMA INVOICE',
        raw: 'RAW MATERIAL BILL'
      };
      const titleEl = sheet.querySelector('.invoice-title-text');
      if (titleEl) titleEl.textContent = titleMap[docType] || 'TAX INVOICE';

      const buyer = activeDocData.buyer || {};
      const parties = sheet.querySelectorAll('.invoice-party-block');
      if (parties[0]) {
        parties[0].querySelector('.invoice-party-title').textContent =
          docType === 'challan' ? 'Consigner (Dispatcher)' : docType === 'raw' ? 'Receiving Unit (Buyer)' : docType === 'quotation' ? 'Quotation From' : 'Seller / Consigner';
        parties[0].querySelector('.invoice-party-name').textContent = compInfo.name;
        parties[0].querySelector('.invoice-party-details-text').innerHTML = `
          Registered Address: ${escapeHtml(compInfo.address)}<br>
          State of Supply: ${escapeHtml(compInfo.stateName)} (Code ${escapeHtml(compInfo.stateCode)})<br>
          PAN: <strong class="col-mono">${escapeHtml(compInfo.pan || '—')}</strong>
        `;
      }
      if (parties[1]) {
        parties[1].querySelector('.invoice-party-title').textContent =
          docType === 'challan' ? 'Consignee (Receiver)' : docType === 'raw' ? 'Raw Material Supplier' : docType === 'quotation' ? 'Quotation To (Client)' : 'Buyer / Consignee (Bill To)';
        parties[1].querySelector('.invoice-party-name').textContent = buyer.name || 'Client';
        parties[1].querySelector('.invoice-party-details-text').innerHTML = `
          GSTIN: <strong>${escapeHtml(buyer.gstin || '—')}</strong><br>
          Address: ${escapeHtml(buyer.address || '—')}<br>
          Contact: ${escapeHtml(buyer.contact || '—')}
        `;
      }

      const metaLabels = sheet.querySelectorAll('.invoice-meta-label');
      const metaVals = sheet.querySelectorAll('.invoice-meta-val');
      if (metaLabels.length >= 4 && metaVals.length >= 4) {
        if (docType === 'quotation') {
          metaLabels[0].textContent = 'Quotation Number';
          metaLabels[1].textContent = 'Quotation Date';
          metaLabels[2].textContent = 'State';
          metaLabels[3].textContent = 'State Code';
          metaVals[0].textContent = `#${activeDocData.invNo}`;
          metaVals[1].textContent = formatDisplayDate(activeDocData.issueDate);
          metaVals[2].textContent = compInfo.stateName || 'Gujarat';
          metaVals[3].textContent = compInfo.stateCode || '24';
        } else if (docType === 'challan') {
          metaLabels[0].textContent = 'Challan Number';
          metaLabels[1].textContent = 'Dispatch Date';
          metaLabels[2].textContent = 'Reason';
          metaLabels[3].textContent = 'Vehicle / Transport';
          metaVals[0].textContent = `#${activeDocData.invNo}`;
          metaVals[1].textContent = formatDisplayDate(activeDocData.issueDate);
          metaVals[2].textContent = activeDocData.challanReason || 'Supply of Goods';
          metaVals[3].textContent = activeDocData.vehicleNo || 'Self / Courier';
        } else if (docType === 'raw') {
          metaLabels[0].textContent = 'Purchase Bill #';
          metaLabels[1].textContent = 'Bill Date';
          metaLabels[2].textContent = 'Supplier Ref #';
          metaLabels[3].textContent = 'Material Category';
          metaVals[0].textContent = `#${activeDocData.invNo}`;
          metaVals[1].textContent = formatDisplayDate(activeDocData.issueDate);
          metaVals[2].textContent = activeDocData.supplierRef || activeDocData.dueDate || '-';
          metaVals[3].textContent = activeDocData.materialCat || 'Raw Materials';
        } else {
          metaVals[0].textContent = `#${activeDocData.invNo}`;
          metaVals[1].textContent = formatDisplayDate(activeDocData.issueDate);
          metaVals[2].textContent = formatDisplayDate(activeDocData.dueDate || activeDocData.poNo || '-');
          metaVals[3].textContent = activeDocData.terms || 'Net 15 Days';
        }
      }

      const tbody = sheet.querySelector('.invoice-items-table tbody');
      let subtotal = 0;
      let totalTax = 0;
      if (tbody) {
        tbody.innerHTML = (activeDocData.rows || [])
          .map((item, idx) => {
            const val = item.qty * item.rate;
            subtotal += val;
            totalTax += val * ((item.gst ?? 18) / 100);
            const lines = String(item.desc || '').split(/\r?\n/).filter(Boolean);
            return `
              <tr class="item-row">
                <td>${idx + 1}</td>
                <td>
                  <div style="font-weight:700;">${escapeHtml(lines[0] || '')}</div>
                  ${lines.length > 1 ? `<div style="font-size:0.75rem;color:var(--text-muted);">${lines.slice(1).map((l) => escapeHtml(l)).join('<br>')}</div>` : ''}
                </td>
                <td class="col-mono">${escapeHtml(item.hsn || '—')}</td>
                <td class="col-align-right">${item.qty}</td>
                <td class="col-align-right">${formatPlainINR(item.rate)}</td>
                <td class="col-align-right col-bold col-mono">${formatPlainINR(val)}</td>
              </tr>`;
          })
          .join('');
      }

      const summaryRight = sheet.querySelector('.invoice-summary-right');
      const isIntrastate = (buyer.code || compInfo.stateCode) === (compInfo.stateCode || '24');
      const finalGrand = activeDocData.totalAmount !== undefined ? Number(activeDocData.totalAmount) : (subtotal + totalTax);
      if (summaryRight) {
        summaryRight.innerHTML = `
          <div class="calc-row">
            <span>Taxable Value (Subtotal)</span>
            <span class="col-mono" style="font-weight: 600;">${formatINR(subtotal)}</span>
          </div>
          ${isIntrastate ? `
            <div class="calc-row">
              <span>Intrastate CGST</span>
              <span class="col-mono">${formatINR(totalTax / 2)}</span>
            </div>
            <div class="calc-row">
              <span>Intrastate SGST</span>
              <span class="col-mono">${formatINR(totalTax / 2)}</span>
            </div>
          ` : `
            <div class="calc-row">
              <span>Interstate IGST</span>
              <span class="col-mono">${formatINR(totalTax)}</span>
            </div>
          `}
          <div class="calc-row" style="border-top: 1px dashed var(--border); padding-top: 10px;">
            <span>Total GST Tax Liability</span>
            <span class="col-mono" style="font-weight: 600;">${formatINR(totalTax)}</span>
          </div>
          <div class="calc-row total-due">
            <span>Total Invoice Amount</span>
            <span class="col-mono">${formatINR(finalGrand)}</span>
          </div>
          ${paidAmount > 0.01 ? `
            <div class="calc-row" style="font-size:0.82rem;color:var(--text-muted);padding-top:6px;">
              <span>Received / Balance Due</span>
              <span class="col-mono" style="font-weight:700;color:${payState.balance > 0.01 ? 'var(--danger)' : 'var(--success)'};">${formatINR(paidAmount)} / ${formatINR(payState.balance)}</span>
            </div>
          ` : ''}
        `;
      }
    }

    const styleBtns = document.querySelectorAll('#preview-style-toggle [data-sheet-style]');
    styleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = btn.getAttribute('data-sheet-style');
        styleBtns.forEach((b) => b.classList.toggle('active', b === btn));
        if (classicRoot) classicRoot.style.display = chosen === 'classic' ? 'flex' : 'none';
        if (sheet) sheet.style.display = chosen === 'modern' ? 'flex' : 'none';
      });
    });

    const fitBtn = document.getElementById('btn-a4-fit-toggle');
    const stageEl = document.getElementById('a4-preview-stage');
    if (fitBtn && stageEl) {
      let isFit = false;
      function applyA4Scale() {
        const scale = isFit ? Math.min(1, Math.max(0.35, (window.innerWidth - 28) / 794)) : 1;
        [classicRoot, sheet].forEach((el) => {
          if (!el) return;
          el.style.zoom = isFit && scale < 1 ? String(scale) : '';
        });
        stageEl.classList.toggle('is-fit-screen', isFit && scale < 1);
        fitBtn.textContent = isFit ? '100% Full A4' : 'Fit A4 to Screen';
      }
      fitBtn.addEventListener('click', () => {
        isFit = !isFit;
        applyA4Scale();
      });
      window.addEventListener('resize', () => {
        if (isFit) applyA4Scale();
      });
    }

    const convertBtn = document.getElementById('btn-convert-quote');
    if (convertBtn && docType === 'quotation') {
      convertBtn.style.display = 'inline-flex';
      convertBtn.addEventListener('click', () => {
        if (activeDocData.qid) {
          window.location.href = `invoice-create.html?fromQuote=${encodeURIComponent(activeDocData.qid)}`;
        } else {
          sessionStorage.setItem('invoiceflex_convert_quote_draft', JSON.stringify({
            quoteNo: activeDocData.invNo,
            buyerId: activeDocData.buyerId || '1',
            buyer: activeDocData.buyer,
            rows: activeDocData.rows,
            notes: activeDocData.notes
          }));
          window.location.href = 'invoice-create.html?fromQuote=draft';
        }
      });
    }

    const sendBtn = document.getElementById('btn-approve-dispatch') || document.querySelector('a[href*="sent=true"]');
    if (sendBtn) {
      if (docType === 'quotation') {
        sendBtn.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24" style="width:16px;height:16px;"><polyline points="20 6 9 17 4 12"/></svg> Save &amp; View Quotations`;
      }
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toast(docType === 'quotation' ? 'Quotation saved & ready to share' : 'Document saved & dispatched', 'success');
        setTimeout(() => {
          window.location.href = docType === 'quotation' ? 'quotations.html' : 'invoice-list.html';
        }, 550);
      });
    }

    const saveToBbBtn = document.getElementById('btn-save-to-billbook');
    if (saveToBbBtn) {
      saveToBbBtn.addEventListener('click', () => {
        const totals = computeInvoiceTotals(activeDocData);
        const pageType = docType === 'challan' ? 'challan' : docType === 'raw' ? 'raw' : 'gst';
        openSaveToBillBookModal({
          billNo: String(activeDocData.invNo || 'AE001/2026-2027').replace(/^#/, ''),
          party: activeDocData.buyer?.name || 'Client',
          date: formatDisplayDate(activeDocData.issueDate),
          amount: Math.round(totals.grand),
          type: pageType,
          notes: `${docType === 'quotation' ? 'Quotation' : docType === 'challan' ? 'Delivery Challan' : docType === 'raw' ? 'Raw Material Bill' : 'Tax Invoice'} saved from Preview`
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     12. Invoice View Detail & Payment Recording (invoice-view.html)
     -------------------------------------------------------------------------- */
  function initInvoiceViewActions() {
    if (!window.location.pathname.toLowerCase().includes('invoice-view')) return;
    const mainEl = document.querySelector('.main-content');
    if (!mainEl) return;

    const params = new URLSearchParams(window.location.search);
    const invId = params.get('id');
    const invoices = loadInvoices();
    const inv = invoices.find((x) => String(x.id) === String(invId)) || invoices[0];

    if (!inv) {
      mainEl.innerHTML = `
        <div class="card">
          <div class="table-empty-state">
            <div class="table-empty-title">No invoice found</div>
            <div class="table-empty-desc">Create an invoice first to inspect details or record payments.</div>
            <a href="invoice-create.html" class="btn btn-primary btn-sm" style="margin-top:12px;">Create Invoice</a>
          </div>
        </div>
      `;
      return;
    }

    function hydrateView() {
      const compInfo = getCompanyInfo();
      const currentInv = loadInvoices().find((x) => String(x.id) === String(inv.id)) || inv;
      const totals = computeInvoiceTotals(currentInv);
      const pay = computePaymentState(currentInv);
      const isIntrastate = (currentInv.buyer?.code || compInfo.stateCode || '24') === (compInfo.stateCode || '24');

      const printBtn = mainEl.querySelector('a[href*="invoice-preview"]');
      if (printBtn) printBtn.href = `invoice-preview.html?id=${encodeURIComponent(currentInv.id)}`;

      const payBtn = Array.from(mainEl.querySelectorAll('button.btn-primary')).find((b) =>
        b.textContent.includes('Record Payment') || b.dataset.payBtn === '1'
      );
      if (payBtn) {
        payBtn.dataset.payBtn = '1';
        payBtn.removeAttribute('onclick');
        payBtn.disabled = pay.balance <= 0.01;
        payBtn.textContent = pay.balance <= 0.01 ? 'Paid in Full' : 'Record Payment Receipt';
        payBtn.style.opacity = pay.balance <= 0.01 ? '0.7' : '1';
        payBtn.onclick = () => openRecordPaymentModal(currentInv.id, hydrateView);
      }

      const cards = mainEl.querySelectorAll('.detail-grid .card');
      if (cards[0]) {
        const titleEl = cards[0].querySelector('.card-title');
        const descEl = cards[0].querySelector('.card-description');
        const badgeEl = cards[0].querySelector('.status-badge');
        if (titleEl) titleEl.textContent = `Invoice ${currentInv.invNo}`;
        if (descEl) descEl.textContent = `Issued on ${formatDisplayDate(currentInv.issueDate)} to ${currentInv.buyer?.name || 'Client'}`;
        if (badgeEl) {
          badgeEl.className = `status-badge ${pay.badgeClass}`;
          badgeEl.textContent = pay.label;
        }
        const metaVals = cards[0].querySelectorAll('.form-grid .form-group > :last-child');
        if (metaVals.length >= 4) {
          metaVals[0].textContent = currentInv.buyer?.gstin || '—';
          metaVals[1].textContent = `${currentInv.buyer?.state || compInfo.stateName} (Code ${currentInv.buyer?.code || compInfo.stateCode})`;
          metaVals[2].textContent = formatDisplayDate(currentInv.issueDate);
          metaVals[3].textContent = currentInv.dueDate ? formatDisplayDate(currentInv.dueDate) : '—';
        }
      }

      if (cards[1]) {
        const tbody = cards[1].querySelector('tbody');
        if (tbody) {
          tbody.innerHTML = (currentInv.rows || []).map((r) => {
            const lines = String(r.desc || '').split(/\r?\n/).filter(Boolean);
            const val = (Number(r.qty) || 0) * (Number(r.rate) || 0);
            return `
              <tr>
                <td>
                  <div style="font-weight:700;">${escapeHtml(lines[0] || '')}</div>
                  ${lines.length > 1 ? `<div style="font-size:0.75rem;color:var(--text-muted);">${lines.slice(1).map((l) => escapeHtml(l)).join('<br>')}</div>` : ''}
                </td>
                <td class="col-mono">${escapeHtml(r.hsn || '—')}</td>
                <td class="col-align-right col-bold">${r.qty}</td>
                <td class="col-align-right col-mono">${formatINR(r.rate)}</td>
                <td class="col-align-right col-bold col-mono">${formatINR(val)}</td>
              </tr>
            `;
          }).join('');
        }
      }

      const rightCards = mainEl.querySelectorAll('.detail-grid > div:last-child > .card');
      if (rightCards[0]) {
        const rows = rightCards[0].querySelectorAll('.summary-card-row');
        if (rows.length >= 5) {
          rows[0].querySelector('span:last-child').textContent = formatINR(totals.subtotal);
          if (isIntrastate) {
            rows[1].style.display = 'flex';
            rows[2].style.display = 'flex';
            rows[1].querySelector('span:last-child').textContent = formatINR(totals.totalTax / 2);
            rows[2].querySelector('span:last-child').textContent = formatINR(totals.totalTax / 2);
          } else {
            rows[1].style.display = 'flex';
            rows[2].style.display = 'none';
            rows[1].querySelector('span:first-child').textContent = 'Interstate IGST:';
            rows[1].querySelector('span:last-child').textContent = formatINR(totals.totalTax);
          }
          rows[3].querySelector('span:last-child').textContent = formatINR(totals.totalTax);
          rows[4].querySelector('span:last-child').textContent = formatINR(pay.total);
        }
        let balRow = rightCards[0].querySelector('#view-balance-summary');
        if (!balRow) {
          balRow = document.createElement('div');
          balRow.id = 'view-balance-summary';
          balRow.className = 'summary-card-row';
          balRow.style.marginTop = '6px';
          rightCards[0].querySelector('div[style*="flex-direction"]')?.appendChild(balRow);
        }
        balRow.innerHTML = `<span style="color:var(--text-muted);">Received / Balance:</span><span class="col-mono" style="font-weight:700;color:${pay.balance > 0.01 ? 'var(--danger)' : 'var(--success)'};">${formatINR(pay.paid)} / ${formatINR(pay.balance)}</span>`;
      }

      if (rightCards[1]) {
        const snap = rightCards[1].querySelector('div[style*="flex-direction"]');
        if (snap) {
          snap.innerHTML = `
            <div style="font-weight:700;font-size:0.9375rem;color:var(--text-main);">${escapeHtml(currentInv.buyer?.name || 'Client')}</div>
            <div style="font-size:0.8125rem;color:var(--text-muted);line-height:1.4;">
              ${escapeHtml(currentInv.buyer?.contact || '')}<br>
              ${escapeHtml(currentInv.buyer?.email || '')}
            </div>
            ${currentInv.buyerId ? `<a href="customer-view.html?id=${encodeURIComponent(currentInv.buyerId)}" style="font-size:0.8125rem;color:var(--primary);font-weight:600;margin-top:8px;display:inline-flex;align-items:center;gap:4px;">View Client Profile Ledger →</a>` : ''}
          `;
        }
      }

      const timelineEl = document.getElementById('invoice-lifecycle-timeline');
      if (timelineEl) {
        const invPayments = loadPayments()
          .filter((p) => String(p.invoiceId) === String(currentInv.id))
          .sort((a, b) => String(a.paidOn || '').localeCompare(String(b.paidOn || '')));
        const events = [
          {
            dot: 'var(--primary)',
            title: `Document #${currentInv.invNo} Issued`,
            meta: `${formatDisplayDate(currentInv.issueDate)} · Total ${formatINR(pay.total)}`
          }
        ];
        invPayments.forEach((p) => {
          events.push({
            dot: 'var(--success)',
            title: `Payment Received (${formatINR(p.amount)})`,
            meta: `${formatDisplayDate(p.paidOn)} · ${p.method || 'Bank Transfer'}${p.note ? ` · ${p.note}` : ''}`
          });
        });
        if (pay.balance <= 0.01) {
          events.push({
            dot: 'var(--success)',
            title: 'Settled in Full',
            meta: 'Zero outstanding balance remaining'
          });
        } else if (pay.overdue) {
          events.push({
            dot: 'var(--danger)',
            title: 'Payment Overdue',
            meta: `${formatINR(pay.balance)} overdue since ${formatDisplayDate(currentInv.dueDate)}`
          });
        } else {
          events.push({
            dot: 'var(--warning)',
            title: 'Awaiting Balance Settlement',
            meta: `${formatINR(pay.balance)} remaining${currentInv.dueDate ? ` · Due ${formatDisplayDate(currentInv.dueDate)}` : ''}`
          });
        }
        timelineEl.innerHTML = events.map((ev) => `
          <div style="position:relative;padding-left:16px;padding-bottom:14px;border-left:2px solid var(--border);">
            <span style="position:absolute;left:-6px;top:4px;width:10px;height:10px;border-radius:50%;background:${ev.dot};box-shadow:0 0 0 3px var(--bg-card);"></span>
            <div style="font-size:0.83rem;font-weight:700;color:var(--text-main);">${escapeHtml(ev.title)}</div>
            <div style="font-size:0.74rem;color:var(--text-muted);margin-top:2px;">${escapeHtml(ev.meta)}</div>
          </div>
        `).join('');
      }
    }

    hydrateView();
  }

  /* --------------------------------------------------------------------------
     13. Interactive Reports Period Switcher & CSV Export (reports.html)
     -------------------------------------------------------------------------- */
  function initReportsModule() {
    if (!window.location.pathname.toLowerCase().includes('reports')) return;

    const tabs = document.querySelectorAll('input[name="report_period"]');
    const collectedEl = document.getElementById('rep-stat-collected');
    const collectedSubEl = document.getElementById('rep-stat-collected-sub');
    const outstandingEl = document.getElementById('rep-stat-outstanding');
    const outstandingSubEl = document.getElementById('rep-stat-outstanding-sub');
    const taxEl = document.getElementById('rep-stat-tax');
    const netEl = document.getElementById('rep-stat-net');
    const chartVisual = document.getElementById('reports-bar-chart') || document.querySelector('.mock-chart-visual');
    const donutGraphic = document.getElementById('reports-donut-graphic') || document.querySelector('.mock-donut-graphic');
    const donutPctEl = document.getElementById('reports-donut-pct');
    const donutLabelsEl = document.getElementById('reports-donut-labels');
    const gstTbody = document.getElementById('reports-gst-tbody');

    function parseRecordDate(str) {
      return parseFlexibleDate(str);
    }

    function getPeriodBounds(periodId) {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      let start;
      if (periodId === 'period-month') {
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
      } else if (periodId === 'period-all-months') {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        const yrEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        return { start, end: yrEnd };
      } else if (periodId === 'period-year') {
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(fyStartYear, 3, 1, 0, 0, 0);
      } else {
        const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0);
      }
      return { start, end };
    }

    function renderReports(periodId) {
      const compInfo = getCompanyInfo();
      const allInvoices = loadInvoices();
      const allPayments = loadPayments();
      const { start, end } = getPeriodBounds(periodId);

      const periodInvoices = allInvoices.filter((inv) => {
        const d = parseRecordDate(inv.issueDate);
        if (!d) return true;
        return d >= start && d <= end;
      });
      const activeInvoices = ((periodId === 'period-year' || periodId === 'period-all-months') && periodInvoices.length === 0 && allInvoices.length > 0)
        ? allInvoices
        : periodInvoices;

      const periodPayments = allPayments.filter((p) => {
        const d = parseRecordDate(p.paidOn);
        if (!d) return true;
        return d >= start && d <= end;
      });
      const activePayments = ((periodId === 'period-year' || periodId === 'period-all-months') && periodPayments.length === 0 && allPayments.length > 0)
        ? allPayments
        : periodPayments;

      let totalTaxable = 0;
      let totalTax = 0;
      let totalBilled = 0;
      let totalOutstanding = 0;
      let openCount = 0;

      const paidByInv = new Map();
      allPayments.forEach((p) => {
        const k = String(p.invoiceId);
        paidByInv.set(k, (paidByInv.get(k) || 0) + (Number(p.amount) || 0));
      });

      const ledgerRows = activeInvoices.map((inv) => {
        const totals = computeInvoiceTotals(inv);
        const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
        const isIntrastate = (inv.buyer?.code || compInfo.stateCode || '24') === (compInfo.stateCode || '24');
        const cgst = isIntrastate ? totals.totalTax / 2 : 0;
        const sgst = isIntrastate ? totals.totalTax / 2 : 0;
        const igst = !isIntrastate ? totals.totalTax : 0;

        totalTaxable += totals.subtotal;
        totalTax += totals.totalTax;
        totalBilled += pay.total;
        totalOutstanding += pay.balance;
        if (pay.balance > 0.01) openCount += 1;

        return { inv, totals, pay, cgst, sgst, igst };
      });

      const periodCollected = activePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const effectiveCollected = periodCollected > 0
        ? periodCollected
        : Math.max(0, totalBilled - totalOutstanding);

      if (collectedEl) collectedEl.textContent = formatINR(effectiveCollected);
      if (collectedSubEl) {
        collectedSubEl.textContent = activePayments.length
          ? `${activePayments.length} payment receipt${activePayments.length === 1 ? '' : 's'} recorded`
          : 'From recorded payments';
      }
      if (outstandingEl) outstandingEl.textContent = formatINR(totalOutstanding);
      if (outstandingSubEl) {
        outstandingSubEl.textContent = openCount
          ? `${openCount} unpaid / partial invoice${openCount === 1 ? '' : 's'}`
          : 'No open invoices in period';
      }
      if (taxEl) taxEl.textContent = formatINR(totalTax);
      if (netEl) netEl.textContent = formatINR(totalTaxable);

      // Bar chart buckets
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let buckets = [];
      if (periodId === 'period-month') {
        buckets = [
          { label: 'Wk 1', fullLabel: 'Week 1', val: 0 },
          { label: 'Wk 2', fullLabel: 'Week 2', val: 0 },
          { label: 'Wk 3', fullLabel: 'Week 3', val: 0 },
          { label: 'Wk 4', fullLabel: 'Week 4', val: 0 }
        ];
        activeInvoices.forEach((inv) => {
          const d = parseRecordDate(inv.issueDate) || new Date();
          const dayDiff = Math.max(0, Math.floor((d - start) / (1000 * 60 * 60 * 24)));
          const idx = Math.min(3, Math.floor(dayDiff / 8));
          buckets[idx].val += computeInvoiceTotals(inv).grand;
        });
      } else if (periodId === 'period-all-months') {
        buckets = monthNames.map((name, mIdx) => ({
          month: mIdx,
          label: name,
          fullLabel: `${name} ${start.getFullYear()}`,
          val: 0
        }));
        activeInvoices.forEach((inv) => {
          const d = parseRecordDate(inv.issueDate) || new Date();
          buckets[d.getMonth()].val += computeInvoiceTotals(inv).grand;
        });
      } else if (periodId === 'period-year') {
        buckets = [
          { label: 'Q1 (A-J)', fullLabel: 'Q1 Apr–Jun', val: 0 },
          { label: 'Q2 (J-S)', fullLabel: 'Q2 Jul–Sep', val: 0 },
          { label: 'Q3 (O-D)', fullLabel: 'Q3 Oct–Dec', val: 0 },
          { label: 'Q4 (J-M)', fullLabel: 'Q4 Jan–Mar', val: 0 }
        ];
        activeInvoices.forEach((inv) => {
          const d = parseRecordDate(inv.issueDate) || new Date();
          const m = d.getMonth();
          const qIdx = m >= 3 && m <= 5 ? 0 : m >= 6 && m <= 8 ? 1 : m >= 9 && m <= 11 ? 2 : 3;
          buckets[qIdx].val += computeInvoiceTotals(inv).grand;
        });
      } else {
        const qStart = start.getMonth();
        buckets = [0, 1, 2].map((offset) => ({
          month: (qStart + offset) % 12,
          label: monthNames[(qStart + offset) % 12],
          fullLabel: `${monthNames[(qStart + offset) % 12]} ${start.getFullYear()}`,
          val: 0
        }));
        activeInvoices.forEach((inv) => {
          const d = parseRecordDate(inv.issueDate) || new Date();
          const m = d.getMonth();
          const target = buckets.find((b) => b.month === m);
          if (target) target.val += computeInvoiceTotals(inv).grand;
        });
      }

      renderMonthlyBarChart(chartVisual, buckets);

      // Donut split
      const totalGross = Math.max(0, totalBilled);
      let collectedPct = 0;
      let taxPct = 0;
      let pendingPct = 0;
      if (totalGross > 0) {
        const netCollectedOnly = Math.max(0, Math.min(totalGross, totalBilled - totalOutstanding));
        collectedPct = Math.round((netCollectedOnly / totalGross) * 100);
        taxPct = Math.min(100 - collectedPct, Math.round((totalTax / totalGross) * 100));
        pendingPct = Math.max(0, 100 - collectedPct - taxPct);
      }

      if (donutGraphic) {
        donutGraphic.style.background = totalGross > 0
          ? `conic-gradient(var(--success) 0% ${collectedPct}%, var(--primary) ${collectedPct}% ${collectedPct + taxPct}%, var(--warning) ${collectedPct + taxPct}% 100%)`
          : 'conic-gradient(var(--border) 0% 100%)';
      }
      if (donutPctEl) donutPctEl.textContent = `${collectedPct}%`;
      if (donutLabelsEl) {
        donutLabelsEl.innerHTML = `
          <div class="donut-label-item">
            <span class="donut-color-dot emerald"></span>
            <span>${collectedPct}% Collected (${formatINR(Math.max(0, totalBilled - totalOutstanding))})</span>
          </div>
          <div class="donut-label-item">
            <span class="donut-color-dot blue"></span>
            <span>${taxPct}% GST Tax (${formatINR(totalTax)})</span>
          </div>
          <div class="donut-label-item">
            <span class="donut-color-dot orange"></span>
            <span>${pendingPct}% Pending (${formatINR(totalOutstanding)})</span>
          </div>
        `;
      }

      if (gstTbody) {
        if (!ledgerRows.length) {
          gstTbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="table-empty-state">
                  <div class="table-empty-title">No invoices in this period yet</div>
                  <div class="table-empty-desc">Create invoices to generate GST liability breakdowns and cash-flow reports.</div>
                </div>
              </td>
            </tr>
          `;
        } else {
          gstTbody.innerHTML = ledgerRows.map(({ inv, totals, pay, cgst, sgst, igst }) => `
            <tr>
              <td><a href="invoice-view.html?id=${encodeURIComponent(inv.id)}" class="col-mono" style="font-weight:700;color:var(--primary);">#${escapeHtml(inv.invNo)}</a></td>
              <td>${escapeHtml(inv.buyer?.name || 'Client')}</td>
              <td class="col-mono">${escapeHtml(inv.buyer?.gstin || '—')}</td>
              <td class="col-align-right col-mono">${formatPlainINR(totals.subtotal)}</td>
              <td class="col-align-right col-mono">${cgst > 0 ? formatPlainINR(cgst) : '—'}</td>
              <td class="col-align-right col-mono">${sgst > 0 ? formatPlainINR(sgst) : '—'}</td>
              <td class="col-align-right col-mono">${igst > 0 ? formatPlainINR(igst) : '—'}</td>
              <td class="col-align-right col-mono col-bold">${formatPlainINR(pay.total)}</td>
            </tr>
          `).join('');
        }
        applyTableLabels(gstTbody.closest('table'));
      }

      const monthlyTbody = document.getElementById('reports-monthly-tbody');
      if (monthlyTbody) {
        const mMap = new Map();
        allInvoices.forEach((inv) => {
          const dt = parseRecordDate(inv.issueDate);
          const mk = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}` : 'undated';
          const totals = computeInvoiceTotals(inv);
          const pay = computePaymentState(inv, paidByInv.get(String(inv.id)) || 0);
          const cur = mMap.get(mk) || { mk, count: 0, taxable: 0, tax: 0, billed: 0, paid: 0, pending: 0 };
          cur.count += 1;
          cur.taxable += totals.subtotal;
          cur.tax += totals.totalTax;
          cur.billed += pay.total;
          cur.paid += pay.paid;
          cur.pending += pay.balance;
          mMap.set(mk, cur);
        });
        const sortedMonths = Array.from(mMap.values()).sort((a, b) => b.mk.localeCompare(a.mk));
        if (!sortedMonths.length) {
          monthlyTbody.innerHTML = `
            <tr>
              <td colspan="8">
                <div class="table-empty-state" style="padding:28px 16px;">
                  <div class="table-empty-title">No monthly invoice data yet</div>
                  <div class="table-empty-desc">Create invoices to see your month-wise summary here.</div>
                </div>
              </td>
            </tr>
          `;
        } else {
          monthlyTbody.innerHTML = sortedMonths.map((row) => {
            let label = 'Undated';
            if (row.mk !== 'undated') {
              const [yr, mo] = row.mk.split('-').map(Number);
              label = new Date(yr, (mo || 1) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            }
            const href = row.mk !== 'undated' ? `invoice-list.html?month=${encodeURIComponent(row.mk)}` : 'invoice-list.html';
            return `
              <tr>
                <td class="col-bold">${escapeHtml(label)}</td>
                <td class="col-align-right col-mono">${row.count}</td>
                <td class="col-align-right col-mono">${formatPlainINR(row.taxable)}</td>
                <td class="col-align-right col-mono">${formatPlainINR(row.tax)}</td>
                <td class="col-align-right col-mono col-bold">${formatPlainINR(row.billed)}</td>
                <td class="col-align-right col-mono" style="color:var(--success);font-weight:700;">${formatPlainINR(row.paid)}</td>
                <td class="col-align-right col-mono" style="color:${row.pending > 0.01 ? 'var(--danger)' : 'var(--text-muted)'};font-weight:600;">${formatPlainINR(row.pending)}</td>
                <td class="col-align-right"><a href="${href}" class="btn btn-secondary btn-sm" style="padding:4px 10px;min-height:28px;font-size:0.74rem;">View</a></td>
              </tr>
            `;
          }).join('');
        }
        applyTableLabels(monthlyTbody.closest('table'));
      }
    }

    const activeTab = Array.from(tabs).find((r) => r.checked);
    renderReports(activeTab ? activeTab.id : 'period-quarter');

    tabs.forEach((radio) => {
      radio.addEventListener('change', () => renderReports(radio.id));
    });

    // Real CSV Export
    const csvBtn = document.getElementById('btn-export-reports-csv') || Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Export compliance CSV')
    );
    if (csvBtn) {
      csvBtn.removeAttribute('onclick');
      csvBtn.addEventListener('click', () => {
        const table = document.querySelector('.enterprise-table');
        if (!table) return;
        const bodyRows = Array.from(table.querySelectorAll('tbody tr')).filter((tr) => !tr.querySelector('.table-empty-state'));
        if (!bodyRows.length) {
          toast('No GST rows in the selected period to export', 'warning');
          return;
        }
        const allRows = [
          ...Array.from(table.querySelectorAll('thead tr')),
          ...bodyRows
        ].map((tr) =>
          Array.from(tr.querySelectorAll('th, td'))
            .map((cell) => `"${cell.textContent.trim().replace(/"/g, '""')}"`)
            .join(',')
        );
        const blob = new Blob([allRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoiceflex-gst-liability-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast('GST compliance CSV downloaded', 'success');
      });
    }
  }

  /* --------------------------------------------------------------------------
     14. Customer Add / Edit Live GSTIN Validation
     -------------------------------------------------------------------------- */
  function initCustomerValidation() {
    const gstinInput = document.getElementById('gstin');
    const stateSelect = document.getElementById('cust-state');
    if (!gstinInput) return;

    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const feedback = gstinInput.parentElement.querySelector('.invalid-feedback');

    function validateGstin() {
      const val = gstinInput.value.trim().toUpperCase();
      gstinInput.value = val;

      if (!val) {
        gstinInput.classList.remove('is-invalid', 'is-valid');
        if (feedback) feedback.style.display = 'none';
        return;
      }

      if (gstinRegex.test(val)) {
        gstinInput.classList.remove('is-invalid');
        gstinInput.classList.add('is-valid');
        if (feedback) {
          feedback.className = 'valid-feedback';
          feedback.style.display = 'flex';
          feedback.innerHTML = `<svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Valid 15-character Indian GSTIN`;
        }
        // Auto-match state code if found
        if (stateSelect) {
          const code = val.slice(0, 2);
          const opt = Array.from(stateSelect.options).find((o) => o.value.startsWith(code));
          if (opt) stateSelect.value = opt.value;
        }
      } else {
        gstinInput.classList.remove('is-valid');
        gstinInput.classList.add('is-invalid');
        if (feedback) {
          feedback.className = 'invalid-feedback';
          feedback.style.display = 'flex';
          feedback.innerHTML = `<svg class="icon-svg" style="width:14px;height:14px;" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Enter valid 15-char GSTIN (e.g., 27AAAAA1111A1Z1)`;
        }
      }
    }

    // Clear initial static error on customer-add.html so page starts clean
    if (gstinInput.value === '27INVALIDGSTINXX') {
      gstinInput.value = '';
      validateGstin();
    }

    gstinInput.addEventListener('input', validateGstin);
  }

  /* --------------------------------------------------------------------------
     15. Signature File Upload & Settings / Profile Appearance Controls
     -------------------------------------------------------------------------- */
  function initSignatureUpload() {
    const uploadBox = document.querySelector('.signature-upload-box');
    if (!uploadBox) return;
    uploadBox.removeAttribute('onclick');

    const preview = uploadBox.querySelector('.uploaded-sig-preview');
    const activeUser = getCurrentUser();
    const savedSig = activeUser ? activeUser.companySignature : localStorage.getItem(COMPANY_SIGNATURE_KEY);
    if (savedSig && preview) {
      preview.innerHTML = `
        <img src="${savedSig}" alt="Uploaded Signature" style="max-height:54px;max-width:200px;object-fit:contain;display:block;margin:0 auto;">
        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;border-top:1px solid var(--border);padding-top:4px;">Saved Stamp / Signature active</div>
      `;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp';
    fileInput.style.display = 'none';
    uploadBox.appendChild(fileInput);

    uploadBox.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const dataUrl = await compressImageFile(file, 420);
      const updated = updateCurrentUser((u) => ({ ...u, companySignature: dataUrl }));
      localStorage.setItem(COMPANY_SIGNATURE_KEY, dataUrl);
      if (updated && hasCompanySetup(updated) && window.__ifLegacyCloud?.saveCompany) {
        window.__ifLegacyCloud.saveCompany(updated.id, updated.companyInfo, { companySignature: dataUrl }).catch(() => {});
      }
      if (preview) {
        preview.innerHTML = `
          <img src="${dataUrl}" alt="Uploaded Signature" style="max-height:54px;max-width:200px;object-fit:contain;display:block;margin:0 auto;">
          <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px;border-top:1px solid var(--border);padding-top:4px;">${escapeHtml(file.name)} saved</div>
        `;
      }
      toast('Authorized seal & signature saved', 'success');
    });
  }

  function initSettingsAndProfileForms() {
    const isSettings = window.location.pathname.includes('company-settings');
    const isProfile = window.location.pathname.includes('profile');
    if (!isSettings && !isProfile) return;

    const currentUser = getCurrentUser();
    const urlParams = new URLSearchParams(window.location.search);
    const isOnboarding = isSettings && (urlParams.get('onboarding') === '1' || (currentUser && !hasCompanySetup(currentUser)));

    if (isOnboarding) {
      const bannerSlot = document.getElementById('onboarding-banner-slot');
      if (bannerSlot) {
        const firstName = currentUser ? currentUser.firstName : 'there';
        bannerSlot.innerHTML = `
          <div class="card" style="background: linear-gradient(135deg, rgba(0,122,255,0.12) 0%, rgba(10,132,255,0.06) 100%); border: 1px solid rgba(0,122,255,0.28); margin-bottom: 22px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
              <div style="min-width:0;">
                <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--primary);margin-bottom:4px;">Step 2 of 2 · Business &amp; GST Onboarding</div>
                <h2 style="font-size:1.15rem;font-weight:800;color:var(--text-main);margin-bottom:4px;">Welcome, ${escapeHtml(firstName)}! Set up your company profile</h2>
                <p style="font-size:0.84rem;color:var(--text-muted);">Fill in your company name, GSTIN, address, bank details &amp; logo below. Once saved, you'll go straight to your Dashboard.</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-skip-onboarding">Skip for now →</button>
            </div>
          </div>
        `;
        const skipBtn = document.getElementById('btn-skip-onboarding');
        if (skipBtn) {
          skipBtn.addEventListener('click', () => {
            updateCurrentUser((u) => ({ ...u, companySetupComplete: true }));
            window.location.href = 'dashboard.html';
          });
        }
      }

      const submitBtn = document.getElementById('btn-setup-submit');
      if (submitBtn) {
        submitBtn.textContent = 'Save Business Setup & Go to Dashboard →';
      }
      const cancelBtn = document.getElementById('btn-setup-cancel');
      if (cancelBtn) {
        cancelBtn.style.display = 'none';
      }
    }

    // Add iOS Dual Appearance Picker card on Settings & Profile pages
    const rightCol = document.querySelector('.settings-grid > div:last-child, .profile-grid > div:last-child');
    if (rightCol && !document.getElementById('appearance-card')) {
      const card = document.createElement('div');
      card.id = 'appearance-card';
      card.className = 'card';
      const current = getPreferredTheme();
      card.innerHTML = `
        <div class="card-header" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
          <div>
            <h3 class="card-title">Display & Appearance</h3>
            <p class="card-description">Choose Light or Dark iOS surface theme</p>
          </div>
        </div>
        <div class="ios-segmented" style="width:100%;display:grid;grid-template-columns:1fr 1fr;">
          <button type="button" class="ios-segmented-btn ${current === 'light' ? 'active' : ''}" data-theme-choice="light">Light</button>
          <button type="button" class="ios-segmented-btn ${current === 'dark' ? 'active' : ''}" data-theme-choice="dark">Dark</button>
        </div>
      `;
      rightCol.prepend(card);
      card.querySelectorAll('[data-theme-choice]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-theme-choice');
          applyTheme(mode);
          toast(mode === 'dark' ? 'Dark Appearance enabled' : 'Light Appearance enabled', 'info');
        });
      });

      if (!document.getElementById('real-notifications-card')) {
        const notifCard = document.createElement('div');
        notifCard.id = 'real-notifications-card';
        notifCard.className = 'card';
        const perm = 'Notification' in window ? Notification.permission : 'unsupported';
        notifCard.innerHTML = `
          <div class="card-header" style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
            <div>
              <h3 class="card-title">Real Device Notifications</h3>
              <p class="card-description">Receive instant device alerts for invoices, payments, quotations &amp; overdue bills</p>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-settings-enable-notif" style="justify-content:center;">
              ${perm === 'granted' ? 'Test Real Device Notification' : 'Enable Real Device Notifications'}
            </button>
          </div>
        `;
        card.insertAdjacentElement('afterend', notifCard);
        const notifBtn = document.getElementById('btn-settings-enable-notif');
        if (notifBtn) {
          notifBtn.addEventListener('click', async () => {
            await enableRealAppNotifications(true);
            if ('Notification' in window && Notification.permission === 'granted') {
              notifBtn.textContent = 'Test Real Device Notification';
            }
          });
        }
      }
    }

    const sessionsList = document.getElementById('profile-sessions-list');
    if (sessionsList && isProfile) {
      const session = getActiveSession();
      const plan = getUserPlan();
      const loginTime = session?.loggedInAt
        ? new Date(session.loggedInAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Active now';
      const ua = navigator.userAgent || '';
      const deviceLabel = /iPhone|iPad/i.test(ua)
        ? 'iOS Safari / Mobile Web'
        : /Android/i.test(ua)
          ? 'Android Browser'
          : /Mac/i.test(ua)
            ? 'macOS Desktop Browser'
            : 'Desktop Web Browser';

      sessionsList.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:12px;border-radius:12px;background:var(--bg-app);border:1px solid var(--border);">
          <div>
            <div style="font-weight:700;font-size:0.875rem;color:var(--text-main);">${escapeHtml(deviceLabel)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">Signed in as ${escapeHtml(currentUser?.email || 'Account')}</div>
            <div style="font-size:0.72rem;color:var(--text-light);margin-top:4px;">Started: ${escapeHtml(loginTime)}</div>
          </div>
          <span class="status-badge paid" style="font-size:0.7rem;">Active</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;padding-top:4px;">
          <span style="color:var(--text-muted);">Subscription Tier</span>
          <a href="plans.html" style="font-weight:700;color:var(--primary);">${escapeHtml(plan.label)} Plan →</a>
        </div>
      `;
    }

    const form = document.getElementById('company-setup-form') || document.querySelector('form[action="dashboard.html"]');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSettings) {
          const compNameEl = document.getElementById('comp-name');
          const compName = compNameEl?.value.trim() || '';
          if (!compName) {
            toast('Please enter your Company Legal Name', 'warning');
            if (compNameEl) compNameEl.focus();
            return;
          }
          const stateVal = document.getElementById('state-origin')?.value || '24|Gujarat';
          const [stateCode, stateName] = stateVal.split('|');
          const info = {
            name: compName,
            gstin: (document.getElementById('comp-gstin')?.value.trim() || '').toUpperCase(),
            pan: (document.getElementById('comp-pan')?.value.trim() || '').toUpperCase(),
            city: document.getElementById('comp-city')?.value.trim() || '',
            stateCode: stateCode || '24',
            stateName: stateName || 'Gujarat',
            email: document.getElementById('comp-email')?.value.trim() || currentUser?.email || '',
            phone: document.getElementById('comp-phone')?.value.trim() || currentUser?.phone || '',
            address: document.getElementById('comp-address')?.value.trim() || '',
            bankName: document.getElementById('bank-name')?.value.trim() || '',
            bankAccount: document.getElementById('bank-account')?.value.trim() || '',
            bankBranchIfsc: document.getElementById('bank-branch-ifsc')?.value.trim() || '',
            bankType: document.getElementById('bank-type')?.value || 'Current Account',
            defaultGst: document.getElementById('def-gst')?.value || '18',
            invoicePrefix: document.getElementById('prefix')?.value.trim() || computeNextInvoiceNo(compName, loadInvoices()),
            quotePrefix: document.getElementById('quote-prefix')?.value.trim() || 'QTN/2026-2027/',
            terms: document.getElementById('comp-terms')?.value.trim() || ''
          };
          const savedUser = updateCurrentUser((u) => ({
            ...u,
            companySetupComplete: true,
            companyInfo: info
          }));
          localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(info));
          hydrateGlobalAvatarsAndLogos();

          if (savedUser && window.__ifLegacyCloud?.saveCompany) {
            const syncPromise = window.__ifLegacyCloud.saveCompany(savedUser.id, info, {
              companyLogo: savedUser.companyLogo,
              companySignature: savedUser.companySignature,
              adminAvatar: savedUser.adminAvatar
            }).catch(() => null);
            await Promise.race([
              syncPromise,
              new Promise((resolve) => setTimeout(resolve, 1800))
            ]);
          }

          if (isOnboarding) {
            toast('Business setup saved! Opening your Dashboard...', 'success');
            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 400);
          } else {
            toast('All business & bank details saved', 'success');
          }
        } else {
          const currPassEl = document.getElementById('curr-pass');
          const newPassEl = document.getElementById('new-pass');
          const confPassEl = document.getElementById('conf-pass');
          const currPass = currPassEl?.value || '';
          const newPass = newPassEl?.value || '';
          const confPass = confPassEl?.value || '';
          let passwordUpdated = false;

          if (currPass || newPass || confPass) {
            if (!(await window.IFCloud.verifyPassword(currPass))) {
              toast('Current password is incorrect', 'warning');
              return;
            }
            if (newPass.length < 6) {
              toast('New password must be at least 6 characters', 'warning');
              return;
            }
            if (newPass !== confPass) {
              toast('New password and confirmation do not match', 'warning');
              return;
            }
            const pwRes = await window.IFCloud.updatePassword(newPass);
            if (pwRes && pwRes.error) {
              toast(pwRes.error, 'warning');
              return;
            }
            passwordUpdated = true;
          }

          const info = {
            firstName: document.getElementById('first-name')?.value.trim() || 'Admin',
            lastName: document.getElementById('last-name')?.value.trim() || '',
            email: document.getElementById('admin-email')?.value.trim() || '',
            phone: document.getElementById('admin-tel')?.value.trim() || ''
          };
          updateCurrentUser((u) => ({
            ...u,
            firstName: info.firstName,
            lastName: info.lastName,
            email: info.email || u.email,
            phone: info.phone,
            password: passwordUpdated ? newPass : u.password
          }));
          localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(info));
          hydrateGlobalAvatarsAndLogos();
          if (passwordUpdated) {
            if (currPassEl) currPassEl.value = '';
            if (newPassEl) newPassEl.value = '';
            if (confPassEl) confPassEl.value = '';
            toast('Personal profile and password updated', 'success');
          } else {
            toast('Personal profile updated', 'success');
          }
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     15B. Bill Book (Folders & Document Pages Like Physical Binder)
     -------------------------------------------------------------------------- */
  function getDefaultBillBookData() {
    return {
      folders: [
        {
          id: 'fld-gst',
          name: 'FY 2026-27 GST Sales Invoices',
          desc: 'Outgoing B2B tax invoices, CGST/SGST & IGST bills',
          color: 'blue'
        },
        {
          id: 'fld-raw',
          name: 'Raw Material & Supplier Bills',
          desc: 'Vendor purchase bills for steel, packaging & raw stock',
          color: 'amber'
        },
        {
          id: 'fld-challan',
          name: 'Delivery Challans & Dispatch',
          desc: 'Goods dispatch slips, job-work challans & transport docs',
          color: 'emerald'
        },
        {
          id: 'fld-proforma',
          name: 'Proforma & Quotations',
          desc: 'Client estimates, advance proformas & signed orders',
          color: 'indigo'
        }
      ],
      pages: [
        {
          id: 'pg-1',
          folderId: 'fld-gst',
          type: 'gst',
          billNo: 'INV-2026-005',
          party: 'Acme Corporation',
          date: '20 Jul 2026',
          amount: 56200,
          notes: 'Software Consulting & Enterprise SaaS Licensing (18% GST)'
        },
        {
          id: 'pg-2',
          folderId: 'fld-gst',
          type: 'gst',
          billNo: 'INV-2026-004',
          party: 'TechSolutions Group',
          date: '18 Jul 2026',
          amount: 144500,
          notes: 'Annual Enterprise Deployment & Support Retainer'
        },
        {
          id: 'pg-3',
          folderId: 'fld-gst',
          type: 'gst',
          billNo: 'INV-2026-003',
          party: 'Apex Labs India',
          date: '15 Jul 2026',
          amount: 82400,
          notes: 'Interstate IGST Cloud Infrastructure Integration'
        },
        {
          id: 'pg-4',
          folderId: 'fld-raw',
          type: 'raw',
          billNo: 'PUR-2026-009',
          party: 'Bharat Steel & Alloys',
          date: '19 Jul 2026',
          amount: 68400,
          notes: 'Cold Rolled Steel Sheets (2mm) · Supplier Ref SUP-8841'
        },
        {
          id: 'pg-5',
          folderId: 'fld-raw',
          type: 'raw',
          billNo: 'PUR-2026-008',
          party: 'Shree Packaging Works',
          date: '14 Jul 2026',
          amount: 24750,
          notes: 'Corrugated Boxes & Protective Crates · Ref PKG-209'
        },
        {
          id: 'pg-6',
          folderId: 'fld-challan',
          type: 'challan',
          billNo: 'DC-2026-012',
          party: 'Acme Corporation',
          date: '21 Jul 2026',
          amount: 34000,
          notes: 'Server Rack Enclosures · Vehicle MH-01-CD-4820'
        },
        {
          id: 'pg-7',
          folderId: 'fld-challan',
          type: 'challan',
          billNo: 'DC-2026-011',
          party: 'Vertex Media',
          date: '12 Jul 2026',
          amount: 18500,
          notes: 'Audio-Visual Hardware · Supply on Approval'
        },
        {
          id: 'pg-8',
          folderId: 'fld-proforma',
          type: 'gst',
          billNo: 'PI-2026-004',
          party: 'Innovative Media Labs',
          date: '10 Jul 2026',
          amount: 185000,
          notes: 'Proforma Quote · Annual Cloud Suite & Onboarding'
        }
      ]
    };
  }

  function loadBillBookData() {
    return window.IFCloud.getData('billbook');
  }

  function saveBillBookData(data) {
    window.IFCloud.setData('billbook', data);
  }

  async function putBillBookFile(id, fileObj) {
    return window.IFCloud.putBillFile(id, fileObj);
  }

  async function getBillBookFile(id) {
    return window.IFCloud.getBillFile(id);
  }

  async function deleteBillBookFile() {
    // File removal happens together with the page record (see supabase-layer.js).
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function openSaveToBillBookModal(docMeta) {
    const data = loadBillBookData();
    const backdrop = document.createElement('div');
    backdrop.className = 'ios-modal-backdrop';
    backdrop.innerHTML = `
      <div class="ios-modal-card" role="dialog" aria-modal="true" style="max-width: 420px; text-align: left;">
        <h3 class="ios-modal-title" style="text-align:center;">Save to Bill Book Folder</h3>
        <p class="ios-modal-message" style="text-align:center;margin-bottom:14px;">File <strong>#${escapeHtml(docMeta.billNo)}</strong> (${escapeHtml(docMeta.party)}) inside a folder.</p>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="save-bb-folder">Select Folder</label>
          <select id="save-bb-folder" class="form-select">
            ${data.folders.map((f) => `<option value="${escapeHtml(f.id)}">${escapeHtml(f.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:18px;">
          <label class="form-label" for="save-bb-note">Page Label / Note</label>
          <input type="text" id="save-bb-note" class="form-control" value="${escapeHtml(docMeta.notes || '')}">
        </div>
        <div class="ios-modal-actions">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="button" class="btn btn-primary" data-modal-confirm>Save Page</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    function close() {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
    }

    backdrop.querySelector('[data-modal-cancel]').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
      const folderId = backdrop.querySelector('#save-bb-folder').value;
      const note = backdrop.querySelector('#save-bb-note').value.trim();
      const fresh = loadBillBookData();
      fresh.pages.unshift({
        id: window.IFCloud.uuid(),
        folderId,
        type: docMeta.type || 'gst',
        billNo: docMeta.billNo,
        party: docMeta.party,
        date: docMeta.date,
        amount: docMeta.amount || 0,
        notes: note || docMeta.notes
      });
      saveBillBookData(fresh);
      close();
      toast(`Saved #${docMeta.billNo} to Bill Book`, 'success');
    });
  }

  function initBillBook() {
    const root = document.getElementById('billbook-root');
    const viewport = document.getElementById('billbook-viewport');
    if (!root || !viewport) return;

    const breadcrumb = document.getElementById('billbook-breadcrumb');
    const searchInput = document.getElementById('billbook-search');
    const filterBtns = document.querySelectorAll('#billbook-type-filter [data-filter]');
    const newFolderBtn = document.getElementById('btn-new-folder');
    const addPageBtn = document.getElementById('btn-add-page');

    let activeFolderId = null;
    let activeFilter = 'all';
    let searchQuery = '';
    const fileUrlCache = new Map();

    const typeMeta = {
      gst: { label: 'GST Invoice', badgeClass: 'sent' },
      raw: { label: 'Raw Material', badgeClass: 'partial' },
      challan: { label: 'Challan', badgeClass: 'paid' },
      file: { label: 'Uploaded File', badgeClass: 'draft' }
    };

    async function resolveFilePreview(page) {
      if (!page.fileKey) return null;
      if (fileUrlCache.has(page.fileKey)) return fileUrlCache.get(page.fileKey);
      const stored = await getBillBookFile(page.fileKey);
      if (stored && stored.dataUrl) {
        fileUrlCache.set(page.fileKey, stored);
        return stored;
      }
      return null;
    }

    async function handleUploadFiles(files, targetFolderId) {
      if (!files || !files.length) return;
      const data = loadBillBookData();
      const folderId = targetFolderId || activeFolderId || (data.folders[0] && data.folders[0].id);
      if (!folderId) return;

      let added = 0;
      for (const file of Array.from(files)) {
        const isImg = file.type.startsWith('image/');
        const dataUrl = isImg ? await compressImageFile(file, 1200) : await readFileAsDataUrl(file);
        const fileKey = 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        await putBillBookFile(fileKey, {
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          dataUrl
        });
        fileUrlCache.set(fileKey, { name: file.name, mime: file.type, dataUrl });

        data.pages.push({
          id: window.IFCloud.uuid(),
          folderId,
          type: 'file',
          billNo: file.name.replace(/\.[^.]+$/, '').slice(0, 26),
          party: isImg ? 'Scanned Bill Image' : 'PDF Document',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          amount: 0,
          notes: `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`,
          fileKey,
          fileMime: file.type,
          fileName: file.name
        });
        added++;
      }

      saveBillBookData(data);
      toast(`Added ${added} file${added === 1 ? '' : 's'} into folder`, 'success');
      render();
    }

    function openNewFolderModal() {
      const backdrop = document.createElement('div');
      backdrop.className = 'ios-modal-backdrop';
      backdrop.innerHTML = `
        <div class="ios-modal-card" role="dialog" aria-modal="true" style="max-width:420px;text-align:left;">
          <h3 class="ios-modal-title" style="text-align:center;">New Bill Book Folder</h3>
          <p class="ios-modal-message" style="text-align:center;margin-bottom:14px;">Group GST invoices, raw material bills, or challans inside one binder.</p>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" for="bb-folder-name">Folder Name <span class="required-star">*</span></label>
            <input type="text" id="bb-folder-name" class="form-control" placeholder="e.g. August Raw Material Bills" required>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" for="bb-folder-desc">Description</label>
            <input type="text" id="bb-folder-desc" class="form-control" placeholder="What bills go inside this folder?">
          </div>
          <div class="form-group" style="margin-bottom:18px;">
            <label class="form-label" for="bb-folder-color">Folder Color Tab</label>
            <select id="bb-folder-color" class="form-select">
              <option value="blue">System Blue</option>
              <option value="amber">Amber (Purchase / Raw Material)</option>
              <option value="emerald">Emerald (Dispatch / Challan)</option>
              <option value="indigo">Indigo (Proforma)</option>
              <option value="rose">Crimson (Tax & Audit)</option>
            </select>
          </div>
          <div class="ios-modal-actions">
            <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
            <button type="button" class="btn btn-primary" data-modal-confirm>Create Folder</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('is-open'));

      function close() {
        backdrop.classList.remove('is-open');
        setTimeout(() => backdrop.remove(), 200);
      }

      backdrop.querySelector('[data-modal-cancel]').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });
      backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
        const name = backdrop.querySelector('#bb-folder-name').value.trim();
        if (!name) {
          toast('Please enter a folder name', 'warning');
          return;
        }
        const desc = backdrop.querySelector('#bb-folder-desc').value.trim() || 'Bill Book document folder';
        const color = backdrop.querySelector('#bb-folder-color').value;
        const data = loadBillBookData();
        const newId = window.IFCloud.uuid();
        data.folders.unshift({ id: newId, name, desc, color });
        saveBillBookData(data);
        close();
        activeFolderId = newId;
        toast(`Created folder "${name}"`, 'success');
        render();
      });
    }

    function openAddPageModal() {
      const data = loadBillBookData();
      const backdrop = document.createElement('div');
      backdrop.className = 'ios-modal-backdrop';
      backdrop.innerHTML = `
        <div class="ios-modal-card" role="dialog" aria-modal="true" style="max-width:460px;text-align:left;">
          <h3 class="ios-modal-title" style="text-align:center;">Add Page to Bill Book</h3>
          <p class="ios-modal-message" style="text-align:center;margin-bottom:14px;">Slip a structured bill entry or upload photo/PDF files into a folder.</p>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" for="bb-page-folder">Destination Folder</label>
            <select id="bb-page-folder" class="form-select">
              ${data.folders.map((f) => `<option value="${escapeHtml(f.id)}" ${f.id === activeFolderId ? 'selected' : ''}>${escapeHtml(f.name)}</option>`).join('')}
            </select>
          </div>
          <div style="padding:12px;border:1.5px dashed var(--border-strong);border-radius:14px;margin-bottom:14px;text-align:center;background:var(--bg-subtle);">
            <input type="file" id="bb-modal-file-input" accept="image/*,.pdf" multiple style="display:none;">
            <button type="button" class="btn btn-secondary btn-sm" id="bb-modal-upload-trigger">Upload Bill Photo / PDF File</button>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">Or fill details below to add a structured bill page</div>
          </div>
          <div class="form-grid" style="gap:10px;margin-bottom:10px;">
            <div class="form-group">
              <label class="form-label" for="bb-page-type">Bill Type</label>
              <select id="bb-page-type" class="form-select">
                <option value="gst">GST Invoice</option>
                <option value="raw">Raw Material Bill</option>
                <option value="challan">Delivery Challan</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="bb-page-no">Bill / Ref #</label>
              <input type="text" id="bb-page-no" class="form-control col-mono" placeholder="INV-2026-010">
            </div>
          </div>
          <div class="form-grid" style="gap:10px;margin-bottom:10px;">
            <div class="form-group">
              <label class="form-label" for="bb-page-party">Customer / Supplier</label>
              <input type="text" id="bb-page-party" class="form-control" placeholder="e.g. Bharat Steel">
            </div>
            <div class="form-group">
              <label class="form-label" for="bb-page-amt">Amount (₹)</label>
              <input type="number" min="0" step="0.01" id="bb-page-amt" class="form-control col-mono" placeholder="25000">
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label" for="bb-page-notes">Material / Notes</label>
            <input type="text" id="bb-page-notes" class="form-control" placeholder="e.g. 500kg Raw Copper Rods · Paid via NEFT">
          </div>
          <div class="ios-modal-actions">
            <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
            <button type="button" class="btn btn-primary" data-modal-confirm>Add Bill Page</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('is-open'));

      function close() {
        backdrop.classList.remove('is-open');
        setTimeout(() => backdrop.remove(), 200);
      }

      backdrop.querySelector('[data-modal-cancel]').addEventListener('click', close);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });

      const fileInp = backdrop.querySelector('#bb-modal-file-input');
      backdrop.querySelector('#bb-modal-upload-trigger').addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', async () => {
        const folderId = backdrop.querySelector('#bb-page-folder').value;
        close();
        await handleUploadFiles(fileInp.files, folderId);
        activeFolderId = folderId;
        render();
      });

      backdrop.querySelector('[data-modal-confirm]').addEventListener('click', () => {
        const folderId = backdrop.querySelector('#bb-page-folder').value;
        const type = backdrop.querySelector('#bb-page-type').value;
        const billNo = backdrop.querySelector('#bb-page-no').value.trim();
        const party = backdrop.querySelector('#bb-page-party').value.trim();
        if (!billNo || !party) {
          toast('Enter Bill # and Customer/Supplier name', 'warning');
          return;
        }
        const amount = parseFloat(backdrop.querySelector('#bb-page-amt').value) || 0;
        const notes = backdrop.querySelector('#bb-page-notes').value.trim() || 'Added to Bill Book';

        const fresh = loadBillBookData();
        fresh.pages.push({
          id: window.IFCloud.uuid(),
          folderId,
          type,
          billNo,
          party,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          amount,
          notes
        });
        saveBillBookData(fresh);
        close();
        activeFolderId = folderId;
        toast(`Page #${billNo} filed into folder`, 'success');
        render();
      });
    }

    async function openPageViewer(pagesList, startIndex) {
      let currentIdx = startIndex;
      const data = loadBillBookData();

      const backdrop = document.createElement('div');
      backdrop.className = 'ios-modal-backdrop';
      backdrop.innerHTML = `<div class="page-viewer-modal" role="dialog" aria-modal="true"></div>`;
      document.body.appendChild(backdrop);
      requestAnimationFrame(() => backdrop.classList.add('is-open'));

      const modal = backdrop.querySelector('.page-viewer-modal');

      function close() {
        backdrop.classList.remove('is-open');
        setTimeout(() => backdrop.remove(), 200);
      }

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close();
      });

      async function renderPageContent() {
        const page = pagesList[currentIdx];
        if (!page) {
          close();
          return;
        }
        const meta = typeMeta[page.type] || typeMeta.gst;
        const folder = data.folders.find((f) => f.id === page.folderId);
        const storedFile = page.fileKey ? await resolveFilePreview(page) : null;

        let bodyHtml = '';
        if (storedFile && storedFile.dataUrl) {
          if ((storedFile.mime || '').startsWith('image/')) {
            bodyHtml = `<img src="${storedFile.dataUrl}" alt="${escapeHtml(page.billNo)}" style="max-width:100%;max-height:54vh;border-radius:12px;border:1px solid var(--border);object-fit:contain;">`;
          } else {
            bodyHtml = `
              <div style="width:100%;padding:28px;border-radius:16px;background:var(--bg-subtle);border:1px solid var(--border);text-align:center;">
                <div style="font-weight:800;font-size:1.1rem;color:var(--text-main);margin-bottom:6px;">${escapeHtml(storedFile.name || page.billNo)}</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:16px;">PDF Document attached in ${escapeHtml(folder ? folder.name : 'Folder')}</div>
                <a href="${storedFile.dataUrl}" download="${escapeHtml(storedFile.name || page.billNo + '.pdf')}" class="btn btn-primary btn-sm">Download PDF</a>
              </div>
            `;
          }
        } else {
          bodyHtml = `
            <div style="width:100%;background:#FFFFFF;color:#1C1C1E;border:1px solid rgba(0,0,0,0.1);border-radius:16px;padding:24px;box-shadow:var(--shadow-sm);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1.5px solid #E5E5EA;padding-bottom:14px;margin-bottom:16px;flex-wrap:wrap;">
                <div>
                  <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:#8E8E93;letter-spacing:0.05em;">${escapeHtml(meta.label)}</div>
                  <div style="font-size:1.25rem;font-weight:800;font-family:var(--font-mono);color:#007AFF;">#${escapeHtml(page.billNo)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:0.75rem;color:#8E8E93;">Bill Date</div>
                  <div style="font-weight:700;">${escapeHtml(page.date)}</div>
                </div>
              </div>
              <div style="margin-bottom:16px;">
                <div style="font-size:0.72rem;text-transform:uppercase;color:#8E8E93;font-weight:700;">Party / Vendor</div>
                <div style="font-size:1.02rem;font-weight:700;">${escapeHtml(page.party)}</div>
              </div>
              <div style="background:#F2F2F7;border-radius:12px;padding:14px;margin-bottom:16px;">
                <div style="font-size:0.72rem;text-transform:uppercase;color:#8E8E93;font-weight:700;margin-bottom:4px;">Particulars & Notes</div>
                <div style="font-size:0.875rem;color:#3A3A3C;line-height:1.5;">${escapeHtml(page.notes || 'Filed in Bill Book')}</div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px dashed #D1D1D6;">
                <span style="font-weight:700;color:#6C6C70;">Total Bill Value</span>
                <span style="font-size:1.3rem;font-weight:800;font-family:var(--font-mono);color:#007AFF;">${formatINR(page.amount)}</span>
              </div>
            </div>
          `;
        }

        modal.innerHTML = `
          <div class="page-viewer-head">
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:0.95rem;color:var(--text-main);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">#${escapeHtml(page.billNo)} · ${escapeHtml(page.party)}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(folder ? folder.name : 'Bill Book')} · Page ${currentIdx + 1} of ${pagesList.length}</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" data-viewer-close>Close</button>
          </div>
          <div class="page-viewer-content">${bodyHtml}</div>
          <div class="page-viewer-foot">
            <div class="btn-group">
              <button type="button" class="btn btn-secondary btn-sm" data-prev-page ${currentIdx === 0 ? 'disabled' : ''}>Prev Page</button>
              <button type="button" class="btn btn-secondary btn-sm" data-next-page ${currentIdx >= pagesList.length - 1 ? 'disabled' : ''}>Next Page</button>
            </div>
            <div class="btn-group">
              ${page.type === 'challan' ? '<a href="invoice-preview.html?type=challan" class="btn btn-outline btn-sm">Open Sheet</a>' : page.type === 'raw' ? '<a href="invoice-preview.html?type=raw" class="btn btn-outline btn-sm">Open Sheet</a>' : !page.fileKey ? '<a href="invoice-preview.html" class="btn btn-outline btn-sm">Open Sheet</a>' : ''}
              <button type="button" class="btn btn-danger btn-sm" data-delete-page>Delete</button>
            </div>
          </div>
        `;

        modal.querySelector('[data-viewer-close]').addEventListener('click', close);
        const prevBtn = modal.querySelector('[data-prev-page]');
        const nextBtn = modal.querySelector('[data-next-page]');
        if (prevBtn) {
          prevBtn.addEventListener('click', () => {
            if (currentIdx > 0) {
              currentIdx--;
              renderPageContent();
            }
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            if (currentIdx < pagesList.length - 1) {
              currentIdx++;
              renderPageContent();
            }
          });
        }
        modal.querySelector('[data-delete-page]').addEventListener('click', async () => {
          const ok = await confirmSheet({
            title: 'Remove Page from Folder?',
            message: `Remove #${page.billNo} from this Bill Book folder?`,
            confirmText: 'Remove',
            danger: true
          });
          if (!ok) return;
          const fresh = loadBillBookData();
          fresh.pages = fresh.pages.filter((p) => p.id !== page.id);
          saveBillBookData(fresh);
          if (page.fileKey) deleteBillBookFile(page.fileKey);
          close();
          toast(`Removed #${page.billNo}`, 'warning');
          render();
        });
      }

      renderPageContent();
    }

    async function render() {
      const data = loadBillBookData();
      const q = searchQuery.trim().toLowerCase();

      if (!activeFolderId) {
        breadcrumb.innerHTML = `<span>All Bill Folders</span> <span class="folder-count-badge">${data.folders.length} Folders · ${data.pages.length} Pages</span>`;

        const matchedFolders = data.folders.filter((f) => {
          const folderPages = data.pages.filter((p) => p.folderId === f.id);
          const matchesType = activeFilter === 'all' || folderPages.some((p) => p.type === activeFilter);
          const matchesQuery =
            !q ||
            f.name.toLowerCase().includes(q) ||
            f.desc.toLowerCase().includes(q) ||
            folderPages.some((p) => `${p.billNo} ${p.party} ${p.notes}`.toLowerCase().includes(q));
          return matchesType && matchesQuery;
        });

        if (!matchedFolders.length) {
          viewport.innerHTML = `
            <div class="card" style="text-align:center;padding:42px 20px;">
              <div style="font-weight:700;font-size:1rem;color:var(--text-main);">No matching folders found</div>
              <div style="font-size:0.84rem;color:var(--text-muted);margin-top:6px;">Create a new folder or clear your search filter.</div>
            </div>
          `;
          return;
        }

        viewport.innerHTML = `
          <div class="billbook-folders-grid">
            ${matchedFolders
              .map((f) => {
                const pages = data.pages.filter((p) => p.folderId === f.id);
                const total = pages.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
                return `
                  <div class="folder-card" data-open-folder="${escapeHtml(f.id)}" tabindex="0" role="button">
                    <div class="folder-card-top">
                      <div class="folder-squircle ${escapeHtml(f.color || 'blue')}">
                        <svg class="icon-svg" viewBox="0 0 24 24" style="width:22px;height:22px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      </div>
                      <span class="folder-count-badge">${pages.length} page${pages.length === 1 ? '' : 's'}</span>
                    </div>
                    <div>
                      <div class="folder-name">${escapeHtml(f.name)}</div>
                      <div class="folder-desc">${escapeHtml(f.desc)}</div>
                    </div>
                    <div class="folder-meta-footer">
                      <span>Folder Total</span>
                      <span class="folder-total-val">${formatINR(total)}</span>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        `;

        viewport.querySelectorAll('[data-open-folder]').forEach((card) => {
          const open = () => {
            activeFolderId = card.getAttribute('data-open-folder');
            render();
          };
          card.addEventListener('click', open);
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          });
        });
        return;
      }

      // Inside a specific folder
      const folder = data.folders.find((f) => f.id === activeFolderId);
      if (!folder) {
        activeFolderId = null;
        render();
        return;
      }

      const folderPages = data.pages.filter((p) => {
        if (p.folderId !== folder.id) return false;
        if (activeFilter !== 'all' && p.type !== activeFilter) return false;
        if (q && !`${p.billNo} ${p.party} ${p.notes} ${p.date}`.toLowerCase().includes(q)) return false;
        return true;
      });

      breadcrumb.innerHTML = `
        <button type="button" class="billbook-crumb-btn" id="bb-back-folders">
          <svg class="icon-svg" style="width:15px;height:15px;" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          All Bill Folders
        </button>
        <span style="color:var(--text-light);">/</span>
        <span>${escapeHtml(folder.name)}</span>
        <span class="folder-count-badge">${folderPages.length} page${folderPages.length === 1 ? '' : 's'}</span>
      `;

      document.getElementById('bb-back-folders').addEventListener('click', () => {
        activeFolderId = null;
        render();
      });

      viewport.innerHTML = `
        <div class="billbook-dropzone" id="bb-dropzone">
          <div class="billbook-dropzone-info">
            <div class="billbook-dropzone-icon">
              <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </div>
            <div>
              <div style="font-weight:700;font-size:0.9rem;color:var(--text-main);">Add files into "${escapeHtml(folder.name)}"</div>
              <div style="font-size:0.78rem;color:var(--text-muted);">Drop or choose bill photos (PNG, JPG) or PDF invoices to store inside this folder</div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="bb-dropzone-btn">Choose Files</button>
          <input type="file" id="bb-folder-file-input" accept="image/*,.pdf" multiple style="display:none;">
        </div>

        ${
          folderPages.length
            ? `<div class="billbook-pages-grid">
                ${folderPages
                  .map((p, idx) => {
                    const meta = typeMeta[p.type] || typeMeta.gst;
                    return `
                      <div class="page-tile" data-open-page="${idx}" tabindex="0" role="button">
                        <div class="page-tile-preview" data-thumb-page="${escapeHtml(p.id)}">
                          <div class="page-paper-thumb">
                            <div class="page-paper-tag">${escapeHtml(meta.label)}</div>
                            <div class="page-paper-line"></div>
                            <div class="page-paper-line mid"></div>
                            <div class="page-paper-line short"></div>
                            <div class="page-paper-line mid" style="margin-top:auto;"></div>
                          </div>
                          <span class="page-number-corner">Pg ${idx + 1}</span>
                        </div>
                        <div class="page-tile-body">
                          <div class="page-tile-title">#${escapeHtml(p.billNo)}</div>
                          <div class="page-tile-sub">${escapeHtml(p.party)} · ${escapeHtml(p.date)}</div>
                          <div class="page-tile-footer">
                            <span class="status-badge ${meta.badgeClass}" style="font-size:0.68rem;padding:2px 8px;">${escapeHtml(meta.label)}</span>
                            <span class="col-mono col-bold" style="color:var(--text-main);">${p.amount ? formatINR(p.amount) : 'Attachment'}</span>
                          </div>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>`
            : `<div class="card" style="text-align:center;padding:38px 20px;">
                <div style="font-weight:700;color:var(--text-main);">This folder has no matching pages yet</div>
                <div style="font-size:0.82rem;color:var(--text-muted);margin-top:6px;">Upload bill photos/PDFs above or click "Add Bill / Page" to file a record.</div>
              </div>`
        }
      `;

      // Hydrate image thumbnails asynchronously from IndexedDB
      folderPages.forEach(async (p) => {
        if (!p.fileKey) return;
        const stored = await resolveFilePreview(p);
        if (stored && stored.dataUrl && (stored.mime || '').startsWith('image/')) {
          const thumbSlot = viewport.querySelector(`[data-thumb-page="${CSS.escape(p.id)}"]`);
          if (thumbSlot) {
            const corner = thumbSlot.querySelector('.page-number-corner');
            thumbSlot.innerHTML = `<img src="${stored.dataUrl}" alt="${escapeHtml(p.billNo)}">`;
            if (corner) thumbSlot.appendChild(corner);
          }
        }
      });

      const dropzone = document.getElementById('bb-dropzone');
      const folderFileInp = document.getElementById('bb-folder-file-input');
      const dropBtn = document.getElementById('bb-dropzone-btn');

      if (dropzone && folderFileInp) {
        dropBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          folderFileInp.click();
        });
        dropzone.addEventListener('click', () => folderFileInp.click());
        folderFileInp.addEventListener('change', () => handleUploadFiles(folderFileInp.files, folder.id));
        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('is-dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
        dropzone.addEventListener('drop', (e) => {
          e.preventDefault();
          dropzone.classList.remove('is-dragover');
          handleUploadFiles(e.dataTransfer.files, folder.id);
        });
      }

      viewport.querySelectorAll('[data-open-page]').forEach((tile) => {
        const idx = Number(tile.getAttribute('data-open-page'));
        tile.addEventListener('click', () => openPageViewer(folderPages, idx));
        tile.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPageViewer(folderPages, idx);
          }
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        render();
      });
    }

    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter') || 'all';
        render();
      });
    });

    if (newFolderBtn) newFolderBtn.addEventListener('click', openNewFolderModal);
    if (addPageBtn) addPageBtn.addEventListener('click', openAddPageModal);

    render();
  }

  /* --------------------------------------------------------------------------
     16. Help Center Live FAQ Filter & Ticket Submission
     -------------------------------------------------------------------------- */
  function initHelpModule() {
    if (!window.location.pathname.includes('help')) return;

    const faqSearch = document.querySelector('.main-content .search-input');
    const faqCards = document.querySelectorAll('.faq-card');
    if (faqSearch && faqCards.length) {
      faqSearch.addEventListener('input', () => {
        const q = faqSearch.value.trim().toLowerCase();
        faqCards.forEach((card) => {
          card.style.display = !q || card.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }

    const supportForm = document.querySelector('form[action="help.html"]');
    if (supportForm) {
      supportForm.removeAttribute('onsubmit');
      supportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        toast('Support request dispatched! We will reply shortly.', 'success');
        const msg = document.getElementById('help-msg');
        if (msg) msg.value = '';
      });
    }
  }

  /* --------------------------------------------------------------------------
     17. Auth Pages (Login, Registration, Forgot Password Modal, Quick Demo)
     -------------------------------------------------------------------------- */
  function attachPasswordToggle(inputEl) {
    if (!inputEl || inputEl.dataset.eyeAttached === '1') return;
    inputEl.dataset.eyeAttached = '1';
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    inputEl.parentNode.insertBefore(wrapper, inputEl);
    wrapper.appendChild(inputEl);
    inputEl.style.paddingRight = '42px';

    const eyeBtn = document.createElement('button');
    eyeBtn.type = 'button';
    eyeBtn.setAttribute('aria-label', 'Toggle password visibility');
    eyeBtn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;';
    eyeBtn.innerHTML = '<svg class="icon-svg" style="width:17px;height:17px;" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    wrapper.appendChild(eyeBtn);

    eyeBtn.addEventListener('click', () => {
      const isPass = inputEl.type === 'password';
      inputEl.type = isPass ? 'text' : 'password';
      eyeBtn.style.color = isPass ? 'var(--primary)' : 'var(--text-muted)';
    });
  }

  function openForgotPasswordModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'ios-modal-backdrop';
    backdrop.innerHTML = `
      <div class="ios-modal-card" role="dialog" aria-modal="true" style="max-width:420px;text-align:left;">
        <h3 class="ios-modal-title" style="text-align:center;">Reset Password</h3>
        <p class="ios-modal-message" style="text-align:center;margin-bottom:14px;">Enter your registered email and we will send you a password reset link.</p>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label" for="fp-email">Registered Email</label>
          <input type="email" id="fp-email" class="form-control" placeholder="owner@yourcompany.com" required>
        </div>
        <div class="ios-modal-actions">
          <button type="button" class="btn btn-secondary" data-modal-cancel>Cancel</button>
          <button type="button" class="btn btn-primary" data-modal-confirm>Send Reset Link</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('is-open'));

    function close() {
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 200);
    }

    backdrop.querySelector('[data-modal-cancel]').addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-modal-confirm]').addEventListener('click', async () => {
      const email = (backdrop.querySelector('#fp-email').value || '').trim().toLowerCase();
      if (!email) {
        toast('Enter your registered email address', 'warning');
        return;
      }
      const res = await window.IFCloud.resetPassword(email);
      if (res && res.error) {
        toast(res.error.message || 'Could not send reset link', 'warning');
        return;
      }
      close();
      toast('If that email is registered, a reset link is on its way.', 'success');
    });
  }

  function initAuthPages() {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    if (loginForm || regForm) {
      if (!document.querySelector('.login-theme-float')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'topbar-icon-btn theme-toggle-btn login-theme-float';
        btn.style.cssText = 'position:fixed;top:18px;right:18px;z-index:100;';
        btn.addEventListener('click', toggleTheme);
        document.body.appendChild(btn);
        updateThemeIcons(getPreferredTheme());
      }
    }

    // Login Page (index.html)
    if (loginForm) {
      attachPasswordToggle(document.getElementById('password'));
      const errBox = document.getElementById('login-error-box');
      const sessionBanner = document.getElementById('active-session-banner');
      const currentUser = getCurrentUser();

      if (currentUser && sessionBanner) {
        const nextUrl = hasCompanySetup(currentUser) ? 'dashboard.html' : 'company-settings.html?onboarding=1';
        sessionBanner.style.display = 'flex';
        sessionBanner.innerHTML = `
          <span>Signed in as <strong>${escapeHtml(currentUser.firstName || currentUser.email)}</strong></span>
          <a href="${nextUrl}" class="login-link">Continue →</a>
        `;
      }

      const forgotLink = document.getElementById('forgot-password-link');
      if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
          e.preventDefault();
          openForgotPasswordModal();
        });
      }

      const demoBtn = document.getElementById('btn-demo-signin');
      if (demoBtn) demoBtn.style.display = 'none';

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errBox) errBox.style.display = 'none';
        const email = (document.getElementById('email')?.value || '').trim().toLowerCase();
        const password = document.getElementById('password')?.value || '';

        function showLoginErr(msg) {
          if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
          }
        }

        if (!email || !password) {
          showLoginErr('Please enter your email address and password.');
          return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const res = await window.IFCloud.signIn(email, password);
        if (submitBtn) submitBtn.disabled = false;

        if (res.error) {
          const msg = String(res.error.message || '');
          if (/confirm/i.test(msg)) showLoginErr('Please confirm your email address first (check your inbox), then sign in.');
          else if (/invalid login/i.test(msg)) showLoginErr('Incorrect email or password. Try again, use Forgot Password, or register a new account.');
          else showLoginErr(msg || 'Could not sign in. Please try again.');
          return;
        }

        const user = getCurrentUser();
        setSessionForUser(user);
        window.location.href = hasCompanySetup(user) ? 'dashboard.html' : 'company-settings.html?onboarding=1';
      });
    }

    // Register Page (register.html)
    if (regForm) {
      attachPasswordToggle(document.getElementById('reg-password'));
      attachPasswordToggle(document.getElementById('reg-confirm-password'));
      const errBox = document.getElementById('register-error-box');
      const infoBox = document.getElementById('register-info-box');
      const params = new URLSearchParams(window.location.search);
      const preEmail = params.get('email');
      if (preEmail) {
        const regEmailEl = document.getElementById('reg-email');
        if (regEmailEl) regEmailEl.value = preEmail;
      }
      if (params.get('unregistered') === '1' && infoBox) {
        infoBox.textContent = 'No account uses that e-mail yet — create one below to get started.';
        infoBox.style.display = 'block';
      }

      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errBox) errBox.style.display = 'none';

        const firstName = (document.getElementById('reg-first-name')?.value || '').trim();
        const lastName = (document.getElementById('reg-last-name')?.value || '').trim();
        const email = (document.getElementById('reg-email')?.value || '').trim().toLowerCase();
        const phone = (document.getElementById('reg-phone')?.value || '').trim();
        const password = document.getElementById('reg-password')?.value || '';
        const confirmPass = document.getElementById('reg-confirm-password')?.value || '';

        function showErr(msg) {
          if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
          }
        }

        if (!firstName || !lastName || !email || !phone) {
          showErr('Please fill in your full name, email address, and mobile number.');
          return;
        }
        if (password.length < 6) {
          showErr('Password must be at least 6 characters long.');
          return;
        }
        if (password !== confirmPass) {
          showErr('Passwords do not match. Please re-enter them.');
          return;
        }

        const submitBtn = regForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        const res = await window.IFCloud.signUp({ email, password, firstName, lastName, phone });
        if (submitBtn) submitBtn.disabled = false;
        if (res.error) {
          const msg = String(res.error.message || '');
          if (/already registered|already exists/i.test(msg)) showErr('An account with this email already exists. Please Sign In instead.');
          else showErr(msg || 'Could not create the account. Please try again.');
          return;
        }
        if (res.needsConfirm) {
          if (infoBox) {
            infoBox.textContent = 'Account created! Check your email and click the confirmation link, then sign in.';
            infoBox.style.display = 'block';
          }
          return;
        }
        setSessionForUser(getCurrentUser());
        toast('Account created! Now complete your business setup.', 'success');
        setTimeout(() => {
          window.location.href = 'company-settings.html?onboarding=1';
        }, 350);
      });
    }
  }
});
