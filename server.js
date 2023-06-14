require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const path = require('path')

const { limitRate, connectToRedisServer } = require("./lib/rateLimiting.js")
const api = require('./api')
const sequelize = require('./lib/sequelize')

const app = express()
const port = process.env.PORT || 8000

app.use(morgan('dev'))
app.use(express.json())

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* 
 * Send all requests through the rate limiter which will decide if they get 
 * sent on to the api.
 */
app.use(limitRate)

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.
 */
app.use('/', api)

/*
 * This route will catch invalid URL and return a response with a 404 status 
 * to the client
 */
app.use('*', function (req, res, next) {
    res.status(404).json({
      error: `Requested URL does not exist: ${req.originalUrl}`
    })
})

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('*', function (err, req, res, next) {
    console.error("== Error:", err)
    res.status(500).send({
        err: "Server error.  Please try again later."
    })
})
  
/*
 * Start the API server listening for requests after establishing a connection
 * to the MySQL and redis servers
 */
sequelize.sync().then(async function () {
    try {
		await connectToRedisServer()
	} catch (err){
		console.log("Could not connect to redis server. Error:", err)
		return
	}
	app.listen(port, function() {
      console.log("== Server is running on port", port)
    })
  })