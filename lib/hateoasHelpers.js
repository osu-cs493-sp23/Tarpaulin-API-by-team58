/**
 * Generates an object containing HATEOAS links based on the provided arguments
 * @param {String} reqPath The url of the request that does not contain the query string parameters.
 * @param {Number} currPage The page being requested
 * @param {Number} lastPage The number of the last page
 * @param {Object} queryStringParams an object containing all the query string parameters from the request so they can be added to the HATEOAS links
 * 
 * @returns an object containing urls with the correct query string parameters for "nextPage," "lastPage," "prevPage," and "firstPage"
 */
function generateHATEOASlinks(reqPath, currPage, lastPage, queryStringParams){
	var links = {}
	
	var queryStringKeys = Object.keys(queryStringParams)
	var linkParts = {
		beginning: `${reqPath}?page=`,
		end: ""
	}
	for (var i = 0; i < queryStringKeys.length; i++){
		var currKey = queryStringKeys[i]
		linkParts.end = `${linkParts.end}&${currKey}=${queryStringParams[currKey]}`
	}

	if (currPage < lastPage){
		links.nextPage = `${linkParts.beginning}${currPage + 1}${linkParts.end}`
		links.lastPage = `${linkParts.beginning}${lastPage}${linkParts.end}`
	}
	if (currPage > 1){
		links.prevPage = `${linkParts.beginning}${currPage - 1}${linkParts.end}`
		links.firstPage = `${linkParts.beginning}1${linkParts.end}`
	}

	return links
}

/**
 * Generates a new object from the obj argument containing only the keys specified in the keys argument.
 * @param {Object} obj any object
 * @param {Array} keys an array of strings specifying the key-value pairs to save from obj
 * 
 * @returns An object containing only the key-value pairs from obj specified in the keys array.
 */
function getOnly(obj, keys){
	var resultObj = {}

	keys.forEach((element) => {
		if (obj[element]){
			resultObj[element] = obj[element]
		}
	})

	return resultObj
}

exports.getOnly = getOnly
exports.generateHATEOASlinks = generateHATEOASlinks

const jwt = require("jsonwebtoken")
const secretKey = "SuperSecret"

exports.generateAuthToken = function(user){
	const payload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		admin: user.admin
	}
	return jwt.sign(payload, secretKey, {expiresIn: "48h"})
}

exports.requireAuthentication = function (req, res, next) {
	console.log("== requireAuthentication()")
	const authHeader = req.get("Authorization") || ""
	const authHeaderParts = authHeader.split(" ")
	const token = authHeaderParts[0] === "Bearer" ?
		authHeaderParts[1] : null
	console.log("  -- token:", token)
	try {
		const payload = jwt.verify(token, secretKey)
		console.log("  -- payload:", payload)
		req.user = {}
		req.user.id = payload.id
		req.user.role = payload.role
		next()
	} catch (err) {
		console.error("== Error verifying token:", err)
		res.status(401).send({
			error: "Invalid authentication token"
		})
	}
}

exports.isAdmin = function(req) {
	console.log("== isAdmin()")
	const authHeader = req.get("Authorization") || ""
	const authHeaderParts = authHeader.split(" ")
	const token = authHeaderParts[0] === "Bearer" ?
		authHeaderParts[1] : null
	console.log("  -- token:", token)
	try {
		const payload = jwt.verify(token, secretKey)
		console.log("  -- payload:", payload)
		req.admin = payload.admin
		return req.admin
	} catch (e) {
		console.error("== Invalid:", e)
		return false
	}
}



exports.verifyAuthTokenExists = function (req){
	const authHeader = req.get("Authorization") || ""
	const authHeaderParts = authHeader.split(" ")
	const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null
	try {
		const payload = jwt.verify(token, secretKey)
	} catch (err){
		return false
	}
	return true
}