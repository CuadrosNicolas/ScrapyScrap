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
	const chainName = "testChain"
			queryChain(chainName, {
				keywords: "akka",
				language: "scala",
				begin: new Date("2019-06-01"),
				end: new Date("2019-06-02"),
				stars: ">0",
				step: 1
				})
				.checkFile({
						fileName: "",
						fileExtension: "",
						keywords: "akka-actor"
				}, "actor", false) //Check if the repository contain a build.sbt file
								// and if it contain the akka-actor keyword
				.checkFile({
					fileName: "",
					fileExtension: "",
					keywords: "akka-test"
				}, "test",true)
				//.checkProperty(r=>true)//r.properties.actor.valid && r.properties.test.valid)
				.clone("./results")	//Clone the repository
									//Add the fullPath property to the repository
				 .checkCommand((r) =>
				 `cd ${r.properties.fullPath} && sbt compile < /dev/null;`
				 ,"buildable")	//Test to compile

				.run((r)=>{
						console.log("Repositories : ",Object.keys(r).length)
						Object.keys(r).forEach((k)=>{
							console.log(`\t ${r[k].owner.login}/${r[k].name}`)
						})
						var url = "mongodb://localhost:27017/";
						MongoClient.connect(url,async  function (err, db) {
							if (err) throw err;
							var dbo = db.db("queryChain");
							try{
								await dbo.dropCollection(chainName)
							}
							catch(e)
							{
								//
							}
							Object.keys(r).forEach((k) => {
								dbo.collection(chainName).insertOne(r[k], function (err, res) {
									if (err) throw err;
								});
							})
							db.close()
						});
					}) //Shows each repositories that fulfill all criterias

}
start()