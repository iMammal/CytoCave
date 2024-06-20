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


$debug = false;
$debug = $_GET['debug'];

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
  $searchGene = "PSMB5 CCT5"; //"GAK";
}

//get scaleFactor name from the url
$scaleFactor = $_GET['scale'];
//sanitize the sclae factor
$scaleFactor = filter_var($scaleFactor, FILTER_SANITIZE_STRING);
//if search term is empty, set it to empty string
if ($scaleFactor == "" || $scaleFactor == null || $scaleFactor == "undefined") {
    $scaleFactor = 30;
 }

// drop tables tempTopology, tempNetwork, tempMetadata if they exist
// $db->exec('DROP TABLE IF EXISTS tempTopology');
// $db->exec('DROP TABLE IF EXISTS tempNetwork');
// $db->exec('DROP TABLE IF EXISTS tempMetadata');
//$db->exec('DROP TABLE IF EXISTS tempComplexes');
//$db->exec('DROP TABLE IF EXISTS tempGenes');



// create table tempTopology with columns label, complexId with unique constraint on label that automatically increments with PDO
// $db->exec('CREATE TABLE tempTopology (label TEXT, complexIdClustering TEXT, Flat_X REAL, Flat_Y REAL, Flat_Z REAL, PRIMARY KEY (label) )');
$pdo->query('CREATE TABLE IF NOT EXISTS tempTopology (label INT PRIMARY KEY, complexIdClustering TEXT, Flat_X REAL, Flat_Y REAL, Flat_Z REAL, Square_X REAL, Square_Y REAL, Square_Z REAL)');
$pdo->query('DELETE FROM tempTopology');

// create table tempNetwork with columns source, target, interaction
$pdo->query('CREATE TABLE IF NOT EXISTS tempNetwork (source TEXT, target TEXT, interaction TEXT)');
$pdo->query('DELETE FROM tempNetwork');

// create table tempMetadata with columns label,complexId, geneName, confidence
$pdo->query('CREATE TABLE IF NOT EXISTS tempMetadata (label TEXT, complexid TEXT, region_name TEXT, uniprotAcc TEXT, confidence TEXT, hemisphere TEXT)');
$pdo->query('DELETE FROM tempMetadata');

// create table tempComplexes with columns complexNumber, complexId, confidence
//$db->exec('CREATE TABLE tempComplexes (complexNumber INTEGER, complexId TEXT, confidence TEXT)');

//// create table tempGenes with columns geneNumber, geneName
//$db->exec('CREATE TABLE tempGenes (geneNumber INTEGER, geneName TEXT)');


function generateGridPointsWithDistance($N,$y = 50) {
    $result = array(
        'distance' => 0,
        'points' => array()
    );

    // Calculate the distance between points, avoiding division by zero when N=1
    $result['distance'] = $N > 1 ? 200 / ($N - 1) : 200;

    // Generate points
    for ($i = 0; $i < $N; $i++) {
        // Calculate the x coordinate, start from 0 and space them evenly.
        $x = $i * $result['distance'];

        // For simplicity, set y to a fixed value, e.g., 50, to place points in the middle of the grid vertically.
        // Alternatively, distribute Y evenly if the problem requires.
//         $y = 50; // get this from the input or calculate it based on the number of points

        // Add the coordinates to the array as floats.
        $result['points'][] = array((float) $x, (float) $y);
    }

    return $result;
}

function generateSquareGridPoints($N) {
    $result = array(
        'distance' => 0,
        'points' => array()
    );

    // Determine the number of points per side for a square layout
    $pointsPerSide = ceil(sqrt($N));

    // Adjust the distance calculation for a 100x100 grid
    $result['distance'] = 200 / max($pointsPerSide - 1, 1);

    // Generate points for a square grid
    for ($i = 0; $i < $pointsPerSide; $i++) {
        for ($j = 0; $j < $pointsPerSide; $j++) {
            // Check if we've added enough points
            if (count($result['points']) >= $N) {
                break 2; // Exit both loops
            }

            // Calculate the coordinates
            $x = $i * $result['distance'];
            $y = $j * $result['distance'];

            // Add the coordinates to the array as floats
            $result['points'][] = array((float) $x, (float) $y);
        }
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


// read pin table into memory
$results = $pdo->query('SELECT proteinA, proteinB, interaction FROM pin LIMIT 100000');
$pin = array();
$geneInterX = array();
// while ($row = $results->fetchArray()) {

// load PIN as sparse matrix
foreach ($results as $row) {
  //array_push($pin, $row);
//   $pin[$row['proteinA']][$row['proteinB']] = $row['interaction'];

    if($row[2] > 0.05) {
        $pin[$row[0]][$row[1]] = $row[2];
        $pin[$row[1]][$row[0]] = $row[2];

        $genesInterX[$row[0]] = $row[1];
        $genesInterX[$row[1]] = $row[0];

        if($debug > 4) echo json_encode($row);
        if($debug > 3) echo $row['proteinA'].','.$row['proteinB'].':'.$row['interaction'].'<BR>';
    }
}

if($debug > 2) print_r($pin);



// replaces spaces in SearchGene with commas
//$searchGene = str_replace(' ', "%' or genenames like '%", $searchGene);
echo "Searchinng for: " . $searchGene;

// split the searchGene by space into an array
$searchGeneArray = explode(" ", $searchGene);

// echo "Searchinng for: " . $searchGene;
echo "Searchinng for: " . json_encode($searchGeneArray);

// create a list of lists fom the searchGeneArray where each element that starts with HuMAP2_ begins a new row
// Note: this only allows for one complex and will need to be modified for multiple complexes
// $searchGeneList = array();
// foreach ($searchGeneArray as $gene) {
//     echo "Processing gene: " . $gene . "," .count($searchGeneList). "<br>";
//     if (strpos($gene, 'HuMAP2_') === 0) {
//         echo "Found complex: " . $gene . "<br>";
//         $searchGeneList[count($searchGeneList)] = array();
//         $searchGeneList[count($searchGeneList)][0] = $gene;
//     }else{
//         $searchGeneList[count($searchGeneList)][count($searchGeneList[count($searchGeneList)])] = $gene;
//         echo "Adding gene to complex: " . $gene . "," .count($searchGeneList). "<br>";
//
//     }
// }
// Rewrite the above code to use a counter instead of count
$searchGeneList = array();
$complexCounter = 0;
$assembliesCounter = 0;
foreach ($searchGeneArray as $gene) {
    echo "Processing gene: " . $gene . "," . $complexCounter . "<br>";
    if (strpos($gene, 'HuMAP2_') === 0) {
        echo "Found complex: " . $gene . "<br>";
        $searchGeneList[$complexCounter] = array();
        $searchGeneList[$complexCounter][0] = $gene;
        $complexCounter++;
        $assembliesCounter = 0;
    } else {
        $searchGeneList[$complexCounter - 1][count($searchGeneList[$complexCounter - 1])] = $gene;
        echo "Adding gene to complex: " . $gene . "," . $complexCounter .  "," . $assembliesCounter . "<br>";
        $assembliesCounter++;
    }
}

echo "Searchinng for: " . json_encode($searchGeneList);



//execute the query to get the number of rows from the database
// $query = "SELECT COUNT(*) FROM table_name";
//$query = 'SELECT count(*)  FROM HuMAP2_ID where genenames like "%'.$searchGene.'%" '; //todo: Do we want to search substrings?
//$query = "SELECT count(*)  FROM HuMAP2_ID where genenames like '%".$searchGene."%' "; // or multiple genes, or both?


$query = "SELECT count(*)  FROM HuMAP2_ID where HuMAP2_ID like '%".$searchGeneList[0][0]."%' ";

if ($debug) echo $query; //'SELECT count(*)  FROM HuMAP2_ID where genenames in ("'.$searchGene.'") '; //dump php variable to console
$result = $pdo->query($query);

if($result) {
//     $numRows = $result->fetchArray();
    $numRows = $result->fetch(PDO::FETCH_NUM);
    echo "Number of rows: " . $numRows[0] . "Searchinng for 0: " . json_encode($searchGeneList[0]);
    $N = $numRows[0] * count($searchGeneList[0]);
} else {
    echo "Error getting number of rows: " . $pdo->errorInfo();
    $N = 0;
}

//execute the query to get the HuMAP2_ID, Confidence, Uniprot_ACCs, and genenames from the database
//$query = 'SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where genenames like "%'.$searchGene.'%" '; //todo: Do we want to search substrings?
//$query = 'SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where genenames  "('.$searchGene.')" '; // or multiple genes, or both?
//$query = "SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where genenames like '%".$searchGene."%' "; //todo: Do we want to search substrings?
// $query = "SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where genenames like '%".$searchGene."%' "; //todo: Do we want to search substrings?
$query = "SELECT HuMAP2_ID, Confidence, Uniprot_ACCs, genenames FROM HuMAP2_ID where HuMAP2_ID like '%".$searchGeneList[0][0]."%' ";


//dump php variable to console
//var_dump($query);
$results = $pdo->query($query);

echo json_encode($results);
$genecounter = 1;
$complexcounter = 1;
$searchTermCounter = 1;

$jsonReturn = array();

$complexMap = array();
$genesInComplexes = array();

$tempTopology = array();
$tempMetadata = array();
$tempNetwork = array();

//generate the grid points
$grid = generateGridPointsWithDistance($N);
$gridPoints = $grid['points'];
$gridDistance = $grid['distance'] * 0.85;

//generate the square grid points
$gridSquare = generateSquareGridPoints($N);
$gridPointsSquare = $gridSquare['points'];
$gridDistanceSquare = $gridSquare['distance'] * 0.85;



//echo the grid points
echo "Grid points: " . json_encode($gridPoints) . "<br>";
echo "Grid distance: " . $gridDistance . "<br>";

//iterate through each row of the result
// while ($row = $results->fetchArray()) {
foreach ($results as $row) {
foreach ( $searchGeneList[0] as $assy) {

  //echo the HuMAP2_ID, Confidence, Uniprot_ACCs, and genenames
  echo "HuMAP2_ID: " . $row['HuMAP2_ID'] . " Confidence: " . $row['Confidence'] . " Uniprot_ACCs: " . $row['Uniprot_ACCs'] . " genenames: " . $row['genenames'] . "<br>";

  $complexId = $row['HuMAP2_ID'];

  $complexIdAssy = $complexId . '_'. $complexcounter;

  //push the HuMAP2_ID and complexcounter to complexMap
  $complexMap[$complexIdAssy] = $complexcounter;

  $genesInComplexes[$complexIdAssy] = array();

  // split the genenames by space
  $genenamesRaw = explode(" ", $row['genenames']);

  $genenames = array();

  // split the Uniprot_ACCs by space
  $uniprotAccsRaw = explode(" ", $row['Uniprot_ACCs']);

  $uniprotAccs = array();

  $geneIndex = 0;
  foreach ( $genenamesRaw as $gene) {
    if($genesInterX[$gene]){
        array_push($genenames,$gene);
        array_push($uniprotAccs,$uniprotAccsRaw[$geneIndex]);
        $geneIndex = $geneIndex + 1;
    }
  }



  //generate the polygon points
  $M = count($genenames);



  $geneFlatCoordinates = generatePolygonPoints($M, $gridPoints[$complexcounter - 1], $gridDistance/(3-$M/$scaleFactor));

  $geneFlatCoordinatesSquare = generatePolygonPoints($M, $gridPointsSquare[$complexcounter - 1], $gridDistanceSquare/(3-$M/$scaleFactor));

    //echo the genenames
    echo "Genenames: " . json_encode($genenames) . "<br>";

    //echo the geneFlatCoordinates
    echo "GeneFlatCoordinates: " . json_encode($geneFlatCoordinates) . "<br>";

    //echo the geneFlatCoordinatesSquare
    echo "GeneFlatCoordinatesSquare: " . json_encode($geneFlatCoordinatesSquare) . "<br>";

  $mygenecounter = 0;


  //iterate through each genename
  foreach ($genenames as $genename) {
    //echo the genename with counter echo "Genename".$genecounter.": " . $genename . "<br>";

    $uniprotAcc = $uniprotAccs[$mygenecounter];
    echo "Uniprot_ACC: " . $uniprotAcc . "<br>";
    echo "complexId:".$complexIdAssy."<br>";
    echo "Genename:".$genecounter.": " . $genename . "<br>";

    // push the gene label into the genesInComplexes array
    array_push($genesInComplexes[$complexIdAssy], $genecounter);


    //insert into tempTopology table the HuMAP2_ID and genenames with label counting up from 1 with PDO
    $stmt = $pdo->prepare('INSERT INTO tempTopology (label, complexIdClustering, Flat_X, Flat_Y, Flat_Z , Square_X, Square_Y, Square_Z) VALUES (:label, :complexIdClustering, :Flat_X, :Flat_Y, :Flat_Z, :Square_X, :Square_Y, :Square_Z)');
    $stmt->bindValue(':label', $genecounter, PDO::PARAM_STR);
    $stmt->bindValue(':complexIdClustering', $complexcounter, PDO::PARAM_STR); // $row['HuMAP2_ID']
    $stmt->bindValue(':Flat_X', $geneFlatCoordinates[$mygenecounter][0], PDO::PARAM_STR);
    $stmt->bindValue(':Flat_Y', 0, PDO::PARAM_STR);
    $stmt->bindValue(':Flat_Z', $geneFlatCoordinates[$mygenecounter][1], PDO::PARAM_STR);
    $stmt->bindValue(':Square_X', $geneFlatCoordinatesSquare[$mygenecounter][0], PDO::PARAM_STR);
    $stmt->bindValue(':Square_Y', 0, PDO::PARAM_STR);
    $stmt->bindValue(':Square_Z', $geneFlatCoordinatesSquare[$mygenecounter][1], PDO::PARAM_STR);

    $result = $stmt->execute();
    if (!$result) {
        echo ':Square_X'.$geneFlatCoordinatesSquare[$mygenecounter][0].'<br>';
        echo ':Square_Y.0.<br>';
        echo ':Square_Z'.$geneFlatCoordinatesSquare[$mygenecounter][1].'<br>';
        echo "Error inserting data into tempTopology: " . json_encode($pdo->errorInfo());
    }

    array_push($tempTopology,array(
      'label' => $genecounter,
      'complexIdClustering' => $complexcounter,
      'Flat_X' => $geneFlatCoordinates[$mygenecounter][0],
      'Flat_Y' => 0,
      'Flat_Z' => $geneFlatCoordinates[$mygenecounter][1]
    ));





    //insert into tempMetadata table the label, clusterid, region_name, and confidence with PDO
    $query = 'INSERT INTO tempMetadata (label, complexid, region_name, uniprotAcc, confidence, hemisphere) VALUES (:label, :complexid, :region_name, :uniprotAcc, :confidence, :hemisphere)';
    $stmt = $pdo->prepare($query);
    $stmt->bindValue(':label', $genecounter, PDO::PARAM_STR);
    // concatenate the complexId with the complexcounter and bind to complexId
    $stmt->bindValue(':complexid', $complexId . '_'. $complexcounter, PDO::PARAM_STR);
    $stmt->bindValue(':region_name', $genename, PDO::PARAM_STR);
    $stmt->bindValue(':uniprotAcc', $uniprotAcc, PDO::PARAM_STR);
    $stmt->bindValue(':confidence', $row['Confidence'], PDO::PARAM_STR);
    $stmt->bindValue(':hemisphere', "left", PDO::PARAM_STR);
    $result = $stmt->execute();
    if (!$result) {
      echo "Error inserting data into tempMetadata: " . $pdo->errorInfo();
    }

//     array_push(
    $tempMetadata[ $genecounter ] = array(
      'label'=> $genecounter,
      'complexid'=> $complexId,
      'region_name'=> $genename,
      'uniprotAccs'=> $uniprotAccs[$mygenecounter],
      'confidence'=>$row['Confidence'],
      'hemisphere'=> "left"
    );

    //increment the counters
    $genecounter++;
    $mygenecounter++;

  }

  //insert into tempTopology table the HuMAP2_ID and genenames with label counting upp from 1

  $complexcounter++;
} //foreach ( $assy in $searchGeneList[0] )
} //foreach ($results as $row) {


$source = null;
$target = null;
$interaction = null;

// for each number from 1 to genecounter, insert into tempNetowrk table the source, target, and interaction
// Also, only insert if source and target are in the same complex

// first loop through all the complexed

//for ($c = 1; $c < $complexcounter; $c++) {
foreach ($complexMap as $complexId => $c) {
    // get all the genes in the complex
    $genesInComplex = $pdo->query('SELECT label,region_name FROM tempMetadata WHERE complexid = "'.$complexId.'"');
    // Todo: popular the genesInComplex array from table tempMetadata isntead of query

    $genesInComplexArray = array();
    foreach ($genesInComplex as $row) {
        if ($genesInterX[$row['region_name']]) {
            echo "INSERTING".json_encode($row)."<BR>";
            array_push($genesInComplexArray, $row['label']);
        }
    }
    //echo the genes in the complex
    echo "Genes in complex: " . json_encode($genesInComplexArray) . "<br>";

    // for each gene in the complex, insert into tempNetwork table the source, target, and interaction
    for ($i = 0; $i < count($genesInComplexArray); $i++) {
        for ($j = 0; $j < count($genesInComplexArray); $j++) {
            if ($i != $j) {

                $source = $tempMetadata[$genesInComplexArray[$i]]['region_name'];
                $target = $tempMetadata[$genesInComplexArray[$j]]['region_name'];




                // read interaction from sparse matrix
                $interaction = $pin[$source][$target];

                //echo the source, target, and interaction
                if($debug) {
                    echo "Source: " . json_encode($source) . " Target: " . json_encode($target)  . " Interaction: " . json_encode($interaction) . "<br>";
                }

                // if the interaction is empty, query the pin table to get the interaction for the target and source

                if ( ($interaction > 0.05) ) {

                    //echo the source, target, and interaction
                    if($debug) {
                        echo "Source: " . json_encode($source) . " Target: " . json_encode($target)  . " Interaction: " . json_encode($interaction) . "<br>";
                    } else {
                        //echo "Interaction: " . json_encode($interaction) ."<BR>";
                    }

                    $stmt = $pdo->prepare( 'INSERT INTO tempNetwork (source, target, interaction) VALUES ( :source, :target, :interaction )'  );
                    $stmt->bindValue(':source', $genesInComplexArray[$i], PDO::PARAM_STR);
                    $stmt->bindValue(':target', $genesInComplexArray[$j], PDO::PARAM_STR);
                    $stmt->bindValue(':interaction', $interaction, PDO::PARAM_STR);
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



echo "Done!";
?>
