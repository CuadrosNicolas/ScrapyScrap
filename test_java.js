

const { queryChain } = require("./QueryChain")

let start = async function () {

	/**

	 * Get repositories containing the guava artifactID keywords

	 * Written in Java

	 * Push between 2017-08-18 and 2019-08-18

	 * With an amount of stars superior to 0

	 * With a step of 1 day between each sub request of repository

	 */

	const chainName = "MavenProjects"

	queryChain(chainName, {

		type: "query",

		query: {

			keywords: "",

			language: "java",

			begin: new Date("2019-03-18"),

			end: new Date("2019-03-19"),

			stars: ">0",

			step: 1

		}

	})

		.checkFile({

			keywords: "<groupId>com.google.guava</groupId>",

			fileName: "pom",

			fileExtension: "xml"

		}, "mvn")

		.clone("./results")     //Clone the repository

		//Add the fullPath property to the repository

		.checkLOC('test', '.java', 'loc_test', 1000) //Source Code LOC

		.checkLOCExclude('src', 'test', '.java', 'loc_src', 1000) //Test Code LOC

		.checkCommandOnFiles('mvn', 'mvn compile', 'buildable', optional = true) //Test to compile

		.run((r) => {

			console.log("Repositories : ", Object.keys(r).length)

			Object.keys(r).forEach((k) => {

				console.log(`\t ${r[k].owner.login}/${r[k].name} loc: ${r[k].properties.loc_src.loc} ${r[k].properties.loc_test.loc}`)

			})

		}) //Shows each repositories that fulfill all criterias

}

start()

