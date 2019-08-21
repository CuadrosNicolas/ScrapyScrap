const {Repository,File} = require('./QueryObject')
const {addDays,sleep,formatDate,prompt} = require('./Utils')
const Octokit = require('@octokit/rest')
const Git = require("nodegit");
const configFilePath = "./config.json"
const fs = require('fs');



let configs = {}
if (fs.existsSync(configFilePath)) {
	configs = JSON.parse(fs.readFileSync("./config.json"))
}
else {
	fs.writeFileSync(configFilePath, '{\n\t"API_TOKEN":""\n}')
	throw new Error("Error : the config file does not exist.\nIt has been created but you need to specify a github access token.")
}
const clientWithAuth = new Octokit({
	auth: 'token ' + configs.API_TOKEN
})

/**
 * Github query used as an async generator
 * yield each page of the response
 * Wait if it exceed the rate limit
 *
 * @param {*} queryFunction Function from octokit.search
 * @param {*} query Query to send
 * @param {*} recover Recover object used to recover from a crash
 */
async function* queryGenerator(queryFunction, query, recover) {
	prompt.level(0).print("Query : ", query)
	let length = 0;
	if (recover == undefined)
		recover = {}
	let total_count = recover.total_count != undefined ? recover.total_count : null;
	let count = recover.count != undefined ? recover.count : 0;
	let page = recover.lastPage != undefined ? recover.lastPage : 1;
	let lastResults = recover.lastResults != undefined ? recover.lastResults : null
	if (lastResults != null) {
		prompt.level(1).print("Recovering page " + lastResults);
		yield {
			results: lastResults,
			recover: {
				lastResults,
				page,
				count,
				total_count
			}
		};
		page++;
	}
	recover ={};
	lastResults = null;
	while (page <= 10 && (total_count == null || count < total_count)) {
		let wait = 0;
		let rateLimit = (await clientWithAuth.rateLimit.get()).data
		let results = null
		try{
			let d = await queryFunction({q:query});
			results = d;
			total_count = d.data.total_count
			length = d.data.items.length
			count += length
		}
		catch(e){
			if (e.status == 403) {
				time = rateLimit.resources.search.reset
				waitingTime = new Date((time + 1) * 1000)
				prompt.level(1).print("Waiting to reset : ", waitingTime - Date.now())
				wait = waitingTime - Date.now()
			}
			else {
				throw e
			}
		}
		if (wait == 0) {
			yield {
				results: results.data.items,
				recover: {
					lastPage: page,
					lastResults: results.data.items,
					count,
					total_count
				}
			}
			page += 1;
		}
		else {
			await sleep(wait)
		}
	}
	if (page >= 10) {
		prompt.level(1).print("WARNING : more than 10 pages has been found, all results might not appear.")
	}
}

/**
 * Search for files in a repository following the options provided in parameters
 *@param repository Repository object
 * @param options Options object for the search
 * @param {String} options.keywords Keywords contained in the file (Optional)
 * @param {String} options.fileName Name of the file (Optional)
 * @param {String} options.fileExtensions Extension of the file (Optional)
 * @returns
 */
async function searchFileInRepo(repository, options,rec) {
	let keywords = options.keywords
	let fileName = options.fileName
	let fileExtension = options.fileExtension
	let size = options.size
	query = (keywords ? `${keywords} ` : " ")
		+ (fileName ? `filename:${fileName} ` : " ")
		+ (fileExtension ? `extension:${fileExtension} ` : " ")
		+ (size ? `size:${size}` : " ")
		+ `repo:${repository.owner.login + "/" + repository.name} `

	r = []
	let temp_rec = null;
	for await (let { results, recover } of queryGenerator(clientWithAuth.search.code, query, rec))
	{
		r.push(...results)
		rec = recover
	}
	return {
		results : r,
		recover: { ...temp_rec		}
	}
}


/**
 * Search for commits in a repository following the options provided in parameters
 *@param repository Repository object
 * @param options Options object for the search
 * @param {String} options.keywords Keywords contained in the file (Optional)
 * @returns
 */
async function searchCommitsInRepo(repository, options, rec) {
	let keywords = options.keywords
	let fileName = options.fileName
	query = (keywords ? `${keywords} ` : " ")
		+ `repo:${repository.owner.login + "/" + repository.name} `

	r = []
	let temp_rec = null;
	for await (let { results, recover } of queryGenerator(clientWithAuth.search.commits, query, rec)) {
		r.push(...results)
		rec = recover
	}
	return {
		results: r,
		recover: { ...temp_rec }
	}
}

/**
 *
 * Check if a repository appear in the result of a request
 * The request search for source code following the criteria defined in the options parameters
 * Add the property to the repository object with as name "propertyName"
 *
 * @param {*} repository Repository to check
 * @param {*} options  Options of the search code request
 * @param {*} propertyName Name of the property to add
 */
function check(options, propertyName) {
	return async function(repository,recover){
		let files = (await searchFileInRepo(repository, options,recover))
		repository.properties[propertyName] = {
			valid: files.results.length > 0,
			files : files.results,
		}
		return {
				results : repository,
				recover : {...files.recover}
			}
		}
	}

/**
 *
 * Check if a repository appear in the result of a request
 * The request search for source code following the criteria defined in the options parameters
 * Add the property to the repository object with as name "propertyName"
 *
 * @param {*} repository Repository to check
 * @param {*} options  Options of the search code request
 * @param {*} propertyName Name of the property to add
 */
function checkCommit(options, propertyName) {
	return async function (repository, recover) {
		let files = (await searchCommitsInRepo(repository, options, recover))
		repository.properties[propertyName] = {
			valid: files.results.length > 0,
			files: files.results,
		}
		return {
			results: repository,
			recover: { ...files.recover }
		}
	}
}

/**
 * Clone a repository to a folder
 * Add a "fullPath" property to the object to know where it was cloned
 * @param {*} reposList repository
 * @param {*} folder Path to put the cloned repositories
 */
async function cloneRepository(repo, folder = "./repos") {
		try {
			if (!folder.endsWith('/'))
				folder += '/'
			repo.folder = folder + repo.owner.login + "/" + repo.name
			repo.properties.fullPath = process.cwd() + repo.folder.replace(".", "")

			try{

				await Git.Clone(repo.clone_url, folder + repo.owner.login + "/" + repo.name);
			}
			catch(e)
			{
				console.log(e)
			}
			return {
				results : repo,
				recover : {}
			}
		}
		catch (e) {
			reject(e);
		}
}

/**
 *	Send a generator yielding repository from a request
 *
 * @param {*} options Request for a repository search
 */
function getQueryRepoGenerator(options)
{
	return async function* (rec) {
		let lastDate = rec.lastDate
		let lastIndex = rec.lastIndex
		let beginDate = lastDate != undefined ? new Date(lastDate) : options.begin
		let endDate = options.end
		let step = options.step
		let query = (options.keywords ? `${options.keywords} ` : " ")
		+ (options.language ? `language:${options.language} ` : " ")
		+ (options.stars ? `stars:${options.stars} ` : " ")
		+ (options.size ? `size:${options.size}` : " ")
		+ `pushed:`
		let index = lastIndex != undefined ? lastIndex : 0
		let alreadySeen = {}
		while (beginDate < endDate) {
			let stepDate = addDays(beginDate, step)
			let actualQuery = query + formatDate(beginDate) + ".." + formatDate(stepDate)
			for await (let { results, recover } of queryGenerator(clientWithAuth.search.repos, actualQuery,rec)) {
				for (let i = index; i < results.length; i++) {
					rec = undefined;
					let repo = results[i];
					if (!(alreadySeen.hasOwnProperty(repo.id))) {
						yield {
							results: {
								...repo,
								properties : {}
							},
							recover: {
								lastIndex: i,
								lastDate: beginDate,
								...recover
							}
						}
						alreadySeen[repo.id] = repo.name
					}
				}
				index = 0;
			}
			beginDate = stepDate
		}
	}
}
module.exports = {
	getQueryRepoGenerator,
	queryGenerator,
	check,
	cloneRepository,
	checkCommit
}