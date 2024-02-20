<?php
// Path: tempNetw.php
// return table of tempNetwork as CSV

//open the database
$db = new SQLite3('../humap2.db');

//execute the query to select all from tempMetadata
$results = $db->query('SELECT * FROM tempMetadata');

//no header
$header = false;

echo "label;complexid;region_name;confidence;hemisphere\n";

//iterate through each row of the result
while ($row = $results->fetchArray()) {

  //echo the row
  //    echo implode(',', $row) . "\n";
  // echo label, complexIdCluster
  echo $row['label'] . ";" . $row['complexid'] . ";" . $row['region_name'] . ";" . $row['confidence'] . ";" . $row['hemisphere'] . "\n";

}
?>
