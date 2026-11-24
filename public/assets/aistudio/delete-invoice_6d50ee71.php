<?php
/* delete-invoice.php — remove an invoice with its items and payments */
require_once __DIR__ . '/config.php';
$user    = require_user($conn);
$user_id = intval($user['id']);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_id'])) {
    $id = intval($_POST['delete_id']);

    // Ownership is checked before anything is removed.
    $stmt = mysqli_prepare($conn, "SELECT id FROM invoices WHERE id = ? AND user_id = ?");
    mysqli_stmt_bind_param($stmt, "ii", $id, $user_id);
    mysqli_stmt_execute($stmt);

    if (mysqli_fetch_assoc(mysqli_stmt_get_result($stmt))) {
        mysqli_query($conn, "DELETE FROM invoice_items WHERE invoice_id = $id");
        mysqli_query($conn, "DELETE FROM payments WHERE invoice_id = $id AND user_id = $user_id");
        mysqli_query($conn, "DELETE FROM invoices WHERE id = $id AND user_id = $user_id");
    }
}

header("Location: invoices.php");
exit();
