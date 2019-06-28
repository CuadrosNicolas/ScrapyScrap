
const Octokit = require('@octokit/rest')
const Git = require("nodegit");
const fs = require('fs');
const configFilePath = "./config.json"
const process = require("process")
const exec = require('child_process').exec;

let configs = {}
if (fs.existsSync(configFilePath)) {
	configs = JSON.parse(fs.readFileSync("./config.json"))
}
else {
	fs.writeFileSync(configFilePath, '{\n\t"API_KEY":""\n}')
	throw new Error("Error : the config file does not exist.\nIt has been created but you need to specify a github access token.")
}
const clientWithAuth = new Octokit({
	auth: 'token ' + configs.API_TOKEN
})
/**
 *	Sleep function to wait a certain amount of time (express in milliseconds)
 *	Need to use await before calling it
 *
 * @param {number} ms number of milliseconds to wait
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 *	Take a repository object from octokit to keep only the interresting parts
 *
 * @param {*} r repository object from octokit
 */
function Repository(r) {
	//STARS
	//WATCHERS
	//SIZE
	//OPEN ISSUES
	//ARCHIVED
	//DISABLED
	//PUSHED UPDATES CREATED
	return {
		id: r.id,
		git_url: r.git_url,
		fork: r.fork,
		name: r.name,
		login: r.owner ? r.owner.login : r.login,
		forks_count: r.forks_account,
		clone_url: r.clone_url,
		size: r.size,
		open_issues_count: r.open_issues_count,
		archived: r.archived,
		disabled: r.disabled,
		pushed_at: r.pushed,
		updated_at: r.updated,
		created_at: r.created,
		properties: {

		}
	}
}
/**
 *	Take a File object from octokit to keep only the interresting parts
 *
 * @param {*} f file object from octokit
 */
function File(f) {
	return {
		name: f.name,
		path: f.path,
		url: f.url,
		repository: f.repository.full_name
	}
}
/**
 * Default function to send a request to the github API via Octokit
 *
 * @param queryFunction Function from the octokit.search field
 * @param query 		q parameter of an octokit query
 * @return results as octokit objects
 */
async function Querying(queryFunction, query, pageCallBack = null, recover = null) {
	let length = 0
	let page =1
	let datas = []
	console.log("Query : ", query.q)
	let count = recover ? recover.count : 0
	let total_count = recover && recover.total_count != undefined ? recover.total_count : null
	if (recover && recover.page == page && recover.results) {
		console.log(`Recovering : page=${page}, count=${count}/${total_count}`)
		if (pageCallBack) {
			await pageCallBack(recover.results, page, count, total_count);
		}
		datas = recover.results;
		page += 1
	}
	while (page <= 10 && (total_count == null || count < total_count)) {
		let wait = 0
		let pagesInfo = {
			page: page,
			per_page: 100
		}
		let pageQuery = {
			...pagesInfo,
			...query
		}
		let rateLimit = (await clientWithAuth.rateLimit.get()).data
		let queryThen = async d => {
			if (!total_count)
				total_count = d.data.total_count
			console.log("\tPage : ", page)
			length = d.data.items.length
			count += length
			console.log("\tNumber of results : ", length)
			if (pageCallBack) {
				await pageCallBack(d.data.items, page,count,total_count);
			}
			page += 1
			d.data.items.forEach(i => datas.push(i))

		}
		await queryFunction(pageQuery).then(queryThen).catch(e => {
			if (e.status == 403) {
				time = rateLimit.resources.search.reset
				waitingTime = new Date((time + 1) * 1000)
				console.log("Waiting to reset : ", waitingTime - Date.now())
				wait = waitingTime - Date.now()
			}
			else {
				throw e
			}
		})

		if (wait > 0)
			await sleep(wait)
	}
	if (page > 10) {
		console.log("WARNING : more than 10 pages has been found, all results might not appear.")
	}
	return datas
}

function addDays(date, days) {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function formatDate(date) {
	return date.toISOString().substring(0, 10);
}
/**
 * Search for repositories follow the criterias of the options parameter
 *
 * @param options Options object for the search
 * @param {String} options.keywords Keywords contained in the readme/description/title of the repository (Optional)
 * @param {String} options.language Language of the repository (Optional)
 * @param {String} options.stars Number of stars (Optional)
 * @param {Date} options.begin
 * @param {Date} options.end
 * @param {number} options.step Step between two search in days
 * @returns {Object.<string,string>}
 */
async function searchRepo(options, pageCallBack = null, recover = null) {

	let beginDate = recover ? new Date(recover.date) : options.begin
	let endDate = options.end
	let step = options.step
	let keywords = options.keywords
	let language = options.language
	let stars = options.stars
	let size = options.size
	let query = (keywords ? `${keywords} ` : " ")
		+ (language ? `language:${language} ` : " ")
		+ (stars ? `stars:${stars} ` : " ")
		+ (size ? `size:${size}` : " ")
		+ `pushed:`

	let repoList = []
	while (beginDate < endDate) {
		let stepDate = addDays(beginDate, step)
		let actualQuery = query + formatDate(beginDate) + ".." + formatDate(stepDate)
		let tempResultsList = []
		let currentPage = 0
		let tempAccount = 0
		let tempTotalAccount = null;
		let results = (await Querying(clientWithAuth.search.repos,
			{ q: actualQuery },
			(l, p,a,ta) => {
				tempResultsList = l.map(e => Repository(e))
				currentPage = p
				tempAccount = a
				tempTotalAccount = ta;
			}
			, recover))
		if (pageCallBack && tempResultsList.length > 0) {
			await pageCallBack(tempResultsList, currentPage, beginDate,tempAccount,tempTotalAccount)
		}
		repoList.push(...results.map((e) => Repository(e)))
		beginDate = stepDate
	}
	return repoList
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
async function searchFileInRepo(repository, options, recover = null, pageCallBack = null) {
	let keywords = options.keywords
	let fileName = options.fileName
	let fileExtension = options.fileExtension
	let size = options.size
	let fileList = []
	query = (keywords ? `${keywords} ` : " ")
		+ (fileName ? `filename:${fileName} ` : " ")
		+ (fileExtension ? `extension:${fileExtension} ` : " ")
		+ (size ? `size:${size}` : " ")
		+ `repo:${repository.login + "/" + repository.name} `
	fileList.push(...((await Querying(clientWithAuth.search.code, { q: query }, pageCallBack, recover)).map(f => File(f))))
	return fileList
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
async function check(repository, options, propertyName, recover = null, pageCallBack = null) {
	let files = (await searchFileInRepo(repository, options, recover, pageCallBack))
	repository.properties[propertyName] = {
		valid: files.length > 0,
		files: files.map(f => File(f))
	}
	return repository, repository.properties[propertyName].valid
}
/**
 *
 *	Take a list of repository and check if contained a property (added by the check function)
 *
 * @param {*} repositoryList List of repository
 * @param {*} property Property to check
 * @return List of repository after being filtered
 */
function filterByProperty(repositoryList, property) {
	return repositoryList.filter((r) =>
		r.hasOwnProperty(property) && r.properties[property].valid)
}
/**
 * Clone a list of repository to a folder
 *
 * @param {*} reposList List of repository
 * @param {*} folder Path to put the cloned repositories
 */
async function cloneRepositoryList(repos = null, folder = "./repos") {

	if (!folder.endsWith('/'))
		folder += '/'

	if (repos) {
		if (repos instanceof Array) {

			repos.forEach(e => {
				e.folder = folder + e.login + "/" + e.name
				e.fullPath = process.cwd() + e.folder.replace(".", "")
				Git.Clone(e.url, folder + e.login + "/" + e.name)
			})
		}
		else {
			repos.folder = folder + repos.login + "/" + repos.name
			repos.fullPath = process.cwd() + repos.folder.replace(".", "")
			Git.Clone(repos.clone_url, folder + repos.login + "/" + repos.name)
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
	return new Promise((resolve, reject) => {
		try {
			if (!folder.endsWith('/'))
				folder += '/'
			repo.folder = folder + repo.login + "/" + repo.name
			repo.fullPath = process.cwd() + repo.folder.replace(".", "")
			Git.Clone(repo.clone_url, folder + repo.login + "/" + repo.name)
			resolve({ repo, path: repo.fullPath })
		}
		catch (e) {
			reject(e);
		}
	})
}
/**
 *
*/
class TrackSystem {
	constructor(name) {
		this.name = name;
		this.linkData = {}
		this.load()
	}
	setState(o) {
		this.data = {
			...this.data,
			...o,
		}
		this.save()
	}
	get(n)
	{
		return this.data[n] != undefined ? this.data[n] : null
	}
	getLinkData(){
		return this.linkData
	}
	load() {
		if (fs.existsSync("./track_" + this.name + ".json")) {
			this.data = JSON.parse(fs.readFileSync("./track_" + this.name + ".json"))
		} else {
			this.data = {}
		}
		if (fs.existsSync("./results_" + this.name + ".json")) {
			this.linkData = JSON.parse(fs.readFileSync("./results_" + this.name + ".json"))
		} else {
			this.linkData = {}
		}
	}
	isEmpty()
	{
		return Object.keys(this.data).length==0
	}
	clean() {
			this.data = {};
			this.save();
	}
	save() {
			fs.writeFileSync("./track_" + this.name + ".json", JSON.stringify(this.data))
			fs.writeFileSync("./results_" + this.name + ".json", JSON.stringify(this.linkData))
	}
}
/**
 * Class to handle a chain of request to the github API
 * search repository -> check -> check...-> result
 */
class Chain {
	/**
	 * 
	 * @param {String} collectionName Name of the output json file
	 */
	constructor(collectionName) {
		this.collectionName = collectionName;
		this.checkList = []
		this.searchRepoOptions = null
		this.checkListCallBack = null;
		this.trackSystem = new TrackSystem(collectionName)
	}
	/**
	 * 
	 * @param {*} options query options for searching the repository (see searchRepo)
	 */
	searchRepo(options) {
		this.searchRepoOptions = options;
		return this;
	}
	/**
	 *	Defined a property to check (see check function)
	 *
	 * @param {*} options Options of the check function
	 * @param {*} proppertyName Name of the property
	 * @param {*} optional If true, make the property optional to pass the chain
	 */
	check(options, proppertyName, optional = false) {
		this.checkList.push({
			...options,
			optional: optional,
			proppertyName: proppertyName
		});
		return this;
	}
	/**
	 *	Run the chain
	 *
	 * @param {*} callback Callback function to call at the end at the chain
	 * 						each time a results succeed to pass each check
	 *
	 * @return promise containing all the results after the chain ended
	 * 			Results are contained in a list will all analysed repositories
	 */
	async run(callback) {
		let parentChain = this;
		return new Promise(async (resolve, reject) => {
			let analysedRepositories = this.trackSystem.getLinkData()
			let hasFailed = false
			let rSearch = this.trackSystem.get("search")
			let rCheck = this.trackSystem.get("check")
			let lastRepo = rSearch ? rSearch.repo : 0
			let lastCheck = rCheck ? rCheck.check : 0
			try {
				//search the repositories
				await searchRepo(parentChain.searchRepoOptions,
					//Add a callback function for each pages
					async (l, p, d,a,ta) => {
						this.trackSystem.setState({search:{
							date : d,
							page : p,
							results : l,
							count : a,
							total_count:ta
						},
							lastUpdate: "SEARCH",check:null})
						for (let i = lastRepo; i < l.length; i++) {
							let repo = l[i]
							this.trackSystem.setState({
								search: {
									repo : i,
									date: d,
									page: p,
									results: l,
									count: a,
									total_count: ta

								},lastUpdate: "SEARCH"
							})
							//For each repositories test all the checking chain
							analysedRepositories[repo.id] = repo;
							for (let y = lastCheck; y < parentChain.checkList.length; y++) {
								let checkOptions = parentChain.checkList[y]
								this.trackSystem.setState({
									check: {
										check: y
									}, lastUpdate: "CHECK"
								})
								let _, v = await check(repo,
									checkOptions,
									checkOptions.proppertyName,
									rCheck, (l, p, a, ta) => {
										this.trackSystem.setState({
											check: {
												page: p,
												results: l,
												check : y,
												count: a,
												total_count: ta
											}, lastUpdate: "CHECK"
										})
									})
								if (!v && checkOptions.optional == false) {
									hasFailed = true;
									break;
								}
							}
							lastCheck = 0;
							if (!hasFailed && callback) {
								callback(repo)
							}
							hasFailed = false
							rCheck = null;
						}
						lastRepo = 0;
						rSearch = null;
					}, rSearch)
				this.trackSystem.clean();
				//Write the final results into a json file
				this.trackSystem.save();
				return resolve(analysedRepositories)
			}
			catch (e) {
				reject(e)
			}
		})
	}
}
/**
 *
 * Interface function to create a chain
 *
 * @param {*} collectionName Name of the output file
 */
function FilteringChain(collectionName) {
	return new Chain(collectionName);
}


function formatExecOutput(o) {
	if (o != null && o instanceof String)
		o = o.split("\n").map(s => s + "\n\t\t").join("")
	return o;
}
/**
 * Object representing a chain of process to apply
 */
class PostProcessChainObject {
	/**
	 *
	 */
	constructor(collectionName) {
		this.commandList = []
	}
	/**
	 *
	 * @param {*} commandList List of command as a string
	 * @param {*} condition Condition function applied on the result of the process
	 *						If true or (false and optional) continue to run
	 * @param {*} optional
	 */
	check(commandList, condition = (err, stdout, stderr) => { return err == null },
		optional = false) {
		this.commandList.push({
			commandList,
			condition,
			optional,
		})
		return this;
	}
	/**
	 * Run the process chain
	 * @param {*} callback Function call at the end of the chain
	 */
	async run(callback) {
			let nCommand = this.commandList.length;
			let actualCommand = 0
			let next = (err, stdout, stderr) => {
				console.log(`\tErr : ${formatExecOutput(err)}`)
				console.log(`\tStdout : ${formatExecOutput(stdout)}`)
				console.log(`\tStderr : ${formatExecOutput(stderr)}`)
				let suceed = (this.commandList[actualCommand].condition(err, stdout, stderr)
					|| this.commandList[actualCommand].optional)
				if ((this.commandList[actualCommand].condition(err, stdout, stderr)
					|| this.commandList[actualCommand].optional)
					&& actualCommand + 1 < nCommand) {
					actualCommand++;
					console.log(`Executing : ${formatExecOutput(this.commandList[actualCommand].commandList)}`)
					exec(this.commandList[actualCommand].commandList, next)
				}
				else {
					if (callback)
						callback(suceed)
				}
			}
			console.log(`Executing : ${formatExecOutput(this.commandList[actualCommand].commandList)}`)
			exec(this.commandList[0].commandList, next)
	}
}
function repoAddProperties(repo,property)
{
	repo.properties[property.name] = {
		...property
	}
	return repo
}
module.exports = {
	cloneRepository,
	cloneRepositoryList,
	filterByProperty,
	check,
	searchFileInRepo,
	searchRepo,
	Querying,
	FilteringChain,
	Chain,
	PostProcessChain:()=>new PostProcessChainObject(),
	TrackSystem,repoAddProperties
}