var express   = require('express');
var mongoose  = require('mongoose');
var bodyParser  = require('body-parser');
var path      = require('path');
var morgan    = require('morgan');
var fs      = require('fs');
var app     = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var port = 3000;
//check Who is Online
var onlineusers = [];
var JSFightPlayer = null;

var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'});
//Logs with morgan
app.use(morgan('combined', {stream: accessLogStream}));



app.use(express.static(path.join(__dirname, '/client/css')));
app.use(express.static(path.join(__dirname, '/client/js')));
app.use(express.static(path.join(__dirname, '/client')));
var clientRoot  = __dirname+'/client';

//Middleware
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({
  extended: true
})); 

//Connection to the database
mongoose.connect('mongodb://localhost/TryFirstTime', function(err) {
  if (err) { throw err; }
});

// Creation of the schema
var usersSchema = new mongoose.Schema({
  Username     : { type : String },
  PWD      : { type : String },
  Games : { type : Number , default : 0 },
  Wins : { type : Number , default : 0 },
  Rate : { type : Number , default : 0 },
});

// Creation of the Model
var userModel = mongoose.model('user', usersSchema);

//Routes
app.post('/login', function (req, res) {
  console.log('To Login');
  var username = req.body.Username;
  var password = req.body.PWD;
  for(var i=0;i<onlineusers.length;i++){
    if(onlineusers[i].username==username)
      res.send(500,'This User has Loged In');
  }
  userModel.findOne({ Username: username}, function (err, doc){
    if(!doc){
      console.log('00000 yonghu bu cunzai 000000');
    }
    else{
      console.log('PWD'+doc.PWD);
      if(doc.PWD == password){
        console.log('denglu cheng gong !!!!!!!!!!');
        res.json(doc); 
      }
    }
  });
});

app.post('/regist', function (req, res) {
  console.log('To Regist');
  var username = req.body.Username;
  var query = userModel.find(null);
  query.where('Username', username);
  query.limit(1);
  
  try{
    query.exec(function (err, user) {
      if (err) { throw err; }
      if (user.length){
        res.send(500,'This Username Has been Registed!!!!');
      }
        // console.log("1111111111111111111111111111111111111111111111111111111111111111");
      else
        {
          console.log("---------------------------------------------------------------");
          var newUser = new userModel({
            Username: req.body.Username,
            PWD: req.body.PWD,
           });
          newUser.save(function (err) {
            if (err) { throw err; }
            console.log('New User Create ! '+newUser);
            res.json({ 'status' : 'created'});  
          });

        }
    });
  } catch(e) {
    //If here, we are probably on a refresh of /add
    res.sendfile(path.join(clientRoot+'/index.html')); 
  }
}); 

// app.get('/gameRoom', function(req, res) {
//   console.log('To GGGameRoom');
//   res.sendFile(path.join(clientRoot+'/gameRoom.html')); 
// });


app.get('*', function(req, res) {
  console.log('To all');
  res.sendFile(path.join(clientRoot+'/index.html'));
});

server.listen(port);
console.log('app listening at http://%s:%s', server.address().address, port)

//Connection of an user on socket.io



function getOnlineUsers(callback){
  var onlineUsersName = [];
  console.log('调用getOnlineUsers');
  for (var i in onlineusers)
  {
    var username = onlineusers[i].username;
    onlineUsersName.push(onlineusers[i].username);
  }
  return onlineUsersName;
};

io.on('connection', function(socket){
  console.log('New Client connect');

  socket.on('new message',function(message,username){
    socket.emit('update myself',{fromUser:username,message:message,date:new Date()});
    socket.broadcast.emit('new message',{fromUser:username,message:message,date:new Date()});
  });
  
  socket.on('login',function(data){
    var temp = {
      "username" : data.Username,
      "socket": socket
    }
    for(var i=0;i<onlineusers.length;i++){
      if(onlineusers[i].username==data.Username)
        return;
    }
    onlineusers.push(temp);
    socket.emit('login success',{username:data.Username,allusers:getOnlineUsers()});
    socket.broadcast.emit('enter chat',{username:data.Username,allusers:getOnlineUsers()});
  });

  socket.on('sendInvite',function(data){
    for(var i in onlineusers){
      if(onlineusers[i].username == data.targetUser){
        onlineusers[i].socket.emit('receivedInvite',{ fromUser: data.fromUser, targetUser: data.targetUser});
        break;
      }
    }
  });

  socket.on('Answer',function( data, result){
    if(result){
      JSFightPlayer = {
        "P1" : data.fromUser,
        "P2" : data.targetUser
      }
    }
    for(var i in onlineusers){
      if(onlineusers[i].username == data.fromUser){
          onlineusers[i].socket.emit('Answer', JSFightPlayer, result);
          break;
      }
    }
  });

  socket.on('OperatingGame',function( data_P1, data_P2, P1_P2_name){
    
    var p1,p2 = null;
    for(var i=0;i<onlineusers.length;i++){
      if(onlineusers[i].username==P1_P2_name.P1)
        p1=i;
      else if(onlineusers[i].username==P1_P2_name.P2)
        p2=i;
    }
    onlineusers[p1].socket.emit('OperatingGame', data_P1, data_P2);
    onlineusers[p2].socket.emit('OperatingGame', data_P1, data_P2);
  });

  socket.on('GameOver',function(Winer, P1_P2_name){
    if(Winer=='P1'){
      userModel.findOne({ Username: P1_P2_name.P1}, function (err, doc){
        if(err){ throw err; }
        doc.Games += 1;
        doc.Wins += 1;
        doc.save(function(err){
          if(err){ throw err; }
        });
      });
    }
    else if(Winer=='P2'){
      userModel.findOne({ Username: P1_P2_name.P2}, function (err, doc){
        if(err){ throw err; }
        doc.Games += 1;
        doc.Wins += 1;
        doc.save(function(err){
          if(err){ throw err; }
        });
      });
    }
  });
  
  socket.on('disconnect',function(){
    console.log('totototo disconnect');
    var thisUser = null;
    for(var i=0;i<onlineusers.length;i++)
    {
      if(onlineusers[i].socket === socket)
      {
        thisUser = onlineusers[i].username;
        onlineusers.splice(i,1);
        socket.broadcast.emit('leave chat',{username:thisUser,allusers:getOnlineUsers()});
        return;
      }
    }
  });
});