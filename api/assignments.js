const { Router } = require('express')
const multer = require('multer')

const fs = require('fs')
const crypto = require("node:crypto")
const { ValidationError } = require('sequelize')
const {Assignment, AssignmentClientFields} = require('../models/assignment')
const { validateAgainstSchema } = require('../lib/dataValidation')
const { SubmissionClientFields, Submission } = require('../models/submission')
const { requireAuthentication } = require('../lib/auth')
const { Course } = require('../models/course')
const { User } = require('../models/user')
const { getOnly, generateHATEOASlinks } = require('../lib/hateoasHelpers.js')

const router = Router()

/*
Create and store a new Assignment with specified data
and adds it to the application's database. 
'admin' or courseId 'instructor' can create assignment
*/
router.post('/', requireAuthentication, async function (req, res, next){
    course = await Course.findByPk(parseInt(req.body.courseId) || 0, {
        include: {
                model: User, as: "users",
                where: {role: "instructor"}, 
                through: {attributes: []}, 
                attributes: ["id"]}})
    if (req.user.role === "admin" || 
        (req.user.role === "instructor" && (course.dataValues.users[0].id === req.user.id))) {
        try {
            const assignment = await Assignment.create(
                req.body, AssignmentClientFields
            )
            res.status(201).send({ id: assignment.id})
        } catch (e) {
            if (e instanceof ValidationError) {
                res.status(400).send({ error: e.message })
              } else {
                next(e)
              }
        }
    } else {
        res.status(403).send({ error: "Unauthorized to access with current credential" })
    }
})

/*
Returns summary data about the Assignment, 
excluding the list of Submissions.
*/
router.get('/:id', async function (req, res, next) {
    const assignmentId = req.params.id
    try {
        const assignment = await Assignment.findByPk(assignmentId)
        if (assignment) {
            res.status(200).send(assignment)
        } else {
            next()
        }
    } catch(e) {
        next(e)
    }
})

/*
return a partial update on the data for the Assignment.
Submission cant be modified via this endpoint.
only 'admin' or courseId 'instructor' can update assignment
*/
router.patch('/:id',requireAuthentication, async function(req, res, next) {
    course = await Course.findByPk(parseInt(req.body.courseId) || 0, {
        include: {
                model: User, as: "users",
                where: {role: "instructor"}, 
                through: {attributes: []}, 
                attributes: ["id"]}})
    if (req.user.role === "admin" || 
        (req.user.role === "instructor" && (course.dataValues.users[0].id === req.user.id))) {
        try {
            const assignmentId = req.params.id
            //const assignment = await Assignment.findByPk(assignmentId)
            const result = await Assignment.update(req.body, {
                where: {id: assignmentId},
                fields: AssignmentClientFields    
            })
            if (result[0] > 0){
                res.status(204).send()
            } else {
                next()
            }
        } catch(e) {
            next(e)
        }
    } else {
        res.status(403).send({ error: "Unauthorized to access with current credential" })
    }
})

/*
delete the data for the Assignment.
only 'admin' or courseId 'instructor' can update assignment
*/
router.delete('/:id',requireAuthentication, async function(req, res, next){
    course = await Course.findByPk(parseInt(req.body.courseId) || 0, {
        include: {
                model: User, as: "users",
                where: {role: "instructor"}, 
                through: {attributes: []}, 
                attributes: ["id"]}})
    if (req.user.role === "admin" || 
        (req.user.role === "instructor" && (course.dataValues.users[0].id === req.user.id))) {
        try {
            const assignmentId = req.params.id
            //const assignment = await Assignment.findByPk(assignmentId)
            const result = await Assignment.destroy({
                where: {id: assignmentId}
            })
            if (result > 0){
                res.status(204).send()
            } else {
                next()
            }
        } catch(e) {
            next(e)
        }
    } else {
        res.status(403).send({ error: "Unauthorized to access with current credential" })
    }
})

// upload
const upload = multer({
    storage: multer.diskStorage({
        destination: `uploads`,
        filename: (req, file, callback) => {
            const filename = crypto.pseudoRandomBytes(16).toString("hex")
            const extension = file.mimetype.split("/")[1]
            callback(null, `${filename}.${extension}`)
        }
    })
})

/*
create and store a new submission to database.
only courseId 'student' can create submission
*/
router.post('/:id/submissions',requireAuthentication, upload.single('file'), async function (req, res, next) {
    const assignmentId = req.params.id
    const assignment = await Assignment.findByPk(assignmentId)
    
    if (!assignment) {
        return next()
    }
    
    course = await Course.findByPk(assignment.dataValues.courseId || 0, {
        include: {
                model: User, as: "users",
                where: {role: "student"}, 
                through: {attributes: []}, 
                attributes: ["id"]}})
    if (req.user.role === "student" && (course.dataValues.users.find(student => { return student.id === req.user.id}))) {
        console.log("   -- req.file:", req.file)
        console.log("   -- req.body:", req.body)
        try {
             
            //const fileData = fs.readFileSync(req.file.path)
            const submissionBody = {
                assignmentId: assignmentId,
                studentId: req.body.studentId,
                file: req.file.path
            }
            if (assignment){
                const submission = await Submission.create(submissionBody, SubmissionClientFields)
                //const submission = await Submission.create({ file: fileBuffer })
                res.status(201).send({
                    id: submission.id
                })
            } else {
                next()
            }
        } catch (err) {
            if (err instanceof ValidationError) {
                res.status(400).send({
                    error: err.message
                })
            } else {
                next(err)
            }
        }
    } else {
        res.status(403).send({ error: "Unauthorized to access with current credential" })
    }
})

/*
Returns the list of all Submissions.
only 'admin' or courseId 'instructor' can get submission
*/
router.get('/:id/submissions',requireAuthentication, async function (req, res, next) {
    const assignmentId = req.params.id
    const assignment = await Assignment.findByPk(assignmentId)
    if (!assignment) {
        return next()
    }
    course = await Course.findByPk(assignment.dataValues.courseId || 0, {
        include: {
                model: User, as: "users",
                where: {role: "instructor"}, 
                through: {attributes: []}, 
                attributes: ["id"]}})
    if (req.user.role === "admin" || 
        (req.user.role === "instructor" && (course.dataValues.users[0].id === req.user.id))) {
        try {
            if (assignment) {
                const submissionPerPage = 10
                //generate offset based on requested page
                var page = parseInt(req.query.page) || 1
                page = page < 1 ? 1 : page
                var offset = (page - 1) * submissionPerPage

                //query the database
                var queryStringParams = getOnly(req.query, ["studentId"])
                var result = null
                try {
                    result = await Submission.findAndCountAll({
                        where: queryStringParams,
                        limit: submissionPerPage,
                        offset: offset,
                        attributes: {include: ["assignmentId", "studentId", "timestamp", "grade", "file"]}
                    })
                } catch (err){
                    next(err)
                    return
                }
                resultsPage = []
                result.rows.forEach((submission) => {
                    resultsPage.push({
                        assignmentId: submission.assignmentId,
                        studentId: submission.studentId,
                        timestamp: submission.timestamp,
                        grade: submission.grade,
                        file: `/${submission.file}`
                    })
                })

                //generate response with appropriate HATEOAS links
                var lastPage = Math.ceil(result.count / submissionPerPage)
                res.status(200).json({
                    submission: resultsPage,
                    links: generateHATEOASlinks(
                        req.originalUrl.split("?")[0],
                        page,
                        lastPage,
                        queryStringParams
                    )
                })
                // const resBody = result.map(submission =>({
                //     //id: submission.id,
                //     assignmentId: submission.assignmentId,
                //     studentId: submission.studentId,
                //     timestamp: submission.timestamp,
                //     grade: submission.grade,
                //     file: `/${submission.file}`,
                // }))
                //res.status(200).send({submission: resBody})
            } else {
                next()
            }
        } catch (err) {
            next(err)
        }
    } else {
        res.status(403).send({ error: "Unauthorized to access with current credential" })
    }
})


module.exports = router