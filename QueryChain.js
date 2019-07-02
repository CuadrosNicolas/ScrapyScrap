const {TaskChain} = require("./Chain");
const {check,cloneRepository,
	getQueryRepoGenerator} = require("./Query")
const {prompt} = require("./Utils")
const exec = require('child_process').exec;

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
	return new Promise((resolve, reject) => {
		exec(cmd, (error, stdout, stderr) => {
			resolve({error,stdout,stderr});
		});
	});
}
/**
 * Chain of task to apply to a list of repository produce by a github repository query
 * Produce a results_'name'.json file containing the final result
 * Repository which not pass non optional task will not appear in the result
 * See QueryObject file for more informations about the repository object produced
 * by the generator
 *
 * Each task (checkFile,checkCommand,clone) add properties to object to track results
 * These properties can be then found in the .properties attribute of the object after each tasks
 * These properties are conserved between each tasks.
 */
class QueryChainObject{
	/**
	 * 
	 * @param {*} name Name of the chain (will be the name of the result file)
	 * @param {*} queryParam Parameters of the repository query
	 */
	constructor(name,queryParam)
	{
		this.taskChain = new TaskChain(name,getQueryRepoGenerator(queryParam),
			(r) =>{
				return ({key:r.id,value:r})
			});
	}
	/**
	 * Add a check file task
	 * Corresponding to a find file query to github
	 * Fail if there is no files correponding to the criterias
	 * This task add a property containing each files returned by the query.
	 *
	 * @param {*} options options the find file query
	 * @param {*} name Name of the property to add to the final results
	 * @param {*} optional If optional, the object will continue the chain
	 */
	checkFile(options,name,optional)
	{
		this.taskChain.task(async (r,recover)=>{
			prompt.level(0).print("Testing for : ",options," in ",r.name)
			let results = await check(options,name)(r,recover)
			return{
				...results,
				continue : results.results.properties[name].valid || optional
			}
		})
		return this;
	}
	/**
	 * Add a clone task
	 * Can not fail
	 * Add a fullPath property to the repository
	 *
	 * @param {*} folder Where to clone the repository using relative path (./...)
	 */
	clone(folder)
	{

		 this.taskChain.task(async (r)=>{
			 prompt.level(0).print(`Cloning ${r.name} to ${folder}`)
			 let temp = await cloneRepository(r,folder);
			 return {
				 ...temp,
				 continue: true
			 }
			})
		return this;
	}
	/**
	 *	Add a command task
	 *
	 * @param {*} f Function taking a repository as a parameter,
	 *  			returning a bash command as a string
	 * 				(a repository contain a fullPath property to know his location
	 * 				after being cloned)
	 * @param {*} propertyName Name of the property to add to the object
	 * @param {*} condition Function taking the result of a command ({error,stdout,stderr})
	 * 						as an input, returning a boolean
	 */
	checkCommand(f, propertyName, condition = ({ error, stdout, stderr },optional=false)=>error==null)
	{
		this.taskChain.task(async function(repo,recover){
			let commands = f(repo);
			prompt.level(0).print("Executing : ",commands)
			let r = await execShellCommand(commands)
			let out = repo
			out.properties[propertyName] = {
				valid : condition(r)
			}
			return {
				results :out,
				recover : {},
				continue : out.properties[propertyName] || optional
			}
		})
		return this;
	}
	async run(callback=(r)=>null)
	{
		await this.taskChain.run(callback)
	}
}

/**
 * Interface for the QueryChainObject
 * @param {*} name
 * @param {*} options 
 */
function queryChain(name,options)
{
	return new QueryChainObject(name,options)
}

module.exports = {
	queryChain
}