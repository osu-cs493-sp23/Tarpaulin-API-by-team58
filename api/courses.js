//Required packages
const { Readable } = require("node:stream")
const { Router } = require("express")
const router = Router()
const { ValidationError } = require('sequelize')

//course api helpers and constants
const { generateHATEOASlinks, getOnly } = require("../lib/hateoasHelpers.js")
const { requireAuthentication, optionalAuthentication, isAdmin } = require("../lib/auth.js")
const { validateAgainstSchema, containsAtLeastOneSchemaField } = require("../lib/dataValidation.js")
const { generateRosterCSV } = require("../lib/csv.js")
const EXCLUDE_ATTRIBUTES_LIST = ["createdAt", "updatedAt"]
const EXCLUDE_USER_ATTRIBUTES_LIST = EXCLUDE_ATTRIBUTES_LIST.concat(["password"])

//sequelize models
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
			include: includeInstructorInCourseResultOptions()
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

	//query the database
	var courseResult = null
	try {
		courseResult = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: includeInstructorInCourseResultOptions()
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
 */
router.get("/:courseId/assignments", async function (req, res, next){
	var courseId = parseInt(req.params.courseId) || 0

	//make sure the course exists in the database
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

	//query the database
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
		res.status(200).json({
			assignments: []
		})
		return
	}

	res.status(200).json({
		assignments: results
	})
})


/**
 * GET /courses/{id}/students endpoint
 * 
 * Sends a response to the client containing a list of all students enrolled in the specified course.
 */
router.get("/:courseId/students", requireAuthentication, async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	//verify specified course exists and get its sequelize model
	var course = null
	try {
		course = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: includeInstructorInCourseResultOptions()
		})
	} catch (err){
		next(err)
		return
	}

	if (!course){
		next()
		return
	}

	if (!(req.user.role === "admin" || (req.user.role === "instructor" && req.user.id === course.dataValues.users[0].id))){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}

	const courseRosterObj = await getCourseStudentsList(courseId)

	if (courseRosterObj.status !== 200){
		var errStr = undefined
		if (courseRosterObj.status !== 404){
			errStr = "server error"
		}
		next(errStr)
		return
	}

	res.status(200).json({
		students: courseRosterObj.data
	})
})


/**
 * GET /courses/{id}/roster
 * 
 * Generates and sends a csv containing the list of students registered for the specified course.
 */
router.get("/:courseId/roster", requireAuthentication, async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	//verify specified course exists and get its sequelize model
	var course = null
	try {
		course = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: includeInstructorInCourseResultOptions()
		})
	} catch (err){
		next(err)
		return
	}

	if (!course){
		next()
		return
	}

	if (!(req.user.role === "admin" || (req.user.role === "instructor" && req.user.id === course.dataValues.users[0].id))){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}

	const courseRosterObj = await getCourseStudentsList(courseId)

	if (courseRosterObj.status !== 200){
		var errStr = undefined
		if (courseRosterObj.status !== 404){
			errStr = "server error"
		}
		next(errStr)
		return
	}

	//convert all student ids to strings for the csv file
	const students = courseRosterObj.data.map(student => {
		student.id = student.id.toString()
		return student
	})

	var csv = null
	try {
		csv = await generateRosterCSV(students)
	} catch (err){
		next(err)
	}
	
	//convert csv buffer to stream and send to user
	Readable.from(csv).pipe(res.status(200).contentType("text/csv"))
})


/**
 * POST /courses endpoint
 * 
 * Adds a new course to the database as long as it does not already exist.
 */
// router.post("/", requireAuthentication, async function (req, res, next){
router.post("/", optionalAuthentication, async function (req, res, next){
	// if (!(req.user.role === "admin")){
	if (!isAdmin(req)){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}
	
	//verify existence of required fields
	var newCourse = req.body
	if (!validateAgainstSchema(newCourse, courseSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain a valid Course object containing required fields: \"subject,\" \"number,\" \"term,\" and \"instructorId.\""
		})
		return
	}

	var instructor = null
	try {
		// instructor = await User.findByPk(newCourse.instructorId)
		instructor = await User.findOne({
			where: {
				id: newCourse.instructorId,
				role: "instructor"
			}
		})
	} catch (err){
		next(err)
	}

	if (!instructor){
		res.status(400).json({
			error: `No instructor exists with id ${newCourse.instructorId}`
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


/**
 * POST /courses/{id}/students endpoint
 * 
 * Allows client to add and remove students from the course roster using:
 *	- req.body.add (array of studentId) 
 * 		and
 * 	- req.body.remove (array of studentId)
 * 
 * If there are errors adding or removing any students, their ids will be sent back to the client
 */
router.post("/:courseId/students", requireAuthentication, async function (req, res, next){
	//verify required request body fields are present
	if (!(req.body && (req.body.add || req.body.remove))){
		res.status(400).json({
			error: "The request body was either not present or did not contain studentIds to add to or remove from the specified course."
		})
		return
	}

	const courseId = parseInt(req.params.courseId) || 0

	//verify specified course exists and get its sequelize model
	var course = null
	try {
		course = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: includeInstructorInCourseResultOptions()
		})
	} catch (err){
		next(err)
		return
	}

	if (!course){
		next()
		return
	}

	if (!(req.user.role === "admin" || (req.user.role === "instructor" && req.user.id === course.dataValues.users[0].id))){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}

	//remove users that exist in both the add and remove fields of the request body
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

	//add and remove users as requested
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

	res.status(200).json(response)
})


/**
 * PATCH /courses/{id} endpoint
 * 
 * Allows user to change stored information about the specified course.
 */
router.patch("/:courseId", requireAuthentication, async function (req, res, next){
	//verify request body is not empty
	if (!containsAtLeastOneSchemaField(req.body, courseSchema)){
		res.status(400).json({
			error: "The request body was either not present or did not contain fields related to a course object."
		})
		return
	}
	
	const courseId = parseInt(req.params.courseId) || 0

	//verify specified course exists and get its sequelize model
	var match = null
	try {
		match = await Course.findByPk(courseId, {
			attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST},
			include: includeInstructorInCourseResultOptions()
		})
	} catch (err){
		next(err)
		return
	}

	if (!match){
		next()
		return
	}

	if (!(req.user.role === "admin" || (req.user.role === "instructor" && req.user.id === match.dataValues.users[0].id))){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}

	//if instructorId was provided in the request body, remove the old instructor and add the new instructor
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

	//update the rest of the provided fields if provided
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

	//if the instructorId or another field are changed, send a 200 response
	if (successfulPatch){
		res.status(200).send()
	} else {
		next()
	}
})


/**
 * DELETE /courses/{id}
 * 
 * Removes the course entry from the database. Cascades to all child tables, namely `usercourses` and `assignments`
 */
router.delete("/:courseId", requireAuthentication, async function (req, res, next){
	const courseId = parseInt(req.params.courseId) || 0

	if (!(req.user.role === "admin")){
		res.status(403).json({
			error: "Unauthorized access to specified resource."
		})
		return
	}

	//query the database
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
/**
 * Restructures data directly from a sequelize query on the Course model that includes the instructor user of the course.
 * @param {*} model the value returned from sequelize. If multiple values are returned, each must be passed to this function individually.
 * @returns a JS object containing the response fields specified in the tarpaulin openAPI specification.
 */
function courseResponseFromSequelizeModel(model){
	return {
		...model.dataValues,
		users: undefined,
		instructorId: model.dataValues.users[0].id
	}
}


/**
 * Checks if the course with the specified courseId exists in the database.
 * @param {*} courseId the id of the course to search for.
 * @returns a boolean representing the existance of the specified course in the database.
 */
async function courseExistsInDb(courseId){
	return !!await Course.findByPk(courseId)
}



async function getCourseStudentsList(courseId){
	var rosterObj = {
		data: [],
		status: 200
	}
	
	//check first if the requested course exists
	try {
		if (!courseExistsInDb(courseId)){
			rosterObj.status = 404
			return rosterObj
		}
	} catch (err){
		rosterObj.status = 500
		return rosterObj
	}

	//query the database
	var courseListResult = null
	try {
		courseListResult = await User.findAll({
			where: {role: "student"},
			attributes: {exclude: EXCLUDE_USER_ATTRIBUTES_LIST.concat(["role", "admin"])},
			include: {
				model: Course,
				as: "courses",
				where: {id: courseId},
				through: {attributes: []},
				attributes: {exclude: EXCLUDE_ATTRIBUTES_LIST}
			}
		})
	} catch (err){
		rosterObj.status = 500
		return rosterObj
	}

	//restructure the data from the database into rosterObj.data
	courseListResult.forEach(student => {
		rosterObj.data.push({
			...student.dataValues,
			courses: undefined
		})
	})
	rosterObj.status = 200

	// return courseList
	return rosterObj
}



function includeInstructorInCourseResultOptions(exclude){
	var xcldUsrAttrLst = EXCLUDE_USER_ATTRIBUTES_LIST
	if (exclude)
		xcldUsrAttrLst.concat(exclude)

	return {
		model: User,
		as: "users",
		where: {role: "instructor"},
		through: {attributes: []},
		attributes: {exclude: xcldUsrAttrLst}
	}
}