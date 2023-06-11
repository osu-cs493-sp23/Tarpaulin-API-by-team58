const { parseAsync } = require("json2csv")


async function generateRosterCSV(rosterArray){
	return new Promise(function (resolve, reject){
		parseAsync(rosterArray, {
			header: true,
			fields: ["id", "name", "email"],
			delimiter: ","
		}).then(function (csv){
			resolve(csv)
		}).catch(function (err){
			reject(err)
		})
	})
}
exports.generateRosterCSV = generateRosterCSV