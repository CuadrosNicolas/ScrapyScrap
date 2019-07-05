const {queryChain} = require("./QueryChain")
var MongoClient = require('mongodb').MongoClient;
let start = async function () {
	/**
	 * Get repositories containing the akka keywords
	 * Written in Scala
	 * Push between 2019-06-01 and 2019-06-02
	 * With an amount of stars superior to 0
	 * With a step of 1 day between each sub request of repository
	 */
	const chainName = "AkkaProjects_post"
			queryChain(chainName, {
				type : "file",
				path: "./results_AkkaProjects.json"
				})
				.checkCommit({
					keywords : "a",
				},"commit")
				.run((r)=>{
						Object.keys(r).forEach((k)=>{
							console.log(`\t ${r[k].owner.login}/${r[k].name}`)
						})
					}) //Shows each repositories that fulfill all criterias

}
start()