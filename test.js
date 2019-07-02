const {queryChain} = require("./QueryChain")
let start = async function () {

		/**
		 * Get repositories containing the akka keywords
		 * Written in Scala
		 * Push between 2019-06-01 and 2019-06-02
		 * With an amount of stars superior to 0
		 * With a step of 1 day between each sub request of repository
		 */
			queryChain("test_chain", {
				//keywords: "",
				language: "scala",
				begin: new Date("2019-01-01"),
				end: new Date("2019-07-01"),
				stars: ">0",
				step: 1
				})
				.checkFile({
						fileName: "build",
						fileExtension: "sbt",
						keywords: "akka-actor"
					},"build") //Check if the repository contain a build.sbt file
								// and if it contain the akka keyword

				.clone(".results")	//Clone the repository
									//Add the fullPath property to the repository


				 .checkCommand((r) =>
				 `cd ${r.properties.fullPath} && sbt compile < /dev/null;`
				 ,"buildable")	//Test to compile

				.run((r)=>{
						console.log("Repositories : ",Object.keys(r).length)
						Object.keys(r).forEach((k)=>{
							console.log(`\t ${r[k].login}/${r[k].name}`)
						});
					}) //Shows each repositories that fulfill all criterias

}
start()