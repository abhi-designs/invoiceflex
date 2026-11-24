<?php
/* ============================================================
   profile.php — company details, bank details, profile picture
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$message = $error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_profile'])) {
    $name   = trim($_POST['company_name']);
    $gst    = strtoupper(trim($_POST['gst_number']));
    $pan    = strtoupper(trim($_POST['pan_number']));
    $state  = trim($_POST['state']);
    $city   = trim($_POST['city']);
    $addr   = trim($_POST['address']);
    $phone  = trim($_POST['phone']);
    $email  = trim($_POST['email']);
    $bank   = trim($_POST['bank_name']);
    $acc    = trim($_POST['account_no']);
    $ifsc   = strtoupper(trim($_POST['ifsc_code']));
    $branch = trim($_POST['branch_name']);

    if ($gst !== '' && !preg_match("/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/", $gst)) {
        $error = "Check the GSTIN — it should look like 24AAAAA0000A1Z5.";
    } elseif ($pan !== '' && !preg_match("/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/", $pan)) {
        $error = "Check the PAN — it should look like ABCDE1234F.";
    } else {
        $picture = save_upload('profile_image');
        $logo    = save_upload('logo');

        $stmt = mysqli_prepare($conn, "UPDATE company SET company_name=?, gst_number=?, pan_number=?, state=?, city=?,
                    address=?, phone=?, email=?, bank_name=?, account_no=?, ifsc_code=?, branch_name=?
                    WHERE user_id=?");
        mysqli_stmt_bind_param($stmt, "ssssssssssssi", $name, $gst, $pan, $state, $city, $addr, $phone, $email,
                               $bank, $acc, $ifsc, $branch, $user_id);
        mysqli_stmt_execute($stmt);

        if ($picture !== '') {
            $s = mysqli_prepare($conn, "UPDATE company SET profile_image=? WHERE user_id=?");
            mysqli_stmt_bind_param($s, "si", $picture, $user_id);
            mysqli_stmt_execute($s);
        }
        if ($logo !== '') {
            $s = mysqli_prepare($conn, "UPDATE company SET logo=? WHERE user_id=?");
            mysqli_stmt_bind_param($s, "si", $logo, $user_id);
            mysqli_stmt_execute($s);
        }

        $company = get_company($conn, $user_id);
        $message = "Profile saved.";
    }
}

if (isset($_POST['remove_picture'])) {
    mysqli_query($conn, "UPDATE company SET profile_image=NULL WHERE user_id=$user_id");
    $company = get_company($conn, $user_id);
    $message = "Profile picture removed.";
}

$avatar  = avatar_src($company);
$limits  = plan_limits($user['membership_plan'] ?? 'Free');
$state   = $user['state'];

require_once __DIR__ . '/partials/layout.php';
page_start('profile', 'Company profile', [
    'sub'     => 'Everything here prints on your invoices',
    'company' => $company, 'user' => $user,
]);
?>

<?php if ($message): ?><div class="notice ok"><?php echo h($message); ?></div><?php endif; ?>
<?php if ($error): ?><div class="notice err"><?php echo h($error); ?></div><?php endif; ?>

<div class="card">
  <div class="avatar-frame">
    <?php if ($avatar): ?>
      <img id="preview" src="<?php echo h($avatar); ?>?v=<?php echo time(); ?>" alt="" class="avatar avatar-xl">
    <?php else: ?>
      <div id="preview" class="avatar avatar-xl avatar-initials"><?php echo h(initials($company['company_name'] ?? '')); ?></div>
    <?php endif; ?>
    <div style="flex:1">
      <h3><?php echo h($company['company_name'] ?? ''); ?></h3>
      <div style="color:var(--muted);font-size:13.5px;margin-top:2px">
        <?php echo h($user['email']); ?> · <?php echo h($limits['label']); ?> plan · <?php echo h($state['note']); ?>
      </div>
      <?php if (!empty($company['profile_image'])): ?>
        <form method="POST" style="margin-top:10px">
          <button name="remove_picture" class="btn btn-secondary btn-sm">Remove picture</button>
        </form>
      <?php endif; ?>
    </div>
  </div>

  <form method="POST" enctype="multipart/form-data">
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="pic">Profile picture</label>
        <input id="pic" type="file" name="profile_image" accept="image/*" onchange="preview(this)">
        <div class="help">Shown as a round photo in the sidebar and on your profile.</div>
      </div>
      <div class="field">
        <label class="field-label" for="lg">Invoice logo</label>
        <input id="lg" type="file" name="logo" accept="image/*">
        <div class="help">Printed at the top of every bill. Leave empty to reuse the picture.</div>
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="cn">Company name</label>
      <input id="cn" type="text" name="company_name" value="<?php echo h($company['company_name'] ?? ''); ?>" required>
    </div>

    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="gs">GSTIN</label>
        <input id="gs" type="text" name="gst_number" maxlength="15" value="<?php echo h($company['gst_number'] ?? ''); ?>">
      </div>
      <div class="field">
        <label class="field-label" for="pn">PAN</label>
        <input id="pn" type="text" name="pan_number" maxlength="10" value="<?php echo h($company['pan_number'] ?? ''); ?>">
      </div>
    </div>

    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="st">Home state</label>
        <select id="st" name="state">
          <?php foreach (['Gujarat','Maharashtra','Rajasthan','Delhi','Madhya Pradesh','Karnataka','Daman & Diu','Other'] as $s): ?>
            <option value="<?php echo $s; ?>" <?php echo (($company['state'] ?? 'Gujarat') === $s) ? 'selected' : ''; ?>><?php echo $s; ?></option>
          <?php endforeach; ?>
        </select>
        <div class="help">Decides whether a bill carries CGST + SGST or IGST.</div>
      </div>
      <div class="field">
        <label class="field-label" for="cty">City</label>
        <input id="cty" type="text" name="city" placeholder="e.g. Vapi" value="<?php echo h($company['city'] ?? ''); ?>">
      </div>
    </div>

    <div class="field">
      <label class="field-label" for="ph">Phone</label>
      <input id="ph" type="text" name="phone" value="<?php echo h($company['phone'] ?? ''); ?>">
    </div>

    <div class="field">
      <label class="field-label" for="em">E-mail on the invoice</label>
      <input id="em" type="email" name="email" value="<?php echo h($company['email'] ?? ''); ?>">
    </div>

    <div class="field">
      <label class="field-label" for="ad">Address</label>
      <textarea id="ad" name="address" rows="3"><?php echo h($company['address'] ?? ''); ?></textarea>
    </div>

    <div class="section-title" style="margin-left:0">Bank details</div>
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="bn">Bank</label>
        <input id="bn" type="text" name="bank_name" value="<?php echo h($company['bank_name'] ?? ''); ?>">
      </div>
      <div class="field">
        <label class="field-label" for="an">Account number</label>
        <input id="an" type="text" name="account_no" value="<?php echo h($company['account_no'] ?? ''); ?>">
      </div>
    </div>
    <div class="grid-2">
      <div class="field">
        <label class="field-label" for="if">IFSC</label>
        <input id="if" type="text" name="ifsc_code" value="<?php echo h($company['ifsc_code'] ?? ''); ?>">
      </div>
      <div class="field">
        <label class="field-label" for="br">Branch</label>
        <input id="br" type="text" name="branch_name" value="<?php echo h($company['branch_name'] ?? ''); ?>">
      </div>
    </div>

    <button type="submit" name="save_profile" class="btn btn-primary">Save profile</button>
  </form>
</div>

<script>
function preview(input) {
  if (!input.files || !input.files[0]) return;
  const url = URL.createObjectURL(input.files[0]);
  document.getElementById('preview').outerHTML =
    '<img id="preview" src="' + url + '" alt="" class="avatar avatar-xl">';
}
</script>

<?php page_end(); ?>
