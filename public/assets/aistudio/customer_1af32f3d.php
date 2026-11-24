<?php
/* ============================================================
   customer.php — customer directory
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$error = $success = '';
list($can_add, $c_used, $c_cap, $c_note) = customer_quota($conn, $user);

/* ---------- delete ---------- */
if (isset($_POST['delete_customer'])) {
    $cid = intval($_POST['customer_id']);
    $used = mysqli_fetch_assoc(mysqli_query($conn,
        "SELECT COUNT(id) AS c FROM invoices WHERE customer_id=$cid AND user_id=$user_id"))['c'];
    if ($used > 0) {
        $error = "This customer is on $used invoice" . ($used == 1 ? '' : 's') . ", so it cannot be removed.";
    } else {
        $stmt = mysqli_prepare($conn, "DELETE FROM customers WHERE id=? AND user_id=?");
        mysqli_stmt_bind_param($stmt, "ii", $cid, $user_id);
        mysqli_stmt_execute($stmt);
        $success = "Customer removed.";
    }
    list($can_add, $c_used, $c_cap, $c_note) = customer_quota($conn, $user);
}

/* ---------- add / update ---------- */
if (isset($_POST['save_customer'])) {
    $id      = intval($_POST['customer_id'] ?? 0);
    $name    = trim($_POST['name']);
    $email   = trim($_POST['email']);
    $mobile  = trim($_POST['mobile']);
    $gst     = strtoupper(trim($_POST['gst_number']));
    $pan     = strtoupper(trim($_POST['pan_number']));
    $state   = trim($_POST['state']);
    $code    = trim($_POST['state_code']);
    $city    = trim($_POST['city']);
    $address = trim($_POST['address']);

    if (!preg_match("/^[6-9][0-9]{9}$/", $mobile)) {
        $error = "Enter a 10-digit Indian mobile number.";
    } elseif ($gst !== '' && !preg_match("/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/", $gst)) {
        $error = "Check the GSTIN — it should look like 24AAAAA0000A1Z5.";
    } elseif ($pan !== '' && !preg_match("/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/", $pan)) {
        $error = "Check the PAN — it should look like ABCDE1234F.";
    } elseif ($id === 0 && !$can_add) {
        $error = $c_note . " Ask the admin to move you to a bigger plan.";
    } else {
        if ($id > 0) {
            $stmt = mysqli_prepare($conn, "UPDATE customers SET name=?, email=?, mobile=?, gst_number=?,
                        pan_number=?, state=?, state_code=?, city=?, address=? WHERE id=? AND user_id=?");
            mysqli_stmt_bind_param($stmt, "sssssssssii", $name, $email, $mobile, $gst, $pan, $state, $code, $city, $address, $id, $user_id);
            mysqli_stmt_execute($stmt);
            $success = "Customer updated.";
        } else {
            $stmt = mysqli_prepare($conn, "INSERT INTO customers
                (user_id, name, email, mobile, gst_number, pan_number, state, state_code, city, address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            mysqli_stmt_bind_param($stmt, "isssssssss", $user_id, $name, $email, $mobile, $gst, $pan, $state, $code, $city, $address);
            mysqli_stmt_execute($stmt);
            $success = "Customer saved.";
        }
        list($can_add, $c_used, $c_cap, $c_note) = customer_quota($conn, $user);
    }
}

/* ---------- one being edited ---------- */
$editing = [];
if (isset($_GET['edit'])) {
    $eid = intval($_GET['edit']);
    $stmt = mysqli_prepare($conn, "SELECT * FROM customers WHERE id=? AND user_id=?");
    mysqli_stmt_bind_param($stmt, "ii", $eid, $user_id);
    mysqli_stmt_execute($stmt);
    $editing = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt)) ?: [];
}

$stmt = mysqli_prepare($conn, "SELECT c.*, COUNT(i.id) AS invoice_count
    FROM customers c LEFT JOIN invoices i ON i.customer_id = c.id AND i.user_id = c.user_id
    WHERE c.user_id = ? GROUP BY c.id ORDER BY c.name ASC");
mysqli_stmt_bind_param($stmt, "i", $user_id);
mysqli_stmt_execute($stmt);
$customers = mysqli_stmt_get_result($stmt);

$states = ['Gujarat' => '24', 'Maharashtra' => '27', 'Rajasthan' => '08', 'Delhi' => '07',
           'Madhya Pradesh' => '23', 'Karnataka' => '29', 'Daman & Diu' => '25', 'Other' => ''];

require_once __DIR__ . '/partials/layout.php';
page_start('customers', 'Customers', [
    'sub'     => $c_cap ? "$c_used of $c_cap slots used" : "$c_used saved",
    'company' => $company, 'user' => $user,
    'actions' => '<a href="invoice-create.php" class="btn btn-primary btn-sm">New invoice</a>',
]);
?>

<?php if ($error): ?><div class="notice err"><?php echo h($error); ?></div><?php endif; ?>
<?php if ($success): ?><div class="notice ok"><?php echo h($success); ?></div><?php endif; ?>
<?php if (!$can_add && !$editing): ?><div class="notice warn"><?php echo h($c_note); ?></div><?php endif; ?>

<div style="display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:18px;align-items:start"
     class="cust-layout">

  <div class="card">
    <h3 style="margin-bottom:14px"><?php echo $editing ? 'Edit customer' : 'Add a customer'; ?></h3>
    <form method="POST" action="customer.php">
      <input type="hidden" name="customer_id" value="<?php echo intval($editing['id'] ?? 0); ?>">

      <div class="field">
        <label class="field-label" for="nm">Customer or firm name</label>
        <input id="nm" type="text" name="name" value="<?php echo h($editing['name'] ?? ''); ?>" required>
      </div>
      <div class="field">
        <label class="field-label" for="mb">Mobile</label>
        <input id="mb" type="text" name="mobile" maxlength="10" value="<?php echo h($editing['mobile'] ?? ''); ?>" required>
      </div>
      <div class="field">
        <label class="field-label" for="em">E-mail</label>
        <input id="em" type="email" name="email" value="<?php echo h($editing['email'] ?? ''); ?>">
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label" for="gs">GSTIN</label>
          <input id="gs" type="text" name="gst_number" maxlength="15" value="<?php echo h($editing['gst_number'] ?? ''); ?>">
        </div>
        <div class="field">
          <label class="field-label" for="pn">PAN</label>
          <input id="pn" type="text" name="pan_number" maxlength="10" value="<?php echo h($editing['pan_number'] ?? ''); ?>">
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label class="field-label" for="stt">State</label>
          <select id="stt" name="state" onchange="fillCode(this)">
            <?php foreach ($states as $s => $code): ?>
              <option value="<?php echo $s; ?>" data-code="<?php echo $code; ?>"
                <?php echo (($editing['state'] ?? 'Gujarat') === $s) ? 'selected' : ''; ?>><?php echo $s; ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="sc">State code</label>
          <input id="sc" type="text" name="state_code" maxlength="2"
                 value="<?php echo h($editing['state_code'] ?? '24'); ?>" required>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="cty">City</label>
        <input id="cty" type="text" name="city" placeholder="e.g. Vapi" value="<?php echo h($editing['city'] ?? ''); ?>">
      </div>
      <div class="field">
        <label class="field-label" for="ads">Billing address</label>
        <textarea id="ads" name="address" rows="3" required><?php echo h($editing['address'] ?? ''); ?></textarea>
      </div>

      <div class="btn-row">
        <button type="submit" name="save_customer" class="btn btn-primary<?php echo (!$can_add && !$editing) ? ' is-disabled' : ''; ?>">
          <?php echo $editing ? 'Save changes' : 'Save customer'; ?>
        </button>
        <?php if ($editing): ?><a href="customer.php" class="btn btn-secondary">Cancel</a><?php endif; ?>
      </div>
    </form>
  </div>

  <div class="card tight">
    <div class="card-head">
      <h3>Saved customers</h3>
      <div class="search">
        <?php echo nav_icon('search'); ?>
        <input type="text" id="q" placeholder="Search name, GSTIN or mobile" onkeyup="filterRows()">
      </div>
    </div>

    <?php if (mysqli_num_rows($customers) > 0): ?>
    <div class="table-wrap">
      <table class="data" id="custTable">
        <thead>
          <tr><th>Customer</th><th>Mobile</th><th>GSTIN</th><th>State / City</th><th class="right">Invoices</th><th></th></tr>
        </thead>
        <tbody>
          <?php while ($c = mysqli_fetch_assoc($customers)): ?>
          <tr data-search="<?php echo h(strtolower($c['name'] . ' ' . $c['mobile'] . ' ' . $c['gst_number'] . ' ' . ($c['city'] ?? ''))); ?>">
            <td>
              <div class="person">
                <div class="avatar avatar-initials"><?php echo h(initials($c['name'])); ?></div>
                <div>
                  <div class="name"><?php echo h($c['name']); ?></div>
                  <div class="sub"><?php echo h($c['email'] ?: 'No e-mail'); ?></div>
                </div>
              </div>
            </td>
            <td class="num"><?php echo h($c['mobile']); ?></td>
            <td><?php echo $c['gst_number'] ? h($c['gst_number']) : '<span style="color:var(--muted)">—</span>'; ?></td>
            <td><?php echo h($c['state']); ?> <span class="chip grey no-dot"><?php echo h($c['state_code']); ?></span>
              <?php if (!empty($c['city'])): ?><div class="sub" style="margin-top:3px"><?php echo h($c['city']); ?></div><?php endif; ?>
            </td>
            <td class="right num"><?php echo intval($c['invoice_count']); ?></td>
            <td class="right">
              <div class="btn-row" style="justify-content:flex-end">
                <a href="customer.php?edit=<?php echo $c['id']; ?>" class="btn btn-secondary btn-sm">Edit</a>
                <form method="POST" onsubmit="return confirm('Remove <?php echo h(addslashes($c['name'])); ?>?')">
                  <input type="hidden" name="customer_id" value="<?php echo $c['id']; ?>">
                  <button type="submit" name="delete_customer" class="btn btn-danger btn-sm">Remove</button>
                </form>
              </div>
            </td>
          </tr>
          <?php endwhile; ?>
        </tbody>
      </table>
    </div>
    <?php else: ?>
      <div class="empty"><span class="big">👥</span>No customers yet. Add one on the left to start billing.</div>
    <?php endif; ?>
  </div>
</div>

<style>
  @media (max-width: 980px) { .cust-layout { grid-template-columns: 1fr !important; } }
</style>

<script>
function fillCode(sel) {
  const code = sel.options[sel.selectedIndex].dataset.code;
  if (code) document.getElementById('sc').value = code;
}
function filterRows() {
  const q = document.getElementById('q').value.toLowerCase();
  document.querySelectorAll('#custTable tbody tr').forEach(r => {
    r.style.display = r.dataset.search.includes(q) ? '' : 'none';
  });
}
</script>

<?php page_end(); ?>
