const { Router } = require('express')
const { ValidationError } = require('sequelize')
const bcrypt = require("bcryptjs")


const {Assignment} = require('../models/assignment')
const {Course} = require('../models/course')
const {User, UserClientFields} = require('../models/user')
const {generateAuthToken, requireAuthentication, isAdmin} = require('../lib/hateoasHelpers')


const router = Router()

// create user
router.post('/', async function (req, res, next){
	if (!isAdmin(req) && req.body.admin){
		res.status(403).json({
			error: "Invalid role to create Admin"
		})
		return
	}
	try{
		const user = await User.create(req.body,UserClientFields)
		const hash = await bcrypt.hashSync(user.password, 8)
		user.password = hash
		console.log(" -- userToInsert:", user)

		res.status(201).send({
			id: user.id
		})
	} catch (e) {
		if (e instanceof ValidationError) {
			res.status(400).send({ error: e.message})
		} else {
			next(e)
		}
	}
})

// login the user
router.post('/login', async function (req, res, next) {
	if (req.body && req.body.id && req.body.password ) {
		try {
			authenticated = await User.findByPk(req.body.id)
			authenticated = await bcrypt.compare(req.body.password, authenticated.password)
		
			if (authenticated) {
			//find out this user
			const userData = await User.findByPk(req.body.id)
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
			err: "request body requires `id` and `password`."
		})
	}
})

// based on id to get all information about user
router.get('/:id', requireAuthentication, async function (req, res, next) {
	if (req.user === Number(req.params.id) || isAdmin(req)) {
		try {
			const user = await User.findByPk(req.params.id)
			if (user) {
				res.status(200).send({
				username: user.name,
				email: user.email,
				role: user.role
			})
		} else {
			next()
		}
		} catch (e) {
			next(e)
		}
	} else {
		res.status(403).send({
			error: "Unauthorized to access the specific resource"
		})
	}
})


module.exports = router
