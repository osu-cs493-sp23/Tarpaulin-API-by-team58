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

module.exports = router