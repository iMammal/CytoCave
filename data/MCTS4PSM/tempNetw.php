<?php
  // Path: tempNetw.php
  // return table of tempNetwork as CSV

    require_once('../../config.php');
    // Assuming the file is located in the same directory
    $db_config = $config['db'];
    $db_host = $db_config['host'];
    $db_name = $db_config['name'];
    $db_user = $db_config['user'];
    $db_password = $db_config['password'];

    // $db = new SQLite3('humap2.db');
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name", $db_user, $db_password);

    if (!$pdo) {
      die("Connection failed: " . mysqli_connect_error());
    }

  //open the database
//   $db = new SQLite3('../../humap2.db');

  //execute the query to select all from tempNetwork
//   $results = $db->query('SELECT * FROM tempNetwork');
    $results = $pdo->query('SELECT * FROM tempNetwork');

  //no header
//   $header = false;
$test = true; //false;

if ($test) {
    $fudge = 141;
} else {
    $fudge = -1;
}

  //iterate through each row of the result
//   while ($row = $results->fetchArray()) {
    while ($row = $results->fetch(PDO::FETCH_ASSOC)) {

    //if no header, echo the header
//     if (!$header) {
// //      echo implode(',', array_keys($row)) . "\n";
//       $header = true;
//     }
    //echo the row
//    echo implode(',', $row) . "\n";
    // echo source, target, interaction
//     echo ($row['source']-1) . "," . ($row['target']-1) . "," . $row['interaction'] . "\n";
    echo ($row['source']+$fudge) . "," . ($row['target']+$fudge) . "," . 14000*$row['interaction'] . "\n";

  }
?>
