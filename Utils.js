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

module.exports = {
	sleep,
	addDays,
	formatDate,
	prompt
}