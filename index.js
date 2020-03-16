var express = require("express")
var socket = require("socket.io")
var whiteCards=require('./WhiteCards').cards
var blackCards=require('./BlackCards').cards
var consts=require('./const').constants

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
var socketLookup=[]
var isActiveLookup=[]
var playerLookup=[]

//keeping track of cards
whiteIndex=0

//shuffle white cards
for (let i = 0; i < whiteCards.length; i++) {
    let r = Math.floor(Math.random() * (i));
    temp = whiteCards[i]
    whiteCards[i]=whiteCards[r]
    whiteCards[r]=temp
}

class Player{
    constructor(socketId){
        this.name = "anonymous"
        this.socketId=socketId
        this.isActive=true
        this.blacks=[]
        this.whites=generateHand()
    }
}

//useful source for socket commands
//https://gist.github.com/alexpchin/3f257d0bb813e2c8c476

//networking protocols
io.on("connection",function(socket){
    //remember new connection
    socket.id=clientId++
    socketLookup[socket.id]=socket
    isActiveLookup[socket.id]=true
    playerLookup[socket.id] = new Player(socket.id)
    //tell everyone
    socketLookup[socket.id].emit("serverPrivate","connected to server on socket: "+socket.id)
    console.log("client connected on socket: ",socket.id +" Current active sockets: "+getTotalActiveSockets())
    io.sockets.emit("serverPublic","new connection on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())
    //deal cards
    socketLookup[socket.id].emit("deal",playerLookup[socket.id].whites)
    console.log(playerLookup[socket.id].whites)

    //relay chat
    socket.on("chat",function(data){
        //send message
        io.sockets.emit("chat",{
            message: scrub(data.message)
        })
    });

    //keep track of players
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
    for(var i=0;i<socketLookup.length;i++){
        if(isActiveLookup[i]){
            total++
        }
    }
    return total
}

//prevents dos attacks by sending large messages
function lengthInUtf8Bytes(str) {
    var m = encodeURIComponent(str).match(/%[89ABab]/g);
    return str.length + (m ? m.length : 0);
}

//pranks users that try to hack
function prankMsg(){
    return randomChoice(["i prefer apple music","i hate star wars","i like mayonnaise more then ketchup","pineapple belongs on pizza","i just bought some belle delphine bath water"])
   
}
function scrub(s){
    //TODO: check for spamming

    //check for DOS attack and injections
    if(lengthInUtf8Bytes(s)>200||s.includes("<")&&s.includes(">")){

        //replace their message with something funny
        s=prankMsg()
    }
    s=s.split("<").join("&lt;").split(">").join("&gt;")
    return s
}
function randomChoice(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

//game functions
function getWhiteCard(){
    if(whiteIndex>=whiteCards.length){
        whiteIndex=0
    }
    else{
        whiteIndex++
    }
    return whiteCards[whiteIndex]
}
function generateHand(){
    let tempCards=[]
    for (i = 0; i < consts.cardsPerHand; i++) {
        if(whiteIndex>=whiteCards.length){
            whiteIndex=0
        }
        tempCards.push(whiteCards[whiteIndex])
        whiteIndex++
    }
    return tempCards
}