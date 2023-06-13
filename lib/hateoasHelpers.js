/**
 * Generates an object containing HATEOAS links based on the provided arguments
 * @param {String} reqPath The url of the request that does not contain the query string parameters.
 * @param {Number} currPage The page being requested
 * @param {Number} lastPage The number of the last page
 * @param {Object} queryStringParams an object containing all the query string parameters from the request so they can be added to the HATEOAS links
 * 
 * @returns an object containing urls with the correct query string parameters for "nextPage," "lastPage," "prevPage," and "firstPage"
 */
function generateHATEOASlinks(reqPath, currPage, lastPage, queryStringParams){
	var links = {}
	
	var queryStringKeys = Object.keys(queryStringParams)
	var linkParts = {
		beginning: `${reqPath}?page=`,
		end: ""
	}
	for (var i = 0; i < queryStringKeys.length; i++){
		var currKey = queryStringKeys[i]
		linkParts.end = `${linkParts.end}&${currKey}=${queryStringParams[currKey]}`
	}

	if (currPage < lastPage){
		links.nextPage = `${linkParts.beginning}${currPage + 1}${linkParts.end}`
		links.lastPage = `${linkParts.beginning}${lastPage}${linkParts.end}`
	}
	if (currPage > 1){
		links.prevPage = `${linkParts.beginning}${currPage - 1}${linkParts.end}`
		links.firstPage = `${linkParts.beginning}1${linkParts.end}`
	}

	return links
}

/**
 * Generates a new object from the obj argument containing only the keys specified in the keys argument.
 * @param {Object} obj any object
 * @param {Array} keys an array of strings specifying the key-value pairs to save from obj
 * 
 * @returns An object containing only the key-value pairs from obj specified in the keys array.
 */
function getOnly(obj, keys){
	var resultObj = {}

	keys.forEach((element) => {
		if (obj[element]){
			resultObj[element] = obj[element]
		}
	})

	return resultObj
}

exports.getOnly = getOnly
exports.generateHATEOASlinks = generateHATEOASlinks