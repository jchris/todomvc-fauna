// import fetch from 'fetch'

const todosEndpoint = 'https://lb3gtcvf9f.execute-api.us-east-1.amazonaws.com/dev';


export default class TodoModel {
	constructor (key) {
		this.key = key;
		this.todos = [];
		this.auth = {}
		this.onChanges = [];
	}
	subscribe(onChange) {
		this.onChanges.push(onChange);
	}
	inform() {
		this.getServerTodos().then(()=>{
			this.onChanges.forEach(function (cb) { cb(); });
		})
	}
	onAuthChange (auth, reload) {
		this.auth = auth;
		console.log("auth", auth, reload)
		if (reload) {
			this.inform()
		}
	}
	makeRequest(id, verb, body, count) {
		if (typeof count === 'undefined') {
			count = 2
		}
		if (count < 1) {
			return Promise.reject("too many retries")
		}
		if (!this.auth.authorization_token) {
			if (this.auth.doRefresh) {
				return this.auth.doRefresh().then(()=> {
					return this.makeRequest(id, verb, body, count -1)
				});
			} else {
				return Promise.reject("no auth")
			}
		}
		var path = todosEndpoint+"/todos";
		if (id) {
			path += "/" + id;
		}
		var options = {
			method : verb,
			headers : {
				Authorization : this.auth.authorization_token
			}
		}
		if (body) {
			options.body = JSON.stringify(body)
		}
		console.log("makeRequest", options)
		return fetch(path, options).then((ok)=>{
			var contentType = ok.headers.get("content-type");
  		if(contentType && contentType.indexOf("application/json") !== -1) {
				return ok.json().then((data) => {
					return data;
				}).catch((e) => ok)
			} else {
				return ok;
			}
		}).then((ok) => {
			console.log("ok", ok)
			return ok;
		}).catch((e) => {
			console.log('fetch error', e)
			return this.auth.doRefresh().then(()=> {
				return this.makeRequest(id, verb, body, count -1)
			});
		});
	}
	getServerTodos() {
		return this.makeRequest(null, 'GET').then((r) => {this.todos = r.data;})
	}
	addTodo(title) {
		var newTodo = {
			title: title,
			completed: false
		}
		this.makeRequest(null, 'POST', newTodo).then((r) => {
			this.inform()
		})
	}
	toggleAll(checked) {
		return this.makeRequest('toggle', 'POST').then((r) => {
			this.inform();
		})
	}
	toggle(todoToToggle) {
		var id = todoToToggle.ref["@ref"].split('/').pop();
		console.log("todoToToggle", todoToToggle)
		todoToToggle.data.completed = !todoToToggle.data.completed;
		this.makeRequest(id, 'PUT', todoToToggle.data).then((r) => {
			this.inform()
		})
	}
	destroy(todo) {
		var id = todo.ref["@ref"].split('/').pop();
		this.makeRequest(id, 'DELETE').then((r) => {
			this.inform()
		})
	}
	save(todoToSave, text) {
		var id = todoToSave.ref["@ref"].split('/').pop();
		console.log("todoToSave", todoToSave)
		todoToSave.data.title = text;
		this.makeRequest(id, 'PUT', todoToSave.data).then((r) => {
			this.inform()
		})
	}
	clearCompleted() {
		return this.makeRequest('clear', 'POST').then((r) => {
			this.inform();
		})
	}
};
