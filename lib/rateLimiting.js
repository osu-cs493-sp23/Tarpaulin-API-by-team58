const redis = require("redis")
const { verifyAuthTokenExists } = require("./auth.js")

//rate limiting details
const RATE_LIMIT_WINDOW_MILLIS = 60000
const RATE_LIMIT_MAX_UNAUTHED_REQUESTS = 10
const RATE_LIMIT_MAX_AUTHED_REQUESTS = 30

//redis connection details
const redisHost = process.env.REDIS_HOST || "localhost"
const redisPort = process.env.REDIS_PORT || 6379
const redisClient = redis.createClient({
	url: `redis://${redisHost}:${redisPort}`
})

async function connectToRedisServer(){
	await redisClient.connect()
}

async function limitRate(req, res, next){
	//get tokens corresponding to client's ip
	var tokenBucket = null
	try {
		tokenBucket = await redisClient.hGetAll(req.ip)
	} catch (err){
		next(err)
		return
	}

	//determine if the user has valid authentication credentials
	const authTokenExists = verifyAuthTokenExists(req)
	const justLoggedIn = (parseInt(tokenBucket.isAuthed) || 0) === 0 && authTokenExists
	// const maxRequests = verifyAuthTokenExists(req) ? 
	// 	RATE_LIMIT_MAX_AUTHED_REQUESTS : RATE_LIMIT_MAX_UNAUTHED_REQUESTS
	const maxRequests = authTokenExists ? 
		RATE_LIMIT_MAX_AUTHED_REQUESTS : RATE_LIMIT_MAX_UNAUTHED_REQUESTS
	const refreshRate = maxRequests / RATE_LIMIT_WINDOW_MILLIS
	const timestamp = Date.now()
	
	// console.log(`Just Logged in: ${justLoggedIn}--->${justLoggedIn ? (parseFloat(tokenBucket.lastAuthedTokens) || maxRequests) : (parseFloat(tokenBucket.tokens) || maxRequests)}`)
	//generate new tokenBucket values
	tokenBucket = {
		tokens: justLoggedIn ? (parseFloat(tokenBucket.lastAuthedTokens) || maxRequests) : (parseFloat(tokenBucket.tokens) || maxRequests),
		last: parseInt(tokenBucket.last) || timestamp,
		isAuthed: authTokenExists ? 1 : 0,
		lastAuthedTokens: parseFloat(tokenBucket.lastAuthedTokens) || maxRequests
	}
	const elapsedMillis = timestamp - tokenBucket.last
	tokenBucket.tokens += elapsedMillis * refreshRate
	tokenBucket.tokens = Math.min(tokenBucket.tokens, maxRequests)
	tokenBucket.last = timestamp

	console.log(`Client has ${tokenBucket.tokens} tokens at ${timestamp}.`)

	//check if client has a token and act accordingly
	if (tokenBucket.tokens < 1){
		try {
			await redisClient.hSet(req.ip, [
				["tokens", tokenBucket.tokens],
				["last", tokenBucket.last],
				["isAuthed", tokenBucket.isAuthed],
				["lastAuthedTokens", tokenBucket.lastAuthedTokens]
			])
		} catch (err){
			next(err)
			return
		}
		res.status(429).json({
			error: "Too many requests in the last minute. Please wait and try again."
		})
		return
	}

	tokenBucket.tokens -= 1
	if (authTokenExists){
		tokenBucket.lastAuthedTokens = tokenBucket.tokens
	}
	try {
		await redisClient.hSet(req.ip, [
			["tokens", tokenBucket.tokens/* .toString() */],
			["last", tokenBucket.last/* .toString() */],
			["isAuthed", tokenBucket.isAuthed],
			["lastAuthedTokens", tokenBucket.lastAuthedTokens]
		])
	} catch (err){
		tokenBucket.tokens += 1
		if (authTokenExists){
			tokenBucket.lastAuthedTokens = tokenBucket.tokens
		}
		next(err)
		return
	}
	next()
}

exports.limitRate = limitRate
exports.connectToRedisServer = connectToRedisServer