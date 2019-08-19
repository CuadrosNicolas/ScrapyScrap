const { queryChain } = require("./QueryChain")
let start = async function () {

	const chainName = "flaky_js"
	queryChain(chainName, {
		type: "query",
		query: {
			keywords: "",
			language: "javascript",
			begin: new Date("2019-01-01"),
			end: new Date("2019-07-01"),
			stars: ">50",
			step: 1
		}
	})
		.checkCommit({
			keywords: "flaky Flaky flaki Flaki",
		}, "commit")
		.run((r) => {
			console.log("Repositories : ", Object.keys(r).length)
			Object.keys(r).forEach((k) => {
				console.log(`\t ${r[k].owner.login}/${r[k].name}`)
			})
		}) //Shows each repositories that fulfill all criterias

}
start()