const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const { Assignment } = require("./assignment.js")
const { User } = require("./user.js")

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

exports.Course = Course
exports.courseSchema = courseFields
exports.courseClientFields = Object.keys(courseFields)

Course.hasMany(Assignment, {
	onDelete: "CASCADE",
	onUpdate: "CASCADE",
	foreignKey: {allowNull: false}
})
Assignment.belongsTo(Course)

//Define N:M relationship between courses and users
const UserCourse = sequelize.define("usercourse", {}, {
	timestamps: false,
	indexes: [
		{
			unique: true,
			fields: ["courseId", "userId"]
		}
	]
})
Course.belongsToMany(User, {
	through: UserCourse,
	as: "users",
	foreignKey: "courseId",
	onDelete: "CASCADE",
	onUpdate: "CASCADE",
})
User.belongsToMany(Course, {
	through: UserCourse,
	as: "courses",
	foreignKey: "userId",
	onDelete: "CASCADE",
	onUpdate: "CASCADE",
})
exports.courseSchema.instructorId = {type: DataTypes.INTEGER, allowNull: false, unique: false}