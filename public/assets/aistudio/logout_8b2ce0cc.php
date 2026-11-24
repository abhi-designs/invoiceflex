<?php
/* logout.php — clear the session and return to the sign-in screen */
session_start();
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
}
session_destroy();
header("Location: index.php?mode=login");
exit();
