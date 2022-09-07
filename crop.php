<?php
ini_set("max_execution_time", 0); // 0 = Unlimited
ini_set("memory_limit", "1024M");

require_once "ImageResize.php";

$DoneBefore = json_decode(file_get_contents("output.json"), true);

$Errors = [];
foreach ($DoneBefore as $key => $i) {
	// [$AI, $_POST["Image"], $_POST["Album"], $ToDo];
	try {
		if ( ! file_exists("output/{$i[2]}")) mkdir("output/{$i[2]}");

		list($OriginalWidth, $OriginalHeight) = getimagesize($i[1]);
		if ( $i[3]["x"] == 0 && $i[3]["y"] == 0 && $OriginalWidth == $i[3]["width"] && $OriginalHeight == $i[3]["height"]) {
			rename($i[1], "output/{$i[2]}/" . basename($i[1]));
			// copy($i[1], "output/{$i[2]}/" . basename($i[1]));
		}
		else {
			$image = new ImageResize($i[1]);
			$image->freecrop($i[3]["width"], $i[3]["height"], $i[3]["x"], $i[3]["y"]);
			$image->save("output/{$i[2]}/" . basename($i[1]));
		}

	} catch (Exception $ex) {
		$Errors[] = "--{$i[0]}--" . $ex->getMessage();
		file_put_contents("errors.txt", "--{$i[0]}--" . $ex->getMessage() . "\r\n", FILE_APPEND);
	}
}

echo json_encode([
	"Result" => "success",
	"Log" => json_encode($Errors)
]);
