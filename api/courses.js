const url = require("url")
const { Router } = require("express")
const router = Router()
const { ValidationError } = require('sequelize')

const { generateHATEOASlinks, getOnly } = require("../lib/hateoasHelpers.js")
const EXCLUDE_ATTRIBUTES_LIST = ["createdAt", "updatedAt"]


const { Assignment } = require("../models/assignment.js")
const { Course, courseClientFields } = require("../models/course.js")



/**
 * GET /courses endpoint
 * 
 * Sends a response to the client containing a paginated list of courses that match the criteria provided in the query string parameters of the request.
 * 
 * The middleware function for this endpoint includes code provided by the instructor to implement pagination.
 */
router.get("/", async function (req, res, next){
	const coursesPerPage = 10
	
	//generate offset based on requested page
	var page = parseInt(req.query.page) || 1
	page = page < 1 ? 1 : page
	var offset = (page - 1) * coursesPerPage

	//query the database
	var queryStringParams = getOnly(req.query, ["subject", "number", "term"])
	var result = null
	try {
		result = await Course.findAndCountAll({
			where: queryStringParams,
			limit: coursesPerPage,
			offset: offset,
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST}
		})
	} catch (err){
		next(err)
		return
	}

	//generate response with appropriate HATEOAS links
	var lastPage = Math.ceil(result.count / coursesPerPage)
	res.status(200).json({
		courses: result.rows,
		links: generateHATEOASlinks(
			req.originalUrl.split("?")[0],
			page,
			lastPage,
			queryStringParams
		)
	})
})


/**
 * GET /courses/{id}
 * 
 * Sends response to the client containing information about a single course given by {id}.
 */
router.get("/:courseId", async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	var courseResult = null
	try {
		courseResult = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST}
		})
	} catch (err){
		next(err)
		return
	}

	if (!courseResult){
		next()
		return
	}

	res.status(200).json(courseResult.dataValues)
})


/**
 * GET /courses/{id}/assignments endpoint
 * 
 * Sends a response to the client with a list of assignments associated with a course given by {id}.
 * 
 * TODO: Test once progress has been made on the Assignment model
 */
router.get("/:courseId/assignments", async function (req, res, next){
	var courseId = parseInt(req.params.courseId) || 0

	var results = null
	try {
		results = await Assignment.findAll({
			where: {
				courseId: courseId
			},
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST}
		})
	} catch (err){
		next(err)
		return
	}

	if (results.length < 1){
		next()
		return
	}

	res.status(200).json({
		assignments: results
	})
})



/**
 * POST /courses endpoint
 * 
 * Adds a new course to the database as long as it does not already exist.
 */
router.post("/", async function (req, res, next){
	//verify existence of required fields
	var newCourse = req.body
	if (!(newCourse && newCourse.subject && newCourse.number && newCourse.term)){
		res.status(400).json({
			error: "The request body was either not present or did not contain a valid Course object containing required fields: \"subject,\" \"number,\" and \"term.\""
		})
		return
	}

	//query the database
	var course = {}
	try {
		course = await Course.create(newCourse, courseClientFields)
	} catch (err){
		//if a validation error is thrown after verifying the existence of required fields, it is due to a unique index constraint on "course"."subject", ."number", and ."term" defined in ../lib/course.js.
		if (err instanceof ValidationError){
			res.status(400).json({
				error: "That course already exists for that term."
			})
		} else {
			next(err)
		}
		return
	}

	res.status(201).json({id: course.id})
})



router.patch("/:courseId", async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	var patchResult = null
	try {
		patchResult = await Course.update(req.body, {
			where: {id: courseId},
			fields: courseClientFields
		})
	} catch (err){
		if (err instanceof ValidationError){
			res.status(400).json({error: "The request body was either not present or did not contain any fields related to Course objects."})
		} else {
			next(err)
		}
		return
	}

	if (patchResult[0] > 0){
		res.status(200).send()
	} else {
		next()
	}
})


module.exports = router