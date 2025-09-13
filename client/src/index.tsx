import { ShowToast, ToastType } from "toastification";
import "toastification/dist/Toast.css";
import $ from "jquery";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.min.css";
import("@fortawesome/fontawesome-free/js/all.min.js");

// @ts-ignore ts(2339)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// const ShowToast = console.log;

let TheInput = (<img id="TheInput" />) as HTMLImageElement;

let images = [],
	i = 0,
	cropper: Cropper;

let fetch_response = await fetch(API_URL + "/initials", {
	// mode: "same-origin",
});
let response = await fetch_response.json();

const PresetButton = ({ Name, onClick }) => (
	<button type="button" class="Button Green" onClick={onClick}>
		{Name}
	</button>
);

let TheAlbumButtons = (
	<div id="TheAlbumButtons">
		{response.albums.map((album: any) => (
			<button
				type="button"
				class="Button AlbumButton"
				onClick={async () => {
					const cropper_Data = cropper.getData();
					console.log("Last Crop Data", cropper_Data);

					try {
						let response = await fetch(API_URL + "/submit", {
							method: "POST",
							mode: "cors",
							// body: formData,
							body: JSON.stringify({
								image: images[i],
								album,
								data: cropper_Data,
							}),
							headers: { "Content-Type": "application/json" },
						});
						response = await response.json();

						console.log(response);

						i++;
						if (typeof images[i] !== "undefined") {
							cropper.replace(API_URL + "/" + (images[i] ?? ""));
						} else {
							$("#TheAlbumButtons").hide();
							ShowToast(ToastType.Info, "Done with images. Double-Click on 'Crop All'", { duration: 20000 });
						}
					} catch (error) {
						console.error(error);
						ShowToast(ToastType.Error, "ERROR");
					}
				}}
			>
				{album}
			</button>
		))}
	</div>
);

images = response.images;

if (!images.length) {
	ShowToast(ToastType.Error, "No Images left");
	console.log("No Images left");
} else {
	TheInput.src = API_URL + "/" + (images[i] ?? "");
}

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
						let DoingCropToast = ShowToast(ToastType.Info, "Doing Crop. Wait!", { duration: 1200000 });
						fetch(API_URL + "/crop")
							.then((response) => response.json())
							.then((response) => {
								ShowToast(ToastType.Successful, "Crop Done! Now go get some coffee!", { duration: 1200000 });
								console.log("Crop Done! Now go get some coffee!");
								console.log(response);
								// DoingCropToast.Dismiss();
							})
							.catch((error) => {
								console.error(error);
								ShowToast(ToastType.Error, "ERROR");
							});
					}}
				>
					Crop All
				</button>
			</div>

			<div>
				<PresetButton
					Name="IG Story"
					onClick={() => {
						cropper.setData({
							x: 0,
							y: 200,
							width: 1080,
							height: 1920,
						});
					}}
				/>
				<PresetButton
					Name="IG Reel"
					onClick={() => {
						cropper.setData({
							x: 0,
							y: 223,
							width: 1080,
							height: 1920,
						});
					}}
				/>
				<PresetButton
					Name="Square"
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
				/>
				<PresetButton
					Name="Abank Receipt"
					onClick={() => {
						cropper.setData({
							x: 0,
							y: 290,
							width: 1080,
							// height: 1390,
							height: 1570,
						});
					}}
				/>
			</div>

			<div>
				<input
					type="number"
					class="InputText"
					id="GoToImage-Index"
					value={response.ai > images.length ? 0 : response.ai}
					placeholder={" 0 - " + images.length}
				/>
				<button
					type="button"
					class="Button Red"
					id="GoToImage-Button"
					onClick={() => {
						let NewIndex = +($("#GoToImage-Index").val() as string);

						if (typeof images[NewIndex] !== "undefined") {
							ShowToast(ToastType.Info, "Went to image " + NewIndex);
							i = NewIndex;
							cropper.replace(API_URL + "/" + (images[i] ?? ""));
						} else {
							ShowToast(ToastType.Error, "Index doesn't exist. the max index is " + (images.length - 1));
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
