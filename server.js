const
	bodyParser = require("body-parser"),
	express = require("express"),
	glob = require("glob"),
	fs = require("fs"),
	fsPromises = require('fs').promises,
	path = require("path"),
	sharp = require("sharp")
;

const
	app = express(),
	OutputFile = "data/output.json",
	AlbumsFile = "data/Albums.json",
	AIFile = "data/AI.txt",
	ErrorsFile = "data/errors.txt"
;

app.use(bodyParser.urlencoded({ extended: false }));

app.use("/data/input", express.static("data/input"));
app.use("/assets", express.static("assets"));

app.get("/", (req, res) => {
	res.sendFile(`${__dirname}/index.html`);
});

app.get("/initials", (req, res) => {
	glob("data/input/{*.jpg,*.jpeg,*.png,*.gif,*.JPG,*.JPEG,*.PNG,*.GIF}", (err, Images) => {
		let Albums = fs.readFileSync(AlbumsFile, 'utf8');
		Albums = JSON.parse(Albums);
		let AI = fs.readFileSync(AIFile, 'utf8');

		res.set('Content-Type', "application/json; charset=utf-8");
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
		let AI = 0;
		if (fs.existsSync(AIFile)) AI = fs.readFileSync(AIFile, 'utf8');
		let Entries = [];
		if (fs.existsSync(OutputFile)) {
			Entries = fs.readFileSync(OutputFile, 'utf8');
			Entries = JSON.parse(Entries);
		}

		Entries.push([AI, req.body.Image, req.body.Album, JSON.parse(req.body.Data)]);
		AI++;
		fs.writeFileSync(AIFile, AI.toString());
		fs.writeFileSync(OutputFile, JSON.stringify(Entries));

		res.send(JSON.stringify({
			Result: true
		}));

	} catch (error) {
		res.send(JSON.stringify({
			Result: false,
			Log: error.message
		}));
	}
});

app.get("/crop", (req, res) => {
	let AI = 0;
	let errors = [];

	try {
		if ( ! fs.existsSync(OutputFile)) {
			res.send(JSON.stringify({
				Result: true,
				Log: "output file doesn't exist."
			}));
			return;
		}

		let Entries = fs.readFileSync(OutputFile, 'utf8');
		Entries = JSON.parse(Entries);
		let EntryPromises = [];
		// [$AI, $_POST["Image"], $_POST["Album"], $ToDo];

		Entries.forEach(i => {
			AI = i[0];
			let ImagePath = i[1];
			let AlbumDir = "data/output/" + i[2];
			let CropData = i[3];
			let OutputPath = AlbumDir + "/" + path.basename(ImagePath);

			CropData = {
				x: Math.round(CropData.x),
				y: Math.round(CropData.y),
				width: Math.round(CropData.width),
				height: Math.round(CropData.height)
			};

			if ( ! fs.existsSync(AlbumDir)){
				fs.mkdirSync(AlbumDir, { recursive: true });
			}

			EntryPromises.push(sharp(ImagePath)
				.metadata()

				.then((metadata) => {
					// Based on EXIF rotation metadata, get the right-side-up width and height
					// https://sharp.pixelplumbing.com/api-input#metadata
					if ((metadata.orientation || 0) >= 5) {
						metadata = {...metadata, width: metadata.height, height: metadata.width };
						CropData = {...CropData, x: CropData.y, y: CropData.x, width: CropData.height, height: CropData.width };
					}
					return [metadata, CropData];
				})

				.then(((AI, values) => {
					const [metadata, CropData] = values;
					if ((CropData.x == 0 && CropData.y == 0 && CropData.width == metadata.width && CropData.height == metadata.height) || (CropData.width == 0 || CropData.height == 0)) {
						return fsPromises.copyFile(ImagePath, OutputPath);
					}
					else {
						return sharp(ImagePath)
							.extract({
								left: CropData.x,
								top: CropData.y,
								width: CropData.width,
								height: CropData.height
							})
							.withMetadata()
							.toFile(OutputPath);
					}
				}).bind(null, AI))

				.catch(((AI, error) => {
					errors.push([AI, error.message]);
					console.log(`--${AI}--` + error.message);
					fs.appendFile(ErrorsFile, `--${AI}--` + error.message + "\r\n", () => {});
				}).bind(null, AI))
			);
		});

		Promise.all(EntryPromises).then(() => {
			res.send(JSON.stringify({
				Result: true,
				Errors: errors
			}));
		});

	} catch (error) {
		errors.push([AI, error.message]);
		fs.appendFile(ErrorsFile, `--${AI}--` + error.message + "\r\n", () => {});

		res.send(JSON.stringify({
			Result: false,
			Errors: errors,
			error: error
		}));
	}
});

app.listen(3000, () => {
	console.log("Started on http://localhost:3000");
});
