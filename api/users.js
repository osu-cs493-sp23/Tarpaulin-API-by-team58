const { Router } = require('express')
const { ValidationError } = require('sequelize')
const bcrypt = require("bcryptjs")


const {Assignment} = require('../models/assignment')
const {Course} = require('../models/course')
const {User, userSchema, UserClientFields} = require('../models/user')
const {generateAuthToken, requireAuthentication, isAdmin, optionalAuthentication} = require('../lib/auth.js')
const {validateAgainstSchema} = require("../lib/dataValidation")


const router = Router()

// create user
router.post('/', optionalAuthentication, async function (req, res, next){
	if (!isAdmin(req) && (req.body.role === "admin" || req.body.role === "instructor")){
		res.status(403).json({
			error: "Invalid role to create new user with specified role."
		})
		return
	}

	if (!validateAgainstSchema(req.body, userSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain a valid User object containing required fields: \"name,\" \"email,\" \"password,\" and \"role.\""
		})
		return
	}

	try{
		const user = await User.create(req.body,UserClientFields)

		res.status(201).send({
			id: user.id
		})
	} catch (e) {
		if (e instanceof ValidationError) {
			res.status(400).send({ error: `User already exists with email: ${req.body.email}.`})
		} else {
			next(e)
		}
	}
})

// login the user
router.post('/login', async function (req, res, next) {
	if (req.body && req.body.email && req.body.password){
		try {
			var userData = await User.findOne({
				where: {email: req.body.email}
			})

			if (!userData){
				/* Best practice (and the api spec) dictates a 401 is sent if 
				the user does not exist or has invalid credentials */
				res.status(401).send({
					error: "invalid authentication credential"
				})
				return
			}

			var authenticated = await bcrypt.compare(req.body.password, userData.password)
		
			if (authenticated) {
				//find out this user
				const token = generateAuthToken(userData)
				res.status(200).send({
					token: token
				})
			}else{
				res.status(401).send({
					error: "invalid authentication credential"
				})
			}
		} catch(e) {
		next(e)
		}
	} else {
		res.status(400).send({
			error: "request body requires `email` and `password`."
		})
	}
})

// based on id to get all information about user
// router.get('/:id', requireAuthentication, async function (req, res, next) {
router.get("/:id", optionalAuthentication, async function (req, res, next){
	const userId = parseInt(req.params.id)
	var user = null
	try {
		user = await User.findByPk(userId, {
			attributes: {exclude: ["createdAt", "updatedAt", "password"]},
			include: {
				model: Course,
				as: "courses",
				through: {attributes: []},
				attributes: ["id"]
			}
		})
	} catch (err){
		next(err)
		return
	}
	if (!user){
		next()
		return
	}
	if (req.user && (req.user.id === userId || isAdmin(req))){
		userCourses = []
		if (user.courses && user.courses.length > 0){
			user.courses.forEach(course => {
				userCourses.push(course.dataValues.id)
			});
		}

		res.status(200).json({
			id: user.dataValues.id,
			name: user.dataValues.name,
			email: user.dataValues.email,
			role: user.dataValues.role,
			courses: userCourses
		})
	} else {
		res.status(403).send({
			error: "Unauthorized to access with current credential"
		})
	}
})


module.exports = router