const fs = require('fs');

function tester(object, condition, def) {
	return object != condition ? object : def
}
function isEmpty(o)
{
	return o==null || (Object.entries(o).length === 0 && o.constructor === Object)
}
/**
 * Object for managing recovering and saving data
*/
class TrackSystem {
	constructor(name) {
		this.name = name;
		this.linkData = {}
		this.load()
	}
	setState(o) {
		this.data = {
			...this.data,
			...o,
		}
		this.save()
	}
	get(n) {
		let result = this.data;
		n.split(".").some(i => {
			if (result[i] != null) {

				result = result[i]
				return false
			}
			else {

				result = null
				return true
			}
		})
		return result !=null ? result : {}
	}
	getLinkData() {
		return this.linkData
	}
	setLinkData(d)
	{
		this.linkData = d;
	}
	load() {
		if (fs.existsSync("./track_" + this.name + ".json")) {
			this.data = JSON.parse(fs.readFileSync("./track_" + this.name + ".json"))
		} else {
			this.data = {}
		}
		if (fs.existsSync("./results_" + this.name + ".json") && fs.existsSync("./track_" + this.name + ".json")) {
			this.linkData = JSON.parse(fs.readFileSync("./results_" + this.name + ".json"))
		} else {
			this.linkData = {}
		}
	}
	isEmpty() {
		return Object.keys(this.data).length == 0
	}
	clean() {
		this.data = {};
		this.save();
		fs.unlinkSync("./track_" + this.name + ".json", JSON.stringify(this.data))
	}
	save() {
		fs.writeFileSync("./track_" + this.name + ".json", JSON.stringify(this.data))
		fs.writeFileSync("./results_" + this.name + ".json", JSON.stringify(this.linkData))

	}
}

/**
 * Object able to create a task chain a run it
 * Can handle crash if recover parameters are added to task functions
 * Need a generator to yield data which need to be pass by the chain
 * If a task fail (return {continue:false}), the current analyszed object will be throw
 * A task need to receive and return an object of the same type of object as the one produced by the generator
 * A task need to return a results,a recover object (use as parameter if a crash happen),and a continue boolean
 *
 */
class TaskChain {
	constructor(name, generator, saveObjectFunction) {
		this.trackSystem = new TrackSystem(name)
		this.datas = this.trackSystem.getLinkData()
		this.generator = generator;
		this.lastTask = tester(this.trackSystem.get("lastTask"),null, 0)
		this.taskRecover = tester(this.trackSystem.get("taskRecover"),null,0)
		if (isEmpty(this.lastTask))
			this.lastTask = 0
		this.taskList = []
		this.saveObjectFunction = saveObjectFunction
	}
	saveObject(o)
	{
		let {key,value}=this.saveObjectFunction(o)
		this.datas[key] = value;
		return key;
	}
	removeObject(o)
	{

		let {key,value} = this.saveObjectFunction(o)
		delete this.datas[key]
		return key
	}
	async run(callback = (r) => null) {
		let rec = this.trackSystem.get("generator")
		let lastAnalysedResults = 0;
		for await (let { results, recover } of this.generator(rec)) {
			this.trackSystem.setState({ generator: recover, lastTask: {},taskRecover : {} })
			let r = this.lastTask > 0 ? this.datas[this.trackSystem.get("lastAnalysedResults")] : results;
			for (let act_t = this.lastTask; act_t < this.taskList.length && r!=null; act_t++) {
				this.trackSystem.setState({ lastTask: act_t })
				let temp = await this.taskList[act_t](r,this.taskRecover);
				this.taskRecover = {}
				this.trackSystem.setState({ taskRecover: temp.recover })
				r = temp.results
				if(temp.continue)
					lastAnalysedResults = this.saveObject(r)
				else{
					lastAnalysedResults = null;
					this.removeObject(r)
					this.trackSystem.setState({ lastAnalysedResults })
					break;
				}
				this.trackSystem.setState({ lastAnalysedResults})
			}
			this.lastTask = 0;
		}
		this.trackSystem.clean()
		callback(this.datas);
	}
	task(t) {

			this.taskList = [...this.taskList, t]
			return this;
	}

}

module.exports = {
	TaskChain,
}