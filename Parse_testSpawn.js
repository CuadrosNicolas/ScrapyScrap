
const fs = require("fs")

let temp = JSON.parse(fs.readFileSync("./results_AkkaProjects_post.json"))
let tab = Object.keys(temp).map(key=>{
	return key+" "+temp[key].properties.fullPath+" "+temp[key].name
}).join("\n");
fs.writeFileSync("./list.csv",tab)


