var userctrl = angular.module('userCtrl', []);


userctrl.controller('registController', function($scope, $http, $location) {
 	$scope.createUser = function(user) {
		$http.post('/regist', user).
			success(function(data) {
				$location.url('/');
			}).
			error(function(err) {
				alert(err);
			});
	};
});

userctrl.controller('loginController', function($scope, $http, $location,$window) {
	if(sessionStorage.getItem("user") != null){
		$location.url('/gameRoom');
	}
	$scope.UserLogin = function(user) {
		$http.post('/login', user).
			success(function(data) {
				$scope.thisUser=user;
				sessionStorage.setItem("user",JSON.stringify(data));
				$location.url('/gameRoom');
				// socket.emit('login',data);
				// window.location.href = '';
			}).
			error(function(err) {
				alert(err);
			});
	};
});


userctrl.controller('socketController',function($scope, $http, $location,$window){
	if(sessionStorage.getItem("user") != null){
		$("#registlogin").hide();
	}
	else{
		
		$location.url('/');
		alert('Please Login First!!');
	}
	var session = JSON.parse(sessionStorage.getItem("user"));
	var username = session.Username;
	$scope.user = session;
	socket.emit('login',session);

	socket.on('login success',function(data){
		console.log('login success');
	
		refreshOnlineUsers(data.allusers);
	});

	socket.on('enter chat',function(data){
		console.log('enter chat');
		console.log(data.username+' has entered the chat');
		refreshOnlineUsers(data.allusers);
	});

	socket.on('leave chat',function(data){
		console.log(data.username + ' has leaved the chat');
		refreshOnlineUsers(data.allusers);
	});

	socket.on('update myself',function(data){
		$('textarea[id=message]').val('');
		var val = $('textarea[id=chathistory]').val();
		$('textarea[id=chathistory]').val(val + username + ' ['+data.date+'] ：'+ data.message + '\n');
	});

	socket.on('new message',function(data){
		var val = $('textarea[id=chathistory]').val();
		$('textarea[id=chathistory]').val(val + data.fromUser + ' ['+data.date+'] ：' + data.message + '\n');
	});


	$scope.sendmsg = function(message) {
		socket.emit("new message", message, username);
	};
	$scope.logOut = function(){
		var logout = confirm('Are you sure to LogOut?');
		if(logout){
			sessionStorage.removeItem("user");
			$location.url('/');
			$("#registlogin").show();
			location.reload([true]);
		}
	}

	function refreshOnlineUsers(allOnlineUsers){
		console.log('refreshOnlineUsers');
		console.log(allOnlineUsers.length + '  ' + allOnlineUsers+ " " + username);
		$('#onlineusers').empty();
		var item,i,innerHTMLText = '';

		if(allOnlineUsers.length === 1 && allOnlineUsers[0]===username){
			$('#onlineusers').append('<div style="color:#f00;">没有其它在线用户!</div>');	
			return;
		}
	    
		for(i=0;i<allOnlineUsers.length;i++){
			if(allOnlineUsers[i] != username){
				console.log('username=' + username +"========" +allOnlineUsers[i]+ '==========='+'进来了');
				// item = "<div><button id=\""+allOnlineUsers[i] +"\" ng-click=\"goChallenge(\""+allOnlineUsers[i]+"\")\" >"+allOnlineUsers[i]+"</button></div>";
				item = "<div><a href=\"#\" id=\""+allOnlineUsers[i] +"\" onclick=\"goChallenge(\'"+ allOnlineUsers[i] +"\')\" >"+allOnlineUsers[i]+"</a></div>";
				$('#onlineusers').append(item);
				// innerHTMLText = innerHTMLText + item;
				// document.getElementById("onlineusers").innerHTML=innerHTMLText;
			}
		}
	}
	
	socket.on('receivedInvite',function(data){
		var result = confirm(data.fromUser+' Invite you to start Fighting !! Are you Ready ?');
		socket.emit('Answer',{fromUser: data.fromUser, targetUser: JSON.parse(sessionStorage.getItem("user")).Username},result);
		if(result){
			$('#chatroom').hide();
			var JSFightPlayer = {
				"P1" : data.fromUser ,
				"P2" : data.targetUser
			}
			sessionStorage.setItem("JSFightPlayer",JSON.stringify(JSFightPlayer));
			$scope.$broadcast("GameBegin");
		}
	});

	socket.on('Answer',function( data , result){
		document.getElementById("InviteInform").innerHTML = "";
		if(!result){
			alert("your invitation has been refused  !!!");
			$('#chatroom').show();
		}
		else{
			sessionStorage.setItem("JSFightPlayer",JSON.stringify(data));
			$scope.$broadcast("GameBegin");
		}
	});
});

userctrl.controller('JSgameController', function($scope, $http, $location,$window){
	if(sessionStorage.getItem("user") != null){
		$('#registlogin').hide();
	}
	else{
		$location.url('/');
		alert('Please Login First!!');
	}
	var myPosition = null;
	console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
	var canvas = document.getElementById("myCanvas");
	var ctx = canvas.getContext("2d");
	console.log("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&");
	//Object P1
	var P1 = {
		x : 0,
		y : 0,
		jump :false,
		crouch :false,
		block :false,
		punch :false,
		kick :false,
		hp:100,
		speed : 5,
		direction: "right",
		cooldown: 5
	}
	//Object P2
	var P2 = {
		x : 0,
		y : 0,
		jump :false,
		crouch :false,
		block :false,
		punch :false,
		kick :false,
		hp:100,
		speed : 5,
		direction: "left",
		cooldown: 5
	}

	
	$scope.$on("GameBegin",function () {
		console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=');
		$('#myCanvas').show();
		if(JSON.parse(sessionStorage.getItem("JSFightPlayer")).P1 == JSON.parse(sessionStorage.getItem("user")).Username){
			myPosition = "P1";
			console.log('我是P1'+ JSON.parse(sessionStorage.getItem("user")).Username);
		}		
		else{
			myPosition = "P2";
			console.log('我是P2'+ JSON.parse(sessionStorage.getItem("user")).Username);
		}
		console.log(myPosition);
		canvas.width=800;
		canvas.height=500
		reSet();
		render();
		// main();
	});

	// EventLister
	var keysDown = {};
	addEventListener("keydown", function (e) {
		keysDown[e.keyCode] = true;
		main();
	}, false);

	addEventListener("keyup", function (e) {
		delete keysDown[e.keyCode];
		if(e.keyCode==40){
			if(myPosition=="P1")
				P1.crouch = false;
			else if(myPosition=="P2")
				P2.crouch = false;
			main();
		}
		if(e.keyCode==38){
			if(myPosition=="P1")
				P1.jump = false;
			else if(myPosition=="P2")
				P2.jump = false;
			main();
		}
		if(e.keyCode==68){
			if(myPosition=="P1")
				P1.block = false;
			else if(myPosition=="P2")
				P2.block = false;
			main();
		}
		if(e.keyCode==65){
			if(myPosition=="P1")
				P1.punch = false;
			else if(myPosition=="P2")
				P2.punch = false;
			main();
		}
		if(e.keyCode==83){
			if(myPosition=="P1")
				P1.kick = false;
			else if(myPosition=="P2")
				P2.kick = false;
			main();
		}
	}, false);

	//restart and reback the position
	var reSet = function(){
		P1.x=0;P1.y=0;
		P2.x=0;P2.y=0;
	};

	//update canvas after operation
	var upDate = function(myPosition){
		
		if(myPosition == "P1"){
			if(!P1.crouch&&!P1.block&&!P1.punch&&!P1.kick){
				if (37 in keysDown) { // Player holding left
					P1.x -= P1.speed;
				}
				if (39 in keysDown) { // Player holding right
					P1.x += P1.speed;
				}
			}
			if(!P1.crouch&&!P1.block&&!P1.jump){
				if(65 in keysDown){
						P1.punch = true;
					}
				if(83 in keysDown){
					P1.kick = true;
				}
			}

			if(!P1.jump){
				if (40 in keysDown){
					P1.crouch = true;
				}
				if (68 in keysDown){
					P1.block = true;
				}
			}
			if (38 in keysDown){
				P1.jump = true;
			}
		}

		else if(myPosition == "P2"){
			console.log(keysDown);
			if(!P2.crouch&&!P2.block&&!P2.punch&&!P2.kick){
				if (37 in keysDown) { // Player holding left
					P2.x -= P2.speed;
				}
				if (39 in keysDown) { // Player holding right
					P2.x += P2.speed;
				}
			}
			if(!P2.crouch&&!P2.block&&!P2.jump){
				if(65 in keysDown){
						P2.punch = true;
					}
				if(83 in keysDown){
					P2.kick = true;
				}
			}
			if(!P2.jump){
				if (40 in keysDown){
					P2.crouch = true;
				}
				if (68 in keysDown){
					P2.block = true;
				}
			}
			if (38 in keysDown){
				P2.jump = true;
			}
		}

//------------------judge   Dirction------------------------
		if((100+P1.x)>(700+P2.x)){
			P1.direction="left";
			P2.direction="right";
		}
		else if((100+P1.x)<=(700+P2.x)){
			P1.direction="right";
			P2.direction="left";
		}

//-------------------judge  collision-----------------------
		if(-50<=((100+P1.x)-(P2.x+700))&&((100+P1.x)-(P2.x+700))<=50){
			console.log('很近很近！！！！！！很近很近');
			if(P1.punch&&P1.kick){
				P2.hp-=10;
			}
			else{
				if(P1.punch&&!P2.block){
					P2.hp-=5;
				}
				else if(P1.kick){
					if(!(P2.block&&P2.crouch))
						P2.hp-=5;
				}
			}
			
			if(P2.punch&&P2.kick){
				P1.hp-=10;
			}
			else{
				if(P2.punch&&!P1.block){
					P1.hp-=5;
				}
				else if(P2.kick){
					if(!(P1.block&&P1.crouch))
						P1.hp-=5;
				}
			}
		}
	};

	//Draw players
	var  render = function(){
		//background !
		if(P1.x< -80){ P1.x= -80;}
		else if(P1.x>680){ P1.x= 680;}

		if(P2.x< -680){ P2.x= -680;}
		else if(P2.x > 80){P2.x = 80;}

		ctx.fillStyle = "white";
		ctx.fillRect(0,0,800,500);

		ctx.beginPath();
		ctx.moveTo(0,450);
		ctx.lineTo(800,450);
		ctx.strokeStyle = "#CC0000";
		ctx.closePath();
		ctx.stroke();

//-------------------player1--------------------------------
		if(P1.punch&&P1.kick){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,240,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(70 +P1.x,290);
				ctx.lineTo(100+P1.x,280);
				ctx.lineTo(130+P1.x,290);
				ctx.moveTo(100+P1.x,260);
				ctx.lineTo(100+P1.x,300);
				ctx.lineTo(80 +P1.x,330);
				ctx.lineTo(110+P1.x,320);
				ctx.moveTo(100+P1.x,300);
				ctx.lineTo(160+P1.x,320);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,240,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(130+P1.x,290);
				ctx.lineTo(100+P1.x,280);
				ctx.lineTo(70+P1.x,290);
				ctx.moveTo(100+P1.x,260);
				ctx.lineTo(100+P1.x,300);
				ctx.lineTo(120+P1.x,330);
				ctx.lineTo(90+P1.x,320);
				ctx.moveTo(100+P1.x,300);
				ctx.lineTo(40+P1.x,320);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
		}
		else if(P1.crouch&&P1.block){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(120+P1.x,390);
				ctx.lineTo(125+P1.x,360);
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(100+P1.x,420);
				ctx.lineTo(80 +P1.x,450);
				ctx.moveTo(100+P1.x,420);
				ctx.lineTo(110+P1.x,420);
				ctx.lineTo(120+P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(80 +P1.x,390);
				ctx.lineTo(75 +P1.x,360);
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(100+P1.x,420);
				ctx.lineTo(120+P1.x,450);
				ctx.moveTo(100+P1.x,420);
				ctx.lineTo(90 +P1.x,420);
				ctx.lineTo(80 +P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
		}
		else if(P1.crouch){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(70 +P1.x,360);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(130+P1.x,420);
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(100+P1.x,420);
				ctx.lineTo(80 +P1.x,450);
				ctx.moveTo(100+P1.x,420);
				ctx.lineTo(110+P1.x,420);
				ctx.lineTo(120+P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(130+P1.x,360);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(70 +P1.x,420);
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(100+P1.x,420);
				ctx.lineTo(120+P1.x,450);
				ctx.moveTo(100+P1.x,420);
				ctx.lineTo(90 +P1.x,420);
				ctx.lineTo(80 +P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
		}
		else if(P1.jump){
			ctx.beginPath();
			ctx.fillStyle = "gray";
			ctx.arc(100+P1.x,240,20,0,Math.PI*2);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.lineWidth = "4";
			ctx.moveTo(60 +P1.x,290);
			ctx.lineTo(100+P1.x,280);
			ctx.lineTo(140+P1.x,290);
			ctx.moveTo(100+P1.x,260);
			ctx.lineTo(100+P1.x,300);
			ctx.lineTo(80 +P1.x,320);
			ctx.lineTo(90 +P1.x,350);
			ctx.moveTo(100+P1.x,300);
			ctx.lineTo(120+P1.x,320);
			ctx.lineTo(110+P1.x,350);
			ctx.strokeStyle = "gray";
			ctx.stroke();
		}
		else if(P1.block){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,350,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(120+P1.x,370);
				ctx.lineTo(130+P1.x,340)
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(100+P1.x,410);
				ctx.lineTo(90 +P1.x,450);
				ctx.moveTo(100+P1.x,410);
				ctx.lineTo(120+P1.x,390);
				ctx.lineTo(120+P1.x,440);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,350,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,380);
				ctx.lineTo(80 +P1.x,370);
				ctx.lineTo(70 +P1.x,340)
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(100+P1.x,410);
				ctx.lineTo(110+P1.x,450);
				ctx.moveTo(100+P1.x,410);
				ctx.lineTo(80 +P1.x,390);
				ctx.lineTo(80 +P1.x,440);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
		}
		else if(P1.punch){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(80 +P1.x,380);
				ctx.lineTo(100+P1.x,390);
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(150+P1.x,370);
				ctx.moveTo(100+P1.x,350);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(60 +P1.x,450);
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(140+P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(120+P1.x,380);
				ctx.lineTo(100+P1.x,390);
				ctx.moveTo(100+P1.x,370);
				ctx.lineTo(50 +P1.x,370);
				ctx.moveTo(100+P1.x,350);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(140+P1.x,450);
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(60 +P1.x,450);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
		}
		else if(P1.kick){
			if(P1.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(70 +P1.x,400);
				ctx.lineTo(100+P1.x,370);
				ctx.lineTo(130+P1.x,400);
				ctx.moveTo(100+P1.x,350);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(90 +P1.x,450);
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(155+P1.x,440);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			else if(P1.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "gray";
				ctx.arc(100+P1.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(130+P1.x,400);
				ctx.lineTo(100+P1.x,370);
				ctx.lineTo(70 +P1.x,400);
				ctx.moveTo(100+P1.x,350);
				ctx.lineTo(100+P1.x,400);
				ctx.lineTo(110+P1.x,450);
				ctx.moveTo(100+P1.x,400);
				ctx.lineTo(45 +P1.x,440);
				ctx.strokeStyle = "gray";
				ctx.stroke();
			}
			
		}
		else{
			ctx.beginPath();
			ctx.fillStyle = "gray";
			ctx.arc(100+P1.x,330,20,0,Math.PI*2);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.lineWidth = "4";
			ctx.moveTo(60 +P1.x,400);
			ctx.lineTo(100+P1.x,370);
			ctx.lineTo(140+P1.x,400);
			ctx.moveTo(100+P1.x,350);
			ctx.lineTo(100+P1.x,400);
			ctx.lineTo(60 +P1.x,450);
			ctx.moveTo(100+P1.x,400);
			ctx.lineTo(140+P1.x,450);
			ctx.strokeStyle = "gray";
			ctx.stroke();
		}


//-------------------player2--------------------------------
		if(P2.punch&&P2.kick){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,240,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(730+P2.x,290);
				ctx.lineTo(700+P2.x,280);
				ctx.lineTo(670+P2.x,290);
				ctx.moveTo(700+P2.x,260);
				ctx.lineTo(700+P2.x,300);
				ctx.lineTo(720+P2.x,330);
				ctx.lineTo(690+P2.x,320);
				ctx.moveTo(700+P2.x,300);
				ctx.lineTo(640+P2.x,320);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,240,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(670+P2.x,290);
				ctx.lineTo(700+P2.x,280);
				ctx.lineTo(730+P2.x,290);
				ctx.moveTo(700+P2.x,260);
				ctx.lineTo(700+P2.x,300);
				ctx.lineTo(680+P2.x,330);
				ctx.lineTo(710+P2.x,320);
				ctx.moveTo(700+P2.x,300);
				ctx.lineTo(760+P2.x,320);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
		}
		else if(P2.crouch&&P2.block){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(680+P2.x,390);
				ctx.lineTo(675+P2.x,360);
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(700+P2.x,420);
				ctx.lineTo(720+P2.x,450);
				ctx.moveTo(700+P2.x,420);
				ctx.lineTo(690+P2.x,420);
				ctx.lineTo(680+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(720+P2.x,390);
				ctx.lineTo(725+P2.x,360);
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(700+P2.x,420);
				ctx.lineTo(680+P2.x,450);
				ctx.moveTo(700+P2.x,420);
				ctx.lineTo(710+P2.x,420);
				ctx.lineTo(720+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			
		}
		else if(P2.crouch){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(730+P2.x,360);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(670+P2.x,420);
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(700+P2.x,420);
				ctx.lineTo(720+P2.x,450);
				ctx.moveTo(700+P2.x,420);
				ctx.lineTo(690+P2.x,420);
				ctx.lineTo(680+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,360,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(670+P2.x,360);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(730+P2.x,420);
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(700+P2.x,420);
				ctx.lineTo(680+P2.x,450);
				ctx.moveTo(700+P2.x,420);
				ctx.lineTo(710+P2.x,420);
				ctx.lineTo(720+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
		}
		else if(P2.jump){
			ctx.beginPath();
			ctx.fillStyle = "blue";
			ctx.arc(700+P2.x,240,20,0,Math.PI*2);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.lineWidth = "4";
			ctx.moveTo(740+P2.x,290);
			ctx.lineTo(700+P2.x,280);
			ctx.lineTo(660+P2.x,290);
			ctx.moveTo(700+P2.x,260);
			ctx.lineTo(700+P2.x,300);
			ctx.lineTo(720+P2.x,320);
			ctx.lineTo(710+P2.x,350);
			ctx.moveTo(700+P2.x,300);
			ctx.lineTo(680+P2.x,320);
			ctx.lineTo(690+P2.x,350);
			ctx.strokeStyle = "blue";
			ctx.stroke();
		}
		else if(P2.block){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,350,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(680+P2.x,370);
				ctx.lineTo(670+P2.x,340)
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(700+P2.x,410);
				ctx.lineTo(710+P2.x,450);
				ctx.moveTo(700+P2.x,410);
				ctx.lineTo(680+P2.x,390);
				ctx.lineTo(680+P2.x,440);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,350,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,380);
				ctx.lineTo(720+P2.x,370);
				ctx.lineTo(730+P2.x,340)
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(700+P2.x,410);
				ctx.lineTo(690+P2.x,450);
				ctx.moveTo(700+P2.x,410);
				ctx.lineTo(720+P2.x,390);
				ctx.lineTo(720+P2.x,440);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
		}
		else if(P2.punch){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(720+P2.x,380);
				ctx.lineTo(700+P2.x,390);
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(650+P2.x,370);
				ctx.moveTo(700+P2.x,350);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(740+P2.x,450);
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(660+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(680+P2.x,380);
				ctx.lineTo(700+P2.x,390);
				ctx.moveTo(700+P2.x,370);
				ctx.lineTo(750+P2.x,370);
				ctx.moveTo(700+P2.x,350);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(660+P2.x,450);
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(740+P2.x,450);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
		}
		else if(P2.kick){
			if(P2.direction=="left"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(730+P2.x,400);
				ctx.lineTo(700+P2.x,370);
				ctx.lineTo(670+P2.x,400);
				ctx.moveTo(700+P2.x,350);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(710+P2.x,450);
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(645+P2.x,440);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
			else if(P2.direction=="right"){
				ctx.beginPath();
				ctx.fillStyle = "blue";
				ctx.arc(700+P2.x,330,20,0,Math.PI*2);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.lineWidth = "4";
				ctx.moveTo(670+P2.x,400);
				ctx.lineTo(700+P2.x,370);
				ctx.lineTo(730+P2.x,400);
				ctx.moveTo(700+P2.x,350);
				ctx.lineTo(700+P2.x,400);
				ctx.lineTo(690+P2.x,450);
				ctx.moveTo(700+P2.x,400);
				ctx.lineTo(755+P2.x,440);
				ctx.strokeStyle = "blue";
				ctx.stroke();
			}
		}
		else {
			ctx.beginPath();
			ctx.fillStyle = "blue";
			ctx.arc(700+P2.x,330,20,0,Math.PI*2);
			ctx.closePath();
			ctx.fill();
			ctx.beginPath();
			ctx.lineWidth = "4";
			ctx.moveTo(740+P2.x,400);
			ctx.lineTo(700+P2.x,370);
			ctx.lineTo(660+P2.x,400);
			ctx.moveTo(700+P2.x,350);
			ctx.lineTo(700+P2.x,400);
			ctx.lineTo(740+P2.x,450);
			ctx.moveTo(700+P2.x,400);
			ctx.lineTo(660+P2.x,450);
			ctx.strokeStyle = "blue";
			ctx.stroke();
		}

//-------------------Player's HP--------------------------
		ctx.fillStyle="#00000";
		ctx.fillText("Player1 HP:",30,30);
		ctx.fillText(P1.hp,110,30);
		ctx.fillText("Player2 HP:",480,30);
		ctx.fillText(P2.hp,560,30);
		ctx.stroke();


//-------------------check the HP if equal 0------------------------
		if(P1.hp == 0){
			socket.emit('GameOver','P2',JSON.parse(sessionStorage.getItem("JSFightPlayer")));
			if(myPosition=='P1'){
				alert('You Lose!!!!!');
				ctx.clearRect(0,0,800,500);
				location.reload([true]);
			}
			if (myPosition=='P2'){
				alert('You Win!!!!!');
				ctx.clearRect(0,0,800,500);
				location.reload([true]);
			}
		}
		else if (P2.hp == 0){
			console.log(myPosition);
			socket.emit('GameOver','P1',JSON.parse(sessionStorage.getItem("JSFightPlayer")));
			if(myPosition=='P1'){
				alert('You Win!!!!!');
				ctx.clearRect(0,0,800,500);
				location.reload([true]);
			}
			if (myPosition=='P2'){
				alert('You Lose!!!!!');
				ctx.clearRect(0,0,800,500);
				location.reload([true]);
			}
		}
	};

	var main = function(){
		upDate( myPosition);
		socket.emit("OperatingGame", P1, P2, JSON.parse(sessionStorage.getItem("JSFightPlayer")));
	}

	socket.on('OperatingGame',function(data_P1, data_P2){
		P1 = data_P1;	P1 = data_P1;
		P2 = data_P2;	P2 = data_P2;
		render();
	});
});



