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
var whiteIndex=0
var blackIndex=0


//shuffle white cards
for (let i = 0; i < whiteCards.length; i++) {
    let r = Math.floor(Math.random() * (i));
    temp = whiteCards[i]
    whiteCards[i]=whiteCards[r]
    whiteCards[r]=temp
}
whiteCards.push(consts.outOfCards)

//shuffle black cards
for (let i = 0; i < blackCards.length; i++) {
    let r = Math.floor(Math.random() * (i));
    temp = blackCards[i]
    blackCards[i]=blackCards[r]
    blackCards[r]=temp
}
blackCards.push(consts.outOfCards)
var currentBlackCard=getBlackCard()

class Player{
    constructor(socketId){
        this.name = "anonymous"
        this.socketId=socketId
        this.hackerSuspicion=0
        this.isActive=true
        this.blacks=[]
        this.whites=generateHand()
        this.currentWhiteCard=""
    }
}

//gamestate
var gamestate=consts.strChooseCard
var GameTimer=consts.choosingTimer
function gameState(){

    if(GameTimer<=0&&gamestate==consts.strChooseCard){
        gamestate=consts.strVoteCard
        GameTimer=consts.voteingTimer
    }
    else if(GameTimer<=0&&gamestate==consts.strVoteCard){
        gamestate=consts.strResults
        GameTimer=consts.resultsTimer
    }
    else if(GameTimer<=0&&gamestate==consts.strResults){
        gamestate=consts.strNewRound
        GameTimer=consts.newRoundTimer
        currentBlackCard=getBlackCard()
        io.sockets.emit("newBlack",currentBlackCard)
    }
    else if(GameTimer<=0&&gamestate==consts.strNewRound){
        gamestate=consts.strChooseCard
        GameTimer=consts.choosingTimer
    }

    GameTimer--
    
    io.sockets.emit("timer",GameTimer)
    io.sockets.emit("gamestate",gamestate)
}
setInterval(gameState, 1000);



/*
    networking protocols
    useful source for socket commands
    https://gist.github.com/alexpchin/3f257d0bb813e2c8c476
*/
io.on("connection",function(socket){
    //remember new connection
    socket.id=clientId++
    socketLookup[socket.id]=socket
    isActiveLookup[socket.id]=true
    playerLookup[socket.id] = new Player(socket.id)
    //tell everyone else
    socketLookup[socket.id].emit("serverPrivate","connected to server on socket: "+socket.id)
    console.log("client connected on socket: ",socket.id +" Current active sockets: "+getTotalActiveSockets())
    io.sockets.emit("serverPublic","new connection on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())
    //deal cards
    socketLookup[socket.id].emit("deal",playerLookup[socket.id].whites)
    socketLookup[socket.id].emit("newBlack",currentBlackCard)


    //relay chat
    socket.on("chat",function(data){
        m=data.message
        if(!(!m || m.length===0)){
            //send message
            io.sockets.emit("chat",{
                message: scrub(m,socket.id),
                name: playerLookup[socket.id].name
            })
        }
    });

    //keep track of players
    socket.on('disconnect', function(){
        console.info('user disconnected from socket: ' + socket.id+" Current active sockets: "+getTotalActiveSockets());
        isActiveLookup[socket.id]=false
        io.sockets.emit("serverPublic","user disconnected on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())
    });

    //get player name
    socket.on('username',function(data){
        if(data.name==""||data.name=="anonymous"){
            playerLookup[socket.id].name="anonymous"+socket.id
        }
        else{
            playerLookup[socket.id].name=scrub(data.name,socket.id)
        }
        io.sockets.emit("serverPublic", "<username>"+playerLookup[socket.id].name +"</username> has joined the game! Current active sockets: "+getTotalActiveSockets())
    })

    //get player's white card
    socket.on("playCard",function(data){
        //check for dos/injection
        let card = scrub(data,socket.id)
        //TODO: if(playerLookup[socket.id].whiteCards)
    })
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
function prank(){
    return randomChoice(["i prefer apple music","i hate star wars","i like mayonnaise more then ketchup","pineapple belongs on pizza","i just bought some belle delphine bath water","i think im addicted to barbie","my new role model https://www.youtube.com/watch?v=cO8SA_miz2c"])
}
function scrub(s,id){
    //TODO: check for spamming

    if(!s||s.length===0){
        s="anonymous"+id
    }

    //check for DOS attack
    if(lengthInUtf8Bytes(s)>200){

        //replace their message with something funny
        s=prank()

        //mark them as very suspicious
        playerLookup[id].hackerSuspicion+=3
        console.log(playerLookup[id].name+" marked as suspicious. ["+playerLookup[id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
    }

    //check for injections
    else if(s.includes("<")&&s.includes(">")){

        //replace their message with something funny
        s=prank()

        //mark them as suspicious
        playerLookup[id].hackerSuspicion++
        console.log(playerLookup[id].name+" marked as suspicious. ["+playerLookup[id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")

        
    }

    //kick if too suspicious
    if(playerLookup[id].hackerSuspicion>=consts.hackerSuspicionThreshold){
        socketLookup[id].disconnect()
    }

    //remove pesky html charactors
    s=s.split("<").join("&lt;").split(">").join("&gt;")
    return s
}
function randomChoice(arr){
    return arr[Math.floor(Math.random() * arr.length)];
}

//game functions
function getWhiteCard(){
    if(whiteIndex>=whiteCards.length-1){
        whiteIndex=0
    }
    else{
        whiteIndex++
    }
    return whiteCards[whiteIndex]
}
function getBlackCard(){
    if(blackIndex>=blackCards.length-1){
        blackIndex=0
    }
    else{
        blackIndex++
    }
    return blackCards[blackIndex]
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