<?php
/* ============================================================
   print-invoice.php — the printable / PDF tax invoice
   The bill layout itself is unchanged; the toolbar around it
   is new, and the payment position is printed under the total.
   ============================================================ */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);

if (!isset($_GET['id'])) { header("Location: invoices.php"); exit(); }
$invoice_id = intval($_GET['id']);

$company = get_company($conn, $user_id);

$stmt = mysqli_prepare($conn, "SELECT * FROM invoices WHERE id = ? AND user_id = ?");
mysqli_stmt_bind_param($stmt, "ii", $invoice_id, $user_id);
mysqli_stmt_execute($stmt);
$invoice = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
if (!$invoice) { die("That invoice does not belong to this account."); }

$logo_path = logo_src($company);
$display_invoice_no = display_invoice_no($invoice);
$show_watermark = has_watermark($user['membership_plan'] ?? 'Free');

/* Receiver GSTIN, falling back to the customer record */
$receiver_gstin = $invoice['customer_gstin'] ?? '';
if (empty($receiver_gstin) && !empty($invoice['customer_id'])) {
    $cid = intval($invoice['customer_id']);
    $row = mysqli_fetch_assoc(mysqli_query($conn, "SELECT gst_number FROM customers WHERE id = $cid"));
    $receiver_gstin = $row['gst_number'] ?? '';
}

$stmt_items = mysqli_prepare($conn, "SELECT * FROM invoice_items WHERE invoice_id = ?");
mysqli_stmt_bind_param($stmt_items, "i", $invoice_id);
mysqli_stmt_execute($stmt_items);
$items_query = mysqli_stmt_get_result($stmt_items);

$subtotal = floatval($invoice['subtotal'] ?? 0);
$cgst = floatval($invoice['cgst_amount'] ?? 0);
$sgst = floatval($invoice['sgst_amount'] ?? 0);
$igst = floatval($invoice['igst_amount'] ?? 0);
$grand_total = floatval($invoice['total_amount'] ?? 0);
if ($grand_total == 0) $grand_total = $subtotal + $cgst + $sgst + $igst;

$paid = paid_total($conn, $invoice_id);
$pay  = payment_state($invoice, $paid);

$terms = trim($invoice['payment_terms'] ?? '');
if ($terms === '') $terms = '50% advance, balance against delivery. Payment due within 5 days of delivery.';

/* Rupees in words, Indian numbering */
function getAmountInWords($number) {
    $no = floor($number);
    $point = (int) round(($number - $no) * 100);
    $digits_length = strlen((string)$no);
    $i = 0;
    $str = [];
    $words = [0=>'',1=>'ONE',2=>'TWO',3=>'THREE',4=>'FOUR',5=>'FIVE',6=>'SIX',7=>'SEVEN',8=>'EIGHT',9=>'NINE',
              10=>'TEN',11=>'ELEVEN',12=>'TWELVE',13=>'THIRTEEN',14=>'FOURTEEN',15=>'FIFTEEN',16=>'SIXTEEN',
              17=>'SEVENTEEN',18=>'EIGHTEEN',19=>'NINETEEN',20=>'TWENTY',30=>'THIRTY',40=>'FORTY',50=>'FIFTY',
              60=>'SIXTY',70=>'SEVENTY',80=>'EIGHTY',90=>'NINETY'];
    $digits = ['', 'HUNDRED', 'THOUSAND', 'LAKH', 'CRORE'];

    while ($i < $digits_length) {
        $divider = ($i == 2) ? 10 : 100;
        $part = floor($no % $divider);
        $no = floor($no / $divider);
        $i += ($divider == 10) ? 1 : 2;

        if ($part) {
            $counter = count($str);
            $hundred = ($counter == 1 && $str[0]) ? ' AND ' : '';
            $unit = ($part < 21)
                ? $words[$part] . ' ' . $digits[$counter] . ' ' . $hundred
                : $words[(int)(floor($part / 10) * 10)] . ' ' . $words[$part % 10] . ' ' . $digits[$counter] . ' ' . $hundred;
            $str[] = $unit;
        } else {
            $str[] = null;
        }
    }

    $rupees = implode('', array_reverse(array_filter($str)));
    $paise = ($point > 0)
        ? ' AND ' . ($words[(int)(floor($point / 10) * 10)] . ' ' . $words[$point % 10]) . ' PAISE'
        : '';
    return ($rupees ? $rupees . 'RUPEES ' : '') . $paise . ' ONLY';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tax invoice <?php echo h($display_invoice_no); ?></title>
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/app.css'); ?>">
<link rel="stylesheet" href="assets/css/print-invoice.css?v=<?php echo @filemtime(__DIR__ . '/assets/css/print-invoice.css'); ?>">
<style>
  body { background: var(--bg); }
  .action-bar {
    position: sticky; top: 0; z-index: 20; width: auto; margin: -20px 0 18px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    padding: 13px 20px; background: rgba(241,242,247,.85);
    backdrop-filter: saturate(180%) blur(18px); border-bottom: 1px solid rgba(0,0,0,.05);
  }
  .product-title { display:block !important; font-size:15px !important; font-weight:bold !important; line-height:1.15 !important; }
  .product-details-cell { padding-left:8px !important; padding-right:5px !important; }
  .product-block tbody td, .product-desc, .product-table-std { font-size:13px !important; font-weight:normal !important; line-height:1.25 !important; }
  .pay-line { font-size: 9.5px; }
  @media print { .action-bar, .screen-only { display: none !important; } }
  .wm {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-32deg);
    font-size: 74px; font-weight: 800; letter-spacing: 2px; color: rgba(15, 23, 42, .07);
    white-space: nowrap; pointer-events: none; z-index: 5; user-select: none;
  }
</style>
</head>
<body>

<div class="action-bar">
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <a href="invoices.php" class="btn btn-secondary btn-sm">Back to invoices</a>
    <span class="chip <?php echo $pay['tone']; ?>"><?php echo h($pay['label']); ?></span>
    <?php if ($pay['balance'] > 0.01): ?>
      <span style="font-size:13px;color:var(--muted)"><?php echo money($pay['balance']); ?> still owing</span>
    <?php endif; ?>
    <?php if ($show_watermark): ?>
      <span style="font-size:12px;color:var(--muted)">
        Watermarked on the <?php echo h($user['membership_plan'] ?? 'Free'); ?> plan ·
        <a href="plans.php">remove it on Enterprise</a>
      </span>
    <?php endif; ?>
  </div>
  <div class="btn-row">
    <?php if ($pay['balance'] > 0.01): ?>
      <a href="payments.php?pay=<?php echo $invoice_id; ?>" class="btn btn-secondary btn-sm">Record payment</a>
    <?php endif; ?>
    <button onclick="window.print()" class="btn btn-primary btn-sm">Print or save as PDF</button>
  </div>
</div>

<div class="invoice-paper" style="position:relative">
  <?php if ($show_watermark): ?><div class="wm">INVOICE FLEX</div><?php endif; ?>

  <div class="top-section">
    <div class="header-container">
      <div class="header-logo-title">
        <?php if ($logo_path): ?>
          <img src="<?php echo h($logo_path); ?>" class="company-logo" alt="">
        <?php endif; ?>
        <div class="header-title"><?php echo strtoupper(h($company['company_name'] ?? '')); ?></div>
      </div>
      <div class="copy-type-box">
        <div><input type="checkbox" checked> Original For Recipient</div>
        <div><input type="checkbox"> Duplicate For Supplier</div>
        <div><input type="checkbox"> Triplicate For Supplier</div>
      </div>
    </div>

    <div class="header-address">
      <strong>Address:</strong> <?php echo h($company['address'] ?? ''); ?><br>
      <?php if (!empty($company['phone'])): ?><strong>(M):</strong> <?php echo h($company['phone']); ?><?php endif; ?>
      <?php if (!empty($company['email'])): ?>, <strong>Email:</strong> <?php echo h($company['email']); ?><?php endif; ?>
    </div>

    <table class="section-block">
      <tr>
        <td style="width:65%" class="text-bold">GSTIN: <?php echo h($company['gst_number'] ?? ''); ?></td>
        <td style="width:35%;text-align:center" class="text-bold bg-header-gold">Tax Invoice</td>
      </tr>
      <tr>
        <td style="padding:0;width:65%">
          <table class="inner-clean-table">
            <tr><td class="col-label">Invoice No.</td><td class="col-val text-bold"><?php echo h($display_invoice_no); ?></td></tr>
            <tr><td class="col-label">Invoice Date.</td><td class="col-val"><?php echo date('d.m.Y', strtotime($invoice['invoice_date'])); ?></td></tr>
            <tr><td class="col-label">State</td><td class="col-val"><?php echo h($company['state'] ?? 'Gujarat'); ?></td></tr>
            <tr><td class="col-label">State Code</td><td class="col-val"><?php echo h(substr($company['gst_number'] ?? '24', 0, 2)); ?></td></tr>
          </table>
        </td>
        <td style="padding:0;width:35%">
          <table class="inner-clean-table">
            <tr><td class="col-label">PO No.</td><td class="col-val"><?php echo trim($invoice['po_number'] ?? '') !== '' ? h($invoice['po_number']) : '-'; ?></td></tr>
            <tr><td class="col-label">PO Date.</td><td class="col-val"><?php echo (!empty($invoice['po_date']) && $invoice['po_date'] !== '0000-00-00') ? date('d.m.Y', strtotime($invoice['po_date'])) : '-'; ?></td></tr>
            <tr><td class="col-label">Vehicle Number</td><td class="col-val"><?php echo trim($invoice['vehicle_number'] ?? '') !== '' ? h($invoice['vehicle_number']) : '-'; ?></td></tr>
            <tr><td class="col-label">E-WAY Bill No.</td><td class="col-val"><?php echo trim($invoice['eway_bill_no'] ?? '') !== '' ? h($invoice['eway_bill_no']) : '-'; ?></td></tr>
          </table>
        </td>
      </tr>
    </table>

    <table class="section-block">
      <tr>
        <td style="width:65%" class="text-bold">Details of Receiver / billed to:</td>
        <td style="width:35%" class="text-bold text-right">PAN No : <?php echo h($company['pan_number'] ?? ''); ?></td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0">
          <table class="inner-clean-table">
            <tr><td class="col-label">Name</td><td class="col-val text-bold"><?php echo strtoupper(h($invoice['customer_name'] ?? '')); ?></td></tr>
            <tr><td class="col-label">Address</td><td class="col-val"><?php echo h($invoice['customer_address'] ?? ''); ?></td></tr>
            <tr><td class="col-label">GSTIN</td><td class="col-val text-bold"><?php echo $receiver_gstin ? h($receiver_gstin) : '-'; ?></td></tr>
            <tr><td class="col-label">State</td><td class="col-val"><?php echo h($invoice['place_of_supply'] ?? ''); ?></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <div class="product-wrapper">
    <table class="product-block">
      <thead>
        <tr>
          <th style="width:8%">Sr. No</th><th style="width:47%">Name of Product</th><th style="width:13%">HSN</th>
          <th style="width:8%">Qty.</th><th style="width:12%">Rate</th><th style="width:12%">Total</th>
        </tr>
      </thead>
      <tbody>
        <?php $sr = 1; while ($item = mysqli_fetch_assoc($items_query)):
          $lines = explode("\n", trim($item['item_description'] ?? ''));
          $title = array_shift($lines);
          $rest  = implode("\n", $lines); ?>
          <tr style="height:38px">
            <td class="text-center product-table-std"><?php echo $sr++; ?></td>
            <td class="product-details-cell">
              <span class="product-title"><?php echo strtoupper(h($title)); ?></span>
              <?php if (trim($rest) !== ''): ?><span class="product-desc"><?php echo nl2br(h($rest)); ?></span><?php endif; ?>
            </td>
            <td class="text-center product-table-std"><?php echo h($item['hsn_sac']); ?></td>
            <td class="text-center product-table-std"><?php echo $item['quantity']; ?></td>
            <td class="text-right product-table-std"><?php echo number_format($item['rate'], 2); ?></td>
            <td class="text-right product-table-std"><?php echo number_format($item['amount'], 2); ?></td>
          </tr>
        <?php endwhile; ?>
        <tr class="stretch-row"><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="bottom-section">
    <table class="section-block" style="margin-bottom:0">
      <tr>
        <td style="width:65%" class="text-bold bg-header-gold">Company Bank Details</td>
        <td style="width:20%" class="text-bold">Total Amount</td>
        <td style="width:15%" class="text-right text-bold"><?php echo number_format($subtotal, 2); ?></td>
      </tr>
      <tr>
        <td><strong>Bank Name :</strong> <?php echo h($company['bank_name'] ?? '-'); ?></td>
        <td class="text-normal">Add : CGST (9%)</td>
        <td class="text-right text-normal"><?php echo $cgst > 0 ? number_format($cgst, 2) : '-'; ?></td>
      </tr>
      <tr>
        <td><strong>A/c No. :</strong> <?php echo h($company['account_no'] ?? '-'); ?></td>
        <td class="text-normal">Add : SGST (9%)</td>
        <td class="text-right text-normal"><?php echo $sgst > 0 ? number_format($sgst, 2) : '-'; ?></td>
      </tr>
      <tr>
        <td><strong>Branch &amp; IFSC Code :</strong>
          <?php echo h(trim(($company['branch_name'] ?? '') . ' & ' . ($company['ifsc_code'] ?? ''), ' &')); ?></td>
        <td class="text-normal">Add : IGST</td>
        <td class="text-right text-normal"><?php echo $igst > 0 ? number_format($igst, 2) : '-'; ?></td>
      </tr>
      <tr>
        <td class="text-bold" style="font-size:9.5px">
          Total Invoice Amount in Words : <?php echo getAmountInWords($grand_total); ?>
        </td>
        <td class="text-bold bg-header-gold">Grand Amount</td>
        <td class="text-right text-bold bg-header-gold"><?php echo number_format($grand_total, 2); ?></td>
      </tr>
      <?php if ($paid > 0.01): ?>
      <tr>
        <td class="pay-line"><strong>Received:</strong> <?php echo number_format($paid, 2); ?>
          (<?php echo $pay['percent']; ?>%) on this invoice</td>
        <td class="text-bold">Balance Due</td>
        <td class="text-right text-bold"><?php echo number_format($pay['balance'], 2); ?></td>
      </tr>
      <?php endif; ?>
    </table>

    <table class="footer-block">
      <tr>
        <td style="width:45%" class="terms-text">
          <strong>Terms &amp; Conditions :</strong><br>
          1. <?php echo h($terms); ?><br>
          2. 18% GST extra<br>
          3. Transport extra
        </td>
        <td style="width:25%;text-align:center;vertical-align:bottom">RECEIVER'S SIGN AND STAMP</td>
        <td style="width:30%;text-align:center;vertical-align:bottom">
          For, <?php echo h($company['company_name'] ?? ''); ?><br><br><br>
          <span style="font-size:8.5px;border-top:1px dashed #15355f;padding-top:2px">Authorised Signatory</span>
        </td>
      </tr>
    </table>
  </div>

</div>
</body>
</html>
