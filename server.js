const express = require("express");
const day = require(__dirname + "/date");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");

console.log(day());

const app = express();
app.use(bodyparser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

const initialItems = [
	{name: "list-item"},
	{name: "cook-food"},
	{name: "eat-food"},
];

const itemsSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
});

const customItemsSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	item: [itemsSchema],
});

const Items = mongoose.model("Items", itemsSchema);
const CustomItems = mongoose.model("CustomItems", customItemsSchema);

// Database setup
async function databaseofTODO() {
	try {
		await mongoose.connect("mongodb://localhost:27017/itemsLIST", {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});

		const itemsCount = await Items.countDocuments();
		if (itemsCount === 0) {
			await Items.insertMany(initialItems);
			console.log("Initial items inserted");
		}
	} catch (err) {
		console.error("Database error:", err);
	}
}

databaseofTODO()
	.then(() => {
		console.log("Database setup completed successfully");
	})
	.catch(err => {
		console.log("Error in database setup:", err);
	});

app.get("/", async (req, res) => {
	try {
		const allItems = await Items.find({});
		res.render("list", {day: "Today", newListItems: allItems});
	} catch (err) {
		console.error("Error fetching items:", err);
		res.status(500).send("Error fetching items");
	}
});

app.get("/work", (req, res) => {
	res.render("list", {day: "Work List", newListItems: []});
});

app.get("/:customListName", async (req, res) => {
	const customListName = req.params.customListName;
	try {
		let foundList = await CustomItems.findOne({name: customListName});
		if (!foundList) {
			const clist = new CustomItems({
				name: customListName,
				item: initialItems,
			});
			foundList = await clist.save();
			res.redirect(`/${customListName}`);
		} else {
			res.render("list", {
				day: customListName,
				newListItems: foundList.item,
			});
		}
	} catch (err) {
		console.error("Error fetching or creating custom list:", err);
		res.status(500).send("Error fetching or creating custom list");
	}
});

app.post("/", async (req, res) => {
	const newItemName = req.body.newItem;
	const listName = req.body.listName;

	const newItem = {name: newItemName};

	if (listName === "Today") {
		const newItemDoc = new Items(newItem);
		await newItemDoc.save();
		res.redirect("/");
	} else {
		try {
			const foundList = await CustomItems.findOne({name: listName});
			if (foundList) {
				foundList.item.push(newItem);
				await foundList.save();
				res.redirect(`/${listName}`);
			} else {
				const clist = new CustomItems({
					name: listName,
					item: [newItem],
				});
				await clist.save();
				res.redirect(`/${listName}`);
			}
		} catch (err) {
			console.error("Error adding item to custom list:", err);
			res.status(500).send("Error adding item to custom list");
		}
	}
});

app.post("/todelete", async (req, res) => {
	const checkedItemId = req.body.checkbox;
	const listName = req.body.listName;

	if (listName === "Today") {
		await Items.findByIdAndDelete(checkedItemId);
		res.redirect("/");
	} else {
		try {
			const foundList = await CustomItems.findOne({name: listName});
			if (foundList) {
				foundList.item = foundList.item.filter(
					item => item._id.toString() !== checkedItemId
				);
				await foundList.save();
				res.redirect(`/${listName}`);
			}
		} catch (err) {
			console.error("Error deleting item from custom list:", err);
			res.status(500).send("Error deleting item from custom list");
		}
	}
});

app.listen(3000, () => {
	console.log("Server is running at http://localhost:3000");
});
