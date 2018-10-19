var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
var Cookies = require('js-cookie');
var remote_db = 'http://127.0.0.1:5984/friend';
const uuidv4 = require('uuid/v4');

app.use('/scripts', express.static(__dirname + '/node_modules/js-cookie/src/'));
app.use('/scripts', express.static(__dirname + '/node_modules/pouchdb/dist/'));

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
	console.log('a user is trying to connect');
	var cookie_id, chats_db = new PouchDB('friend');
	if (!Cookies.get('io')) {
		cookie_id = uuidv4();
		chats_db.post({'user_id': cookie_id}).then(function (response) {
			set_cookie = Cookies.set('user_id', cookie_id, { expires: 7 });
			console.log(Cookies.get() + ' ==== ' + cookie_id);
		}).catch(function(err) {
			console.log('could not post: ' + err);
		});
	}
	else {
		console.log('returning user');
		cookie_id = Cookies.get('user_id');
    	var chats = chats_db.find({
    		selector: {'user_id': cookie_id}, 
    		fields: ['_id']
    	}).then(function(response) {
      		console.log('retrieved messages from user');
    	}).catch(function(err){
			console.log(err);
		});
	}
	socket.on('chat', function (msg) {
		console.log('message: ' + msg);
		var current = Date.now(), chat = {'user_id': cookie_id, 'content': msg, 'time': current};
		chats_db.post(chat).then(function(response) {
			console.log('message logged to local db');
		}).catch(function(err) {
			console.log('message was not logged to local db');
		});
		chats_db.sync(remote_db).then(function(response) {
			console.log('successfully synced with ' + remote_db);
		}).catch(function(err) {
			console.log('could not sync with ' + remote_db);
		});
	});
	socket.on('disconnect', function () {
		console.log('user disconnected');
	});
});

http.listen(3000, function () {
	console.log('listening on *:3000');
});
