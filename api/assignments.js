const { Router } = require('express')
const { ValidationError } = require('sequelize')

const {Assignment, AssignmentClientFields} = require('../models/assignment')

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

/*
Returns the list of all Submissions.
only 'admin' or courseId 'instructor' can get submission
*/
router.get('/:id/submissions', async function (req, res, next) {
    const assignmentId = req.params.id
})

/*
create and store a new submission to database.
oncourseId 'student' can create submission
*/
router.post('/:id/submissions', async function (req, res, next) {
    const assignmentId = req.params.id
})

module.exports = router