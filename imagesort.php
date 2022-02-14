<?php

/**
 * imagesort.php
 *
 * Developed by Shahab Movahhedi
 * me@shmovahhedi.com
 * shmovahhedi.com
 * github.com/movahhedi
 * 
 * @author Shahab Movahhedi <me@shmovahhedi.com>
 */

$Lists = array(
	"Camera",
	"University",
	"Quotes",
	"Memes",
	"Documents",
	"Photography",
	"Memories",
	"Cool",
	"Manuals",
	"Good Moments",
	"Screenshots",
	"To Delete",
);

if ($_POST) {
	if ( ! file_exists($_POST["ListName"])) mkdir($_POST["ListName"]);
	rename($_POST["FileName"], $_POST["ListName"] . "/" . basename($_POST["FileName"]));
}

$images = glob("input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}", GLOB_BRACE);
if ( ! isset($images[0])) {
	echo "Well Done! Now go get some coffee!";
	exit;
}

$Source = $images[0];

?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ImageSort - Developed by Shahab Movahhedi</title>

	<style>
		body {
			margin: 0;
			padding: 0;
		}
		#InputPicDiv {
			display: inline-block;
			width: 70vw;
			vertical-align: top;
			direction: rtl;
		}
		#TheButtons {
			display: inline-block;
			width: 25vw;
			vertical-align: top;
		}
		#TheInput {
			display: block;
			max-width: 99%;
			max-height: 100vh;
		}
		.Button {
			font-size: 1vw;
			font-family: "Segoe UI", sans-serif;
			text-align: center;
			width: 10%;
			margin: 0.5vw 0.75vw;
			padding: 0.5vw 1vw;
			max-width: 100%;
			min-width: 10vw;
			display: inline-block;
			position: relative;
			background-color: #007FFF;
			color: #FFFFFF;
			border-radius: 3vw;
			box-sizing: border-box;
			cursor: pointer;
			border: 1px solid #007FFF;
			-webkit-appearance: none;
			text-decoration: none;
			outline: 0;
		}
	</style>
</head>
<body>
	<div id="InputPicDiv">
		<img id="TheInput" src="<?= $Source ?>" alt="">
	</div>
	<form id="TheButtons" method="post" action="imagesort.php">
		<input type="hidden" name="FileName" value="<?= $Source ?>" />
		<?php
		foreach ($Lists as $i) { ?>
			<button class="Button" type="submit" name="ListName" value="output/<?= $i ?>" ><?= $i ?></button>
		<?php } ?>
	</form>
</body>
</html>