const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const Submission = sequelize.define('submission', {
    //assignmentId: { type: DataTypes.INTEGER, allowNull: false},
    studentId: { type: DataTypes.INTEGER, allowNull: false},
    timestamp: { type: DataTypes.DATE, defaultValue: function () {
        return new Date().toISOString(); // Generate current timestamp in ISO 8601 format
      }, allowNull: true},
    grade: { type: DataTypes.FLOAT, defaultValue:0, allowNull: true},
    file: { type: DataTypes.STRING, allowNull: false}
})

exports.Submission = Submission

exports.SubmissionClientFields = [
    'studentId',
    'file'
    //'timestamp',
    //'grade',
]