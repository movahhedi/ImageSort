// Thanks to
// https://codeforgeek.com/handle-get-post-request-express-4/
// https://www.digitalocean.com/community/tutorials/how-to-process-images-in-node-js-with-sharp

import bodyParser from "body-parser";
import express from "express";
import { glob } from "glob";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import sharp from "sharp";
import cors from "cors";

const app = express(),
	SERVER_PORT = process.env.SERVER_PORT || 3000,
	OutputFile = "data/output.json",
	AlbumsFile = "data/Albums.json",
	AIFile = "data/AI.txt",
	ErrorsFile = "data/errors.txt";

let ImagesGlob;

app.use(cors());
app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.use("/data/input", express.static("data/input"));
app.use("/assets", express.static("assets"));

// app.get("/", (req, res) => {
// 	res.sendFile(`${__dirname}/index.html`);
// });

app.get("/initials", async (req, res) => {
	glob("data/input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}").then((Images) => {
		let Albums = fs.readFileSync(AlbumsFile, "utf8");
		Albums = JSON.parse(Albums);
		let AI = 0;

		ImagesGlob = Images;

		if (fs.existsSync(AIFile)) AI = +fs.readFileSync(AIFile, "utf8");
		fs.writeFileSync(AIFile, AI.toString());

		res.set("Content-Type", "application/json; charset=utf-8");
		res.send(
			JSON.stringify({
				Albums: Albums,
				Images: Images,
				AI: AI,
			})
		);
	});
});

app.post("/submit", (req, res) => {
	try {
		let AI = 0,
			Entries = [];
		if (fs.existsSync(AIFile)) AI = +fs.readFileSync(AIFile, "utf8");
		if (fs.existsSync(OutputFile)) {
			Entries = fs.readFileSync(OutputFile, "utf8");
			Entries = JSON.parse(Entries);
		}
		Entries.push([AI, req.body.Image, req.body.Album, JSON.parse(req.body.Data)]);
		AI++;
		fs.writeFileSync(AIFile, AI.toString());
		fs.writeFileSync(OutputFile, JSON.stringify(Entries));

		res.send(
			JSON.stringify({
				Result: true,
			})
		);
	} catch (error) {
		console.log(error);
		res.send(
			JSON.stringify({
				Result: false,
				Log: error.message,
				Stack: error.stack,
			})
		);
	}
});

app.get("/crop", (req, res) => {
	let AI = 0;
	let errors = [];

	try {
		if (!fs.existsSync(OutputFile)) {
			res.send(
				JSON.stringify({
					Result: true,
					Log: "output file doesn't exist.",
				})
			);
			return;
		}

		let Entries = fs.readFileSync(OutputFile, "utf8");
		Entries = JSON.parse(Entries);
		let EntryPromises = [];
		// [$AI, $_POST["Image"], $_POST["Album"], $ToDo];

		Entries.forEach((i) => {
			AI = i[0];
			let ImagePath = i[1];
			let AlbumDir = "data/output/" + i[2];
			let CropData = i[3];
			let OutputPath = AlbumDir + "/" + path.basename(ImagePath);

			CropData = {
				x: Math.round(CropData.x),
				y: Math.round(CropData.y),
				width: Math.round(CropData.width),
				height: Math.round(CropData.height),
			};

			if (!fs.existsSync(AlbumDir)) {
				fs.mkdirSync(AlbumDir, { recursive: true });
			}

			EntryPromises.push(
				sharp(ImagePath)
					.metadata()
					.then((metadata) => {
						// Based on EXIF rotation metadata, get the right-side-up width and height
						// https://sharp.pixelplumbing.com/api-input#metadata
						if ((metadata.orientation || 0) >= 5) {
							metadata = { ...metadata, width: metadata.height, height: metadata.width };
							CropData = {
								...CropData,
								x: CropData.y,
								y: CropData.x,
								width: CropData.height,
								height: CropData.width,
							};
						}
						return [metadata, CropData];
					})
					.then(
						((AI, values) => {
							const [metadata, CropData] = values;
							if (
								(CropData.x == 0 &&
									CropData.y == 0 &&
									CropData.width == metadata.width &&
									CropData.height == metadata.height) ||
								CropData.width == 0 ||
								CropData.height == 0
							) {
								// return fsPromises.rename(ImagePath, OutputPath);
								return fsPromises.copyFile(ImagePath, OutputPath);
							} else {
								return sharp(ImagePath)
									.extract({
										left: CropData.x,
										top: CropData.y,
										width: CropData.width,
										height: CropData.height,
									})
									.withMetadata()
									.toFile(OutputPath);
								// .then(() => fsPromises.unlink(ImagePath, OutputPath));
							}
						}).bind(null, AI)
					)
					.catch(
						((AI, error) => {
							errors.push([AI, error.message]);
							console.log(`--${AI}--` + error.message);
							fs.appendFile(ErrorsFile, `--${AI}--` + error.message + "\r\n", () => {});
						}).bind(null, AI)
					)
			);
		});

		let SortedDir = "data/input/Sorted-" + Date.now();

		Promise.all(EntryPromises)
			.then(() => {
				fs.mkdirSync(SortedDir, { recursive: true });

				ImagesGlob.forEach((ImagePath) => {
					let OutputPath = SortedDir + "/" + path.basename(ImagePath);
					fsPromises.rename(ImagePath, OutputPath);
				});
			})
			.then(() => {
				res.send(
					JSON.stringify({
						Result: true,
						Errors: errors,
					})
				)
				console.log("Done");
			});
	} catch (error) {
		console.log(error);
		errors.push([AI, error.message]);
		fs.appendFile(ErrorsFile, `--${AI}--` + error.message + "\r\n", () => {});

		res.send(
			JSON.stringify({
				Result: false,
				Errors: errors,
				error: error,
			})
		);
	}
});

app.listen(SERVER_PORT, () => {
	console.log("Started on http://localhost:" + SERVER_PORT);
});
