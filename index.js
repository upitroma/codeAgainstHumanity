var express = require("express")
var socket = require("socket.io")

//app setup
var app = express();
var server = app.listen(4000,function(){
    console.log("Server is up on http://"+getIp()+":4000")
});
app.use(express.static("public"))

//socket setup
var io = socket(server)

//keeping track of active clients
var clientId=0
var lookup=[]
var isActiveLookup=[]

//useful source for socket commands
//https://gist.github.com/alexpchin/3f257d0bb813e2c8c476

//networking protocols
io.on("connection",function(socket){
    socket.id=clientId++
    lookup[socket.id]=socket
    isActiveLookup[socket.id]=true
    lookup[socket.id].emit("serverPrivate","connected to server on socket: "+socket.id)
    console.log("client connected on socket: ",socket.id +" Current active sockets: "+getTotalActiveSockets())
    io.sockets.emit("serverPublic","new connection on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())


    //in
    socket.on("chat",function(data){
        io.sockets.emit("chat",data)
    });

    socket.on('disconnect', function(){
        console.info('user disconnected from socket: ' + socket.id+" Current active sockets: "+getTotalActiveSockets());
        isActiveLookup[socket.id]=false
        io.sockets.emit("serverPublic","user disconnected on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())
    });
});




//gets the ip of the server (for convenience, not critical)
function getIp(){
    var os = require('os');
    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }
    return addresses
}

function getTotalActiveSockets(){
    var total=0
    for(var i=0;i<lookup.length;i++){
        if(isActiveLookup[i]){
            total++
        }
    }
    return total
}