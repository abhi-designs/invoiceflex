<?php
/* ============================================================
   invoices.php — every invoice, grouped by month
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$filter = $_GET['show'] ?? 'all';   // all | pending | paid

$stmt = mysqli_prepare($conn, "
    SELECT i.*, COALESCE(SUM(p.amount),0) AS paid
    FROM invoices i LEFT JOIN payments p ON p.invoice_id = i.id
    WHERE i.user_id = ?
    GROUP BY i.id ORDER BY i.invoice_date DESC, i.id DESC");
mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

$months = [];
$grand  = 0;
while ($inv = mysqli_fetch_assoc($res)) {
    $pay = payment_state($inv, $inv['paid']);
    if ($filter === 'pending' && $pay['key'] === 'paid') continue;
    if ($filter === 'paid' && $pay['key'] !== 'paid') continue;
    $inv['pay'] = $pay;
    $months[date('F Y', strtotime($inv['invoice_date']))][] = $inv;
    $grand += $pay['total'];
}

require_once __DIR__ . '/partials/layout.php';
page_start('invoices', 'Monthly invoices', [
    'sub'     => money($grand) . ' shown',
    'company' => $company, 'user' => $user,
    'actions' => '<a href="invoice-create.php" class="btn btn-primary btn-sm">New invoice</a>',
]);
?>

<div class="segmented" style="margin-bottom:16px">
  <a href="?show=all"     class="<?php echo $filter === 'all' ? 'active' : ''; ?>">All</a>
  <a href="?show=pending" class="<?php echo $filter === 'pending' ? 'active' : ''; ?>">Owing</a>
  <a href="?show=paid"    class="<?php echo $filter === 'paid' ? 'active' : ''; ?>">Settled</a>
</div>

<?php if (!$months): ?>
  <div class="card"><div class="empty"><span class="big">🧾</span>Nothing to show here yet.
    <div class="btn-row" style="justify-content:center;margin-top:14px">
      <a href="invoice-create.php" class="btn btn-primary btn-sm">Create an invoice</a>
    </div></div></div>
<?php endif; ?>

<?php foreach ($months as $month => $list):
  $month_total = array_sum(array_map(fn($i) => $i['pay']['total'], $list));
  $month_due   = array_sum(array_map(fn($i) => $i['pay']['balance'], $list)); ?>

  <div class="card tight">
    <div class="month-bar">
      <span class="m"><?php echo h($month); ?></span>
      <span class="t num"><?php echo money($month_total); ?><?php echo $month_due > 0.01 ? ' · ' . money($month_due) . ' owing' : ''; ?></span>
    </div>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr><th>Invoice</th><th>Customer</th><th>Date</th><th class="right">Amount</th><th class="right">Balance</th><th>Payment</th><th></th></tr>
        </thead>
        <tbody>
          <?php foreach ($list as $inv): $pay = $inv['pay']; ?>
          <tr>
            <td class="strong"><?php echo h(display_invoice_no($inv)); ?></td>
            <td><?php echo h($inv['customer_name']); ?></td>
            <td><?php echo date('d M Y', strtotime($inv['invoice_date'])); ?></td>
            <td class="right num"><?php echo money($pay['total']); ?></td>
            <td class="right num"><?php echo $pay['balance'] > 0.01 ? money($pay['balance']) : '—'; ?></td>
            <td><span class="chip <?php echo $pay['tone']; ?>"><?php echo h($pay['label']); ?></span></td>
            <td class="right">
              <div class="btn-row" style="justify-content:flex-end">
                <a href="print-invoice.php?id=<?php echo $inv['id']; ?>" class="btn btn-secondary btn-sm" target="_blank">Print</a>
                <?php if ($pay['balance'] > 0.01): ?>
                  <a href="payments.php?pay=<?php echo $inv['id']; ?>" class="btn btn-ghost btn-sm">Record payment</a>
                <?php endif; ?>
                <form action="delete-invoice.php" method="POST"
                      onsubmit="return confirm('Delete invoice <?php echo h(display_invoice_no($inv)); ?>? Its payment records go too.')">
                  <input type="hidden" name="delete_id" value="<?php echo $inv['id']; ?>">
                  <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
<?php endforeach; ?>

<?php page_end(); ?>
