<?php
/* ============================================================
   index.php — sign in / sign up
   Plain e-mail + password for everyone (no OTP). An e-mail that
   isn't registered is sent straight to the sign-up form; a known
   e-mail with the wrong password is told so and asked to try again.
   ============================================================ */
require_once __DIR__ . '/config.php';

if (isset($_GET['logout'])) { header("Location: logout.php"); exit(); }

sync_all_memberships($conn);

$message   = '';
$mode      = (isset($_GET['mode']) && $_GET['mode'] === 'signup') ? 'signup' : 'login';
$old_email = '';

if (isset($_GET['notice']) && $_GET['notice'] === 'expired') {
    $message = "That plan has ended. Ask the admin to extend it, then sign in again.";
}

/* Already signed in? Send them where they belong. */
if (isset($_SESSION['user_id'])) {
    $u = fetch_user($conn, $_SESSION['user_id']);
    if ($u && intval($u['is_admin']) === 1) {
        header("Location: admin_dashboard.php"); exit();
    }
    if ($u) {
        $state = sync_membership_status($conn, $u);
        if ($state['status'] === 'active') {
            $has_company = mysqli_num_rows(mysqli_query($conn, "SELECT id FROM company WHERE user_id=" . intval($u['id']))) > 0;
            header("Location: " . ($has_company ? "dashboard.php" : "setup.php"));
            exit();
        }
        $_SESSION = [];
        $message = "That plan has ended. Ask the admin to extend it, then sign in again.";
    }
}

function password_matches($stored, $entered)
{
    return $stored === $entered || password_verify($entered, (string)$stored);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    /* ---------- Create account ---------- */
    if (isset($_POST['submit_signup'])) {
        $email     = mysqli_real_escape_string($conn, strtolower(trim($_POST['email'])));
        $pass      = trim($_POST['password']);
        $confirm   = trim($_POST['confirm_password'] ?? '');
        $old_email = $email;
        $mode      = 'signup';

        if (mysqli_num_rows(mysqli_query($conn, "SELECT id FROM users WHERE email='$email'")) > 0) {
            $message = "That e-mail already has an account. Sign in instead.";
            $mode = 'login';
        } elseif (strlen($pass) < 4) {
            $message = "Use a password of at least 4 characters.";
        } elseif ($pass !== $confirm) {
            $message = "Those passwords don't match — re-enter them.";
        } else {
            $admin = ($email === strtolower(ADMIN_EMAIL)) ? 1 : 0;
            $pass_esc = mysqli_real_escape_string($conn, $pass);
            if (mysqli_query($conn, "INSERT INTO users (email, password, is_admin, membership_plan, membership_status)
                                     VALUES ('$email', '$pass_esc', $admin, 'Free', 'active')")) {
                $_SESSION['user_id']  = mysqli_insert_id($conn);
                $_SESSION['email']    = $email;
                $_SESSION['is_admin'] = $admin;
                header("Location: " . ($admin ? "admin_dashboard.php" : "setup.php"));
                exit();
            }
            $message = "The account could not be created. Try again.";
        }
    }

    /* ---------- Sign in ---------- */
    elseif (isset($_POST['submit_login'])) {
        $email     = mysqli_real_escape_string($conn, strtolower(trim($_POST['email'])));
        $pass      = trim($_POST['password']);
        $old_email = $email;

        $res = mysqli_query($conn, "SELECT * FROM users WHERE email='$email'");
        $u = ($res && mysqli_num_rows($res) > 0) ? mysqli_fetch_assoc($res) : null;

        if (!$u) {
            /* Not registered — send them straight to sign up, e-mail kept. */
            header("Location: index.php?mode=signup&email=" . urlencode($email));
            exit();
        } elseif (!password_matches($u['password'], $pass)) {
            $message = "That password is wrong — re-enter it.";
        } else {
            $state = sync_membership_status($conn, $u);
            if ($state['status'] !== 'active') {
                $message = "That plan ended on " . date('d M Y', strtotime($state['expiry'])) . ". Ask the admin to extend it.";
            } else {
                $_SESSION['user_id']  = $u['id'];
                $_SESSION['email']    = $u['email'];
                $_SESSION['is_admin'] = intval($u['is_admin']);
                if (intval($u['is_admin']) === 1) { header("Location: admin_dashboard.php"); exit(); }
                $has_company = mysqli_num_rows(mysqli_query($conn, "SELECT id FROM company WHERE user_id=" . intval($u['id']))) > 0;
                header("Location: " . ($has_company ? "dashboard.php" : "setup.php"));
                exit();
            }
        }
    }
}

if ($old_email === '' && isset($_GET['email'])) $old_email = strtolower(trim($_GET['email']));
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#F1F2F7">
<title><?php echo $mode === 'signup' ? 'Create account' : 'Sign in'; ?> · Invoice Flex</title>
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/app.css'); ?>">
</head>
<body class="auth">

<div class="auth-card">
  <img src="assets/images/LOGO.png" alt="" class="auth-logo">
  <h1>Invoice Flex</h1>
  <p class="lede"><?php echo $mode === 'signup' ? 'Set up billing for your firm' : 'GST billing for your workshop'; ?></p>

  <?php if ($message): ?>
    <div class="notice err"><?php echo h($message); ?></div>
  <?php endif; ?>

  <?php if ($mode === 'signup'): ?>
    <?php if (isset($_GET['email']) && !$message): ?>
      <div class="notice info">No account uses that e-mail yet — create one below to get started.</div>
    <?php endif; ?>
    <form method="POST" action="index.php?mode=signup">
      <div class="field">
        <label class="field-label" for="su-email">E-mail</label>
        <input id="su-email" type="email" name="email" placeholder="name@company.com"
               value="<?php echo h($old_email); ?>" required>
      </div>
      <div class="field">
        <label class="field-label" for="su-pass">Password</label>
        <input id="su-pass" type="password" name="password" placeholder="At least 4 characters" required>
      </div>
      <div class="field">
        <label class="field-label" for="su-pass2">Re-enter password</label>
        <input id="su-pass2" type="password" name="confirm_password" placeholder="Same password again" required>
      </div>
      <button type="submit" name="submit_signup" class="btn btn-primary btn-block">Create account</button>
    </form>
    <div class="auth-foot">Already registered? <a href="index.php?mode=login">Sign in</a></div>

  <?php else: ?>
    <form method="POST" action="index.php?mode=login">
      <div class="field">
        <label class="field-label" for="li-email">E-mail</label>
        <input id="li-email" type="email" name="email" placeholder="name@company.com"
               value="<?php echo h($old_email); ?>" required autofocus>
      </div>
      <div class="field">
        <label class="field-label" for="li-pass">Password</label>
        <input id="li-pass" type="password" name="password" required>
      </div>
      <button type="submit" name="submit_login" class="btn btn-primary btn-block">Sign in</button>
    </form>
    <div class="auth-foot">New here? <a href="index.php?mode=signup">Create an account</a></div>
  <?php endif; ?>
</div>

</body>
</html>
