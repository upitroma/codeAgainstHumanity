var express = require("express")
var socket = require("socket.io")
var fs = require('fs');
var sha256 = require('js-sha256');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var whiteCards=[]
var blackCards=[]
var consts=require('./const').constants

//create credential file if it dosen't exist
fs.appendFile('loginCredentials.txt', '', function (err) {
    if (err) throw err;
}); 
updateLoginCredentials()

function addNSFW(){
    //get whites
    HttpClientGet('https://raw.githubusercontent.com/nodanaonlyzuul/against-humanity/master/answers.txt', function(response) {
        whiteCards = response.split("\n")

        //shuffle white cards
        for (let i = 0; i < whiteCards.length; i++) {
            let r = Math.floor(Math.random() * (i));
            temp = whiteCards[i]
            whiteCards[i]=whiteCards[r]
            whiteCards[r]=temp
        }
    });
    //get blacks
    HttpClientGet('https://raw.githubusercontent.com/nodanaonlyzuul/against-humanity/master/questions.txt', function(response) {
        blackCards = response.split("\n")

        //only single blanks
        for(let i=0;i<blackCards.length;i++){

            let count = 0;
            for(let j = 0; j < blackCards[i].length; ++j){
                if(blackCards[i][j] == "_"){
                    count++;
                }
            }

            if(count>0){
                blackCards.splice(i,1)
            }
        }

        //shuffle black cards
        for (let i = 0; i < blackCards.length; i++) {
            let r = Math.floor(Math.random() * (i));
            temp = blackCards[i]
            blackCards[i]=blackCards[r]
            blackCards[r]=temp
        }
    });
}
function addSFW(){
    fs.readFile("WhiteCards.txt",'utf8', function read(err, data) {
        lines=[]
        if (err) {
            throw err;
        }
        const content = data;
    
        content.split("\n").forEach(function(l){
            whiteCards.push(l)
        });
    });

    fs.readFile("BlackCards.txt",'utf8', function read(err, data) {
        lines=[]
        if (err) {
            throw err;
        }
        const content = data;
    
        content.split("\n").forEach(function(l){
            blackCards.push(l)
        });
    });
}
if(consts.NSFW){
    addNSFW()
}
else{
    addSFW()
}


//app setup
var app = express();
var server = app.listen(4000,function(){
    console.log("Server is up on http://"+getIp()+":4000")
});
console.log("NSFW: "+consts.NSFW)
app.use(express.static("public"))

//socket setup
var io = socket(server)

//keeping track of active clients
var clientId=0
var socketLookup=[]
//var isActiveLookup=[]
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
    constructor(socket){
        this.name = "anonymous"
        this.socket=socket
        this.hackerSuspicion=0
        this.messagesLastSecond=0
        this.isActive=false //players are inactive untill they login
        this.isLoggedIn=false
        this.score=0
        this.whites=generateHand()
        this.currentWhiteCard=""
        this.hasVotedThisRound=false
    }
}

//gamestate
var gamestate=consts.strChooseCard
var GameTimer=consts.choosingTimer
var cardsPlayedThisRound=[]
var votes=[]

//security/persistence
var usernameHashes=[]
var passwordHashes=[]
var scores=[]

function gameState(){

    //start of vote
    if(GameTimer<=0&&gamestate==consts.strChooseCard){
        gamestate=consts.strVoteCard
        GameTimer=consts.voteingTimer

        if(cardsPlayedThisRound.length==0){
            //nobody played this round
            GameTimer=1
        }
        else{
            //show submissions
            for(let i=0;i<playerLookup.length;i++){
                if(playerLookup[i].isActive){
                    socketLookup[i].emit("submissions",cardsPlayedThisRound)
                    playerLookup[i].hasVotedThisRound=false
                }
            }
        }
    }
    //end of vote
    else if(GameTimer<=0&&gamestate==consts.strVoteCard){

        if(cardsPlayedThisRound.length==0){

            //tell everyone
            for(let i=0;i<playerLookup.length;i++){
                if(playerLookup[i].isActive){
                    socketLookup[i].emit("results",{
                        winningCard: "no players this round",
                        winningPlayer: "nobody :("
                    })
                }
            }

        }
        else{
            let winningCard = cardsPlayedThisRound[findWinner(votes)]
            let winningPlayer = "unknown (Did nobody vote? This shouldn't've happened.)"
    
            for(let i=0;i<playerLookup.length;i++){
                if(playerLookup[i].isActive){
                    if(playerLookup[i].currentWhiteCard==winningCard){
                        winningPlayer=playerLookup[i].name
                        playerLookup[i].score++
                        //TODO: save the score in the loginCredentials file
                    }
                }
            }

            //tell everyone
            for(let i=0;i<playerLookup.length;i++){
                if(playerLookup[i].isActive){
                    socketLookup[i].emit("results",{
                        winningCard: winningCard,
                        winningPlayer: winningPlayer
                    })
                }
            }
        }

        gamestate=consts.strResults
        GameTimer=consts.resultsTimer
    }
    //start of new round
    else if(GameTimer<=0&&gamestate==consts.strResults){
        cardsPlayedThisRound=[]
        gamestate=consts.strNewRound
        GameTimer=consts.newRoundTimer
        currentBlackCard=getBlackCard()

        //deal new cards
        for(let i=0;i<playerLookup.length;i++){
            if(playerLookup[i].isActive){
                //black
                socketLookup[i].emit("newBlack",currentBlackCard)
                //white
                socketLookup[i].emit("deal",playerLookup[i].whites)
                playerLookup[i].currentWhiteCard=""
            }
        }
    }
    //choose your card
    else if(GameTimer<=0&&gamestate==consts.strNewRound){
        gamestate=consts.strChooseCard
        GameTimer=consts.choosingTimer
    }

    //help check for spam
    for(let i=0;i<playerLookup.length;i++){
        if(playerLookup[i].isActive){
            playerLookup[i].messagesLastSecond=0
        }
    }

    GameTimer--

    //tell everyone
    for(let i=0;i<playerLookup.length;i++){
        if(playerLookup[i].isActive){
            socketLookup[i].emit("timer",GameTimer)
            socketLookup[i].emit("gamestate",gamestate)
               
        }
    }
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
    playerLookup[socket.id] = new Player(socket)
    //tell everyone else
    socketLookup[socket.id].emit("connected","")
    socketLookup[socket.id].emit("serverPrivate","connected to server on socket: "+socket.id)
    console.log("client connected on socket: ",socket.id +" Current active sockets: "+getTotalActiveSockets())
    io.sockets.emit("serverPublic","new connection on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())

    socket.on("login",function(data){
        updateLoginCredentials()

        authenticated=false

        for(i=0;i<usernameHashes.length;i++){
            if (sha256(data.username)==usernameHashes[i]){

                //check if multiple people are on the same account
                //FIXME: it just dosen't work
                playerLookup.forEach(function(p){
                    if(p.username==data.username && p.isActive){
                        //multiple people are on the same account
                        ban(p.socket.id,consts.strSameAccountLoginAttempt)
                    }
                })

                console.log(data.username+" is authenticated")
                authenticated=true

                playerLookup[socket.id].name=data.username
                playerLookup[socket.id].score=scores[i]
                playerLookup[socket.id].isActive=true

                socketLookup[socket.id].emit("deal",playerLookup[socket.id].whites)
                socketLookup[socket.id].emit("newBlack",currentBlackCard)
            }      
        }
        //TODO: if not valid, send back error
    })

    //TODO: scrub usernames
    socket.on("signUp",function(data){
        //check if new username
        originalName=true
        for(i=0;i<usernameHashes.length;i++){
            if (sha256(data.username)==usernameHashes[i]){
                originalName=false
                console.log(data.username+" is already being used")
            }      
        }
        if(originalName){
            fs.appendFile('loginCredentials.txt', sha256(data.username)+":"+sha256(data.password)+":0"+"\n", function (err) {
                if (err) throw err;
            }); 
            updateLoginCredentials()
        }
        //TODO: send error message if fail
    })
    


    //relay chat
    socket.on("chat",function(data){
        m=data.message
        if((!(!m || m.length===0))&&playerLookup[socket.id].isActive){
            //send message to active players
            for(let i=0;i<playerLookup.length;i++){
                if(playerLookup[i].isActive){
                    playerLookup[i].socket.emit("chat",{
                        message: scrub(m,socket.id),
                        name: playerLookup[socket.id].name
                    })
                }
            }
        }
    });

    //keep track of players
    socket.on('disconnect', function(){
        console.info('user disconnected from socket: ' + socket.id+" Current active sockets: "+getTotalActiveSockets());
        playerLookup[socket.id].isActive=false
        io.sockets.emit("serverPublic","user disconnected on socket: "+socket.id+". Current active sockets: "+getTotalActiveSockets())
    });

    //get player's white card
    socket.on("playCard",function(data){

        if(playerLookup[socket.id].currentWhiteCard==""){
            let card = playerLookup[socket.id].whites[data]
            playerLookup[socket.id].currentWhiteCard=card

            cardsPlayedThisRound.push(card)
            
            //deal a new white card to the player
            playerLookup[socket.id].whites[data]=getWhiteCard()
        }
        else{
            //player is playing multiple cards and is probably cheeting
            playerLookup[socket.id].hackerSuspicion+=consts.playingMultipleCardsPunish
            console.log(playerLookup[socket.id].name+" marked as suspicious for playing multiple cards at once. ["+playerLookup[socket.id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
        }
    })

    //vote
    socket.on("vote",function(data){
        if(!playerLookup[socket.id].hasVotedThisRound){
            votes.push(data)
            playerLookup[socket.id].hasVotedThisRound=true
        }
        else{
            //player is trying to vote more than once and is probably cheeting
            playerLookup[socket.id].hackerSuspicion+=consts.voteingMoreThanOncePunish
            console.log(playerLookup[socket.id].name+" marked as suspicious for voting more than once. ["+playerLookup[socket.id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
        }
    })

    //redraw
    socket.on("redraw",function(data){
        //TODO: cooldown
        if(playerLookup[socket.id].isActive){
            playerLookup[socket.id].whites=generateHand()
            socketLookup[socket.id].emit("deal",playerLookup[socket.id].whites)
        }
    })

});

//method counting votes
function findWinner(arr){
    //https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
    return arr.sort((a,b) =>
          arr.filter(v => v===a).length
        - arr.filter(v => v===b).length
    ).pop();
}

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
        if(playerLookup[i].isActive){
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
    return randomChoice(["i prefer apple music","i hate waffles","i hate star wars","mayonnaise is better than ketchup","pineapple belongs on pizza","i just bought some belle delphine bath water","i think im addicted to barbie","i love blippi"])
}
function scrub(s,id){

    if(!s||s.length===0){
        s="anonymous"+id
    }

    //check for DOS attack
    if(lengthInUtf8Bytes(s)>consts.maxByteSize){

        if(lengthInUtf8Bytes(s)>1024){
            ban(id,"banned for sending over 1024 bytes of data at once.")
        }

        //replace their message with something funny
        s=prank()
        //mark them as suspicious
        playerLookup[id].hackerSuspicion+=consts.largeMessagePunish
        console.log(playerLookup[id].name+" marked as suspicious for sending too much data at once. ["+playerLookup[id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
    }

    //check for injections
    else if(s.includes("<")&&s.includes(">")){

        //replace their message with something funny
        s=prank()

        //mark them as suspicious
        playerLookup[id].hackerSuspicion+=consts.htmlInjectionPunish
        console.log(playerLookup[id].name+" marked as suspicious for using html charactors. ["+playerLookup[id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
    }

    //check for spamming
    playerLookup[id].messagesLastSecond++
    if(playerLookup[id].messagesLastSecond>consts.maxMessagesPerSecond){
        //mark them as suspicious
        playerLookup[id].hackerSuspicion+=consts.spammingPunish
        console.log(playerLookup[id].name+" marked as suspicious for spamming. ["+playerLookup[id].hackerSuspicion+"/"+consts.hackerSuspicionThreshold+"]")
    }

    //kick if too suspicious
    if(playerLookup[id].hackerSuspicion>=consts.hackerSuspicionThreshold){
        ban(id,"banned for repeated infractions")
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
    //TODO: use getWhiteCard()
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

//for getting cards off the internet
function HttpClientGet(aUrl, aCallback) {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function() { 
        if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
            aCallback(anHttpRequest.responseText);
    }

    anHttpRequest.open( "GET", aUrl, true );            
    anHttpRequest.send( null );
}

function updateLoginCredentials(){
    var u=[]
    var p=[]
    var s=[]

    fs.readFile('loginCredentials.txt','utf8', function read(err, data) {
        if (err) {
            throw err;
        }
        const content = data;
    
        content.split("\n").forEach(function(l){
            login=l.split(":")
            u.push(login[0])
            p.push(login[1])
            s.push(parseInt(login[2]))
        });
        usernameHashes=u
        passwordHashes=p
        scores=s
    });
}
function ban(id,reason){
    //TODO: lock account for set time
    playerLookup[id].socket.emit("ban",reason)
    playerLookup[id].isActive=false
    console.log(playerLookup[id].name+" banned for "+reason)
}
