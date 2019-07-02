const {queryChain} = require("./QueryChain")
let start = async function () {

		/**
		 * Get repositories containing the akka keywords
		 * Written in Scala
		 * Push between 2019-06-01 and 2019-06-02
		 * With an amount of stars superior to 0
		 * With a step of 1 day between each sub request of repository
		 */
		const searchRepo_options = {
			keywords: "akka",
			language: "scala",
			begin: new Date("2019-06-01"),
			end: new Date("2019-06-02"),
			stars: ">0",
			step: 1
		};
		const checkProperty_options = {
			fileName: "build",
			fileExtension: "sbt",
			keywords: "akka"
		};
		const checkProperty_name = "build";
		const buildProperty_name = "buildable"
		const clone_folder = "./results";
		queryChain("test_chain",searchRepo_options)
			.checkFile(checkProperty_options,checkProperty_name)
			.clone(clone_folder)//Add the fullPath property to the repository
			.checkCommand((r) => [
				`cd ${r.properties.fullPath} && sbt compile < /dev/null;`
			].join("\n"),buildProperty_name)
			.run()



}
start()