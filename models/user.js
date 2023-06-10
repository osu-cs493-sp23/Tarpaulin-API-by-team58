const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const { Course } = require("./course.js")

const bcrypt = require("bcryptjs")

const User = sequelize.define('user',{
	id: {type: DataTypes.INTEGER, allowNull: false, primaryKey: true},
	name: {type: DataTypes.STRING, allowNull: false},
	email: {type: DataTypes.STRING, allowNull: false},
	password: {
		type: DataTypes.STRING,
		set(value) {
			// Storing passwords in plaintext in the database is terrible.
			// Hashing the value with an appropriate cryptographic hash function is better.
			this.setDataValue('password', bcrypt.hashSync(value));
		},
		allowNull: false
	},
	role: {type: DataTypes.STRING, allowNull: false},
	admin: {type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false},
	// teacher: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
	// student: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true}
})

exports.User = User

exports.UserClientFields = [
	'name',
	'email',
	'password',
	'role', //student or teacher
	'admin'
]