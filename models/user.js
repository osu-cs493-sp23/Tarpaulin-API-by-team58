const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const userFields = {
	name: {type: DataTypes.STRING, allowNull: false, unique: false},
	email: {type: DataTypes.STRING, allowNull: false, unique: true},
	password: {type: DataTypes.STRING, allowNull: false, unique: false},
	role: {type: DataTypes.STRING, allowNull: false, unique: false}
}

const User = sequelize.define("user", userFields)

exports.User = User
exports.userSchema = userFields
exports.userClientFields = Object.keys(userFields)