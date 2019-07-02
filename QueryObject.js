/**
 *	Take a repository object from octokit to keep only the interresting parts
 *
 * @param {*} r repository object from octokit
 */
function Repository(r) {
	return {
		id: r.id,
		git_url: r.git_url,
		fork: r.fork,
		name: r.name,
		login: r.owner ? r.owner.login : r.login,
		forks_count: r.forks_account,
		clone_url: r.clone_url,
		size: r.size,
		open_issues_count: r.open_issues_count,
		archived: r.archived,
		disabled: r.disabled,
		pushed_at: r.pushed,
		updated_at: r.updated,
		created_at: r.created,
		properties: {

		}
	}
}
/**
 *	Take a File object from octokit to keep only the interresting parts
 *
 * @param {*} f file object from octokit
 */
function File(f) {
	return {
		name: f.name,
		path: f.path,
		url: f.url,
		repository: f.repository.full_name
	}
}

module.exports = {
	Repository,
	File
}