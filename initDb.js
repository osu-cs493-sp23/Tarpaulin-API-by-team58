require('dotenv').config()
const {User, UserClientFields} = require('./models/user.js')
const sequelize = require("./lib/sequelize.js")

sequelize.sync().then(async function (){
	const results = await User.create({
		name: "ADMIN USER",
		email: "admin@localhost",
		password: process.env.MYSQL_PASSWORD || "58",
		role: "admin"
	}, UserClientFields)
})