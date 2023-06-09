const { Router } = require('express')
const { ValidationError } = require('sequelize')
const { User, userSchema, userClientFields } = require("../models/user.js")
const { validateAgainstSchema } = require("../lib/dataValidation.js")

const router = Router()

router.post("/", async function (req, res, next){
	var newUser = req.body
	if (!validateAgainstSchema(newUser, userSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain a valid User object containing required fields: \"name,\" \"email,\" \"password,\" and \"role.\""
		})
		return
	}

	var user = {}
	try {
		user = await User.create(newUser, userClientFields)
	} catch (err){
		if (err instanceof ValidationError){
			res.status(400).json({
				error: "A user already exists with that email."
			})
			return
		}
		next(err)
		return
	}

	res.status(201).json({id: user.id})
})

module.exports = router