const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")

const Submission = sequelize.define('submission', {
    //assignmentId: { type: DataTypes.INTEGER, allowNull: false},
    studentId: { type: DataTypes.INTEGER, allowNull: false},
    timestamp: { type: DataTypes.DATE, allowNull: false},
    grade: { type: DataTypes.INTEGER, allowNull: false},
    file: { type: DataTypes.STRING, allowNull: false},
})

exports.Submission = Submission