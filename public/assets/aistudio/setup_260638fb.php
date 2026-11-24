<?php
/* ============================================================
   setup.php — first-run company details
   ============================================================ */
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) { header("Location: index.php"); exit(); }
if (!empty($_SESSION['is_admin'])) { header("Location: admin_dashboard.php"); exit(); }

$user_id = intval($_SESSION['user_id']);
$error = '';

if (mysqli_num_rows(mysqli_query($conn, "SELECT id FROM company WHERE user_id=$user_id")) > 0) {
    header("Location: dashboard.php"); exit();
}

if (isset($_POST['save_setup'])) {
    $name  = trim($_POST['company_name']);
    $gst   = strtoupper(trim($_POST['gst_number']));
    $pan   = strtoupper(trim($_POST['pan_number']));
    $addr  = trim($_POST['address']);
    $state = trim($_POST['state'] ?? 'Gujarat');
    $city  = trim($_POST['city'] ?? '');

    if (!preg_match("/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/", $gst)) {
        $error = "Check the GSTIN — it should look like 24AAAAA0000A1Z5.";
    } elseif (!preg_match("/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/", $pan)) {
        $error = "Check the PAN — it should look like ABCDE1234F.";
    } else {
        $picture = save_upload('profile_image');
        $stmt = mysqli_prepare($conn, "INSERT INTO company
            (user_id, company_name, gst_number, pan_number, address, state, city, logo, profile_image)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, "issssssss", $user_id, $name, $gst, $pan, $addr, $state, $city, $picture, $picture);
        if (mysqli_stmt_execute($stmt)) { header("Location: plans.php?welcome=1"); exit(); }
        $error = "The details could not be saved: " . mysqli_error($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Company setup · Invoice Flex</title>
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/app.css'); ?>">
</head>
<body class="auth">
<div class="auth-card wide">
  <h1>Set up your company</h1>
  <p class="lede">These details print on every tax invoice. You can change them later.</p>

  <?php if ($error): ?><div class="notice err"><?php echo h($error); ?></div><?php endif; ?>

  <form method="POST" action="setup.php" enctype="multipart/form-data">
    <div class="avatar-frame">
      <div id="preview" class="avatar avatar-xl avatar-initials">AB</div>
      <div style="flex:1">
        <label class="field-label" for="pic">Profile picture</label>
        <input id="pic" type="file" name="profile_image" accept="image/*" onchange="showPreview(this)">
        <div class="help">Shown as a round photo across the app and on your invoices.</div>
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="cn">Company or firm name</label>
      <input id="cn" type="text" name="company_name" placeholder="Anuyog Engineering" required
             oninput="document.getElementById('preview').textContent = (this.value.trim()[0]||'A').toUpperCase()">
    </div>

    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="gst">GSTIN</label>
        <input id="gst" type="text" name="gst_number" placeholder="24AAAAA0000A1Z5" maxlength="15" required>
      </div>
      <div class="field">
        <label class="field-label" for="pan">PAN</label>
        <input id="pan" type="text" name="pan_number" placeholder="ABCDE1234F" maxlength="10" required>
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="st">State</label>
        <select id="st" name="state">
          <?php foreach (['Gujarat','Maharashtra','Rajasthan','Delhi','Madhya Pradesh','Karnataka','Daman & Diu','Other'] as $s): ?>
            <option value="<?php echo $s; ?>"><?php echo $s; ?></option>
          <?php endforeach; ?>
        </select>
        <div class="help">Decides whether a bill carries CGST + SGST or IGST.</div>
      </div>
      <div class="field">
        <label class="field-label" for="cty">City</label>
        <input id="cty" type="text" name="city" placeholder="e.g. Vapi">
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="ad">Business address</label>
      <textarea id="ad" name="address" rows="3" placeholder="Workshop or office address" required></textarea>
    </div>

    <button type="submit" name="save_setup" class="btn btn-primary btn-block">Save and open dashboard</button>
  </form>
</div>

<script>
function showPreview(input) {
  if (!input.files || !input.files[0]) return;
  const url = URL.createObjectURL(input.files[0]);
  const box = document.getElementById('preview');
  box.outerHTML = '<img id="preview" src="' + url + '" alt="" class="avatar avatar-xl">';
}
</script>
</body>
</html>
