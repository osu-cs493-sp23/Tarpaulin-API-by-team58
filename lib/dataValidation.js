/**
 * 
 * @param {*} doc a js object whose fields should be validated
 * @param {*} schema the schema to validate against. Each required field should contain an object with a falsey value for the "allowNull" field.
 * @returns a boolean representing if the js object matches the provided schema
 */
function validateAgainstSchema (doc, schema){
	return doc && Object.keys(schema).every(
		key => schema[key].allowNull || doc[key]
	)
}

exports.validateAgainstSchema = validateAgainstSchema