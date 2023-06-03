const express = require('express')
const app = express()
const sequelize = require("./lib/sequelize.js")

const api = require("./api")

const port = 8000

app.use(express.json())

app.use(function (req, res, next) {
    console.log("== Request received")
    console.log("   -- Method:", req.method)
    console.log("   -- URL:", req.url)
    next()
})

app.use("/", api)

app.use("*", function (req, res, next){
	res.status(404).json({error: `${req.originalUrl} does not exist.`})
})

app.use("*", function (err, req, res, next){
	res.status(500).json({error: "Server error. Please try again later"})
})

sequelize.sync().then(function (){
	app.listen(port, function() {
		console.log("== Server is running on port", port)
	})
})