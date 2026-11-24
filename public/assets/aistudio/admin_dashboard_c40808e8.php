<?php
/* ============================================================
   admin_dashboard.php — member management
   There is no status field to set any more. A membership is
   active while its end date is today or later, so extending a
   plan brings the account straight back to life.
   ============================================================ */
require_once __DIR__ . '/config.php';
$admin = require_admin($conn);

/* ---------- save plan + end date ----------
   Triggered either by the "Save" button (update_membership) or by
   one of the +1 month / +6 months / +1 year quick buttons (extend).
   They used to only fire when update_membership was also present,
   which is never true for the quick buttons — that was why they
   silently did nothing. */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_POST['update_membership']) || isset($_POST['extend']))) {
    $target = intval($_POST['target_user_id']);
    $plan   = $_POST['membership_plan'] ?? 'Free';
    if (!isset($PLAN_LIMITS[$plan])) $plan = 'Free';

    $extend = $_POST['extend'] ?? '';
    $expiry = trim($_POST['membership_expiry'] ?? '');

    if ($extend !== '') {
        /* Extend from whichever is later: today or the current end date. */
        $row = mysqli_fetch_assoc(mysqli_query($conn, "SELECT membership_expiry FROM users WHERE id=$target"));
        $base = (!empty($row['membership_expiry']) && $row['membership_expiry'] >= date('Y-m-d'))
                ? $row['membership_expiry'] : date('Y-m-d');
        $map = ['1m' => '+1 month', '6m' => '+6 months', '1y' => '+1 year'];
        if (isset($map[$extend])) $expiry = date('Y-m-d', strtotime($base . ' ' . $map[$extend]));
    }

    $expiry_sql = ($expiry === '') ? "NULL" : "'" . mysqli_real_escape_string($conn, $expiry) . "'";
    $plan_sql   = mysqli_real_escape_string($conn, $plan);

    mysqli_query($conn, "UPDATE users SET membership_plan='$plan_sql', membership_expiry=$expiry_sql
                         WHERE id=$target AND is_admin=0");

    /* Recalculate the stored status right away from the new date. */
    $u = fetch_user($conn, $target);
    if ($u) sync_membership_status($conn, $u);

    header("Location: admin_dashboard.php?msg=saved"); exit();
}

/* ---------- clear the end date (never expires) ---------- */
if (isset($_POST['clear_expiry'])) {
    $target = intval($_POST['target_user_id']);
    mysqli_query($conn, "UPDATE users SET membership_expiry=NULL, membership_status='active'
                         WHERE id=$target AND is_admin=0");
    header("Location: admin_dashboard.php?msg=saved"); exit();
}

/* ---------- delete a member ---------- */
if (isset($_GET['action'], $_GET['target_id']) && $_GET['action'] === 'delete_user') {
    $t = intval($_GET['target_id']);
    mysqli_query($conn, "DELETE FROM payments WHERE user_id=$t");
    mysqli_query($conn, "DELETE ii FROM invoice_items ii
                         JOIN invoices i ON i.id = ii.invoice_id WHERE i.user_id=$t");
    mysqli_query($conn, "DELETE FROM invoices WHERE user_id=$t");
    mysqli_query($conn, "DELETE FROM customers WHERE user_id=$t");
    mysqli_query($conn, "DELETE FROM company WHERE user_id=$t");
    mysqli_query($conn, "DELETE FROM users WHERE id=$t AND is_admin=0");
    header("Location: admin_dashboard.php?msg=deleted"); exit();
}

sync_all_memberships($conn);

$users = mysqli_query($conn, "
    SELECT u.*, c.company_name, c.profile_image, c.logo,
           (SELECT COUNT(*) FROM invoices i WHERE i.user_id = u.id) AS invoice_count,
           (SELECT COALESCE(SUM(i.total_amount),0) FROM invoices i WHERE i.user_id = u.id) AS billed,
           (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.user_id = u.id) AS received
    FROM users u LEFT JOIN company c ON c.user_id = u.id
    WHERE u.is_admin = 0 ORDER BY u.id DESC");

$rows = [];
$active = $expired = $soon = $invoice_total = 0;
while ($u = mysqli_fetch_assoc($users)) {
    $u['state'] = membership_state($u);
    if ($u['state']['status'] === 'active') {
        $active++;
        if ($u['state']['days'] !== null && $u['state']['days'] <= 7) $soon++;
    } else {
        $expired++;
    }
    $invoice_total += intval($u['invoice_count']);
    $rows[] = $u;
}

require_once __DIR__ . '/partials/layout.php';
page_start('admin', 'Members', [
    'sub'   => count($rows) . ' accounts · ' . $active . ' active',
    'admin' => true,
]);
?>

<?php if (($_GET['msg'] ?? '') === 'saved'): ?>
  <div class="notice ok">Membership saved. The account status follows the end date from now on.</div>
<?php elseif (($_GET['msg'] ?? '') === 'deleted'): ?>
  <div class="notice err">The account and everything it owned has been deleted.</div>
<?php endif; ?>

<div class="stat-grid">
  <div class="stat"><div class="label">Accounts</div><div class="value num"><?php echo count($rows); ?></div></div>
  <div class="stat good"><div class="label">Active</div><div class="value num"><?php echo $active; ?></div></div>
  <div class="stat warn"><div class="label">Ending within a week</div><div class="value num"><?php echo $soon; ?></div></div>
  <div class="stat bad"><div class="label">Ended</div><div class="value num"><?php echo $expired; ?></div></div>
  <div class="stat"><div class="label">Invoices raised</div><div class="value num"><?php echo $invoice_total; ?></div></div>
</div>

<div class="card tight">
  <div class="card-head">
    <h3>Memberships</h3>
    <div class="search">
      <?php echo nav_icon('search'); ?>
      <input type="text" id="q" placeholder="Search e-mail or company" onkeyup="filterRows()">
    </div>
  </div>

  <div class="table-wrap">
    <table class="data" id="memberTable">
      <thead>
        <tr><th>Member</th><th class="right">Invoices</th>
            <th>Plan and end date</th><th>Status</th><th></th></tr>
      </thead>
      <tbody>
      <?php foreach ($rows as $u):
        $st = $u['state'];
        $limits = plan_limits($u['membership_plan']);
        $pic = avatar_src($u);
        $fid = 'f' . $u['id']; ?>
        <tr data-search="<?php echo h(strtolower($u['email'] . ' ' . ($u['company_name'] ?? ''))); ?>">
          <td>
            <div class="person">
              <?php if ($pic): ?>
                <img src="<?php echo h($pic); ?>" alt="" class="avatar">
              <?php else: ?>
                <div class="avatar avatar-initials"><?php echo h(initials($u['company_name'] ?: $u['email'])); ?></div>
              <?php endif; ?>
              <div>
                <div class="name"><?php echo h($u['company_name'] ?: 'Company not set up'); ?></div>
                <div class="sub">#<?php echo $u['id']; ?> · <?php echo h($u['email']); ?></div>
              </div>
            </div>
          </td>
          <td class="right num"><?php echo intval($u['invoice_count']); ?></td>
          <td>
            <form method="POST" id="<?php echo $fid; ?>">
              <input type="hidden" name="target_user_id" value="<?php echo $u['id']; ?>">
            </form>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <select name="membership_plan" form="<?php echo $fid; ?>" style="width:auto;min-width:118px">
                <?php foreach ($PLAN_LIMITS as $key => $p): ?>
                  <option value="<?php echo $key; ?>" <?php echo $u['membership_plan'] === $key ? 'selected' : ''; ?>>
                    <?php echo h($p['label']); ?>
                  </option>
                <?php endforeach; ?>
              </select>
              <input type="date" name="membership_expiry" form="<?php echo $fid; ?>"
                     value="<?php echo h($u['membership_expiry']); ?>" style="width:auto">
              <button type="submit" name="update_membership" form="<?php echo $fid; ?>" class="btn btn-primary btn-sm">Save</button>
            </div>
            <div class="btn-row" style="margin-top:8px">
              <button type="submit" name="extend" value="1m" form="<?php echo $fid; ?>" class="btn btn-secondary btn-sm">+1 month</button>
              <button type="submit" name="extend" value="6m" form="<?php echo $fid; ?>" class="btn btn-secondary btn-sm">+6 months</button>
              <button type="submit" name="extend" value="1y" form="<?php echo $fid; ?>" class="btn btn-secondary btn-sm">+1 year</button>
              <button type="submit" name="clear_expiry" form="<?php echo $fid; ?>" class="btn btn-ghost btn-sm">No end date</button>
            </div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:6px"><?php echo h($limits['blurb']); ?></div>
          </td>
          <td>
            <span class="chip <?php echo $st['status'] === 'active' ? 'green' : 'red'; ?>">
              <?php echo $st['status'] === 'active' ? 'Active' : 'Ended'; ?>
            </span>
            <div style="font-size:11.5px;color:var(--muted);margin-top:5px"><?php echo h($st['note']); ?></div>
          </td>
          <td class="right">
            <a href="admin_dashboard.php?action=delete_user&target_id=<?php echo $u['id']; ?>"
               class="btn btn-danger btn-sm"
               onclick="return confirm('Delete this account with its customers, invoices and payments?')">Delete</a>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$rows): ?>
        <tr><td colspan="5"><div class="empty"><span class="big">👤</span>No member accounts yet.</div></td></tr>
      <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<p style="color:var(--muted);font-size:13px;max-width:70ch">
  A membership is live while its end date is today or later. Extend the date and the member can sign in
  again immediately — nothing else needs switching on. Clear the date to let an account run without an end.
</p>

<script>
function filterRows() {
  const q = document.getElementById('q').value.toLowerCase();
  document.querySelectorAll('#memberTable tbody tr').forEach(r => {
    if (!r.dataset.search) return;
    r.style.display = r.dataset.search.includes(q) ? '' : 'none';
  });
}
</script>

<?php page_end(); ?>
