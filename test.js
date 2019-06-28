var scrap = require("./scrapyScrap.js");
const fs = require('fs-extra');
const { performance } = require('perf_hooks');
const exec = require('child_process').exec;


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
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
		end: new Date("2019-06-20"),
		stars: ">0",
		step: 1
	};
	const checkProperty_options = {
		fileName: "build",
		fileExtension: "sbt",
		keywords: "akka"
	};
	const checkProperty_name = "build";
	const clone_folder = "./results";
	let trackSystem = new scrap.TrackSystem("test_10_process")
	let results = trackSystem.getLinkData()

		 scrap.FilteringChain("test_10_git").searchRepo(searchRepo_options)
			 .check(checkProperty_options, checkProperty_name)
			 .run((repo) => {
				 /**
				  * This function is call each time a repository reach the end of the chain
				  */
				 scrap.cloneRepository(repo, clone_folder).then(({_,path})=>{
					  scrap.PostProcessChain().check([
						  `cd ${path} && sbt compile < /dev/null;`
						].join("\n")).run((r)=>{
							scrap.repoAddProperties(repo,{name:"buildable",valid:r})
							if(r)
							{
								results[repo.id] = repo
							}
							trackSystem.save()
							console.log("Process "+(r ? "succeed":"failed")+" for : "+repo.name)
						})
					})
			 })
	 //})






}
start()