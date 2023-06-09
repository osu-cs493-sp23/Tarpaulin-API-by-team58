const { Router } = require("express")
const router = Router()
const { ValidationError } = require('sequelize')

const { generateHATEOASlinks, getOnly } = require("../lib/hateoasHelpers.js")
const { validateAgainstSchema, containsAtLeastOneSchemaField } = require("../lib/dataValidation.js")
const EXCLUDE_ATTRIBUTES_LIST = ["createdAt", "updatedAt"]
const EXCLUDE_USER_ATTRIBUTES_LIST = EXCLUDE_ATTRIBUTES_LIST.concat(["password"])


const { Assignment } = require("../models/assignment.js")
const { User } = require("../models/user.js")
const { Course, courseSchema, courseClientFields } = require("../models/course.js")



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
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: {
				model: User,
				as: "users",
				where: {role: "instructor"},
				through: {attributes: []},
				attributes: {exclude: EXCLUDE_USER_ATTRIBUTES_LIST}
			}
		})
	} catch (err){
		next(err)
		return
	}

	//reformat json result to only include instructor id and course fields
	resultsPage = []
	result.rows.forEach((course) => {
		resultsPage.push(courseResponseFromSequelizeModel(course))
	})

	//generate response with appropriate HATEOAS links
	var lastPage = Math.ceil(result.count / coursesPerPage)
	res.status(200).json({
		courses: resultsPage,
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
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: {
				model: User,
				as: "users",
				where: {role: "instructor"},
				through: {attributes: []},
				attributes: {exclude: EXCLUDE_USER_ATTRIBUTES_LIST}
			}
		})
	} catch (err){
		next(err)
		return
	}

	if (!courseResult){
		next()
		return
	}

	res.status(200).json(courseResponseFromSequelizeModel(courseResult))
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
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST.concat("courseId")}
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



router.get("/:courseId/students", async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	try {
		if (!courseExistsInDb(courseId)){
			next()
			return
		}
	} catch (err){
		next(err)
		return
	}

	var courseListResult = null
	try {
		courseListResult = await User.findAll({
			where: {role: "student"},
			attributes: {exclude: EXCLUDE_USER_ATTRIBUTES_LIST.concat("role")},
			include: {
				model: Course,
				as: "courses",
				where: {id: courseId},
				through: {attributes: []},
				attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST}
			}
		})
	} catch (err){
		next(err)
		return
	}

	courseList = []
	courseListResult.forEach(student => {
		courseList.push({
			...student.dataValues,
			courses: undefined
		})
	})

	res.status(200).json({
		students: courseList
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
	if (!validateAgainstSchema(newCourse, courseSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain a valid Course object containing required fields: \"subject,\" \"number,\" \"term,\" and \"instructorId.\""
		})
		return
	}

	//query the database
	var course = {}
	try {
		course = await Course.create(newCourse, courseClientFields)
		await course.addUser(newCourse.instructorId)
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



router.post("/:courseId/students", async function (req, res, next){
	if (!(req.body && (req.body.add || req.body.remove))){
		res.status(400).json({
			error: "The request body was either not present or did not contain studentIds to add to or remove from the specified course."
		})
		return
	}

	const courseId = parseInt(req.params.courseId) || 0

	var course = null
	try {
		course = await Course.findByPk(courseId)
	} catch (err){
		next(err)
		return
	}

	if (!course){
		next()
		return
	}

	var addArr = []
	var removeArr = []
	if (req.body.add && req.body.remove){
		addArr = req.body.add.filter(studentId => {
			return !req.body.remove.includes(studentId)
		})
		removeArr = req.body.remove.filter(studentId => {
			return !req.body.add.includes(studentId)
		})
	} else if (req.body.add){
		addArr = req.body.add
	} else {
		removeArr = req.body.remove
	}

	var response = {}
	var couldNotAdd = []
	var couldNotRemove = []
	if (addArr.length > 0){
		addArr.forEach(async studentId => {
			try {
				await course.addUser(studentId)
			} catch (err){
				couldNotAdd.push(studentId)
			}
		})
		if (couldNotAdd.length > 0){
			response["not_added"] = couldNotAdd
		}
	}

	if (removeArr.length > 0){
		removeArr.forEach(async studentId => {
			try {
				await course.removeUser(studentId)
			} catch (err){
				couldNotRemove.push(studentId)
			}
		})
		if (couldNotRemove.length > 0){
			response["not_removed"] = couldNotRemove
		}
	}

	res.status(201).json(response)
})



router.patch("/:courseId", async function (req, res, next){
	if (!containsAtLeastOneSchemaField(req.body, courseSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain fields related to a course object."
		})
		return
	}
	
	const courseId = parseInt(req.params.courseId) || 0

	var match = null
	try {
		match = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: {
				model: User,
				as: "users",
				where: {role: "instructor"},
				through: {attributes: []},
				attributes: {exclude: EXCLUDE_USER_ATTRIBUTES_LIST}
			}
		})
	} catch (err){
		next(err)
		return
	}

	if (!match){
		next()
		return
	}

	var successfulPatch = false
	if (req.body.instructorId){
		try {
			await match.removeUser(match.dataValues.users[0].id)
			await match.addUser(req.body.instructorId)
		} catch (err){
			next(err)
			return
		}
		successfulPatch = true
	}

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
		successfulPatch = true
	}

	if (successfulPatch){
		res.status(200).send()
	} else {
		next()
	}
})



router.delete("/:courseId", async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	var result = 0
	try {
		result = await Course.destroy({where: {id: courseId}})
	} catch (err){
		next(err)
		return
	}

	if (result <= 0){
		next()
		return
	}

	res.status(204).send()
})


module.exports = router


//Helpers

function courseResponseFromSequelizeModel(model){
	return {
		...model.dataValues,
		users: undefined,
		instructorId: model.dataValues.users[0].id
	}
}



async function courseExistsInDb(courseId){
	return !!await Course.findByPk(courseId)
}