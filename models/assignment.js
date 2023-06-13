const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const { Submission } = require("./submission.js")


const Assignment = sequelize.define("assignment", {
    title: { type: DataTypes.STRING, allowNull: false},
    points: { type: DataTypes.INTEGER, allowNull: false},
    due: { type: DataTypes.DATE, allowNull: false}
})

/*
* Set up one-to-many relationship to Submission.
*/
Assignment.hasMany(Submission, {
    onDelete: "CASCADE",
	onUpdate: "CASCADE",
	foreignKey: {allowNull: false}
})
Submission.belongsTo(Assignment)

exports.Assignment = Assignment

/*
Export an array containing the names of fields 
the client is allowed to set on businesses.
 */
exports.AssignmentClientFields = [
    'courseId',
    'title',
    'points',
    'due'
]