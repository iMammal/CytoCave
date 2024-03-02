<?php

require_once('config.php');
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

//get gene name from the url
$searchTerms = $_GET['search'];
//sanitize the search term
$searchGene = filter_var($searchTerms, FILTER_SANITIZE_STRING);

//if search term is empty, set it to empty string
if ($searchTerms == "" || $searchTerms == null || $searchTerms == "undefined") {
  $error = array('error' => 'No search term');
  echo json_encode($error);
  ///$db->close();
  //exit();
  $searchGene = "GAK";
}

// drop tables tempTopology, tempNetwork, tempMetadata if they exist
// $db->exec('DROP TABLE IF EXISTS tempTopology');
// $db->exec('DROP TABLE IF EXISTS tempNetwork');
// $db->exec('DROP TABLE IF EXISTS tempMetadata');
//$db->exec('DROP TABLE IF EXISTS tempComplexes');
//$db->exec('DROP TABLE IF EXISTS tempGenes');



// create table tempTopology with columns label, complexId with unique constraint on label that automatically increments with PDO
// $db->exec('CREATE TABLE tempTopology (label TEXT, complexIdClustering TEXT, Flat_X REAL, Flat_Y REAL, Flat_Z REAL, PRIMARY KEY (label) )');
$pdo->query('CREATE TABLE IF NOT EXISTS tempTopology (label INT PRIMARY KEY, complexIdClustering TEXT, Flat_X REAL, Flat_Y REAL, Flat_Z REAL)');
$pdo->query('DELETE FROM tempTopology');

// create table tempNetwork with columns source, target, interaction
$pdo->query('CREATE TABLE IF NOT EXISTS tempNetwork (source TEXT, target TEXT, interaction TEXT)');
$pdo->query('DELETE FROM tempNetwork');

// create table tempMetadata with columns label,complexId, geneName, confidence
$pdo->query('CREATE TABLE IF NOT EXISTS tempMetadata (label TEXT, complexid TEXT, region_name TEXT, confidence TEXT, hemisphere TEXT)');
$pdo->query('DELETE FROM tempMetadata');

// create table tempComplexes with columns complexNumber, complexId, confidence
//$db->exec('CREATE TABLE tempComplexes (complexNumber INTEGER, complexId TEXT, confidence TEXT)');

//// create table tempGenes with columns geneNumber, geneName
//$db->exec('CREATE TABLE tempGenes (geneNumber INTEGER, geneName TEXT)');


function generateGridPointsWithDistance($N) {
    $result = array(
        'distance' => 0,
        'points' => array()
    );

    // Calculate the distance between points, avoiding division by zero when N=1
    $result['distance'] = $N > 1 ? 100 / ($N - 1) : 100;

    // Generate points
    for ($i = 0; $i < $N; $i++) {
        // Calculate the x coordinate, start from 0 and space them evenly.
        $x = $i * $result['distance'];

        // For simplicity, set y to a fixed value, e.g., 50, to place points in the middle of the grid vertically.
        // Alternatively, distribute Y evenly if the problem requires.
        $y = 50;

        // Add the coordinates to the array as floats.
        $result['points'][] = array((float) $x, (float) $y);
    }

    return $result;
}


function generatePolygonPoints($M, $centroid, $distance) {
    $points = array();

    // Calculate the angle between each point
    $angleIncrement = 2 * pi() / $M;

    for ($i = 0; $i < $M; $i++) {
        // Calculate the angle for this point
        $angle = $angleIncrement * $i;

        // Calculate the coordinates of the point
        $x = $centroid[0] + $distance * cos($angle);
        $y = $centroid[1] + $distance * sin($angle);

        // Add the point to the array
        $points[] = array((float) $x, (float) $y);
    }

    return $points;
}

//execute the query to get the number of rows from the database
// $query = "SELECT COUNT(*) FROM table_name";
$query = 'SELECT count(*)  FROM HuMAP2_ID where genenames like "%'.$searchGene.'%" ';
$result = $pdo->query($query);

if($result) {
//     $numRows = $result->fetchArray();
    $numRows = $result->fetch(PDO::FETCH_NUM);
    echo "Number of rows: " . $numRows[0];
    $N = $numRows[0];
}

//execute the query to get the HuMAP2_ID, Confidence, Uniprot_ACCs, and genenames from the database
$query = 'SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where genenames like "%'.$searchGene.'%" ';
//dump php variable to console
//var_dump($query);
$results = $pdo->query($query);

echo json_encode($results);
$genecounter = 1;
$complexcounter = 1;

$jsonReturn = array();

$complexMap = array();
$genesInComplexes = array();

//generate the grid points
$grid = generateGridPointsWithDistance($N);
$gridPoints = $grid['points'];
$gridDistance = $grid['distance'];

//echo the grid points
echo "Grid points: " . json_encode($gridPoints) . "<br>";
echo "Grid distance: " . $gridDistance . "<br>";

//iterate through each row of the result
// while ($row = $results->fetchArray()) {
foreach ($results as $row) {
  //echo the HuMAP2_ID, Confidence, Uniprot_ACCs, and genenames
  echo "HuMAP2_ID: " . $row['HuMAP2_ID'] . " Confidence: " . $row['Confidence'] . " Uniprot_ACCs: " . $row['Uniprot_ACCs'] . " genenames: " . $row['genenames'] . "<br>";

  $complexId = $row['HuMAP2_ID'];

  //push the HuMAP2_ID abd complexcounter to complexMap
  $complexMap[$complexId] = $complexcounter;

  $genesInComplexes[$complexId] = array();

  // split the genenames by space
  $genenames = explode(" ", $row['genenames']);

  //generate the polygon points
  $M = count($genenames);
  $geneFlatCoordinates = generatePolygonPoints($M, $gridPoints[$complexcounter - 1], $gridDistance/3);

    //echo the genenames
    echo "Genenames: " . json_encode($genenames) . "<br>";

    //echo the geneFlatCoordinates
    echo "GeneFlatCoordinates: " . json_encode($geneFlatCoordinates) . "<br>";


  $mygenecounter = 0;


  //iterate through each genename
  foreach ($genenames as $genename) {
    //echo the genename with counter echo "Genename".$genecounter.": " . $genename . "<br>";


    // push the gene label into the genesInComplexes array
    array_push($genesInComplexes[$complexId], $genecounter);

    //insert into tempTopology table the HuMAP2_ID and genenames with label counting upp from 1
//     $stmt = $db->prepare('INSERT INTO tempTopology (label, complexIdClustering, Flat_X, Flat_Y, Flat_Z) VALUES (:label, :complexIdClustering, :Flat_X, :Flat_Y, :Flat_Z)');
//     $stmt->bindValue(':label', $genecounter, SQLITE3_TEXT);
//     $stmt->bindValue(':complexIdClustering', $complexcounter, SQLITE3_TEXT); // $row['HuMAP2_ID']
//     $stmt->bindValue(':Flat_X', $geneFlatCoordinates[$mygenecounter][0], SQLITE3_TEXT);
//     $stmt->bindValue(':Flat_Y', 0, SQLITE3_TEXT);
//     $stmt->bindValue(':Flat_Z', $geneFlatCoordinates[$mygenecounter][1], SQLITE3_TEXT);

//     $result = $stmt->execute();
//     if (!$result) {
//       echo "Error inserting data: " . $db->lastErrorMsg();
//     }

//insert into tempTopology table the HuMAP2_ID and genenames with label counting upp from 1 with PDO
    $stmt = $pdo->prepare('INSERT INTO tempTopology (label, complexIdClustering, Flat_X, Flat_Y, Flat_Z) VALUES (:label, :complexIdClustering, :Flat_X, :Flat_Y, :Flat_Z)');
    $stmt->bindValue(':label', $genecounter, PDO::PARAM_STR);
    $stmt->bindValue(':complexIdClustering', $complexcounter, PDO::PARAM_STR); // $row['HuMAP2_ID']
    $stmt->bindValue(':Flat_X', $geneFlatCoordinates[$mygenecounter][0], PDO::PARAM_STR);
    $stmt->bindValue(':Flat_Y', 0, PDO::PARAM_STR);
    $stmt->bindValue(':Flat_Z', $geneFlatCoordinates[$mygenecounter][1], PDO::PARAM_STR);

    $result = $stmt->execute();
    if (!$result) {
      echo "Error inserting data: " . $pdo->errorInfo();
    }


    //insert into tempMetadata table the label, clusterid, region_name, and confidence
//     $query = 'INSERT INTO tempMetadata (label, complexid, region_name, confidence, hemisphere) VALUES (:label, :complexid, :region_name, :confidence, :hemisphere)';
//     $stmt = $db->prepare($query);
//     $stmt->bindValue(':label', $genecounter, SQLITE3_TEXT);
//     $stmt->bindValue(':complexid', $complexId, SQLITE3_TEXT);
//     $stmt->bindValue(':region_name', $genename, SQLITE3_TEXT);
//     $stmt->bindValue(':confidence', $row['Confidence'], SQLITE3_TEXT);
//     $stmt->bindValue(':hemisphere', "left", SQLITE3_TEXT);
//     $result = $stmt->execute();
//     if (!$result) {
//       echo "Error inserting data: " . $db->lastErrorMsg();
//     }

//insert into tempMetadata table the label, clusterid, region_name, and confidence with PDO
    $query = 'INSERT INTO tempMetadata (label, complexid, region_name, confidence, hemisphere) VALUES (:label, :complexid, :region_name, :confidence, :hemisphere)';
    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':label', $genecounter, PDO::PARAM_STR);
    $stmt->bindValue(':complexid', $complexId, PDO::PARAM_STR);
    $stmt->bindValue(':region_name', $genename, PDO::PARAM_STR);
    $stmt->bindValue(':confidence', $row['Confidence'], PDO::PARAM_STR);
    $stmt->bindValue(':hemisphere', "left", PDO::PARAM_STR);
    $result = $stmt->execute();
    if (!$result) {
      echo "Error inserting data: " . $pdo->errorInfo();
    }

    //increment the counters
    $genecounter++;
    $mygenecounter++;

  }

  //insert into tempTopology table the HuMAP2_ID and genenames with label counting upp from 1

  $complexcounter++;
}

// for each number from 1 to genecounter, insert into tempNetowrk table the source, target, and interaction
// Also, only insert if source and target are in the same complex

// first loop through all the complexed

//for ($c = 1; $c < $complexcounter; $c++) {
foreach ($complexMap as $complexId => $c) {
    // get all the genes in the complex
    $genesInComplex = $pdo->query('SELECT label FROM tempMetadata WHERE complexid = "'.$complexId.'"');
    $genesInComplexArray = array();
//     while ($row = $genesInComplex->fetchArray()) {
    foreach ($genesInComplex as $row) {
        array_push($genesInComplexArray, $row['label']);
    }
    //echo the genes in the complex
    echo "Genes in complex: " . json_encode($genesInComplexArray) . "<br>";

    // for each gene in the complex, insert into tempNetwork table the source, target, and interaction
    for ($i = 0; $i < count($genesInComplexArray); $i++) {
        for ($j = 0; $j < count($genesInComplexArray); $j++) {
            if ($i != $j) {
                //query the tempMetadate table to get the geneName for the source
//                 $source = $db->querySingle('SELECT region_name FROM tempMetadata WHERE label = "'.$genesInComplexArray[$i].'"');
                $result = $pdo->query('SELECT region_name FROM tempMetadata WHERE label = "'.$genesInComplexArray[$i].'"');
                $source = $result->fetch(PDO::FETCH_ASSOC);

                        //querySingle('SELECT region_name FROM tempMetadata WHERE label = "'.$genesInComplexArray[$i].'"');


                //query the tempMetadate table to get the geneName for the target
                $result = $pdo->query('SELECT region_name FROM tempMetadata WHERE label = "'.$genesInComplexArray[$j].'"');
                $target = $result->fetch(PDO::FETCH_ASSOC);

                //query the pin table to get the interaction for the source and target
                $result = $pdo->query('SELECT interaction FROM pin WHERE proteinA = "'.$source['region_name'].'" AND proteinB = "'.$target['region_name'].'"');
                $interaction = $result->fetch(PDO::FETCH_ASSOC);
                if ($interaction['interaction'] == "") {
                    $result = $pdo->query('SELECT interaction FROM pin WHERE proteinA = "'.$target['region_name'].'" AND proteinB = "'.$source['region_name'].'"');
                    $interaction = $result->fetch(PDO::FETCH_ASSOC);
                }

                //echo the source, target, and interaction
                echo "Source: " . json_encode($source) . " Target: " . json_encode($target)  . " Interaction: " . json_encode($interaction) . "<br>";


                if ( ($interaction['interaction'] != "") ) { //}&& ($sameComplex == 1 ) ) {

//                     $stmt = $db->prepare('INSERT INTO tempNetwork (source, target, interaction) VALUES (:source, :target, :interaction)');
//                     $stmt->bindValue(':source', $genesInComplexArray[$i], SQLITE3_TEXT);
//                     $stmt->bindValue(':source', $genesInComplexArray[$i], SQLITE3_TEXT);
//                     $stmt->bindValue(':target', $genesInComplexArray[$j], SQLITE3_TEXT);
//                     $stmt->bindValue(':interaction', $interaction, SQLITE3_TEXT);
//                     $result = $stmt->execute();
//                     if (!$result) {
//                       echo "Error inserting data: " . $db->lastErrorMsg();
//                     }

                    $stmt = $pdo->prepare('INSERT INTO tempNetwork (source, target, interaction) VALUES (:source, :target, :interaction)');
                    $stmt->bindValue(':source', $genesInComplexArray[$i], PDO::PARAM_STR);
                    $stmt->bindValue(':target', $genesInComplexArray[$j], PDO::PARAM_STR);
                    $stmt->bindValue(':interaction', $interaction['interaction'], PDO::PARAM_STR);
                    $result = $stmt->execute();
                    if (!$result) {
                      echo "Error inserting data: " . $pdo->errorInfo();
                    }

                }
            }
        }
    }
}

// $db->close();
$pdo = null;


//   // Trash code from proteinsearcher.php
//execute the query to get the proteinA and proteinB from the database
//$results = $db->query('SELECT proteinA, proteinB FROM pin');

//iterate through each row of the result
//while ($row = $results->fetchArray()) {
//echo the proteinA and proteinB
//echo "ProteinA: " . $row['proteinA'] . " ProteinB: " . $row['proteinB'] . "<br>";
//}
//   //execute query to select complexNumber from tempComplexes where complexId = $row['HuMAP2_ID']
//    $complexNumber = $db->querySingle('SELECT complexNumber FROM tempComplexes WHERE complexId = "'.$row['HuMAP2_ID'].'"');
//    $stmt->bindValue(':complexId', $complexNumber, SQLITE3_TEXT);
//    $result = $stmt->execute();
//    if (!$result) {
//      echo "Error inserting data: " . $db->lastErrorMsg();
//    }
//
//    //insert into tempGenes table the geneNumber and genename
//    $stmt = $db->prepare('INSERT INTO tempGenes (geneNumber, geneName) VALUES (:geneNumber, :geneName)');
//    $stmt->bindValue(':geneNumber', $genecounter, SQLITE3_TEXT);
//    $stmt->bindValue(':geneName', $genename, SQLITE3_TEXT);
//    $result = $stmt->execute();
//    if (!$result) {
//      echo "Error inserting data: " . $db->lastErrorMsg();
//    }
//  //insert into tempComplexes table the complexNumber, HuMAP2_ID, and Confidence
//  $stmt = $db->prepare('INSERT INTO tempComplexes (complexNumber, complexId, confidence) VALUES (:complexNumber, :complexId, :confidence)');
//  $stmt->bindValue(':complexNumber', $complexcounter, SQLITE3_TEXT);
//  $stmt->bindValue(':complexId', $row['HuMAP2_ID'], SQLITE3_TEXT);
//  $stmt->bindValue(':confidence', $row['Confidence'], SQLITE3_TEXT);
//  $result = $stmt->execute();
//
//  if (!$result) {
//    echo "Error inserting data: " . $db->lastErrorMsg();
//  }
            // sameComplex is true if the source and target are in the same complex
//             $idComplexSource = $db->querySingle('SELECT complexid FROM tempMetadata WHERE label = "'.$genesInComplexArray[$i].'"');
//             $idComplexTarget = $db->querySingle('SELECT complexid FROM tempMetadata WHERE label = "'.$genesInComplexArray[$j].'"');
//             $sameComplex = $idComplexSource == $idComplexTarget;
//
//             echo "Same complex: " .
//
// for ($i = 1; $i < $genecounter; $i++) {
//   //for ($j = $i; $j < $genecounter; $j++) {  // upper triangle
//   for ($j = 1; $j < $genecounter; $j++) {  // full matrix
//     if ($i != $j) {
//       //query the tempMetadate table to get the geneName for the source
//       $source = $db->querySingle('SELECT region_name FROM tempMetadata WHERE label = "'.$i.'"');
//       //query the tempMetadate table to get the geneName for the target
//       $target = $db->querySingle('SELECT region_name FROM tempMetadata WHERE label = "'.$j.'"');
//
//       //query the pin table to get the interaction for the source and target
//       $interaction = $db->querySingle('SELECT interaction FROM pin WHERE proteinA = "'.$source.'" AND proteinB = "'.$target.'"');
//       if ($interaction == "") {
//         $interaction = $db->querySingle('SELECT interaction FROM pin WHERE proteinA = "'.$target.'" AND proteinB = "'.$source.'"');
//       }
//
//         //echo the source, target, and interaction
//         echo "Source: " . $source . " Target: " . $target  . " Interaction: " . $interaction . "<br>";
//
//       // sameComplex is true if the source and target are in the same complex
//         $idComplexSource = $db->querySingle('SELECT complexid FROM tempMetadata WHERE label = "'.$i.'"');
//         $idComplexTarget = $db->querySingle('SELECT complexid FROM tempMetadata WHERE label = "'.$j.'"');
//         $sameComplex = $idComplexSource == $idComplexTarget;
//
//         echo "Same complex: " . $sameComplex . "<br>";
//         echo "Complex source: " . $idComplexSource . " Complex target: " . $idComplexTarget . "<br>";

echo "Done!";
?>
