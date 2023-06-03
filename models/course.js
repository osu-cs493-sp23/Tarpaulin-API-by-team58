const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const Course = sequelize.define("course", {
	subject: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: false
	},
	number: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: false
	},
	title: {
		type: DataTypes.STRING,
		allowNull: true,
		unique: false
	},
	term: {
		type: DataTypes.STRING,
		allowNull: false,
		unique: false
	}
}, {
	indexes: [
		{
			unique: true,
			fields: ["subject", "number", "term"]
		}
	]
})