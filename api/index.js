const { Router } = require("express")
const router = Router()

//router middleware functions go here
router.use("/users", /* require("./users.js") */ (req, res, next) => {next()})
router.use("/courses", require("./courses.js"))
router.use("/assignments", /* require("./assignments.js") */ (req, res, next) => {next()})


module.exports = router