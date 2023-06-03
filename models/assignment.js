const { DataTypes } = require("sequelize")
const sequelize = require("../lib/sequelize.js")


const Assignment = sequelize.define("assignment", {}, {})

exports.Assignment = Assignment