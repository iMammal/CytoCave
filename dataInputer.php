<?php

/// require_once('.env'); // Assuming the file is located in the parent directory
// $db_host = getenv('DB_HOST');
// $db_name = getenv('DB_NAME');
// $db_user = getenv('DB_USER');
// $db_password = getenv('DB_PASSWORD');
// ... connect to your database using these variables ...

require_once('config.php'); // Assuming the file is located in the same directory
$db_config = $config['db'];
$db_host = $db_config['host'];
$db_name = $db_config['name'];
$db_user = $db_config['user'];
$db_password = $db_config['password'];

//create if not exists or open sqlite3 database
// $db = new SQLite3('humap2.db');

// echo $db_host;
// echo $db_name;
// echo $db_user;
// echo $db_password;

// connect to mysql database using the variables from .env
// Using mysqli
// $mysqli = new mysqli( $db_host, $db_user, $db_password, $db_name  );//'localhost', 'username', 'password', 'database_name');
// if ($mysqli->connect_error) {
//   die('Connect Error (' . $mysqli->connect_errno . ') '
//           . $mysqli->connect_error);
// }
// Using PDO
// $pdo = new PDO('mysql:host='+$db_host+';dbname='+$db_name, $db_user, $db_password);
try {
  //check that database exists if not create it
  echo "Database " . $db_name . "\n";
  $pdo = new PDO("mysql:host=$db_host", $db_user, $db_password);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $sql = "CREATE DATABASE IF NOT EXISTS $db_name";
  $pdo->exec($sql);
  echo "Database successful\n";
} catch(PDOException $e) {
  echo "<br>" . $e->getMessage();
}
try {
  // Check DSN format for MySQL
  $dsn = 'mysql:host=' . $db_host . ';dbname=' . $db_name;

  echo $dsn;

  // Connect to database
  $pdo = new PDO($dsn, $db_user, $db_password);

  // Database connection successful (code to interact with database)
  echo 'Connected to database!';

} catch (PDOException $e) {
  echo 'Connection failed: ' . $e->getMessage();
}

//create table if not exists, named pin
//$db->exec('CREATE TABLE IF NOT EXISTS pin (id INTEGER PRIMARY KEY, proteinA TEXT, proteinB TEXT, interaction TEXT)');
// -- $mysqli->query('CREATE TABLE IF NOT EXISTS pin (id INTEGER PRIMARY KEY, proteinA TEXT, proteinB TEXT, interaction TEXT)');
$pdo->query('CREATE TABLE IF NOT EXISTS pin (id INTEGER AUTO_INCREMENT PRIMARY KEY, proteinA TEXT, proteinB TEXT, interaction TEXT)');

//load humap2_ppis_genename_20200821.pairsWprob.csv
$pisCsv = fopen('humap2_ppis_genename_20200821.csv', 'r');

//check if file is open or not
if ($pisCsv === FALSE) {
  echo "Error opening file\n";
} else {
  echo "File opened\n";
}


//start transaction
//$db->exec('BEGIN');
// $mysqli->query('BEGIN');
//$pdo->query('BEGIN');

//iterate through each row of the csv file add to the database
//while (($data = fgetcsv($pisCsv, 0, "\t")) !== FALSE) {

// Change FALSE to TRUE to load the data
while (FALSE && ($data = fgetcsv($pisCsv, 0, ",")) !== FALSE) {

//   $stmt = $db->prepare('INSERT INTO pin (proteinA, proteinB, interaction) VALUES (:proteinA, :proteinB, :interaction)');
//   $stmt->bindValue(':proteinA', $data[0], SQLITE3_TEXT);
//   $stmt->bindValue(':proteinB', $data[1], SQLITE3_TEXT);
//   $stmt->bindValue(':interaction', $data[2], SQLITE3_TEXT);
//   $result = $stmt->execute();

//     $sql = "INSERT INTO pin (proteinA, proteinB, interaction) VALUES ('".$data[0]."', '".$data[1]."', '".$data[2]."')";
//     $result = $mysqli->query($sql);
    $sql = "INSERT INTO pin (proteinA, proteinB, interaction) VALUES ('".$data[0]."', '".$data[1]."', '".$data[2]."')";
    $result = $pdo->query($sql);


//   if (!$result) {
//     echo "Error inserting data: " . $db->lastErrorMsg();
//   }
//     if (!$result) {
//         echo "Error inserting data: " . $mysqli->error;
//       }
    if (!$result) {
        echo "Error inserting data: " . $pdo->error;
      }

}
//$pdo->query('END');
//commit transaction
//$db->exec('COMMIT');
// $mysqli->query('COMMIT');
$pdo->query('COMMIT');

// Close the CSV file
fclose($pisCsv);
echo "CSV1 file closed\n";
//close the database
// $db->close();
// $mysqli->close();


//open the database
// $db = new SQLite3('humap2.db');

//create table if not exist HuMAP2_ID,Confidence,Uniprot_ACCs,genenames
// $db->exec('CREATE TABLE IF NOT EXISTS HuMAP2_ID (id INTEGER PRIMARY KEY, HuMAP2_ID TEXT, Confidence TEXT, Uniprot_ACCs TEXT, genenames TEXT)');
// $mysqli->query('CREATE TABLE IF NOT EXISTS HuMAP2_ID (id INTEGER PRIMARY KEY, HuMAP2_ID TEXT, Confidence TEXT, Uniprot_ACCs TEXT, genenames TEXT)');
$pdo->query('CREATE TABLE IF NOT EXISTS HuMAP2_ID (id INTEGER AUTO_INCREMENT PRIMARY KEY, HuMAP2_ID TEXT, Confidence TEXT, Uniprot_ACCs TEXT, genenames TEXT)');
echo "Table created\n";
//load humap2_complexes_20200809.csv
$dataCsv2 = fopen('humap2_complexes_20200809.csv', 'r');
if ($dataCsv2 === FALSE) {
  echo "Error opening file\n";
} else {
  echo "File opened\n";
}

//start transaction
// $db->exec('BEGIN');
// $mysqli->query('BEGIN');
//$pdo->query('BEGIN');
echo "Transaction started\n";
//iterate through each row of the csv file add to the database // Change FALSE to TRUE to load the data
while (TRUE && ($data = fgetcsv($dataCsv2, 0, ",")) !== FALSE) {
//   $stmt = $db->prepare('INSERT INTO HuMAP2_ID (HuMAP2_ID, Confidence, Uniprot_ACCs, genenames) VALUES (:HuMAP2_ID, :Confidence, :Uniprot_ACCs, :genenames)');
//   $stmt->bindValue(':HuMAP2_ID', $data[0], SQLITE3_TEXT);
//   $stmt->bindValue(':Confidence', $data[1], SQLITE3_TEXT);
//   $stmt->bindValue(':Uniprot_ACCs', $data[2], SQLITE3_TEXT);
//   $stmt->bindValue(':genenames', $data[3], SQLITE3_TEXT);
//   $result = $stmt->execute();
//   $result = $stmt->execute();
//     $sql = "INSERT INTO HuMAP2_ID (HuMAP2_ID, Confidence, Uniprot_ACCs, genenames) VALUES ('".$data[0]."', '".$data[1]."', '".$data[2]."', '".$data[3]."')";
//     $result = $mysqli->query($sql);
    $sql = "INSERT INTO HuMAP2_ID (HuMAP2_ID, Confidence, Uniprot_ACCs, genenames) VALUES ('".$data[0]."', '".$data[1]."', '".$data[2]."', '".$data[3]."')";
    echo $sql;
    $result = $pdo->query($sql);

//   if (!$result) {
//     echo "Error inserting data: " . $db->lastErrorMsg();
//   }
//     if (!$result) {
//         echo "Error inserting data: " . $mysqli->error;
//       }
    if (!$result) {
        echo "Error inserting data: " . $pdo->error;
      }
}
//$pdo->query('END');
echo "Transaction ended\n";
//commit transaction
// $db->exec('COMMIT');
// $mysqli->query('COMMIT');
$pdo->query('COMMIT');
echo "Transaction committed\n";
//close the database
// $db->close();
// $mysqli->close();
$pdo = null;

?>
