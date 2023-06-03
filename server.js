const express = require('express')
const app = express()

const port = 8000

app.use(express.json())

app.use(function (req, res, next) {
    console.log("== Request received")
    console.log("   -- Method:", req.method)
    console.log("   -- URL:", req.url)
    next()
})

//This route will catch invalid URL and return
//a response with a 404 status to client
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
  

app.listen(port, function() {
    console.log("== Server is running on port", port)
})