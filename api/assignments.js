const { Router } = require('express')
const multer = require('multer')

const fs = require('fs')
const crypto = require("node:crypto")
const { ValidationError } = require('sequelize')
const {Assignment, AssignmentClientFields} = require('../models/assignment')
const { validateAgainstSchema } = require('../lib/dataValidation')
const { SubmissionClientFields, Submission } = require('../models/submission')

const router = Router()

/*
Create and store a new Assignment with specified data
and adds it to the application's database. 
'admin' or courseId 'instructor' can create assignment
*/
router.post('/', async function (req, res, next){
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
router.patch('/:id', async function(req, res, next) {
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
})

/*
delete the data for the Assignment.
only 'admin' or courseId 'instructor' can update assignment
*/
router.delete('/:id', async function(req, res, next){
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
})

// upload
const upload = multer({
    storage: multer.diskStorage({
        destination: `uploads`,
        filename: (req, file, callback) => {
            callback(null, file.originalname)
        }
    })
})

// const upload = multer({
//     storage: multer.memoryStorage()
// })

/*
create and store a new submission to database.
oncourseId 'student' can create submission
*/
router.post('/:id/submissions', upload.single('file'), async function (req, res, next) {
    const assignmentId = req.params.id
    
    console.log("   -- req.file:", req.file)
    console.log("   -- req.body:", req.body)
    try {
        const assignment = await Assignment.findByPk(assignmentId)
        
        //const fileData = fs.readFileSync(req.file.path)
        // const metadata = {
        //     filename: req.file.originalname,
        //     mimetype: req.file.mimetype,
        //     size: req.file.size,
        //     path: req.file.path
        // }

        // const fileObject = {
        //     fileData: fileData,
        //     metadata: metadata
        // }

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
})

/*
Returns the list of all Submissions.
only 'admin' or courseId 'instructor' can get submission
*/
router.get('/:id/submissions', async function (req, res, next) {
    try {
        const assignmentId = req.params.id
        const assignment = await Assignment.findByPk(assignmentId)

        if (assignment) {
            const result = await Submission.findAll({
                where: {assignmentId: assignmentId}
            })

            const resBody = result.map(submission =>({
                //id: submission.id,
                assignmentId: submission.assignmentId,
                studentId: submission.studentId,
                timestamp: submission.timestamp,
                grade: submission.grade,
                file: `/${submission.file}`,
            }))
            res.status(200).send({submission: resBody})
        } else {
            next()
        }
    } catch (err) {
        next(err)
    }
})


module.exports = router