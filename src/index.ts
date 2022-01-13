import express, { Response } from "express"
import bodyParser from "body-parser"
import { Db, MongoClient } from "mongodb"
import cors from "cors"
import path from "path"

const uri =
	"mongodb+srv://m001-student:m001-mongodb-basics@sandbox.tnjgj.mongodb.net/sample_linkedin"
const client = new MongoClient(uri)

async function main() {
	await client.connect()
	console.log("DB:OPEN")
	const db = client.db("sample_linkedin")

	const useDB = async (res: Response, callback: (db: Db) => Promise<void>) => {
		try {
			await callback(db)
			// console.log("DB:CLOSE")
			// client.close()
		} catch (err) {
			res.status(500).json({ message: "An error occurred", err })
		}
	}

	const app = express()
	app.use(bodyParser.json())
	app.use(cors())
	app.use(express.static(path.join(__dirname, "/static")))

	app.get("/articles/:name", async (req, res) => {
		const { name } = req.params

		useDB(res, async (db) => {
			const articleInfo = await db.collection("articles").findOne({ name })
			res.status(200).json(articleInfo)
		})
	})

	app.get("/articles", async (_, res) => {
		useDB(res, async (db) => {
			const articles = await db.collection("articles").find().toArray()
			res.status(200).json(articles)
		})
	})

	app.post("/upvote/:name", async (req, res) => {
		const { name } = req.params

		useDB(res, async (db) => {
			const articlesCollection = db.collection("articles")
			const updateResult = await articlesCollection.updateOne(
				{ name },
				{ $inc: { upvotes: 1 } }
			)

			if (updateResult.modifiedCount >= 1) {
				const article = await articlesCollection.findOne({ name })
				res.status(200).json(article)
			} else {
				res.status(200).json("Upvote not recorded")
			}
		})
	})

	app.post("/articles/comment/:name", async (req, res) => {
		const { user, body } = req.body
		const { name } = req.params

		useDB(res, async (db) => {
			const articlesCollection = db.collection("articles")
			const article = await articlesCollection.findOne({ name })

			if (article?._id) {
				await articlesCollection.updateOne(
					{ name },
					{ $push: { comments: { user, body } } }
				)

				const updatedArticle = await articlesCollection.findOne({ name })
				res.status(200).json(updatedArticle)
			} else {
				res.status(200).send("Article not found")
			}
		})
	})

	app.post("/articles/new-article", async (req, res) => {
		const { title, body } = req.body

		useDB(res, async (db) => {
			const articlesCollection = db.collection("articles")
			const article = await articlesCollection.insertOne({ title, body })
			res.status(200).json(article)
		})
	})

	app.get("*", (_, res) => {
		res.sendFile(path.join(__dirname, "/static/index.html"))
	})

	app.listen(4000, () => {
		console.log("SERVER IS RUNNING")
	})
}

main()
