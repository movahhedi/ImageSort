import $ from "jquery";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.min.css";

const API_URL = "http://localhost:3000";

const ShowToast = console.log;

let TheInput = (<img id="TheInput" />) as HTMLImageElement;

let images = [],
	i = 0,
	cropper: Cropper;

let fetch_response = await fetch(API_URL + "/initials"),
	response: any = await fetch_response.json();
console.log(response);
// response = JSON.parse(response);

let TheAlbumButtons = (
	<div id="TheAlbumButtons">
		{response.Albums.map((album: any) => (
			<button
				type="button"
				class="Button AlbumButton"
				onClick={() => {
					let formData = new FormData();
					formData.append("Image", images[i]);
					formData.append("Album", album);
					formData.append("Data", JSON.stringify(cropper.getData()));

					fetch(API_URL + "/submit", {
						method: "POST",
						mode: "cors",
						// body: formData,
						body: JSON.stringify({
							Image: images[i],
							Album: album,
							Data: JSON.stringify(cropper.getData()),
						}),
						// headers: { "Content-Type": "application/x-www-form-urlencoded" },
						headers: { "Content-Type": "application/json" },
					})
						.then((response) => response.json())
						.then((response) => {
							console.log(response);

							i++;
							if (typeof images[i] !== "undefined") {
								cropper.replace(images[i]);
							} else {
								$("#TheAlbumButtons").hide();
								ShowToast("Done with images. Double-Click on 'Crop All'", undefined, 20000);
							}
						})
						.catch((error) => {
							console.error(error);
							ShowToast("ERROR");
						});
				}}
			>
				{album}
			</button>
		))}
	</div>
);

images = response.Images;

if (!images) {
	console.log("No Images left.");
}
TheInput.src = API_URL + "/" + (images[i] ?? "");

let InitialBody = (
	<div>
		<div id="InputPicDiv">{TheInput}</div>

		<div id="TheButtons">
			{TheAlbumButtons}

			<div>
				<button
					type="button"
					class="Button Red"
					id="DoCrop"
					onClick={() => {
						$("#TheButtons").hide();
						let DoingCropToast = ShowToast("Doing Crop. Wait!", undefined, 1200000);
						fetch(API_URL + "/crop")
							.then((response) => response.json())
							.then((response) => {
								ShowToast("Crop Done! Now go get some coffee!", undefined, 1200000);
								console.log("Crop Done! Now go get some coffee!");
								console.log(response);
								// DoingCropToast.Dismiss();
							})
							.catch((error) => {
								console.error(error);
								ShowToast("ERROR");
							});
					}}
				>
					Crop All
				</button>
			</div>

			<div>
				<button
					type="button"
					class="Button Green"
					id="Preset-IGStory"
					onClick={() => {
						cropper.setData({
							x: 0,
							y: 200,
							width: 1080,
							height: 1920,
						});
					}}
				>
					IG Story
				</button>
				<button
					type="button"
					class="Button Green"
					id="Preset-Square"
					onClick={() => {
						let ImageData = cropper.getImageData();
						let a = Math.min(ImageData.naturalWidth, ImageData.naturalHeight);

						cropper.setData({
							x: (ImageData.naturalWidth - a) / 2,
							y: (ImageData.naturalHeight - a) / 2,
							width: a,
							height: a,
						});
					}}
				>
					Square
				</button>
			</div>

			<div>
				<input
					type="number"
					class="InputText"
					id="GoToImage-Index"
					value={response.AI}
					placeholder={" 0 - " + response.AI}
				/>
				<button
					type="button"
					class="Button Red"
					id="GoToImage-Button"
					onClick={() => {
						let NewIndex = +($("#GoToImage-Index").val() as string);

						if (typeof images[NewIndex] !== "undefined") {
							ShowToast("Went to image " + NewIndex);
							i = NewIndex;
							cropper.replace(images[i]);
						} else {
							ShowToast("Index doesn't exist. the max index is " + (images.length - 1));
						}
					}}
				>
					Go To
				</button>
			</div>
		</div>
	</div>
);

document.body.appendChild(InitialBody);

cropper = new Cropper(TheInput, {
	autoCropArea: 1,
	zoomOnWheel: false,
	viewMode: 1,
	toggleDragModeOnDblclick: false,
});
