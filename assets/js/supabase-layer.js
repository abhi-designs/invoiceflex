/* --- InvoiceFlex Supabase data layer ---------------------------------------
   Replaces the old browser-localStorage storage. app.js keeps its simple,
   synchronous load/save calls; this file keeps an in-memory copy of the
   signed-in user's data, sends every change to Supabase in the background
   (through a small "outbox" that survives page changes) and loads fresh data
   from Supabase before each page starts.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://itvhwiuilzxlmyrntitn.supabase.co';
  // (The public anon key lives in supabase-config.js.)

  // Hide the page until the first data load has finished (app.js removes the class).
  var hideStyle = document.createElement('style');
  hideStyle.textContent = 'html.if-loading body{visibility:hidden}';
  document.head.appendChild(hideStyle);
  document.documentElement.classList.add('if-loading');
  setTimeout(function () { document.documentElement.classList.remove('if-loading'); }, 9000);

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var COLLS = ['customers', 'invoices', 'payments', 'quotations', 'bb_folders', 'bb_pages'];
  var KIND_COL = { logo: 'logo_path', signature: 'signature_path', avatar: 'profile_path' };
  var KIND_USER = { logo: 'companyLogo', signature: 'companySignature', avatar: 'adminAvatar' };

  var S = {
    uid: null,
    auth: null,
    u: null,
    companyExists: false,
    data: { customers: [], invoices: [], payments: [], quotations: [], bb_folders: [], bb_pages: [] },
    outbox: [],
    draining: false,
    retryTimer: null
  };

  var sb = null;
  async function getClient() {
    try {
      if (window.getInvoiceFlexSupabase) {
        var c = await window.getInvoiceFlexSupabase();
        if (c) return c;
      }
    } catch (e) { console.error(e); }
    return null;
  }

  /* ------------------------------ helpers ------------------------------ */
  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  function clone(v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function localIso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayIso() { return localIso(new Date()); }
  function toIso(v) {
    if (!v || v === '-') return null;
    v = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    var m = v.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if (m) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    var t = Date.parse(v);
    return isNaN(t) ? null : localIso(new Date(t));
  }
  function displayDate(iso) {
    if (!iso) return '';
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function notify(msg, type) {
    var tries = 0;
    (function go() {
      var ui = window.InvoiceFlexUI;
      if (ui && ui.toast) { ui.toast(msg, type || 'warning'); return; }
      if (++tries < 20) { setTimeout(go, 300); } else { console.warn(msg); }
    })();
  }
  function dataUrlToBlob(dataUrl) {
    var parts = String(dataUrl).split(',');
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || 'application/octet-stream';
    var bin = atob(parts[1] || '');
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  /* ------------------------------ mappers ------------------------------ */
  function splitBank(s) {
    s = (s || '').trim();
    if (!s) return { branch: '', ifsc: '' };
    var i = s.lastIndexOf('&');
    if (i >= 0) return { branch: s.slice(0, i).trim(), ifsc: s.slice(i + 1).trim().toUpperCase() };
    return { branch: '', ifsc: s.toUpperCase() };
  }
  function companyFromRow(c) {
    var bank = c.branch_name && c.ifsc ? c.branch_name + ' & ' + c.ifsc : (c.ifsc || c.branch_name || '');
    return {
      name: c.name || '', gstin: c.gstin || '', pan: c.pan || '',
      stateCode: c.state_code || '24', stateName: c.state || 'Gujarat', city: c.city || '',
      email: c.email || '', phone: c.phone || '', address: c.address || '',
      bankName: c.bank_name || '', bankAccount: c.account_no || '', bankBranchIfsc: bank,
      bankType: c.bank_type || 'Current Account',
      invoicePrefix: c.invoice_prefix || '', quotePrefix: c.quote_prefix || 'QTN/2026-2027/',
      defaultGst: String(num(c.default_gst) || 18), terms: c.terms || ''
    };
  }
  function companyToRow(i) {
    var b = splitBank(i.bankBranchIfsc);
    return {
      user_id: S.uid,
      name: i.name || '', gstin: i.gstin || null, pan: i.pan || null,
      state_code: i.stateCode || null, state: i.stateName || null, city: i.city || null,
      email: i.email || null, phone: i.phone || null, address: i.address || null,
      bank_name: i.bankName || null, account_no: i.bankAccount || null,
      branch_name: b.branch || null, ifsc: b.ifsc || null, bank_type: i.bankType || 'Current Account',
      default_gst: num(i.defaultGst) || 18,
      invoice_prefix: (i.invoicePrefix || 'INV').slice(0, 40),
      quote_prefix: i.quotePrefix || 'QTN', terms: i.terms || null,
      updated_at: new Date().toISOString()
    };
  }

  function customerFromRow(r) {
    return {
      id: r.id, contactName: r.contact_name || r.name, role: r.contact_role || '', name: r.name,
      email: r.email || '', phone: r.phone || '', gstin: r.gstin || '', pan: r.pan || '',
      state: r.state || '', code: r.state_code || '', city: r.city || '', address: r.address || '',
      zip: r.zip || '', status: r.status || 'Active'
    };
  }
  function customerToRow(c) {
    return {
      id: c.id, name: c.name || c.contactName || 'Customer', contact_name: c.contactName || null,
      contact_role: c.role || null, email: c.email || null, phone: c.phone || null,
      gstin: c.gstin || null, pan: c.pan || null, state: c.state || null, state_code: c.code || null,
      city: c.city || null, address: c.address || null, zip: c.zip || null, status: c.status || 'Active'
    };
  }

  function itemsToRows(items) {
    return (items || []).slice().sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); }).map(function (i) {
      return { desc: i.description, hsn: i.hsn || '', qty: num(i.qty), rate: num(i.rate), gst: num(i.gst_rate) };
    });
  }
  function rowsToItems(rows) {
    return (rows || []).map(function (r) {
      return {
        description: String(r.desc || '').trim() || 'Item',
        hsn: r.hsn || '',
        qty: num(r.qty) > 0 ? num(r.qty) : 1,
        unit: 'Nos',
        rate: num(r.rate),
        gst_rate: r.gst === undefined || r.gst === '' || r.gst === null ? 18 : num(r.gst)
      };
    });
  }

  function invoiceFromRow(r) {
    var m = r.meta || {};
    return {
      id: r.id, docType: r.doc_type || 'tax', invNo: r.invoice_no, issueDate: r.invoice_date,
      dueDate: r.due_date || '', terms: m.terms || r.payment_terms || '',
      poNo: r.po_number || '-', poDate: m.poDate || '-', vehicleNo: r.vehicle_no || '-',
      ewayNo: r.eway_bill_no || '-', challanReason: m.challanReason || '', supplierRef: m.supplierRef || '',
      materialCat: m.materialCat || '', notes: r.notes || '', requireSign: r.require_sign !== false,
      buyerId: r.customer_id || '',
      buyer: m.buyer || { name: r.customer_name, gstin: r.customer_gstin || '', state: '', code: r.customer_state_code || '', city: '', address: r.customer_address || '', contact: '' },
      rows: itemsToRows(r.invoice_items), totalAmount: num(r.total),
      status: m.status || (r.status === 'issued' ? 'sent' : r.status)
    };
  }
  function invoiceMeta(inv) {
    return {
      buyer: inv.buyer || null, poDate: inv.poDate || '', terms: inv.terms || '',
      challanReason: inv.challanReason || '', supplierRef: inv.supplierRef || '',
      materialCat: inv.materialCat || '', status: inv.status || 'sent'
    };
  }
  function invoiceDbStatus(inv) { return inv.status === 'draft' ? 'draft' : 'sent'; }
  function invoiceRpcArgs(inv) {
    var issue = toIso(inv.issueDate) || todayIso();
    var due = toIso(inv.dueDate);
    if (due && due < issue) due = null;
    return {
      p_customer_id: inv.buyerId, p_items: rowsToItems(inv.rows),
      p_invoice_date: issue, p_due_date: due, p_payment_terms: inv.terms || null,
      p_notes: inv.notes || null, p_po_number: inv.poNo || null,
      p_vehicle_no: inv.vehicleNo || null, p_eway_bill_no: inv.ewayNo || null,
      p_advance: 0, p_invoice_no: inv.invNo || null, p_status: invoiceDbStatus(inv),
      p_doc_type: inv.docType || 'tax', p_require_sign: inv.requireSign !== false,
      p_id: inv.id, p_meta: invoiceMeta(inv)
    };
  }
  function invoiceHeaderUpdate(inv) {
    return {
      status: invoiceDbStatus(inv), due_date: toIso(inv.dueDate), notes: inv.notes || null,
      payment_terms: inv.terms || null, require_sign: inv.requireSign !== false,
      vehicle_no: inv.vehicleNo || null, eway_bill_no: inv.ewayNo || null,
      po_number: inv.poNo || null, meta: invoiceMeta(inv)
    };
  }

  function paymentFromRow(r) {
    return { id: r.id, invoiceId: r.invoice_id, amount: num(r.amount), paidOn: r.paid_on, method: r.method, note: r.note || '' };
  }
  function paymentToRow(p) {
    return { id: p.id, invoice_id: p.invoiceId, amount: num(p.amount), paid_on: toIso(p.paidOn) || todayIso(), method: p.method || 'Cash', note: p.note || null };
  }

  function quoteTotal(rows) {
    var t = 0;
    (rows || []).forEach(function (r) {
      var v = num(r.qty) * num(r.rate);
      t += v + v * (r.gst === undefined || r.gst === '' ? 18 : num(r.gst)) / 100;
    });
    return Math.round(t * 100) / 100;
  }
  function quotationFromRow(r) {
    var m = r.meta || {};
    return {
      id: r.id, quoteNo: r.quote_no, date: m.date || r.quote_date, status: r.status || 'Draft',
      buyerId: r.customer_id || '',
      buyer: m.buyer || { name: r.customer_name, gstin: r.customer_gstin || '', state: '', code: r.customer_state_code || '', address: r.customer_address || '', contact: r.contact || '' },
      rows: itemsToRows(r.quotation_items), notes: r.notes || ''
    };
  }
  function quotationToRow(q) {
    var b = q.buyer || {};
    return {
      id: q.id, customer_id: UUID_RE.test(q.buyerId || '') ? q.buyerId : null,
      customer_name: b.name || '-', customer_gstin: b.gstin || null,
      customer_address: b.address || null, customer_state_code: b.code || null, contact: b.contact || null,
      quote_no: q.quoteNo, quote_date: toIso(q.date) || todayIso(), status: q.status || 'Draft',
      notes: q.notes || null, total: quoteTotal(q.rows), meta: { date: q.date || '', buyer: b }
    };
  }

  function folderFromRow(r) { return { id: r.id, name: r.name, desc: r.description || '', color: r.color || 'blue' }; }
  function folderToRow(f) { return { id: f.id, name: f.name || 'Folder', description: f.desc || null, color: f.color || 'blue' }; }
  function pageFromRow(r) {
    var p = {
      id: r.id, folderId: r.folder_id, type: r.type || 'gst', billNo: r.bill_no || '', party: r.party || '',
      date: displayDate(r.page_date), amount: num(r.amount), notes: r.notes || ''
    };
    if (r.file_path) {
      p.fileKey = r.file_path.split('/').pop();
      p.fileMime = r.file_mime || '';
      p.fileName = r.file_name || '';
    }
    return p;
  }
  function pageToRow(p) {
    return {
      id: p.id, folder_id: p.folderId, type: p.type || 'gst', bill_no: p.billNo || null, party: p.party || null,
      page_date: toIso(p.date) || todayIso(), amount: num(p.amount), notes: p.notes || null,
      file_path: p.fileKey ? S.uid + '/' + p.fileKey : null, file_name: p.fileName || null, file_mime: p.fileMime || null
    };
  }

  var TABLE = { customers: 'customers', invoices: 'invoices', payments: 'payments', quotations: 'quotations', bb_folders: 'billbook_folders', bb_pages: 'billbook_pages' };

  /* ------------------------------ outbox ------------------------------- */
  function outboxKey() { return 'if_outbox_' + S.uid; }
  function loadOutbox() {
    try { var raw = localStorage.getItem(outboxKey()); var p = raw ? JSON.parse(raw) : []; return Array.isArray(p) ? p : []; }
    catch (e) { return []; }
  }
  function persistOutbox() {
    try {
      if (S.outbox.length) localStorage.setItem(outboxKey(), JSON.stringify(S.outbox));
      else localStorage.removeItem(outboxKey());
    } catch (e) { console.warn('Could not store pending changes locally', e); }
  }

  function applyUserOp(op) {
    var u = S.u; if (!u) return;
    if (op.t === 'company') { u.companyInfo = clone(op.info); u.setupComplete = true; }
    else if (op.t === 'image') { u.images[op.kind] = op.dataUrl || null; }
    else if (op.t === 'profile') { u.firstName = op.firstName; u.lastName = op.lastName; u.phone = op.phone; if (op.email) u.email = op.email; }
    else if (op.t === 'plan') { u.plan = op.plan; u.planPayRef = op.ref || ''; }
  }
  function applyOp(op) {
    if (op.t === 'put') {
      var list = S.data[op.c];
      var idx = list.findIndex(function (r) { return r.id === op.rec.id; });
      if (idx >= 0) list[idx] = clone(op.rec); else list.unshift(clone(op.rec));
    } else if (op.t === 'del') {
      S.data[op.c] = S.data[op.c].filter(function (r) { return r.id !== op.id; });
    } else {
      applyUserOp(op);
    }
  }
  function enqueue(ops) {
    if (!ops.length) return;
    ops.forEach(function (op) { S.outbox.push(op); });
    persistOutbox();
    drain();
  }

  /* --------------------------- executing ops --------------------------- */
  async function must(p) {
    var r = await p;
    if (r && r.error) throw r.error;
    return r;
  }
  async function ensureCompany() {
    if (S.companyExists) return;
    await must(sb.from('companies').upsert({ user_id: S.uid, name: '' }, { onConflict: 'user_id', ignoreDuplicates: true }));
    S.companyExists = true;
  }
  async function putRecord(c, rec) {
    if (c === 'customers') {
      await must(sb.from('customers').upsert(customerToRow(rec), { onConflict: 'id' }));
    } else if (c === 'invoices') {
      await must(sb.rpc('create_invoice', invoiceRpcArgs(rec)));
      var upd = await must(sb.from('invoices').update(invoiceHeaderUpdate(rec)).eq('id', rec.id).select('total').single());
      var live = S.data.invoices.find(function (r) { return r.id === rec.id; });
      if (live && upd.data) live.totalAmount = num(upd.data.total);
    } else if (c === 'payments') {
      await must(sb.from('payments').delete().eq('id', rec.id));
      await must(sb.from('payments').insert(paymentToRow(rec)));
    } else if (c === 'quotations') {
      await must(sb.from('quotations').upsert(quotationToRow(rec), { onConflict: 'id' }));
      await must(sb.from('quotation_items').delete().eq('quotation_id', rec.id));
      var items = rowsToItems(rec.rows).map(function (it, i) {
        return { quotation_id: rec.id, sort: i, description: it.description, hsn: it.hsn || null, qty: it.qty, unit: it.unit, rate: it.rate, gst_rate: it.gst_rate, amount: Math.round(it.qty * it.rate * 100) / 100 };
      });
      if (items.length) await must(sb.from('quotation_items').insert(items));
    } else if (c === 'bb_folders') {
      await must(sb.from('billbook_folders').upsert(folderToRow(rec), { onConflict: 'id' }));
    } else if (c === 'bb_pages') {
      await must(sb.from('billbook_pages').upsert(pageToRow(rec), { onConflict: 'id' }));
    }
  }
  async function delRecord(c, id, rec) {
    if (c === 'bb_pages' && rec && rec.fileKey) {
      try { await sb.storage.from('billbook').remove([S.uid + '/' + rec.fileKey]); } catch (e) { /* ignore */ }
    }
    await must(sb.from(TABLE[c]).delete().eq('id', id));
  }
  async function execOp(op) {
    if (op.t === 'put') return putRecord(op.c, op.rec);
    if (op.t === 'del') return delRecord(op.c, op.id, op.rec);
    if (op.t === 'company') {
      await must(sb.from('companies').upsert(companyToRow(op.info), { onConflict: 'user_id' }));
      S.companyExists = true;
      return;
    }
    if (op.t === 'image') {
      await ensureCompany();
      var path = S.uid + '/' + op.kind;
      var patch = {};
      if (op.dataUrl) {
        var blob = dataUrlToBlob(op.dataUrl);
        await must(sb.storage.from('branding').upload(path, blob, { upsert: true, contentType: blob.type }));
        patch[KIND_COL[op.kind]] = path;
      } else {
        try { await sb.storage.from('branding').remove([path]); } catch (e) { /* ignore */ }
        patch[KIND_COL[op.kind]] = null;
      }
      await must(sb.from('companies').update(patch).eq('user_id', S.uid));
      return;
    }
    if (op.t === 'profile') {
      await must(sb.auth.updateUser({ data: { first_name: op.firstName, last_name: op.lastName, phone: op.phone } }));
      if (op.email && S.auth && op.email.toLowerCase() !== (S.auth.email || '').toLowerCase()) {
        await must(sb.auth.updateUser({ email: op.email }));
      }
      return;
    }
    if (op.t === 'plan') {
      await must(sb.rpc('set_my_plan', { p_plan: op.plan, p_pay_ref: op.ref || null }));
    }
  }

  function isPermanent(e) {
    if (!e) return false;
    var code = String(e.code || '');
    var status = Number(e.status || 0);
    if (code === 'P0001' || /^(22|23|42)/.test(code) || code === 'PGRST116') return true;
    return status === 400 || status === 403 || status === 404 || status === 409 || status === 422;
  }
  function friendly(e) {
    var m = String((e && e.message) || e || '');
    var map = {
      PLAN_LIMIT_INVOICES: 'Daily invoice limit reached for your plan. Upgrade on the Plans page.',
      PLAN_LIMIT_CUSTOMERS: 'Customer limit reached for your plan. Upgrade on the Plans page.',
      COMPANY_PROFILE_INCOMPLETE: 'Complete your company profile (GSTIN, address, bank details) in Settings before creating invoices.',
      COMPANY_SETUP_REQUIRED: 'Complete your company profile in Settings before creating invoices.',
      CUSTOMER_NOT_FOUND: 'Select a saved customer before creating an invoice.',
      DUPLICATE_INVOICE_NO: 'That invoice number already exists. Use a different number.',
      INVALID_ITEM: 'One of the invoice items is invalid (check description, quantity, rate and GST).',
      NO_ITEMS: 'Add at least one item to the invoice.',
      MEMBERSHIP_EXPIRED: 'Your plan has expired. Renew it on the Plans page.',
      NO_MEMBERSHIP: 'No active plan found for this account.'
    };
    for (var k in map) { if (m.indexOf(k) >= 0) return map[k]; }
    if (String(e && e.code) === '23505') return 'That record already exists (duplicate number).';
    return 'Could not save to the cloud: ' + m;
  }

  async function reload(colls) {
    try {
      for (var i = 0; i < colls.length; i++) {
        S.data[colls[i]] = await fetchColl(colls[i]);
      }
      S.outbox.forEach(function (op) { if (op.c && colls.indexOf(op.c) >= 0) applyOp(op); });
    } catch (e) { console.warn('Reload failed', e); }
  }
  async function dropFailed(op) {
    if (op.c === 'invoices') {
      var id = op.rec && op.rec.id;
      S.outbox = S.outbox.filter(function (o) { return !(o.c === 'payments' && o.rec && o.rec.invoiceId === id); });
      await reload(['invoices', 'payments']);
    } else if (op.c) {
      await reload([op.c]);
    }
  }
  function scheduleRetry() {
    if (S.retryTimer) return;
    S.retryTimer = setTimeout(function () { S.retryTimer = null; drain(); }, 6000);
  }
  async function drain() {
    if (S.draining || !S.uid || !sb) return;
    S.draining = true;
    try {
      while (S.outbox.length) {
        var op = S.outbox[0];
        try {
          await execOp(op);
          S.outbox.shift();
          persistOutbox();
        } catch (e) {
          if (isPermanent(e)) {
            S.outbox.shift();
            persistOutbox();
            console.error('Save failed', op, e);
            notify(friendly(e));
            await dropFailed(op);
            persistOutbox();
          } else {
            console.warn('Offline or temporary error, will retry', e);
            scheduleRetry();
            break;
          }
        }
      }
    } finally {
      S.draining = false;
    }
  }
  window.addEventListener('online', function () { drain(); });

  /* ----------------------------- loading ------------------------------- */
  async function fetchColl(c) {
    var q;
    if (c === 'customers') q = sb.from('customers').select('*').order('created_at', { ascending: false }).limit(5000);
    else if (c === 'invoices') q = sb.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false }).limit(5000);
    else if (c === 'payments') q = sb.from('payments').select('*').order('created_at', { ascending: false }).limit(5000);
    else if (c === 'quotations') q = sb.from('quotations').select('*, quotation_items(*)').order('created_at', { ascending: false }).limit(5000);
    else if (c === 'bb_folders') q = sb.from('billbook_folders').select('*').order('created_at', { ascending: true }).limit(2000);
    else q = sb.from('billbook_pages').select('*').order('created_at', { ascending: false }).limit(5000);
    var r = await must(q);
    var rows = r.data || [];
    var mapper = { customers: customerFromRow, invoices: invoiceFromRow, payments: paymentFromRow, quotations: quotationFromRow, bb_folders: folderFromRow, bb_pages: pageFromRow }[c];
    return rows.map(mapper);
  }
  async function downloadImage(path) {
    if (!path) return null;
    try {
      var r = await sb.storage.from('branding').download(path);
      if (r.error || !r.data) return null;
      return await blobToDataUrl(r.data);
    } catch (e) { return null; }
  }

  async function hydrate(session) {
    var user = session.user;
    S.uid = user.id;
    S.auth = user;
    S.outbox = loadOutbox();

    var results = await Promise.all([
      must(sb.from('companies').select('*').eq('user_id', S.uid).maybeSingle()),
      must(sb.from('memberships').select('*').eq('user_id', S.uid).maybeSingle()),
      fetchColl('customers'), fetchColl('invoices'), fetchColl('payments'),
      fetchColl('quotations'), fetchColl('bb_folders'), fetchColl('bb_pages')
    ]);
    var comp = results[0].data;
    var mem = results[1].data;
    S.companyExists = !!comp;
    S.data.customers = results[2];
    S.data.invoices = results[3];
    S.data.payments = results[4];
    S.data.quotations = results[5];
    S.data.bb_folders = results[6];
    S.data.bb_pages = results[7];

    var meta = user.user_metadata || {};
    var plan = mem && mem.plan ? mem.plan : 'Free';
    if (mem && mem.expires_on && mem.expires_on < todayIso()) plan = 'Free';
    S.u = {
      email: user.email || '',
      firstName: meta.first_name || '', lastName: meta.last_name || '', phone: meta.phone || '',
      plan: plan, planPayRef: (mem && mem.pay_ref) || '',
      setupComplete: !!comp, companyInfo: comp ? companyFromRow(comp) : null,
      images: { logo: null, signature: null, avatar: null }
    };
    var imgs = await Promise.all([
      downloadImage(comp && comp.logo_path),
      downloadImage(comp && comp.signature_path),
      downloadImage(comp && comp.profile_path)
    ]);
    S.u.images.logo = imgs[0]; S.u.images.signature = imgs[1]; S.u.images.avatar = imgs[2];

    // Show changes that were made on the previous page but not yet confirmed by the cloud.
    S.outbox.forEach(applyOp);
    drain();
  }

  function resetState() {
    S.uid = null; S.auth = null; S.u = null; S.companyExists = false; S.outbox = [];
    COLLS.forEach(function (c) { S.data[c] = []; });
  }

  /* ------------------------------ public API --------------------------- */
  function getUser() {
    if (!S.uid || !S.u) return null;
    var u = S.u;
    return {
      id: S.uid, email: u.email, firstName: u.firstName, lastName: u.lastName, phone: u.phone,
      role: 'Administrator', plan: u.plan, planPayRef: u.planPayRef,
      companySetupComplete: u.setupComplete, companyInfo: u.companyInfo ? clone(u.companyInfo) : null,
      companyLogo: u.images.logo, companySignature: u.images.signature, adminAvatar: u.images.avatar
    };
  }
  function setUser(n) {
    if (!S.uid || !S.u || !n) return;
    var u = S.u; var ops = [];
    var infoChanged = n.companyInfo && JSON.stringify(n.companyInfo) !== JSON.stringify(u.companyInfo);
    if (infoChanged || (n.companySetupComplete && !u.setupComplete)) {
      ops.push({ t: 'company', info: clone(n.companyInfo) });
    }
    Object.keys(KIND_USER).forEach(function (kind) {
      var next = n[KIND_USER[kind]] || null;
      if (next !== (u.images[kind] || null)) ops.push({ t: 'image', kind: kind, dataUrl: next });
    });
    if (n.firstName !== u.firstName || n.lastName !== u.lastName || n.phone !== u.phone || (n.email && n.email !== u.email)) {
      ops.push({ t: 'profile', firstName: n.firstName || '', lastName: n.lastName || '', phone: n.phone || '', email: n.email || '' });
    }
    if (n.plan && n.plan !== u.plan) ops.push({ t: 'plan', plan: n.plan, ref: n.planPayRef || '' });
    ops.forEach(applyUserOp);
    enqueue(ops);
  }

  function setColl(c, next) {
    var prev = S.data[c];
    var prevMap = {};
    prev.forEach(function (r) { prevMap[r.id] = JSON.stringify(r); });
    var seen = {};
    var ops = [];
    next.forEach(function (r) { if (!r.id || !UUID_RE.test(String(r.id))) r.id = uuid(); });
    next.slice().reverse().forEach(function (r) {
      seen[r.id] = true;
      if (prevMap[r.id] !== JSON.stringify(r)) ops.push({ t: 'put', c: c, rec: clone(r) });
    });
    prev.forEach(function (r) {
      if (!seen[r.id]) ops.push({ t: 'del', c: c, id: r.id, rec: clone(r) });
    });
    S.data[c] = clone(next);
    enqueue(ops);
  }
  function getData(name) {
    if (name === 'billbook') return { folders: clone(S.data.bb_folders), pages: clone(S.data.bb_pages) };
    return clone(S.data[name]) || [];
  }
  function setData(name, value) {
    if (!S.uid) return;
    if (name === 'billbook') {
      setColl('bb_folders', value.folders || []);
      setColl('bb_pages', value.pages || []);
    } else {
      setColl(name, value || []);
    }
  }

  async function signIn(email, password) {
    if (!sb) return { error: { message: 'Cloud library not loaded' } };
    var r = await sb.auth.signInWithPassword({ email: email, password: password });
    if (r.error) return { error: r.error };
    try { await hydrate(r.data.session); } catch (e) { return { error: e }; }
    return {};
  }
  async function signUp(info) {
    if (!sb) return { error: { message: 'Cloud library not loaded' } };
    var r = await sb.auth.signUp({
      email: info.email, password: info.password,
      options: { data: { first_name: info.firstName, last_name: info.lastName, phone: info.phone } }
    });
    if (r.error) return { error: r.error };
    if (r.data.user && r.data.user.identities && r.data.user.identities.length === 0) {
      return { error: { message: 'User already registered' } };
    }
    if (r.data.session) {
      try { await hydrate(r.data.session); } catch (e) { return { error: e }; }
      return {};
    }
    return { needsConfirm: true };
  }
  async function signOut() {
    try { if (sb) await sb.auth.signOut(); } catch (e) { /* ignore */ }
    resetState();
  }
  async function resetPassword(email) {
    if (!sb) return { error: { message: 'Cloud library not loaded' } };
    return sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/index.html' });
  }

  async function verifyPassword(pw) {
    if (!sb || !S.auth) return false;
    var r = await sb.auth.signInWithPassword({ email: S.auth.email, password: pw });
    return !r.error;
  }
  async function updatePassword(pw) {
    if (!sb) return { error: 'Cloud library not loaded' };
    var r = await sb.auth.updateUser({ password: pw });
    return { error: r.error ? r.error.message : null };
  }

  async function putBillFile(fileKey, obj) {
    if (!S.uid || !obj || !obj.dataUrl) return false;
    try {
      var blob = dataUrlToBlob(obj.dataUrl);
      var r = await sb.storage.from('billbook').upload(S.uid + '/' + fileKey, blob, { upsert: true, contentType: blob.type });
      if (r.error) throw r.error;
      return true;
    } catch (e) {
      console.error('Bill book upload failed', e);
      notify('Could not upload file: ' + (e.message || e));
      return false;
    }
  }
  async function getBillFile(fileKey) {
    if (!S.uid) return null;
    try {
      var page = S.data.bb_pages.find(function (p) { return p.fileKey === fileKey; }) || {};
      var r = await sb.storage.from('billbook').download(S.uid + '/' + fileKey);
      if (r.error || !r.data) return null;
      var dataUrl = await blobToDataUrl(r.data);
      return { id: fileKey, name: page.fileName || 'file', mime: page.fileMime || r.data.type, dataUrl: dataUrl };
    } catch (e) { return null; }
  }

  var ready = (async function () {
    sb = await getClient();
    if (!sb) {
      console.error('Supabase is not configured.');
      notify('Cloud database is not configured. Check the Supabase URL and key.');
      return;
    }
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'PASSWORD_RECOVERY') {
        setTimeout(function () {
          var pw = window.prompt('Enter your new password (6+ characters):');
          if (pw && pw.length >= 6) {
            sb.auth.updateUser({ password: pw }).then(function (res) {
              notify(res.error ? res.error.message : 'Password updated. You are signed in.', res.error ? 'warning' : 'success');
            });
          }
        }, 800);
      }
    });
    try {
      var r = await sb.auth.getSession();
      if (r.data && r.data.session) await hydrate(r.data.session);
    } catch (e) {
      console.error('Could not load your data', e);
      resetState();
    }
  })();

  window.IFCloud = {
    ready: ready, uuid: uuid, getUser: getUser, setUser: setUser, getData: getData, setData: setData,
    signIn: signIn, signUp: signUp, signOut: signOut, resetPassword: resetPassword,
    verifyPassword: verifyPassword, updatePassword: updatePassword,
    putBillFile: putBillFile, getBillFile: getBillFile, flush: drain
  };
})();
