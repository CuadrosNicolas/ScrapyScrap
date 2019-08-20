/**
 *	Sleep function to wait a certain amount of time (express in milliseconds)
 *	Need to use await before calling it
 *
 * @param {number} ms number of milliseconds to wait
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function addDays(date, days) {
	var result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function formatDate(date) {
	return date.toISOString().substring(0, 10);
}
function printLevel(t,i)
{
	console.log('\t'.repeat(i) + t)
	return this;
}
const prompt = {
	l : 0,
	level : (i)=>{
			return{
					print:	(...t)=>
					{
						printLevel(t.join(""),i)
					}
				}
	}
}

// List all files in a directory in Node.js recursively in a synchronous fashion
var walkSync = function (dir, filelist) {
	var path = path || require('path');
	var fs = fs || require('fs'),
		files = fs.readdirSync(dir);
	filelist = filelist || [];
	files.forEach(function (file) {
		if(path.join(dir,file).split('/').filter(n=>n.startsWith('.')).length==0)
		{
			if (fs.statSync(path.join(dir, file)).isDirectory()) {
				filelist = walkSync(path.join(dir, file), filelist);
			}
			else {
				filelist.push(path.join(dir,file));
			}
		}
	});
	return filelist;
};

const listContains = (l,n)=>l.filter(f=>f===n).length>0;
const checkParents = (list, parentName) => {
	return list.filter((f) =>  listContains(f.split('/'),parentName));
}
const checkExcludes = (list, parentName,exludeName) => {
	let l = checkParents(list, parentName);
	return l.filter((f) => !listContains(f.split('/'), exludeName));
}

const LOC=(filename)=>{
	var fs = require('fs');
	fileBuffer = fs.readFileSync(filename);
	to_string = fileBuffer.toString();
	split_lines = to_string.split("\n").filter(l => l.replace(/\s/g, '').length);
	return split_lines.length;
}
const endsWith=(list,name)=>{
	return list.filter((f)=>f.endsWith(name))
}

module.exports = {
	sleep,
	addDays,
	formatDate,
	prompt,
	walkSync,
	checkParents,
	checkExcludes,
	endsWith,
	LOC
}