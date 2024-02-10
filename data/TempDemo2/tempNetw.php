<?php
  // Path: tempNetw.php
  // return table of tempNetwork as CSV

  //open the database
  $db = new SQLite3('../../huMAP2.db');

  //execute the query to select all from tempNetwork
  $results = $db->query('SELECT * FROM tempNetwork');

  //no header
  $header = false;

  //iterate through each row of the result
  while ($row = $results->fetchArray()) {
    //if no header, echo the header
    if (!$header) {
//      echo implode(',', array_keys($row)) . "\n";
      $header = true;
    }
    //echo the row
//    echo implode(',', $row) . "\n";
    // echo source, target, interaction
    echo $row['source'] . "," . $row['target'] . "," . $row['interaction'] . "\n";

  }
?>
