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


app.listen(port, function() {
    console.log("== Server is running on port", port)
})