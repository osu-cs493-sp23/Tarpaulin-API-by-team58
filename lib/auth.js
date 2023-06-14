const jwt = require("jsonwebtoken")
const secretKey = "SuperSecret"

exports.generateAuthToken = function(user){
	const payload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role
	}
	return jwt.sign(payload, secretKey, {expiresIn: "48h"})
}

exports.requireAuthentication = function (req, res, next) {
	// console.log("== requireAuthentication()")
	const authHeader = req.get("Authorization") || ""
	const authHeaderParts = authHeader.split(" ")
	const token = authHeaderParts[0] === "Bearer" ?
		authHeaderParts[1] : null
	// console.log("  -- token:", token)
	try {
		const payload = jwt.verify(token, secretKey)
		// console.log("  -- payload:", payload)
		req.user = {}
		req.user.id = payload.id
		req.user.role = payload.role
		next()
	} catch (err) {
		console.error("== Error verifying token:", err)
		//res.status(401).send({
		res.status(403).send({
			error: "Invalid authentication token"
		})
	}
}

exports.optionalAuthentication = function (req, res, next) {
	const authHeader = req.get("Authorization") || ""
	const authHeaderParts = authHeader.split(" ")
	const token = authHeaderParts[0] === "Bearer" ?
		authHeaderParts[1] : null
	try {
		const payload = jwt.verify(token, secretKey)
		req.user = {}
		req.user.id = payload.id
		req.user.role = payload.role
		next()
	} catch (err) {
		req.user = null
		next()
	}
}

exports.isAdmin = function(req) {
	return req.user && req.user.role === "admin"
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