<?php
// Replace the values within the quotes according to your database connection details

require_once('../config.php'); // Assuming the file is located in the same directory
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

$gene_name = isset($_GET['gene']) ? $_GET['gene'] : 'GAK';

// Prevent SQL injection
$gene_name = $conn->real_escape_string($gene_name);

$sql = "SELECT * FROM gene_data WHERE gene_name = '$gene_name'";

$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // Output data of each row
    while($row = $result->fetch_assoc()) {
        // loop through the columns

        $count = 0;
        foreach ($row as $key => $value) {
            if ( ($count > 1)  && ($count != (count($row))-1) )

                {
                    echo $key . ";" . $value . "\n";
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

