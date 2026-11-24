<?php
/* ============================================================
   plans.php — choose or switch a membership plan
   Shown automatically once, right after setup.php, for a brand
   new account (?welcome=1). Reachable any time after that from
   the "Plan" tab in the sidebar so an existing user can switch
   plans themselves, the way a music app lets you change tiers.
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);
$company = get_company($conn, $user_id);
if (!$company) { header("Location: setup.php"); exit(); }

$welcome    = isset($_GET['welcome']);
$current    = $user['membership_plan'] ?? 'Free';
$state      = $user['state'];
$message    = '';
$confirm    = $_GET['confirm'] ?? '';
if ($confirm && !isset($PLAN_LIMITS[$confirm])) $confirm = '';

/* Free needs no payment step — switch straight away. Pro/Enterprise
   route through the confirm screen below first, since real money is
   involved even in this demo flow. */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['choose_plan'])) {
    $picked = $_POST['plan'] ?? '';
    if ($picked !== 'Free' && !isset($_POST['pay_ref'])) {
        $message = "Confirm payment before switching to a paid plan.";
    } elseif (choose_plan($conn, $user_id, $picked)) {
        header("Location: plans.php?picked=1");
        exit();
    } else {
        $message = "That plan is not available.";
    }
}

require_once __DIR__ . '/partials/layout.php';
page_start('plans', $welcome ? 'Pick a plan' : 'Plan', [
    'sub'     => $welcome ? 'One last thing before your dashboard' : ('Currently on ' . $current . ' · ' . $state['note']),
    'company' => $company, 'user' => $user,
]);
?>

<?php if ($message): ?><div class="notice err"><?php echo h($message); ?></div><?php endif; ?>
<?php if (isset($_GET['picked'])): ?><div class="notice ok">You're on the <?php echo h($current); ?> plan now.</div><?php endif; ?>

<?php if ($confirm): $p = $PLAN_LIMITS[$confirm]; ?>

  <div class="card" style="max-width:440px;margin:0 auto">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:13px;color:var(--muted);font-weight:600">CONFIRM & PAY</div>
      <div style="font-size:24px;font-weight:800;margin-top:2px"><?php echo h($p['label']); ?> plan — ₹<?php echo number_format($p['price']); ?>/month</div>
    </div>
    <ul class="plan-features" style="margin-bottom:18px">
      <?php foreach ($p['features'] as $f): ?><li><?php echo h($f); ?></li><?php endforeach; ?>
    </ul>
    <form method="POST">
      <input type="hidden" name="plan" value="<?php echo h($confirm); ?>">
      <div class="field">
        <label class="field-label" for="upi">UPI ID or card number</label>
        <input id="upi" type="text" name="pay_ref" placeholder="name@bank or card number" required>
      </div>
      <div class="notice info" style="font-size:12.5px;margin-bottom:14px">
        This is a demo checkout — no real payment gateway is connected yet, so nothing is actually
        charged. Anything you type here just gets recorded as the payment reference.
      </div>
      <button type="submit" name="choose_plan" class="btn btn-primary btn-block">Pay ₹<?php echo number_format($p['price']); ?> &amp; activate</button>
    </form>
    <a href="plans.php" class="btn btn-ghost btn-block" style="margin-top:8px">Cancel</a>
  </div>

<?php else: ?>

<?php if ($welcome): ?>
<div class="notice info" style="margin-bottom:18px">
  Pick whichever fits how you bill today — you can switch any time from the <strong>Plan</strong> tab.
</div>
<?php endif; ?>

<div class="plan-grid">
  <?php foreach ($PLAN_LIMITS as $key => $p):
    $isCurrent = ($current === $key); ?>
    <div class="plan-card<?php echo $isCurrent ? ' is-current' : ''; ?><?php echo $key === 'Pro' ? ' is-popular' : ''; ?>">
      <?php if ($key === 'Pro'): ?><div class="plan-badge">Most popular</div><?php endif; ?>
      <div class="plan-name"><?php echo h($p['label']); ?></div>
      <div class="plan-tagline"><?php echo h($p['tagline']); ?></div>
      <div class="plan-price">
        <?php if ($p['price'] > 0): ?>
          <span class="amt">₹<?php echo number_format($p['price']); ?></span><span class="per">/month</span>
        <?php else: ?>
          <span class="amt">Free</span>
        <?php endif; ?>
      </div>
      <ul class="plan-features">
        <?php foreach ($p['features'] as $f): ?>
          <li><?php echo h($f); ?></li>
        <?php endforeach; ?>
      </ul>
      <?php if ($isCurrent): ?>
        <button type="button" class="btn btn-secondary is-disabled btn-block" disabled>Current plan</button>
      <?php elseif ($key === 'Free'): ?>
        <form method="POST">
          <input type="hidden" name="plan" value="Free">
          <button type="submit" name="choose_plan" class="btn btn-primary btn-block">Choose Free</button>
        </form>
      <?php else: ?>
        <a href="plans.php?confirm=<?php echo h($key); ?>" class="btn btn-primary btn-block">Choose <?php echo h($p['label']); ?></a>
      <?php endif; ?>
    </div>
  <?php endforeach; ?>
</div>

<p style="color:var(--muted);font-size:13px;max-width:70ch;margin-top:18px">
  Free and Pro invoices print with an "Invoice Flex" watermark; Enterprise removes it. Daily invoice limits reset
  at midnight. An admin can also extend or change your plan from their console at any time.
</p>

<?php endif; ?>


<style>
  .plan-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  @media (max-width:900px) { .plan-grid { grid-template-columns:1fr; } }
  .plan-card {
    position:relative; background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg);
    padding:24px 22px; box-shadow:var(--shadow-1); display:flex; flex-direction:column;
  }
  .plan-card.is-popular { border-color:var(--brand); box-shadow:0 0 0 2px var(--brand-soft), var(--shadow-2); }
  .plan-card.is-current { background:var(--surface-2); }
  .plan-badge {
    position:absolute; top:-11px; left:20px; background:var(--brand); color:#fff; font-size:11px;
    font-weight:700; padding:4px 10px; border-radius:20px; letter-spacing:.3px;
  }
  .plan-name { font-size:19px; font-weight:700; }
  .plan-tagline { color:var(--muted); font-size:13.5px; margin-top:2px; }
  .plan-price { margin:16px 0; }
  .plan-price .amt { font-size:30px; font-weight:800; letter-spacing:-.02em; }
  .plan-price .per { color:var(--muted); font-size:13px; }
  .plan-features { list-style:none; margin:0 0 20px; padding:0; flex:1; }
  .plan-features li { font-size:13.5px; color:var(--ink-2); padding:7px 0 7px 22px; position:relative; border-top:1px solid var(--line); }
  .plan-features li:first-child { border-top:none; }
  .plan-features li::before { content:"✓"; position:absolute; left:0; color:var(--green); font-weight:700; }
</style>

<?php page_end(); ?>
