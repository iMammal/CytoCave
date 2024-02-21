<?php

//create if not exists or open sqlite3 database
$db = new SQLite3('humap2.db');

//create table if not exists, named pin
$db->exec('CREATE TABLE IF NOT EXISTS pin (id INTEGER PRIMARY KEY, proteinA TEXT, proteinB TEXT, interaction TEXT)');

//load humap2_ppis_genename_20200821.pairsWprob.csv
$pisCsv = fopen('humap2_ppis_genename_20200821.csv', 'r');

//start transaction
$db->exec('BEGIN');

//iterate through each row of the csv file add to the database
while (($data = fgetcsv($pisCsv, 0, "\t")) !== FALSE) {
  $stmt = $db->prepare('INSERT INTO pin (proteinA, proteinB, interaction) VALUES (:proteinA, :proteinB, :interaction)');
  $stmt->bindValue(':proteinA', $data[0], SQLITE3_TEXT);
  $stmt->bindValue(':proteinB', $data[1], SQLITE3_TEXT);
  $stmt->bindValue(':interaction', $data[2], SQLITE3_TEXT);
  $result = $stmt->execute();
  if (!$result) {
    echo "Error inserting data: " . $db->lastErrorMsg();
  }
}

//commit transaction
$db->exec('COMMIT');

// Close the CSV file
fclose($pisCsv);

//close the database
$db->close();

//open the database
$db = new SQLite3('humap2.db');

//create table if not exist HuMAP2_ID,Confidence,Uniprot_ACCs,genenames
$db->exec('CREATE TABLE IF NOT EXISTS HuMAP2_ID (id INTEGER PRIMARY KEY, HuMAP2_ID TEXT, Confidence TEXT, Uniprot_ACCs TEXT, genenames TEXT)');

//load humap2_complexes_20200809.csv
$dataCsv2 = fopen('humap2_complexes_20200809.csv', 'r');

//start transaction
$db->exec('BEGIN');

//iterate through each row of the csv file add to the database
while (($data = fgetcsv($dataCsv2, 0, ",")) !== FALSE) {
  $stmt = $db->prepare('INSERT INTO HuMAP2_ID (HuMAP2_ID, Confidence, Uniprot_ACCs, genenames) VALUES (:HuMAP2_ID, :Confidence, :Uniprot_ACCs, :genenames)');
  $stmt->bindValue(':HuMAP2_ID', $data[0], SQLITE3_TEXT);
  $stmt->bindValue(':Confidence', $data[1], SQLITE3_TEXT);
  $stmt->bindValue(':Uniprot_ACCs', $data[2], SQLITE3_TEXT);
  $stmt->bindValue(':genenames', $data[3], SQLITE3_TEXT);
  $result = $stmt->execute();
  if (!$result) {
    echo "Error inserting data: " . $db->lastErrorMsg();
  }
}

//commit transaction
$db->exec('COMMIT');

//close the database
$db->close();

?>
