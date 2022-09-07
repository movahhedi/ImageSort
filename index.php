<?php

/**
 * imagesort.php
 *
 * Developed by Shahab Movahhedi
 * shmovahhedi.com
 * dev@shmovahhedi.com
 * github.com/movahhedi
 *
 * @author Shahab Movahhedi <dev@shmovahhedi.com>
 */

$Albums = json_decode(file_get_contents("Albums.json"), true);
$AI = file_get_contents("AI.txt");

// $images = glob("input/*");
$images = glob("input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}", GLOB_BRACE);

?>

<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>ImageSort - Developed by Shahab Movahhedi</title>
	<script src="assets/jquery.min.js"></script>
	<script src="assets/script.js"></script>
	<script src="assets/cropper.min.js"></script>
	<link href="assets/cropper.min.css" rel="stylesheet">
	<link href="assets/reset.css" rel="stylesheet">
	<link href="assets/Toast.css" rel="stylesheet">
	<link href="assets/style.css" rel="stylesheet">
</head>
<body>
	<div id="ToastBox"></div>

	<div id="InputPicDiv">
		<img id="TheInput" src="<?= $Source ?>" alt="">
	</div>

	<div id="TheButtons">
		<div id="TheAlbumButtons">
			<?php
			foreach ($Albums as $i) { ?>
				<button type="button" class="Button AlbumButton" value="<?= $i ?>" ><?= $i ?></button>
				<?php
			} ?>
		</div>

		<div>
			<button type="button" class="Button Red" id="DoCrop" >Crop All</button>
		</div>
		<div>
			<button type="button" class="Button Green" id="Preset-IGStory" >IG Story</button>
			<button type="button" class="Button Green" id="Preset-Square" >Square</button>
		</div>
		<div>
			<input type="number" class="InputText" id="GoToImage-Index" value="<?= $AI ?>">
			<button type="button" class="Button Red" id="GoToImage-Button" >Go To</button>
		</div>
	</div>

	<script>
		var images = `<?= json_encode($images, JSON_HEX_TAG | JSON_HEX_QUOT | JSON_HEX_APOS) ?>`;

		images = JSON.parse(images);
		var i = 0;
		$("#TheInput").attr("src", images[i]);

		const image = document.getElementById("TheInput");
		const cropper = new Cropper(image, {
			autoCropArea: 1,
			zoomOnWheel: false,
			viewMode: 1,
			toggleDragModeOnDblclick: false,
			/*crop(event) {
				CurrentData = event.detail;
				// console.log(CurrentData);
			}*/
		});

		// var CurrentImage = null;
		// var CurrentData = null;

		$(".AlbumButton").on("click", function () {
			SimpleAjax("do.php",
				{
					"Image": images[i],
					"Album": $(this).val(),
					// "Data": JSON.stringify(CurrentData)
					"Data": JSON.stringify(cropper.getData())
				},
				true,
				function (Returned) {
					// console.log("Done!");
					// console.log(Returned);
					// ShowToast("Done");

					i++;
					if (typeof images[i] !== "undefined") {
						cropper.replace(images[i]);
					}
					else {
						$("#TheAlbumButtons").hide();
						ShowToast("Done with images. Double-Click on 'Crop All'", undefined, 20000);
					}
				},
				function () {
					console.log("ERROR");
					ShowToast("ERROR");
				}
			);
		});
		$("#DoCrop").on("click", function () {
			ShowToast("Did you mean to Double-Click?");
		});
		$("#DoCrop").on("dblclick", function () {
			$("#TheButtons").hide();
			let DoingCropToast =  ShowToast("Doing Crop. Wait!", undefined, 1200000);
			SimpleAjax("crop.php",
				{},
				true,
				function (Returned) {
					ShowToast("Crop Done! Now go get some coffee!", undefined, 1200000);
					console.log("Crop Done! Now go get some coffee!");
					console.log(Returned);
					DoingCropToast.Dismiss();
				},
				function () {
					console.log("ERROR");
					ShowToast("ERROR");
					$("#TheButtons").show();
				}
			);
		});

		$("#GoToImage-Button").on("click", function () {
			let NewIndex = $("#GoToImage-Index").val();

			if (typeof images[NewIndex] !== "undefined") {
				ShowToast("Went to image " + NewIndex);
				i = NewIndex;
				cropper.replace(images[i]);
			}
			else {
				ShowToast("Index doesn't exist. the max index is " + (images.length - 1));
			}
		});

		$("#Preset-Square").on("click", function () {
			let ImageData = cropper.getImageData();
			let a = Math.min(ImageData.naturalWidth, ImageData.naturalHeight);

			cropper.setData({
				x: (ImageData.naturalWidth - a) / 2,
				y: (ImageData.naturalHeight - a) / 2,
				width: a,
				height: a,
			});
		});
		$("#Preset-IGStory").on("click", function () {
			cropper.setData({
				x: 0,
				y: 200,
				width: 1080,
				height: 1920,
			});
			// cropper.setCropBoxData({
			// 	top: 200,
			// });
		});
	</script>
</body>
</html>