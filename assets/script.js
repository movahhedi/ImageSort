$(() => {
	let images = [];
	let cropper;
	let i = 0;

	$.get("/initials", (response) => {
		console.log(response);
		// response = JSON.parse(response);
		response.Albums.forEach(element => {
			let b = document.createElement("button");
			b.type = "button";
			b.className = "Button AlbumButton";
			b.value = element;
			b.textContent = element;
			$("#TheAlbumButtons").append(b);
		});

		document.getElementById("GoToImage-Index").value = response.AI;
		document.getElementById("GoToImage-Index").placeholder = " 0 - " + response.AI;

		images = response.Images;

		$("#TheInput").attr("src", images[i]);

		cropper = new Cropper(document.getElementById("TheInput"), {
			autoCropArea: 1,
			zoomOnWheel: false,
			viewMode: 1,
			toggleDragModeOnDblclick: false,
		});

		$(".AlbumButton").on("click", () => {
			$.post("/submit",
				{
					"Image": images[i],
					"Album": $(this).val(),
					"Data": JSON.stringify(cropper.getData())
				},
				(response) => {
					i++;
					if (typeof images[i] !== "undefined") {
						cropper.replace(images[i]);
					}
					else {
						$("#TheAlbumButtons").hide();
						ShowToast("Done with images. Double-Click on 'Crop All'", undefined, 20000);
					}
				}
			).fail(() => {
				ShowToast("ERROR");
			});
		});

	});

	// $("#DoCrop").on("click", () => {
	// 	ShowToast("Did you mean to Double-Click?");
	// });

	$("#DoCrop").on("dblclick", () => {
		$("#TheButtons").hide();
		let DoingCropToast = ShowToast("Doing Crop. Wait!", undefined, 1200000);
		$.get("/crop",
			(response) => {
				ShowToast("Crop Done! Now go get some coffee!", undefined, 1200000);
				console.log("Crop Done! Now go get some coffee!");
				console.log(response);
				DoingCropToast.Dismiss();
			}
		).fail(() => {
			ShowToast("ERROR");
		});
	});

	$("#GoToImage-Button").on("click", () => {
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

	$("#Preset-Square").on("click", () => {
		let ImageData = cropper.getImageData();
		let a = Math.min(ImageData.naturalWidth, ImageData.naturalHeight);

		cropper.setData({
			x: (ImageData.naturalWidth - a) / 2,
			y: (ImageData.naturalHeight - a) / 2,
			width: a,
			height: a,
		});
	});

	$("#Preset-IGStory").on("click", () => {
		cropper.setData({
			x: 0,
			y: 200,
			width: 1080,
			height: 1920,
		});
	});
});

function ShowToast(myToastText = "", ToastBackColor = null, ToastDuration = 5000, Options = []) {
	var myToast = document.createElement("div");
	myToast.className = "Toast";
	myToast.IsPinned = Options["IsPinned"] ?? false;

	if ( ! (Options["NoPin"] && Options["NoDismiss"])) {
		var ToastActionBox = document.createElement("div");
		ToastActionBox.className = "ToastActionBox";
		if (ToastBackColor) ToastActionBox.style.backgroundColor = ToastBackColor;
		myToast.appendChild(ToastActionBox);

		if ( ! Options["NoPin"] && ! myToast.IsPinned) {
			var ToastAction_Pin = document.createElement("button");
			ToastAction_Pin.className = "ToastAction Pin";
			ToastActionBox.appendChild(ToastAction_Pin);
			ToastAction_Pin.addEventListener("click", function () {
				myToast.Pin();
			})
		}
		if ( ! Options["NoDismiss"]) {
			var ToastAction_Dismiss = document.createElement("button");
			ToastAction_Dismiss.className = "ToastAction Dismiss";
			ToastActionBox.appendChild(ToastAction_Dismiss);
			ToastAction_Dismiss.addEventListener("click", function () {
				myToast.Dismiss();
			})
		}
	}

	let ToastContent = document.createElement("div");
	ToastContent.className = "ToastContent";
	myToast.appendChild(ToastContent);
	if (ToastBackColor) ToastContent.style.backgroundColor = ToastBackColor;

	if (Options["Title"]) {
		let ToastTitle = document.createElement("h5");
		ToastTitle.className = "ToastTitle";
		ToastTitle.textContent = Options["Title"];
		if (Options["TitleAlign"]) ToastTitle.style.textAlign = Options["TitleAlign"];
		if (Options["TitleSize"]) ToastTitle.style.fontSize = Options["TitleSize"];
		if (Options["TitleWeight"]) ToastTitle.style.fontweight = Options["TitleWeight"];
		ToastContent.appendChild(ToastTitle);
	}

	let ToastText = document.createElement("p");
	ToastText.className = "ToastText";
	ToastText.textContent = myToastText;
	if (Options["TextAlign"]) ToastText.style.textAlign = Options["TextAlign"];
	if (Options["TextSize"]) ToastText.style.fontSize = Options["TextSize"];
	if (Options["TextWeight"]) ToastText.style.fontweight = Options["TextWeight"];
	ToastContent.appendChild(ToastText);

	if (Options["Buttons"]) {
		let ToastButtonBox = document.createElement("div");
		ToastButtonBox.className = "ToastButtonBox";
		ToastContent.appendChild(ToastButtonBox);
		for (const Button of Options["Buttons"]) {
			if (Button["Text"]) {
				let ToastButton = document.createElement("button");
				ToastButton.className = "ToastButton";
				ToastButton.textContent = Button["Text"];
				if (Button["Style"]) ToastButton.classList.add(Button["Style"]);
				if (Button["OnClick"]) ToastButton.addEventListener("click", function () { Button["OnClick"](myToast); });
				ToastButton.addEventListener("hover", function () { Button["OnClick"](myToast); });
				ToastButtonBox.appendChild(ToastButton);
			}
		}
	}

	let ToastProgressBar = document.createElement("div");
	ToastProgressBar.className = "ToastProgressBar";
	ToastContent.appendChild(ToastProgressBar);

	let ToastProgressBar_Value = document.createElement("div");
	ToastProgressBar_Value.className = "ToastProgressBar-Value";
	ToastProgressBar.appendChild(ToastProgressBar_Value);

	myToast.ToastInterval = false;

	myToast.SetText = function (Text = '') {
		ToastText.textContent = Text;
		return true;
	}
	myToast.Dismiss = function (InMS = 0) {
		clearInterval(myToast.ToastInterval);
		return setTimeout(function () {
			requestAnimationFrame(function () {
				myToast.style.height = myToast.scrollHeight + 'px';
				requestAnimationFrame(function () {
					myToast.classList.add("Bye");
					myToast.style.height = 0;
					myToast.style.margin = 0;
					setTimeout(function () {
						myToast.remove();
					}, 500);
				});
			});
		}, InMS);
	}
	myToast.Pin = function (Percent = 0) {
		myToast.IsPinned = true;
		clearInterval(myToast.ToastInterval);
		if (typeof ToastAction_Pin !== 'undefined') ToastAction_Pin.remove();
		ToastProgressBar_Value.style.width = Percent + '%';
		return true;
	}
	myToast.SetPercent = function (Percent = 0) {
		myToast.Pin(Percent);
	}
	myToast.SetInterval = function (DurationMS = 5000, InitialPercent = 0) {
		myToast.IsPinned = false;
		clearInterval(myToast.ToastInterval);
		ToastProgressBar.style.display = 'block';

		myToast.CurrentPercent = InitialPercent;

		myToast.ToastInterval = setInterval(function () {
			if (myToast.CurrentPercent >= 100) {
				clearInterval(myToast.ToastInterval);
				myToast.Dismiss();
			} else {
				myToast.CurrentPercent++;
				ToastProgressBar_Value.style.width = myToast.CurrentPercent + '%';
			}
		}, (DurationMS - 200) / 100);

		if ( ! Options["NoPauseOnHover"]) {
			myToast.addEventListener("mouseenter", function () {
				clearInterval(myToast.ToastInterval);
			})
			myToast.addEventListener("mouseleave", function () {
				if ( ! myToast.IsPinned) {
					myToast.SetInterval(DurationMS, myToast.CurrentPercent)
				}
			})
		}
		return true;
	}

	if ( ! (myToast.IsPinned || ToastDuration === -1)) {
		myToast.SetInterval(ToastDuration);
	}

	let ToastBox = document.getElementById('ToastBox');
	if (ToastBox === null) {
		ToastBox = document.createElement("div");
		ToastBox.id = "ToastBox";
		document.body.prepend(ToastBox);
	}
	ToastBox.appendChild(myToast);
	return myToast;
}
