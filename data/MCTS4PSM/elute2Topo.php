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

//execute the query to select max(complexidClustering) from tempTopology
$results = $pdo->query('SELECT max(complexIdClustering) as max FROM tempTopology');
foreach ($results as $row) {
    $max = $row['max'];
}

$elution = array();

//execute the query to protID from elute_data1
$results = $pdo->query('SELECT protId FROM elute_data2');

foreach ($results as $row) {
    $elution[$row['protId']] = $row['protId'];
}

// read mctstopo.csv into an array
$mctstopo = array_map('str_getcsv', file('mctstopo.csv'));

echo "label,Straight,,,Square,,,complexIdClustering,LevelTree,DetailsFile\n";

$test = true; //false;

if ($test) {

        //iterate through each row of the result, skip header
    foreach ($mctstopo as $row) {
        if (($row[0] == 'label') || ($row[0] > 141)) {
            continue;

        }
    //     echo the row
        //echo implode(',', $row) . "\n";
        echo $row[0],',0,0,0,0,0,0,',$max+1,",1,\n";
    }

    // if $metadata[$row['uniprotAccs']] is not in $elution, then skip
//     if (!array_key_exists($metadata[$row[0]]['uniprotAcc'], $elution)) {
//         echo $row[0] .   "," . $row[1]. "," . $row[2]. "," . $row[3]. ", ". $row[4].", ". $row[5].", ". $row[6] . "," . $row[7] . ",\n";
//
//     } else {
//         echo $row[0] .   "," . $row[1]. "," . $row[2]. "," . $row[3]. ", ". $row[4].", ". $row[5].", ". $row[6] . "," . $row[7] . ",proteinCFMSelute.php?rep=1&prot=".$metadata[$row[0]]['uniprotAcc'] ."\n";
//     }


}


$results = $pdo->query('SELECT * FROM tempTopology');
//no header
// $header = false;

//iterate through each row of the result
// while ($row = $results->fetchArray()) {
foreach ($results as $row) {
  //echo the row
  //    echo implode(',', $row) . "\n";
  // echo label, complexIdCluster

// echo $metadata[$row['label']]; //.','.$metadata['uniprotAcc'] . "\n";

  // if $metadata[$row['uniprotAccs']] is not in $elution, then skip
    if (!array_key_exists($metadata[$row['label']]['uniprotAcc'], $elution)) {
        echo $row['label'] .   "," . $row['Flat_X']. "," . $row['Flat_Y']. "," . $row['Flat_Z']. ", ". $row['Square_X'].", ". $row['Square_Y'].", ". $row['Square_Z'] . "," . $row['complexIdClustering'] . ",1,\n";

    } else {
        echo $row['label'] .   "," . $row['Flat_X']. "," . $row['Flat_Y']. "," . $row['Flat_Z']. ", ". $row['Square_X'].", ". $row['Square_Y'].", ". $row['Square_Z']. "," . $row['complexIdClustering'] . ",1,,proteinCFMSelute.php?rep=2&prot=".$metadata[$row['label']]['uniprotAcc'] ."\n";
    }
}
?>
