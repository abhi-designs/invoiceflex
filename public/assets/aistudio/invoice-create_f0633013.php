<?php
/* ============================================================
   invoice-create.php — build and save a tax invoice
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$message = '';
$missing = profile_missing_fields($company);
list($can_bill, $used, $cap, $quota_note) = invoice_quota($conn, $user);

$seller_state = strtolower(trim($company['state'] ?? 'gujarat'));
if ($seller_state === '') $seller_state = 'gujarat';

$cust_stmt = mysqli_prepare($conn, "SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC");
mysqli_stmt_bind_param($cust_stmt, "i", $user_id);
mysqli_stmt_execute($cust_stmt);
$customers = mysqli_stmt_get_result($cust_stmt);

$auto_no = next_invoice_no($conn, $user_id, $company['company_name'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_invoice'])) {

    if ($missing) {
        $message = "Complete your company profile before billing — missing: " . implode(', ', $missing) . ".";
    } elseif (!$can_bill) {
        $message = $quota_note;
    } else {
        $customer_id = intval($_POST['customer_id']);
        $c_stmt = mysqli_prepare($conn, "SELECT * FROM customers WHERE id = ? AND user_id = ?");
        mysqli_stmt_bind_param($c_stmt, "ii", $customer_id, $user_id);
        mysqli_stmt_execute($c_stmt);
        $cust = mysqli_fetch_assoc(mysqli_stmt_get_result($c_stmt));

        if (!$cust) {
            $message = "Pick a customer before saving.";
        } else {
            /* Totals are recalculated here, never trusted from the browser. */
            $subtotal = 0;
            $lines = [];
            $descs = $_POST['descriptions'] ?? [];
            for ($i = 0; $i < count($descs); $i++) {
                $desc = trim($descs[$i]);
                if ($desc === '') continue;
                $qty  = floatval($_POST['qtys'][$i] ?? 0);
                $rate = floatval($_POST['rates'][$i] ?? 0);
                $amt  = round($qty * $rate, 2);
                $subtotal += $amt;
                $lines[] = ['desc' => $desc, 'hsn' => trim($_POST['hsns'][$i] ?? ''), 'qty' => $qty, 'rate' => $rate, 'amt' => $amt];
            }
            $subtotal = round($subtotal, 2);

            $inter = strtolower(trim($cust['state'])) !== $seller_state;
            $cgst = $inter ? 0 : round($subtotal * 0.09, 2);
            $sgst = $inter ? 0 : round($subtotal * 0.09, 2);
            $igst = $inter ? round($subtotal * 0.18, 2) : 0;
            $grand = round($subtotal + $cgst + $sgst + $igst, 2);

            $invoice_no  = next_invoice_no($conn, $user_id, $company['company_name'] ?? '');
            $invoice_date = $_POST['invoice_date'];
            $due_date     = $_POST['due_date'];
            $po_number    = trim($_POST['po_number']);
            $po_date      = !empty($_POST['po_date']) ? $_POST['po_date'] : null;
            $vehicle      = trim($_POST['vehicle_number']);
            $eway         = trim($_POST['eway_bill_no']);
            $terms        = trim($_POST['payment_terms'] ?? '');
            $cgst_rate    = $inter ? 0 : 9; $sgst_rate = $inter ? 0 : 9; $igst_rate = $inter ? 18 : 0;

            $name = $cust['name']; $addr = $cust['address']; $gstin = $cust['gst_number']; $pos = $cust['state'];
            $status = 'unpaid';

            $sql = "INSERT INTO invoices
                (user_id, customer_id, invoice_no, customer_name, customer_address, customer_gstin,
                 place_of_supply, invoice_date, due_date, po_number, po_date, vehicle_number, eway_bill_no,
                 subtotal, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
                 total_amount, status, payment_terms)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
            $stmt = mysqli_prepare($conn, $sql);
            mysqli_stmt_bind_param($stmt, "iisssssssssssddddddddss",
                $user_id, $customer_id, $invoice_no, $name, $addr, $gstin, $pos,
                $invoice_date, $due_date, $po_number, $po_date, $vehicle, $eway,
                $subtotal, $cgst_rate, $cgst, $sgst_rate, $sgst, $igst_rate, $igst,
                $grand, $status, $terms);

            if (mysqli_stmt_execute($stmt)) {
                $new_id = mysqli_insert_id($conn);

                $item_stmt = mysqli_prepare($conn, "INSERT INTO invoice_items
                    (invoice_id, item_description, hsn_sac, quantity, rate, amount) VALUES (?,?,?,?,?,?)");
                foreach ($lines as $l) {
                    mysqli_stmt_bind_param($item_stmt, "issddd", $new_id, $l['desc'], $l['hsn'], $l['qty'], $l['rate'], $l['amt']);
                    mysqli_stmt_execute($item_stmt);
                }

                /* Optional advance taken at the time of billing */
                $adv = round(floatval($_POST['advance_amount'] ?? 0), 2);
                if ($adv > 0 && $adv <= $grand + 0.01) {
                    $method = trim($_POST['advance_method'] ?? 'Cash');
                    $note = 'Advance at billing';
                    $p = mysqli_prepare($conn, "INSERT INTO payments
                        (user_id, invoice_id, customer_id, amount, paid_on, method, note)
                        VALUES (?,?,?,?,?,?,?)");
                    mysqli_stmt_bind_param($p, "iiidsss", $user_id, $new_id, $customer_id, $adv, $invoice_date, $method, $note);
                    mysqli_stmt_execute($p);
                    $st = ($adv >= $grand - 0.01) ? 'paid' : 'partial';
                    mysqli_query($conn, "UPDATE invoices SET status='$st' WHERE id=$new_id");
                }

                header("Location: print-invoice.php?id=" . $new_id . "&new=1");
                exit();
            }
            $message = "The invoice could not be saved: " . mysqli_error($conn);
        }
    }
}

require_once __DIR__ . '/partials/layout.php';
page_start('invoices', 'New invoice', [
    'sub'     => $cap ? ($used . ' of ' . $cap . ' used today') : 'Unlimited today',
    'company' => $company, 'user' => $user,
    'actions' => '<a href="invoices.php" class="btn btn-secondary btn-sm">Cancel</a>',
]);
?>

<?php if ($message): ?><div class="notice err"><?php echo h($message); ?></div><?php endif; ?>

<?php if ($missing): ?>
  <div class="modal-backdrop" id="profileGate">
    <div class="modal-card">
      <div class="big" style="font-size:34px">🏦</div>
      <h2 style="margin:8px 0 4px">Add your bank details first</h2>
      <p style="color:var(--muted);font-size:14px;max-width:44ch;margin:0 auto 14px">
        Every invoice prints your firm's details and bank info, so we need your company profile filled in
        before your first bill — this only takes a minute.
      </p>
      <div style="text-align:left;background:var(--surface-2);border-radius:var(--r-md);padding:12px 16px;margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">STILL MISSING</div>
        <?php foreach ($missing as $m): ?>
          <div style="font-size:13.5px;padding:3px 0">• <?php echo h($m); ?></div>
        <?php endforeach; ?>
      </div>
      <a href="profile.php" class="btn btn-primary btn-block">Complete company profile</a>
      <a href="dashboard.php" class="btn btn-ghost btn-block" style="margin-top:8px">Back to dashboard</a>
    </div>
  </div>
  <style>
    .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:80;
      display:flex; align-items:center; justify-content:center; padding:20px; }
    .modal-card { background:var(--surface); border-radius:var(--r-lg); padding:28px 26px;
      max-width:420px; width:100%; text-align:center; box-shadow:var(--shadow-2); }
  </style>
  <?php page_end(); return; ?>
<?php endif; ?>

<?php if (!$can_bill): ?>
  <div class="card">
    <div class="empty">
      <span class="big">🔒</span>
      <?php echo h($quota_note); ?>
      <div class="btn-row" style="justify-content:center;margin-top:14px">
        <a href="dashboard.php" class="btn btn-secondary btn-sm">Back to dashboard</a>
      </div>
    </div>
  </div>
  <?php page_end(); return; ?>
<?php endif; ?>

<?php if (mysqli_num_rows($customers) === 0): ?>
  <div class="card"><div class="empty"><span class="big">👥</span>
    Add a customer first — an invoice needs someone to bill.
    <div class="btn-row" style="justify-content:center;margin-top:14px">
      <a href="customer.php" class="btn btn-primary btn-sm">Add a customer</a>
    </div></div></div>
  <?php page_end(); return; ?>
<?php endif; ?>

<form method="POST" action="invoice-create.php">
  <div class="card">
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="ino">Invoice number</label>
        <input id="ino" type="text" value="<?php echo h($auto_no); ?>" readonly>
        <div class="help">Set for you from your firm's initials and the current financial year.</div>
      </div>
      <div class="field">
        <label class="field-label" for="cs">Customer</label>
        <select id="cs" name="customer_id" onchange="recalc()" required>
          <option value="">Choose a customer</option>
          <?php while ($c = mysqli_fetch_assoc($customers)): ?>
            <option value="<?php echo $c['id']; ?>" data-state="<?php echo h(strtolower($c['state'])); ?>">
              <?php echo h($c['name']); ?>
            </option>
          <?php endwhile; ?>
        </select>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="idt">Invoice date</label>
        <input id="idt" type="date" name="invoice_date" value="<?php echo date('Y-m-d'); ?>" required>
      </div>
      <div class="field">
        <label class="field-label" for="ddt">Payment due</label>
        <input id="ddt" type="date" name="due_date" value="<?php echo date('Y-m-d', strtotime('+15 days')); ?>" required>
      </div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:14px">Delivery and transport</h3>
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="po">PO number</label>
        <input id="po" type="text" name="po_number" placeholder="PO-9982">
      </div>
      <div class="field">
        <label class="field-label" for="pod">PO date</label>
        <input id="pod" type="date" name="po_date">
      </div>
    </div>
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="veh">Vehicle number</label>
        <input id="veh" type="text" name="vehicle_number" placeholder="GJ-15-XX-1234">
      </div>
      <div class="field">
        <label class="field-label" for="ewb">E-way bill</label>
        <input id="ewb" type="text" name="eway_bill_no" placeholder="121000987654">
      </div>
    </div>
    <div class="field">
      <label class="field-label" for="pt">Payment terms printed on the bill</label>
      <input id="pt" type="text" name="payment_terms" value="50% advance, balance against delivery">
    </div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:6px">Items</h3>
    <div class="table-wrap">
      <table class="items" id="itemsTable">
        <thead>
          <tr><th style="width:42%">Description</th><th style="width:13%">HSN / SAC</th><th style="width:10%">Qty</th>
              <th style="width:15%">Rate</th><th style="width:15%">Amount</th><th style="width:5%"></th></tr>
        </thead>
        <tbody>
          <tr>
            <td><textarea name="descriptions[]" placeholder="Item name on the first line, details below" required></textarea></td>
            <td><input type="text" name="hsns[]" value="8471"></td>
            <td><input type="number" name="qtys[]" class="qty" value="1" step="any" oninput="recalc()" required></td>
            <td><input type="number" name="rates[]" class="rate" value="0.00" step="any" oninput="recalc()" required></td>
            <td><input type="number" name="amounts[]" class="amount" value="0.00" readonly></td>
            <td><button type="button" class="btn-remove" onclick="dropRow(this)">×</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="addRow()">Add another item</button>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span class="num">₹<span id="v_sub">0.00</span></span></div>
      <div class="row" id="r_cgst"><span>CGST <span class="tax-tag">9%</span></span><span class="num">₹<span id="v_cgst">0.00</span></span></div>
      <div class="row" id="r_sgst"><span>SGST <span class="tax-tag">9%</span></span><span class="num">₹<span id="v_sgst">0.00</span></span></div>
      <div class="row" id="r_igst" style="display:none"><span>IGST <span class="tax-tag">18%</span></span><span class="num">₹<span id="v_igst">0.00</span></span></div>
      <div class="row grand"><span>Total</span><span class="num">₹<span id="v_grand">0.00</span></span></div>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:6px">Advance received</h3>
    <p style="color:var(--muted);font-size:13.5px">Leave this empty if nothing has been collected yet. It shows up straight away in Payments.</p>
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="adv">Amount received now</label>
        <input id="adv" type="number" step="0.01" min="0" name="advance_amount" placeholder="0.00">
        <div class="btn-row" style="margin-top:8px">
          <button type="button" class="btn btn-secondary btn-sm" onclick="advHalf()">50% of total</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('adv').value=''">Clear</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="advm">Method</label>
        <select id="advm" name="advance_method">
          <option>Cash</option><option>UPI</option><option>Bank transfer</option>
          <option>Cheque</option><option>Card</option><option>Other</option>
        </select>
      </div>
    </div>
  </div>

  <button type="submit" name="save_invoice" class="btn btn-primary">Save and open the printable bill</button>
</form>

<script>
const sellerState = "<?php echo h($seller_state); ?>";
let grandTotal = 0;

function recalc() {
  const qtys = document.querySelectorAll('.qty');
  const rates = document.querySelectorAll('.rate');
  const amounts = document.querySelectorAll('.amount');
  let sub = 0;

  for (let i = 0; i < qtys.length; i++) {
    const line = (parseFloat(qtys[i].value) || 0) * (parseFloat(rates[i].value) || 0);
    amounts[i].value = line.toFixed(2);
    sub += line;
  }

  const sel = document.getElementById('cs');
  const state = sel.selectedIndex > 0 ? (sel.options[sel.selectedIndex].dataset.state || '') : '';
  const interState = state !== '' && state !== sellerState;

  let cgst = 0, sgst = 0, igst = 0;
  if (interState) {
    igst = sub * 0.18;
    r_cgst.style.display = r_sgst.style.display = 'none';
    r_igst.style.display = 'flex';
  } else {
    cgst = sgst = sub * 0.09;
    r_cgst.style.display = r_sgst.style.display = 'flex';
    r_igst.style.display = 'none';
  }

  grandTotal = sub + cgst + sgst + igst;
  v_sub.textContent = sub.toFixed(2);
  v_cgst.textContent = cgst.toFixed(2);
  v_sgst.textContent = sgst.toFixed(2);
  v_igst.textContent = igst.toFixed(2);
  v_grand.textContent = grandTotal.toFixed(2);
}

function addRow() {
  const tb = document.querySelector('#itemsTable tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><textarea name="descriptions[]" placeholder="Item name on the first line, details below" required></textarea></td>
    <td><input type="text" name="hsns[]" value="8471"></td>
    <td><input type="number" name="qtys[]" class="qty" value="1" step="any" oninput="recalc()" required></td>
    <td><input type="number" name="rates[]" class="rate" value="0.00" step="any" oninput="recalc()" required></td>
    <td><input type="number" name="amounts[]" class="amount" value="0.00" readonly></td>
    <td><button type="button" class="btn-remove" onclick="dropRow(this)">×</button></td>`;
  tb.appendChild(tr);
}

function dropRow(btn) {
  const tb = document.querySelector('#itemsTable tbody');
  if (tb.childElementCount > 1) { btn.closest('tr').remove(); recalc(); }
}

function advHalf() { document.getElementById('adv').value = (grandTotal / 2).toFixed(2); }
recalc();
</script>

<?php page_end(); ?>
