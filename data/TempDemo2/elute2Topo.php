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
// $db = new SQLite3('../../humap2.db');

//load metadata into $metadata array
$metadata = array();

//execute the query to select all from tempNetwork
$results = $pdo->query('SELECT * FROM tempMetadata');
foreach ($results as $row) {
    $metadata[$row['label']] = array(
        'gene_name' => $row['region_name'],
        'uniprotAcc' => $row['uniprotAcc']
     );
}

$elution = array();

//execute the query to protID from elute_data1
$results = $pdo->query('SELECT protId FROM elute_data2');

foreach ($results as $row) {
    $elution[$row['protId']] = $row['protId'];
}


$results = $pdo->query('SELECT * FROM tempTopology');
//no header
// $header = false;

echo "label,Flat,,,complexIdClustering,DetailsFile\n";

//iterate through each row of the result
// while ($row = $results->fetchArray()) {
foreach ($results as $row) {
  //echo the row
  //    echo implode(',', $row) . "\n";
  // echo label, complexIdCluster

// echo $metadata[$row['label']]; //.','.$metadata['uniprotAcc'] . "\n";

  // if $metadata[$row['uniprotAccs']] is not in $elution, then skip
    if (!array_key_exists($metadata[$row['label']]['uniprotAcc'], $elution)) {
        echo $row['label'] .   "," . $row['Flat_X']. "," . $row['Flat_Y']. "," . $row['Flat_Z']."," . $row['complexIdClustering'] . ",\n";

    } else {
        echo $row['label'] .   "," . $row['Flat_X']. "," . $row['Flat_Y']. "," . $row['Flat_Z']."," . $row['complexIdClustering'] . ",proteinCFMSelute.php?rep=2&prot=".$metadata[$row['label']]['uniprotAcc'] ."\n";
    }
}
?>
