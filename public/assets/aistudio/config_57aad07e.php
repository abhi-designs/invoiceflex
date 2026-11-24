<?php
/* ============================================================
   Invoice Flex — config.php
   Single place for the DB connection, plan limits and the
   shared helper functions every page uses.
   Include this at the very top of every PHP page.
   ============================================================ */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

date_default_timezone_set('Asia/Kolkata');

/* ---------- Database ---------- */
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'invoice_db');

$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (!$conn) {
    die("Database connection failed: " . mysqli_connect_error());
}
mysqli_set_charset($conn, 'utf8mb4');

/* The e-mail that is always treated as the master admin account. */
define('ADMIN_EMAIL', 'abhipan0011@gmail.com');

/* ------------------------------------------------------------
   PLAN LIMITS — the paid-plan restrictions.
   Change the numbers here and the whole app follows.
   null = unlimited.
   ------------------------------------------------------------ */
$PLAN_LIMITS = [
    'Free' => [
        'label'             => 'Free',
        'invoices_daily'    => 4,
        'customers'         => 10,
        'watermark'         => true,
        'price'             => 0,
        'blurb'             => '4 invoices a day, 10 customers, watermark on every bill',
        'tagline'           => 'Try it out',
        'features'          => ['4 invoices a day', '10 customers', 'Invoice Flex watermark on every PDF'],
    ],
    'Pro' => [
        'label'             => 'Pro',
        'invoices_daily'    => 10,
        'customers'         => 200,
        'watermark'         => true,
        'price'             => 499,
        'blurb'             => '10 invoices a day, 200 customers, watermark on every bill',
        'tagline'           => 'For growing shops',
        'features'          => ['10 invoices a day', '200 customers', 'Invoice Flex watermark on every PDF', 'Payment tracking'],
    ],
    'Enterprise' => [
        'label'             => 'Enterprise',
        'invoices_daily'    => 20,
        'customers'         => null,
        'watermark'         => false,
        'price'             => 1499,
        'blurb'             => '20 invoices a day, unlimited customers, no watermark',
        'tagline'           => 'For full-time billing',
        'features'          => ['20 invoices a day', 'Unlimited customers', 'No watermark on invoices', 'Payment tracking'],
    ],
];

/* ------------------------------------------------------------
   Schema check — runs once per session.
   Adds the payments table and the newer columns so an existing
   invoice_db keeps all its data and still gains the new
   features. Nothing is dropped.
   ------------------------------------------------------------ */
/* Adds a column only when it is missing. Works on MySQL and MariaDB. */
function ensure_column($conn, $table, $column, $definition)
{
    $t = mysqli_real_escape_string($conn, $table);
    $c = mysqli_real_escape_string($conn, $column);
    $res = mysqli_query($conn, "SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$t' AND COLUMN_NAME = '$c'");
    $row = $res ? mysqli_fetch_assoc($res) : null;
    if ($row && intval($row['n']) === 0) {
        mysqli_query($conn, "ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

function ensure_schema($conn)
{
    if (!empty($_SESSION['schema_checked'])) {
        return;
    }

    mysqli_query($conn, "
        CREATE TABLE IF NOT EXISTS payments (
            id INT(11) NOT NULL AUTO_INCREMENT,
            user_id INT(11) NOT NULL,
            invoice_id INT(11) NOT NULL,
            customer_id INT(11) DEFAULT NULL,
            amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            paid_on DATE NOT NULL,
            method VARCHAR(30) DEFAULT 'Cash',
            note VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_user (user_id),
            KEY idx_invoice (invoice_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    /* Round profile picture for the company */
    ensure_column($conn, 'company', 'profile_image', "VARCHAR(255) DEFAULT NULL");
    /* Home state, used to decide CGST+SGST versus IGST */
    ensure_column($conn, 'company', 'state', "VARCHAR(100) DEFAULT NULL");
    /* Home city, shown next to the state on the profile */
    ensure_column($conn, 'company', 'city', "VARCHAR(100) DEFAULT NULL");
    /* Payment terms printed on the bill */
    ensure_column($conn, 'invoices', 'payment_terms', "VARCHAR(120) DEFAULT NULL");
    /* Customer's city, shown next to state/state code */
    ensure_column($conn, 'customers', 'city', "VARCHAR(100) DEFAULT NULL");
    /* Set once a user has been through the plan picker, so it is
       only shown automatically straight after setup. */
    ensure_column($conn, 'users', 'plan_chosen', "TINYINT(1) NOT NULL DEFAULT 0");

    $_SESSION['schema_checked'] = 1;
}
ensure_schema($conn);

/* ------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------ */
function h($v) { return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }

function money($n) { return '₹' . number_format((float)$n, 2); }

function initials($text)
{
    $text = trim((string)$text);
    if ($text === '') return '?';
    $parts = preg_split('/\s+/', $text);
    $out = '';
    foreach ($parts as $p) {
        $p = preg_replace('/[^A-Za-z0-9]/', '', $p);
        if ($p !== '') $out .= strtoupper($p[0]);
        if (strlen($out) >= 2) break;
    }
    return $out !== '' ? $out : '?';
}

/* ------------------------------------------------------------
   MEMBERSHIP
   The status is never typed in by hand any more. It is worked
   out from the expiry date every time it is needed, so the
   moment an admin extends a plan the account is active again.
   ------------------------------------------------------------ */
function membership_state($user)
{
    $expiry = $user['membership_expiry'] ?? null;
    $plan   = $user['membership_plan'] ?? 'Free';

    if (empty($expiry) || $expiry === '0000-00-00') {
        // No end date set — the account simply stays on.
        return ['status' => 'active', 'days' => null, 'expiry' => null, 'plan' => $plan, 'note' => 'No expiry set'];
    }

    $today = new DateTime(date('Y-m-d'));
    $end   = new DateTime($expiry);
    $days  = (int)$today->diff($end)->format('%r%a');

    if ($days < 0) {
        $n = abs($days);
        return ['status' => 'expired', 'days' => $days, 'expiry' => $expiry, 'plan' => $plan,
                'note' => 'Ended ' . $n . ' day' . ($n === 1 ? '' : 's') . ' ago'];
    }
    if ($days === 0) {
        return ['status' => 'active', 'days' => 0, 'expiry' => $expiry, 'plan' => $plan, 'note' => 'Ends today'];
    }
    return ['status' => 'active', 'days' => $days, 'expiry' => $expiry, 'plan' => $plan,
            'note' => 'Renews in ' . $days . ' day' . ($days === 1 ? '' : 's')];
}

/* Self-service plan pick/switch (Free/Pro/Enterprise), used by plans.php.
   Free never expires. Pro/Enterprise start a fresh 1-month term from
   today unless the account already has time left on the same or a
   higher plan, in which case the existing end date is kept. */
function choose_plan($conn, $user_id, $plan)
{
    global $PLAN_LIMITS;
    $user_id = intval($user_id);
    if (!isset($PLAN_LIMITS[$plan])) return false;

    if ($plan === 'Free') {
        mysqli_query($conn, "UPDATE users SET membership_plan='Free', membership_expiry=NULL,
            membership_status='active', plan_chosen=1 WHERE id=$user_id AND is_admin=0");
        return true;
    }

    $row = mysqli_fetch_assoc(mysqli_query($conn, "SELECT membership_expiry FROM users WHERE id=$user_id"));
    $keep = !empty($row['membership_expiry']) && $row['membership_expiry'] !== '0000-00-00'
            && $row['membership_expiry'] >= date('Y-m-d');
    $expiry = $keep ? $row['membership_expiry'] : date('Y-m-d', strtotime('+1 month'));

    $plan_sql = mysqli_real_escape_string($conn, $plan);
    mysqli_query($conn, "UPDATE users SET membership_plan='$plan_sql', membership_expiry='$expiry',
        membership_status='active', plan_chosen=1 WHERE id=$user_id AND is_admin=0");
    return true;
}

/* Keeps the old membership_status column in step with the dates
   so older queries and reports still read correctly. */
function sync_membership_status($conn, $user)
{
    $state = membership_state($user);
    if (($user['membership_status'] ?? '') !== $state['status']) {
        $id = intval($user['id']);
        $s  = mysqli_real_escape_string($conn, $state['status']);
        mysqli_query($conn, "UPDATE users SET membership_status='$s' WHERE id=$id");
    }
    return $state;
}

function sync_all_memberships($conn)
{
    mysqli_query($conn, "UPDATE users SET membership_status='expired'
        WHERE is_admin = 0 AND membership_expiry IS NOT NULL
          AND membership_expiry <> '0000-00-00' AND membership_expiry < CURDATE()");
    mysqli_query($conn, "UPDATE users SET membership_status='active'
        WHERE is_admin = 0 AND (membership_expiry IS NULL OR membership_expiry = '0000-00-00'
              OR membership_expiry >= CURDATE())");
}

/* ------------------------------------------------------------
   GUARDS
   ------------------------------------------------------------ */
function fetch_user($conn, $id)
{
    $id = intval($id);
    $res = mysqli_query($conn, "SELECT * FROM users WHERE id = $id");
    return $res ? mysqli_fetch_assoc($res) : null;
}

/* Use on every page a normal (non-admin) user can open. */
function require_user($conn)
{
    if (!isset($_SESSION['user_id'])) {
        header("Location: index.php");
        exit();
    }
    if (!empty($_SESSION['is_admin'])) {
        header("Location: admin_dashboard.php");
        exit();
    }

    $user = fetch_user($conn, $_SESSION['user_id']);
    if (!$user) {
        session_destroy();
        header("Location: index.php");
        exit();
    }

    $state = sync_membership_status($conn, $user);
    if ($state['status'] !== 'active') {
        $_SESSION = [];
        session_destroy();
        header("Location: index.php?notice=expired");
        exit();
    }

    $user['state'] = $state;
    return $user;
}

function require_admin($conn)
{
    if (!isset($_SESSION['user_id'])) {
        header("Location: index.php");
        exit();
    }
    $user = fetch_user($conn, $_SESSION['user_id']);
    if (!$user || intval($user['is_admin']) !== 1) {
        header("Location: index.php");
        exit();
    }
    return $user;
}

/* ------------------------------------------------------------
   COMPANY + AVATAR
   ------------------------------------------------------------ */
function get_company($conn, $user_id)
{
    $user_id = intval($user_id);
    $res = mysqli_query($conn, "SELECT * FROM company WHERE user_id = $user_id");
    return ($res ? mysqli_fetch_assoc($res) : null) ?: [];
}

/* Fields that must be filled in before the firm can bill anyone —
   covers identity, address and the bank details that print on
   every invoice. Returns a list of missing field labels; empty
   means the profile is ready to bill from. */
function profile_missing_fields($company)
{
    $required = [
        'company_name' => 'Company name',
        'gst_number'   => 'GSTIN',
        'pan_number'   => 'PAN',
        'state'        => 'Home state',
        'city'         => 'City',
        'address'      => 'Billing address',
        'phone'        => 'Phone',
        'email'        => 'E-mail on the invoice',
        'bank_name'    => 'Bank name',
        'account_no'   => 'Account number',
        'ifsc_code'    => 'IFSC code',
        'branch_name'  => 'Branch name',
    ];
    $missing = [];
    foreach ($required as $key => $label) {
        if (trim((string)($company[$key] ?? '')) === '') $missing[] = $label;
    }
    return $missing;
}

/* Round profile picture, falling back to the logo. Returns '' if
   neither has been uploaded — the page then shows initials. */
function avatar_src($company)
{
    foreach (['profile_image', 'logo'] as $key) {
        $file = $company[$key] ?? '';
        if (!empty($file)) {
            if (file_exists(__DIR__ . '/uploads/' . $file)) return 'uploads/' . rawurlencode($file);
            if (file_exists(__DIR__ . '/' . $file)) return $file;
        }
    }
    return '';
}

function logo_src($company)
{
    $file = $company['logo'] ?? '';
    if (!empty($file) && file_exists(__DIR__ . '/uploads/' . $file)) return 'uploads/' . rawurlencode($file);
    return avatar_src($company);
}

/* Saves an uploaded image and returns the stored file name, or ''. */
function save_upload($field)
{
    if (empty($_FILES[$field]['name']) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return '';
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    $ext = strtolower(pathinfo($_FILES[$field]['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowed, true)) return '';
    if (!is_dir(__DIR__ . '/uploads')) mkdir(__DIR__ . '/uploads', 0777, true);
    $name = time() . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', basename($_FILES[$field]['name']));
    return move_uploaded_file($_FILES[$field]['tmp_name'], __DIR__ . '/uploads/' . $name) ? $name : '';
}

/* ------------------------------------------------------------
   PLAN USAGE — the limits actually being enforced
   ------------------------------------------------------------ */
function plan_limits($plan)
{
    global $PLAN_LIMITS;
    return $PLAN_LIMITS[$plan] ?? $PLAN_LIMITS['Free'];
}

function invoices_today($conn, $user_id)
{
    $user_id = intval($user_id);
    $row = mysqli_fetch_assoc(mysqli_query($conn,
        "SELECT COUNT(id) AS c FROM invoices
         WHERE user_id = $user_id AND invoice_date = CURDATE()"));
    return intval($row['c'] ?? 0);
}

function customer_count($conn, $user_id)
{
    $user_id = intval($user_id);
    $row = mysqli_fetch_assoc(mysqli_query($conn, "SELECT COUNT(id) AS c FROM customers WHERE user_id = $user_id"));
    return intval($row['c'] ?? 0);
}

/* Returns [allowed(bool), used, limit, message] — limit resets every day. */
function invoice_quota($conn, $user)
{
    $limits = plan_limits($user['membership_plan'] ?? 'Free');
    $cap    = $limits['invoices_daily'];
    $used   = invoices_today($conn, $user['id']);
    if ($cap === null) return [true, $used, null, ''];
    $left = $cap - $used;
    return [
        $left > 0, $used, $cap,
        $left > 0
            ? "$left of $cap invoices left today on the {$limits['label']} plan."
            : "You have used all $cap invoices today on the {$limits['label']} plan. Try again tomorrow, or move to a bigger plan."
    ];
}

/* Whether invoices on this plan carry the Invoice Flex watermark. */
function has_watermark($plan)
{
    return (bool) (plan_limits($plan)['watermark'] ?? true);
}

function customer_quota($conn, $user)
{
    $limits = plan_limits($user['membership_plan'] ?? 'Free');
    $cap    = $limits['customers'];
    $used   = customer_count($conn, $user['id']);
    if ($cap === null) return [true, $used, null, ''];
    $left = $cap - $used;
    return [
        $left > 0, $used, $cap,
        $left > 0
            ? "$left of $cap customer slots left on the {$limits['label']} plan."
            : "You have reached the $cap customer limit of the {$limits['label']} plan."
    ];
}

/* ------------------------------------------------------------
   PAYMENTS
   Every invoice's payment position is worked out from what has
   actually been received against it.
   ------------------------------------------------------------ */
function paid_total($conn, $invoice_id)
{
    $invoice_id = intval($invoice_id);
    $row = mysqli_fetch_assoc(mysqli_query($conn,
        "SELECT COALESCE(SUM(amount),0) AS p FROM payments WHERE invoice_id = $invoice_id"));
    return round(floatval($row['p'] ?? 0), 2);
}

/* $invoice needs total_amount, due_date. $paid is the amount received. */
function payment_state($invoice, $paid)
{
    $total = round(floatval($invoice['total_amount'] ?? 0), 2);
    $paid  = round(floatval($paid), 2);
    $bal   = round($total - $paid, 2);
    $pct   = $total > 0 ? min(100, round(($paid / $total) * 100)) : ($paid > 0 ? 100 : 0);

    $overdue = !empty($invoice['due_date'])
        && $invoice['due_date'] !== '0000-00-00'
        && $invoice['due_date'] < date('Y-m-d')
        && $bal > 0.01;

    if ($total > 0 && $bal <= 0.01) {
        $key = 'paid';   $label = 'Paid';                 $tone = 'green';
    } elseif ($paid <= 0.01) {
        $key = 'unpaid'; $label = $overdue ? 'Overdue' : 'Payment pending'; $tone = $overdue ? 'red' : 'amber';
    } elseif ($pct >= 45 && $pct <= 55) {
        $key = 'advance'; $label = $pct . '% advance';    $tone = 'violet';
    } else {
        $key = 'partial'; $label = $pct . '% received';   $tone = 'blue';
    }

    return [
        'key' => $key, 'label' => $label, 'tone' => $tone,
        'total' => $total, 'paid' => $paid, 'balance' => max(0, $bal),
        'percent' => $pct, 'overdue' => $overdue,
    ];
}

/* Financial-year aware invoice number, e.g. AE004/2026-2027 */
function financial_year($date = null)
{
    $ts = $date ? strtotime($date) : time();
    $y = (int)date('Y', $ts);
    $m = (int)date('n', $ts);
    return ($m >= 4) ? [$y . '-' . ($y + 1), "$y-04-01", ($y + 1) . "-03-31"]
                     : [($y - 1) . '-' . $y, ($y - 1) . "-04-01", "$y-03-31"];
}

function next_invoice_no($conn, $user_id, $company_name)
{
    $prefix = '';
    foreach (preg_split('/\s+/', trim((string)$company_name)) as $word) {
        $word = preg_replace('/[^A-Za-z]/', '', $word);
        if ($word !== '') $prefix .= strtoupper($word[0]);
    }
    if ($prefix === '') $prefix = 'INV';
    $prefix = substr($prefix, 0, 3);

    list($fy_label, $fy_start, $fy_end) = financial_year();

    $stmt = mysqli_prepare($conn, "SELECT invoice_no FROM invoices
        WHERE user_id = ? AND invoice_no LIKE ? AND invoice_date BETWEEN ? AND ?");
    $like = $prefix . '%/' . $fy_label;
    $uid  = intval($user_id);
    mysqli_stmt_bind_param($stmt, "isss", $uid, $like, $fy_start, $fy_end);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);

    $max = 0;
    while ($row = mysqli_fetch_assoc($res)) {
        if (preg_match('/(\d+)/', $row['invoice_no'], $m)) $max = max($max, intval($m[1]));
    }
    mysqli_stmt_close($stmt);

    return $prefix . str_pad($max + 1, 3, '0', STR_PAD_LEFT) . '/' . $fy_label;
}

function display_invoice_no($invoice)
{
    if (!empty($invoice['invoice_no'])) return $invoice['invoice_no'];
    list($fy) = financial_year($invoice['invoice_date'] ?? null);
    return 'INV' . str_pad(intval($invoice['id']), 3, '0', STR_PAD_LEFT) . '/' . $fy;
}
