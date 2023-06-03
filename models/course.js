const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const { Assignment } = require("./assignment.js")

const courseFields = {
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
}

const Course = sequelize.define("course", courseFields, {
	indexes: [
		{
			unique: true,
			fields: ["subject", "number", "term"]
		}
	]
})

Course.hasMany(Assignment, {
	onDelete: "CASCADE",
	onUpdate: "CASCADE",
	foreignKey: {allowNull: false}
})
Assignment.belongsTo(Course)

exports.Course = Course
exports.courseClientFields = Object.keys(courseFields)