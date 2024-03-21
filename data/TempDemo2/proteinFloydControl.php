<?php
// Replace the values within the quotes according to your database connection details

require_once('../../config.php'); // Assuming the file is located in the same directory
$db_config = $config['db'];
$db_host = $db_config['host'];
$db_name = $db_config['name'];
$db_user = $db_config['user'];
$db_password = $db_config['password'];


// Create connection
$conn = new mysqli($db_host, $db_user, $db_password, $db_name);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$prot_name = isset($_GET['prot']) ? $_GET['prot'] :  'A0A087WUL8';
$rep_num = isset($_GET['rep']) ? $_GET['rep'] :  '1';

// Prevent SQL injection
$prot_name = $conn->real_escape_string($prot_name);
$rep_num = $conn->real_escape_string($rep_num);

$sql = "SELECT * FROM HEK_SEC_control_$rep_num WHERE UniProt = '$prot_name'";

$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // Output data of each row
    while($row = $result->fetch_assoc()) {
        // loop through the columns

        $count = 0;
        foreach ($row as $key => $value) {
            if ( ($count > 1)  && ($count != (count($row))-1) )

                {
                    $fraction = explode("_", $key);
//                     echo $key . ";" . $value . "\n";
                    echo $fraction[4] . ";" . $value . "\n";
                }
            $count++;
        }

    }
//     echo "</table>";
} else {
    echo "0 results";
}
$conn->close();
?>

