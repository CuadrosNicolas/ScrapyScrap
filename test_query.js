const {queryChain} = require("./QueryChain")
let start = async function () {
	/**
	 * Get repositories containing the akka keywords
	 * Written in Scala
	 * Push between 2019-06-01 and 2019-06-02
	 * With an amount of stars superior to 0
	 * With a step of 1 day between each sub request of repository
	 */
	const chainName = "AkkaProjects"
			queryChain(chainName, {
				type : "query",
					query : {
					keywords: "",
					language: "scala",
					begin: new Date("2019-01-01"),
					end: new Date("2019-08-21"),
					stars: ">0",
					step: 1
					}
				})
				.checkFile({
					keywords : "akka",
					fileName:"build",
					fileExtension:"sbt"
				},"sbt")
				.clone("./results")	//Clone the repository
				//Add the fullPath property to the repository
				.checkLOC('test','.scala','loc_test',10)
				.checkLOCExclude('src','test', '.scala', 'loc_src', 10)
				.checkCommandOnFiles('sbt','sbt compile < /dev/null','buildable')
				.run((r) => {
						console.log("Repositories : ",Object.keys(r).length)
						Object.keys(r).forEach((k)=>{
							console.log(`\t ${r[k].owner.login}/${r[k].name} loc: ${r[k].properties.loc_src.loc} ${r[k].properties.loc_test.loc}`)
						})
					}) //Shows each repositories that fulfill all criterias

}
start()