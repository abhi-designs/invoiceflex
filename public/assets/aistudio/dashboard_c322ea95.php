<?php
/* ============================================================
   dashboard.php — the user's home screen
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);

if (!$company) { header("Location: setup.php"); exit(); }

/* Money position across every invoice this user owns */
$totals = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COALESCE(SUM(i.total_amount),0) AS billed, COUNT(i.id) AS invoices
    FROM invoices i WHERE i.user_id = $user_id"));

$received = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COALESCE(SUM(p.amount),0) AS received FROM payments p WHERE p.user_id = $user_id"));

$billed      = floatval($totals['billed']);
$got         = floatval($received['received']);
$outstanding = max(0, $billed - $got);

list($can_bill, $used, $cap, $quota_note) = invoice_quota($conn, $user);
$limits   = plan_limits($user['membership_plan'] ?? 'Free');
$cust_cnt = customer_count($conn, $user_id);

/* How many invoices still have money owing */
$pending = mysqli_fetch_assoc(mysqli_query($conn, "
    SELECT COUNT(*) AS c FROM (
        SELECT i.id, i.total_amount, COALESCE(SUM(p.amount),0) AS paid
        FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
        WHERE i.user_id = $user_id GROUP BY i.id
        HAVING i.total_amount - paid > 0.01
    ) t"))['c'] ?? 0;

$recent = mysqli_query($conn, "
    SELECT i.*, COALESCE(SUM(p.amount),0) AS paid
    FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.user_id = $user_id
    GROUP BY i.id ORDER BY i.invoice_date DESC, i.id DESC LIMIT 8");

$state    = $user['state'];
$pct_used = $cap ? min(100, round($used / max(1, $cap) * 100)) : 0;
$meter_tone = $pct_used >= 100 ? ' bad' : ($pct_used >= 80 ? ' warn' : '');

require_once __DIR__ . '/partials/layout.php';
page_start('dashboard', 'Dashboard', [
    'sub'     => $state['note'] . ' · ' . $limits['blurb'],
    'company' => $company,
    'user'    => $user,
    'actions' => '<a href="invoice-create.php" class="btn btn-primary btn-sm">New invoice</a>',
]);
?>

<?php if (!$can_bill): ?>
  <div class="notice warn"><?php echo h($quota_note); ?></div>
<?php elseif ($cap && $cap - $used <= 2): ?>
  <div class="notice info"><?php echo h($quota_note); ?></div>
<?php endif; ?>

<div class="stat-grid">
  <div class="stat">
    <div class="label">Billed</div>
    <div class="value num"><?php echo money($billed); ?></div>
    <div class="foot"><?php echo intval($totals['invoices']); ?> invoices in total</div>
  </div>
  <div class="stat good">
    <div class="label">Received</div>
    <div class="value num"><?php echo money($got); ?></div>
    <div class="foot"><?php echo $billed > 0 ? round($got / $billed * 100) : 0; ?>% of everything billed</div>
  </div>
  <div class="stat bad">
    <div class="label">Outstanding</div>
    <div class="value num"><?php echo money($outstanding); ?></div>
    <div class="foot"><?php echo intval($pending); ?> invoices still owing</div>
  </div>
  <div class="stat accent">
    <div class="label">Today</div>
    <div class="value num"><?php echo $used; ?><?php echo $cap ? ' / ' . $cap : ''; ?></div>
    <?php if ($cap): ?>
      <div class="meter<?php echo $meter_tone; ?>"><span style="width:<?php echo $pct_used; ?>%"></span></div>
      <div class="foot"><?php echo max(0, $cap - $used); ?> left on <?php echo h($limits['label']); ?></div>
    <?php else: ?>
      <div class="foot">Unlimited on <?php echo h($limits['label']); ?></div>
    <?php endif; ?>
  </div>
</div>

<div class="card tight">
  <div class="card-head">
    <h3>Recent invoices</h3>
    <a href="invoices.php" class="btn btn-ghost btn-sm">See all</a>
  </div>

  <?php if ($recent && mysqli_num_rows($recent) > 0): ?>
  <div class="table-wrap">
    <table class="data">
      <thead>
        <tr><th>Invoice</th><th>Customer</th><th>Date</th><th class="right">Amount</th><th>Payment</th><th></th></tr>
      </thead>
      <tbody>
        <?php while ($inv = mysqli_fetch_assoc($recent)):
          $pay = payment_state($inv, $inv['paid']); ?>
          <tr>
            <td class="strong"><?php echo h(display_invoice_no($inv)); ?></td>
            <td><?php echo h($inv['customer_name']); ?></td>
            <td><?php echo date('d M Y', strtotime($inv['invoice_date'])); ?></td>
            <td class="right num"><?php echo money($inv['total_amount']); ?></td>
            <td><span class="chip <?php echo $pay['tone']; ?>"><?php echo h($pay['label']); ?></span></td>
            <td class="right">
              <a href="print-invoice.php?id=<?php echo $inv['id']; ?>" class="btn btn-secondary btn-sm" target="_blank">Print</a>
            </td>
          </tr>
        <?php endwhile; ?>
      </tbody>
    </table>
  </div>
  <?php else: ?>
    <div class="empty">
      <span class="big">🧾</span>
      No invoices yet. Add a customer, then raise your first bill.
      <div class="btn-row" style="justify-content:center;margin-top:14px">
        <a href="customer.php" class="btn btn-secondary btn-sm">Add a customer</a>
        <a href="invoice-create.php" class="btn btn-primary btn-sm">Create invoice</a>
      </div>
    </div>
  <?php endif; ?>
</div>

<div class="stat-grid">
  <div class="stat">
    <div class="label">Customers</div>
    <div class="value num"><?php echo $cust_cnt; ?><?php echo $limits['customers'] ? ' / ' . $limits['customers'] : ''; ?></div>
    <div class="foot"><a href="customer.php">Manage customers</a></div>
  </div>
  <div class="stat">
    <div class="label">Plan</div>
    <div class="value"><?php echo h($limits['label']); ?></div>
    <div class="foot"><?php echo h($state['note']); ?></div>
  </div>
</div>

<?php page_end(); ?>
