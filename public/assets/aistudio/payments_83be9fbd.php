<?php
/* ============================================================
   payments.php — money in, money still owed
   Shows which company has paid, who is part-paid (a 50%
   advance, say) and who has not paid at all.
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$error = $success = '';

/* ---------- record a payment ---------- */
if (isset($_POST['record_payment'])) {
    $invoice_id = intval($_POST['invoice_id']);
    $amount     = round(floatval($_POST['amount']), 2);
    $paid_on    = $_POST['paid_on'] ?: date('Y-m-d');
    $method     = trim($_POST['method']);
    $note       = trim($_POST['note']);

    $stmt = mysqli_prepare($conn, "SELECT * FROM invoices WHERE id=? AND user_id=?");
    mysqli_stmt_bind_param($stmt, "ii", $invoice_id, $user_id);
    mysqli_stmt_execute($stmt);
    $inv = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    if (!$inv) {
        $error = "That invoice could not be found.";
    } elseif ($amount <= 0) {
        $error = "Enter an amount greater than zero.";
    } else {
        $already = paid_total($conn, $invoice_id);
        $balance = round(floatval($inv['total_amount']) - $already, 2);
        if ($amount > $balance + 0.01) {
            $error = "That is more than the " . money($balance) . " still owing on this invoice.";
        } else {
            $cid = intval($inv['customer_id']);
            $stmt = mysqli_prepare($conn, "INSERT INTO payments
                (user_id, invoice_id, customer_id, amount, paid_on, method, note)
                VALUES (?, ?, ?, ?, ?, ?, ?)");
            mysqli_stmt_bind_param($stmt, "iiidsss", $user_id, $invoice_id, $cid, $amount, $paid_on, $method, $note);
            mysqli_stmt_execute($stmt);

            $new_paid = paid_total($conn, $invoice_id);
            $status = ($new_paid >= floatval($inv['total_amount']) - 0.01) ? 'paid'
                     : ($new_paid > 0.01 ? 'partial' : 'unpaid');
            mysqli_query($conn, "UPDATE invoices SET status='$status' WHERE id=$invoice_id AND user_id=$user_id");

            $success = money($amount) . " recorded against " . h(display_invoice_no($inv)) . ".";
        }
    }
}

/* ---------- undo a payment ---------- */
if (isset($_POST['delete_payment'])) {
    $pid = intval($_POST['payment_id']);
    $row = mysqli_fetch_assoc(mysqli_query($conn, "SELECT invoice_id FROM payments WHERE id=$pid AND user_id=$user_id"));
    if ($row) {
        mysqli_query($conn, "DELETE FROM payments WHERE id=$pid AND user_id=$user_id");
        $iid = intval($row['invoice_id']);
        $inv = mysqli_fetch_assoc(mysqli_query($conn, "SELECT total_amount FROM invoices WHERE id=$iid"));
        $np  = paid_total($conn, $iid);
        $status = ($inv && $np >= floatval($inv['total_amount']) - 0.01) ? 'paid' : ($np > 0.01 ? 'partial' : 'unpaid');
        mysqli_query($conn, "UPDATE invoices SET status='$status' WHERE id=$iid AND user_id=$user_id");
        $success = "Payment entry removed.";
    }
}

/* ---------- data ---------- */
$filter = $_GET['show'] ?? 'all';   // all | pending | advance | paid

$stmt = mysqli_prepare($conn, "
    SELECT i.*, COALESCE(SUM(p.amount),0) AS paid
    FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.user_id = ?
    GROUP BY i.id ORDER BY i.invoice_date DESC, i.id DESC");
mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$rows = [];
$by_company = [];
$billed = $received = 0;
$overdue_count = 0;

while ($inv = mysqli_fetch_assoc($res)) {
    $pay = payment_state($inv, $inv['paid']);
    $inv['pay'] = $pay;
    $rows[] = $inv;

    $billed   += $pay['total'];
    $received += $pay['paid'];
    if ($pay['overdue']) $overdue_count++;

    $name = $inv['customer_name'] ?: 'Unnamed customer';
    if (!isset($by_company[$name])) {
        $by_company[$name] = ['billed' => 0, 'paid' => 0, 'count' => 0, 'overdue' => 0];
    }
    $by_company[$name]['billed'] += $pay['total'];
    $by_company[$name]['paid']   += $pay['paid'];
    $by_company[$name]['count']++;
    if ($pay['overdue']) $by_company[$name]['overdue']++;
}

$outstanding = max(0, $billed - $received);
uasort($by_company, fn($a, $b) => ($b['billed'] - $b['paid']) <=> ($a['billed'] - $a['paid']));

/* Payment history for the drawer */
$history = [];
$hres = mysqli_query($conn, "SELECT * FROM payments WHERE user_id=$user_id ORDER BY paid_on DESC, id DESC");
while ($p = mysqli_fetch_assoc($hres)) $history[$p['invoice_id']][] = $p;

$open_for = isset($_GET['pay']) ? intval($_GET['pay']) : 0;

$visible = array_filter($rows, function ($r) use ($filter) {
    $k = $r['pay']['key'];
    if ($filter === 'pending')  return $k === 'unpaid';
    if ($filter === 'advance')  return $k === 'advance' || $k === 'partial';
    if ($filter === 'paid')     return $k === 'paid';
    return true;
});

require_once __DIR__ . '/partials/layout.php';
page_start('payments', 'Payments', [
    'sub'     => money($outstanding) . ' still to collect',
    'company' => $company, 'user' => $user,
    'actions' => '<a href="invoice-create.php" class="btn btn-primary btn-sm">New invoice</a>',
]);
?>

<?php if ($error): ?><div class="notice err"><?php echo $error; ?></div><?php endif; ?>
<?php if ($success): ?><div class="notice ok"><?php echo $success; ?></div><?php endif; ?>

<div class="stat-grid">
  <div class="stat">
    <div class="label">Billed</div>
    <div class="value num"><?php echo money($billed); ?></div>
    <div class="foot"><?php echo count($rows); ?> invoices</div>
  </div>
  <div class="stat good">
    <div class="label">Received</div>
    <div class="value num"><?php echo money($received); ?></div>
    <div class="foot"><?php echo $billed > 0 ? round($received / $billed * 100) : 0; ?>% collected</div>
  </div>
  <div class="stat bad">
    <div class="label">Outstanding</div>
    <div class="value num"><?php echo money($outstanding); ?></div>
    <div class="foot">Across <?php echo count(array_filter($by_company, fn($c) => $c['billed'] - $c['paid'] > 0.01)); ?> companies</div>
  </div>
  <div class="stat warn">
    <div class="label">Past due date</div>
    <div class="value num"><?php echo $overdue_count; ?></div>
    <div class="foot">Invoices needing a follow-up</div>
  </div>
</div>

<div class="card tight">
  <div class="card-head">
    <h3>Where each company stands</h3>
    <span class="hint">Sorted by the largest balance</span>
  </div>
  <?php if ($by_company): ?>
  <div class="table-wrap">
    <table class="data">
      <thead><tr><th>Company</th><th class="right">Billed</th><th class="right">Received</th><th class="right">Balance</th><th>Position</th></tr></thead>
      <tbody>
        <?php foreach ($by_company as $name => $c):
          $bal = round($c['billed'] - $c['paid'], 2);
          $pct = $c['billed'] > 0 ? round($c['paid'] / $c['billed'] * 100) : 0;
          if ($bal <= 0.01)      { $tone = 'green';  $label = 'Fully paid'; }
          elseif ($c['paid'] <= 0.01) { $tone = $c['overdue'] ? 'red' : 'amber'; $label = $c['overdue'] ? 'Overdue' : 'Payment pending'; }
          elseif ($pct >= 45 && $pct <= 55) { $tone = 'violet'; $label = $pct . '% advance paid'; }
          else                   { $tone = 'blue';   $label = $pct . '% received'; } ?>
          <tr>
            <td>
              <div class="person">
                <div class="avatar avatar-initials"><?php echo h(initials($name)); ?></div>
                <div>
                  <div class="name"><?php echo h($name); ?></div>
                  <div class="sub"><?php echo $c['count']; ?> invoice<?php echo $c['count'] == 1 ? '' : 's'; ?></div>
                </div>
              </div>
            </td>
            <td class="right num"><?php echo money($c['billed']); ?></td>
            <td class="right num"><?php echo money($c['paid']); ?></td>
            <td class="right num strong"><?php echo $bal > 0.01 ? money($bal) : '—'; ?></td>
            <td><span class="chip <?php echo $tone; ?>"><?php echo h($label); ?></span></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php else: ?>
    <div class="empty"><span class="big">💳</span>No invoices yet, so there is nothing to collect.</div>
  <?php endif; ?>
</div>

<div class="section-title">Invoice by invoice</div>

<div class="segmented" style="margin-bottom:14px">
  <a href="?show=all"     class="<?php echo $filter === 'all' ? 'active' : ''; ?>">All</a>
  <a href="?show=pending" class="<?php echo $filter === 'pending' ? 'active' : ''; ?>">Not paid</a>
  <a href="?show=advance" class="<?php echo $filter === 'advance' ? 'active' : ''; ?>">Part paid</a>
  <a href="?show=paid"    class="<?php echo $filter === 'paid' ? 'active' : ''; ?>">Paid</a>
</div>

<div class="card tight">
  <?php if ($visible): ?>
  <div class="table-wrap">
    <table class="data">
      <thead>
        <tr><th>Invoice</th><th>Customer</th><th>Due</th><th class="right">Amount</th><th class="right">Received</th>
            <th class="right">Balance</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
        <?php foreach ($visible as $inv): $pay = $inv['pay']; $no = display_invoice_no($inv); ?>
        <tr>
          <td class="strong"><?php echo h($no); ?></td>
          <td><?php echo h($inv['customer_name']); ?></td>
          <td>
            <?php if (!empty($inv['due_date']) && $inv['due_date'] !== '0000-00-00'): ?>
              <span style="<?php echo $pay['overdue'] ? 'color:var(--red);font-weight:600' : ''; ?>">
                <?php echo date('d M Y', strtotime($inv['due_date'])); ?></span>
            <?php else: ?>—<?php endif; ?>
          </td>
          <td class="right num"><?php echo money($pay['total']); ?></td>
          <td class="right num"><?php echo money($pay['paid']); ?></td>
          <td class="right num strong"><?php echo $pay['balance'] > 0.01 ? money($pay['balance']) : '—'; ?></td>
          <td><span class="chip <?php echo $pay['tone']; ?>"><?php echo h($pay['label']); ?></span></td>
          <td class="right">
            <button class="btn btn-secondary btn-sm" data-inv="<?php echo intval($inv['id']); ?>"
              onclick='openPay(<?php echo json_encode([
                  "id"      => intval($inv["id"]),
                  "no"      => $no,
                  "cust"    => $inv["customer_name"],
                  "total"   => $pay["total"],
                  "paid"    => $pay["paid"],
                  "balance" => $pay["balance"],
                  "history" => array_map(fn($p) => [
                        "id" => intval($p["id"]), "amount" => floatval($p["amount"]),
                        "on" => date("d M Y", strtotime($p["paid_on"])),
                        "method" => $p["method"], "note" => $p["note"],
                    ], $history[$inv["id"]] ?? []),
              ], JSON_HEX_APOS | JSON_HEX_QUOT); ?>)'>
              <?php echo $pay['balance'] > 0.01 ? 'Record payment' : 'View'; ?>
            </button>
          </td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php else: ?>
    <div class="empty"><span class="big">✅</span>Nothing sits in this group right now.</div>
  <?php endif; ?>
</div>

<!-- Record payment sheet -->
<div class="modal-back" id="payModal" onclick="if(event.target===this) closePay()">
  <div class="modal">
    <h2 id="pmTitle">Record payment</h2>
    <p class="hint" id="pmSub" style="color:var(--muted);font-size:13.5px;margin-top:4px"></p>

    <div class="stat-grid" style="grid-template-columns:1fr 1fr 1fr;gap:8px;margin:14px 0 18px">
      <div class="stat" style="padding:11px 12px;box-shadow:none;background:var(--surface-2)">
        <div class="label">Amount</div><div class="value num" id="pmTotal" style="font-size:16px"></div>
      </div>
      <div class="stat" style="padding:11px 12px;box-shadow:none;background:var(--surface-2)">
        <div class="label">Received</div><div class="value num" id="pmPaid" style="font-size:16px"></div>
      </div>
      <div class="stat" style="padding:11px 12px;box-shadow:none;background:var(--surface-2)">
        <div class="label">Balance</div><div class="value num" id="pmBal" style="font-size:16px"></div>
      </div>
    </div>

    <form method="POST" action="payments.php" id="pmForm">
      <input type="hidden" name="invoice_id" id="pmInvoiceId">

      <div class="field">
        <label class="field-label" for="pmAmount">Amount received</label>
        <input id="pmAmount" type="number" step="0.01" min="0.01" name="amount" required>
        <div class="btn-row" style="margin-top:8px">
          <button type="button" class="btn btn-secondary btn-sm" onclick="fillPart(0.5)">50% advance</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="fillPart(0.25)">25%</button>
          <button type="button" class="btn btn-secondary btn-sm" onclick="fillFull()">Full balance</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label class="field-label" for="pmDate">Received on</label>
          <input id="pmDate" type="date" name="paid_on" value="<?php echo date('Y-m-d'); ?>" required>
        </div>
        <div class="field">
          <label class="field-label" for="pmMethod">Method</label>
          <select id="pmMethod" name="method">
            <option>Cash</option><option>UPI</option><option>Bank transfer</option>
            <option>Cheque</option><option>Card</option><option>Other</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="pmNote">Note</label>
        <input id="pmNote" type="text" name="note" placeholder="Advance against delivery, cheque number, and so on">
      </div>

      <div class="btn-row">
        <button type="submit" name="record_payment" class="btn btn-primary" id="pmSubmit">Save payment</button>
        <button type="button" class="btn btn-secondary" onclick="closePay()">Close</button>
      </div>
    </form>

    <div id="pmHistory" style="margin-top:20px"></div>
  </div>
</div>

<script>
const PM = {
  el: document.getElementById('payModal'),
  data: null
};

function money(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function openPay(inv) {
  PM.data = inv;
  document.getElementById('pmTitle').textContent = inv.balance > 0.01 ? 'Record payment' : 'Payment history';
  document.getElementById('pmSub').textContent = inv.no + ' · ' + inv.cust;
  document.getElementById('pmTotal').textContent = money(inv.total);
  document.getElementById('pmPaid').textContent  = money(inv.paid);
  document.getElementById('pmBal').textContent   = money(inv.balance);
  document.getElementById('pmInvoiceId').value   = inv.id;
  document.getElementById('pmAmount').value      = inv.balance > 0.01 ? inv.balance.toFixed(2) : '';
  document.getElementById('pmAmount').max        = inv.balance;
  document.getElementById('pmForm').style.display = inv.balance > 0.01 ? '' : 'none';

  let html = '';
  if (inv.history.length) {
    html = '<div class="section-title" style="margin:0 0 8px">Already received</div>';
    inv.history.forEach(p => {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;' +
              'padding:10px 12px;background:var(--surface-2);border-radius:12px;margin-bottom:7px">' +
              '<div><div style="font-weight:620">' + money(p.amount) + ' · ' + p.method + '</div>' +
              '<div style="font-size:12px;color:var(--muted)">' + p.on + (p.note ? ' · ' + p.note : '') + '</div></div>' +
              '<form method="POST" onsubmit="return confirm(\'Remove this payment entry?\')">' +
              '<input type="hidden" name="payment_id" value="' + p.id + '">' +
              '<button class="btn btn-danger btn-sm" name="delete_payment">Undo</button></form></div>';
    });
  }
  document.getElementById('pmHistory').innerHTML = html;
  PM.el.classList.add('open');
}

function closePay() { PM.el.classList.remove('open'); }
function fillPart(f) { if (PM.data) document.getElementById('pmAmount').value = (PM.data.total * f).toFixed(2); }
function fillFull() { if (PM.data) document.getElementById('pmAmount').value = PM.data.balance.toFixed(2); }
addEventListener('keydown', e => { if (e.key === 'Escape') closePay(); });

<?php if ($open_for): ?>
  (function () {
    const btn = document.querySelector('button[data-inv="<?php echo $open_for; ?>"]');
    if (btn) btn.click();
  })();
<?php endif; ?>
</script>

<?php page_end(); ?>
