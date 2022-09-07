<?php
require_once "ImageResize.php";

$AI = file_get_contents("AI.txt");

$DoneBefore = [];
if (file_exists("output.json")) {
	$DoneBefore = json_decode(file_get_contents("output.json"), true);
}

$ToDo = json_decode($_POST["Data"], true);

// $image = new ImageResize($_POST["Image"]);
// $image->freecrop($ToDo["width"], $ToDo["height"], $ToDo["x"], $ToDo["y"]);
// $image->save("output/{$i}.jpg");

$DoneBefore[] = [$AI, $_POST["Image"], $_POST["Album"], $ToDo];

$AI++;
file_put_contents("AI.txt", $AI);

file_put_contents("output.json", json_encode($DoneBefore));

echo json_encode([
	"Result" => "success"
]);
