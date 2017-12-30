var socket = io.connect('http://localhost:3000');
socket.on('connect',function(){
	console.log('connected to server');
});

function goChallenge(user){
	var sessionUser = JSON.parse(sessionStorage.getItem("user")).Username;
	console.log('From'+sessionUser);
	console.log('to'+user);
	var checkChallenge = confirm("Sure to Challenge with "+ user +" ???");
	if(checkChallenge){
		$('#chatroom').hide();
		socket.emit('sendInvite', {fromUser: sessionUser , targetUser: user});
		document.getElementById("InviteInform").innerHTML = "Waiting for Answer ..............";
	}
}