<?php
// Path: tempNetw.php
// return table of tempNetwork as CSV

//open the database
$db = new SQLite3('../../humap2.db');

//execute the query to select all from tempNetwork
$results = $db->query('SELECT * FROM tempTopology');

//no header
$header = false;

echo "label,complexIdClustering\n";

//iterate through each row of the result
while ($row = $results->fetchArray()) {

  //echo the row
  //    echo implode(',', $row) . "\n";
  // echo label, complexIdCluster
  echo $row['label'] . "," . $row['complexIdClustering'] . "\n";

}
?>
