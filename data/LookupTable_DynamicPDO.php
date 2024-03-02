<?php
// Path: tempNetw.php
// return table of tempNetwork as CSV

require_once('../config.php');
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
// $db = new SQLite3('../humap2.db');

//execute the query to select all from tempMetadata
// $results = $db->query('SELECT * FROM tempMetadata');
$results = $pdo->query('SELECT * FROM tempMetadata');

//no header
$header = false;

echo "label;complexid;region_name;confidence;hemisphere\n";

//iterate through each row of the result
// while ($row = $results->fetchArray()) {
foreach ($results as $row) {
//     echo json_encode($row);
  //echo the row

  //    echo implode(',', $row) . "\n";
  // echo label, complexIdCluster
  echo $row['label'] . ";" . $row['complexid'] . ";" . $row['region_name'] . ";" . $row['confidence'] . ";" . $row['hemisphere'] . "\n";

}
?>
