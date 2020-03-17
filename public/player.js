//Make connection
var socket = io.connect(window.location.href);//server location = browser url (in this case)

//get objects from html
var message = document.getElementById('message'),
    btn = document.getElementById('send'),
    output = document.getElementById('output'),
    serverInfo = document.getElementById("serverInfo"),
    whites = document.getElementById("whiteCards"),
    black = document.getElementById("blackCard"),
    timer = document.getElementById("timer"),
    gamestate = document.getElementById("gamestate"),
    chatBox = document.getElementById("chat");

//get username
socket.emit("username",{
    //FIXME: uncomment this
    //TODO: uncomment this
    //name: prompt("Please enter your name", "anonymous")
    name: "test"
});

//get white card selection
var myWhiteCards=[]
var myChosenWhiteCard=-1
function whiteClick(i){
    if(gamestate.innerHTML=="<p>Choose a card</p>"){
        myChosenWhiteCard=i
        whites.innerHTML= "";

        for(let c=0; c<myWhiteCards.length;c++){
            if(c==i){
                whites.innerHTML+= "<button><div>"+myWhiteCards[c]+"</div></button>";
            }
            else{
                whites.innerHTML+= "<shortCards><div>"+myWhiteCards[c]+"</shortCards></div>";
            }
        }
        socket.emit("playCard",i)
        console.log(i)
    }
    else if(gamestate.innerHTML=="<p>Vote for your favorite</p>"){
        whites.innerHTML= "";
        for(let c=0; c<myWhiteCards.length;c++){
            if(c==i){
                whites.innerHTML+= "<button><div>"+myWhiteCards[c]+"</div></button>";
            }
            else{
                whites.innerHTML+= "<shortCards><div>"+myWhiteCards[c]+"</shortCards></div>";
            }
        }
        socket.emit("vote",i)
        console.log(i)
    }
}

//networking in
socket.on("serverPrivate",function(data){
    serverInfo.innerHTML= "<p>"+"Server"+": "+data+"</p>";
});
socket.on("serverPublic",function(data){
    output.innerHTML+= "<p>"+"Server"+": "+data+"</p>";
});
socket.on("chat",function(data){
    output.innerHTML+= "<p><username>["+data.name+"]: </username>"+data.message+"</p>";
});
socket.on("deal",function(data){
    myWhiteCards=[]
    whites.innerHTML= "";
    for(i=0; i<data.length;i++){
        whites.innerHTML+= "<button onClick=whiteClick("+i+")><div>"+data[i]+"</div></button>";
        myWhiteCards.push(data[i])
    }
})
socket.on("newBlack",function(data){
    black.innerHTML="<p>"+data+"</p>"
})
socket.on("timer",function(data){
    timer.innerHTML="<p>"+data+"</p>"
})
socket.on("gamestate",function(data){
    gamestate.innerHTML="<p>"+data+"</p>"
})
socket.on("submissions",function(data){
    whites.innerHTML= "";
    myWhiteCards=[]
    console.log(whites.innerHTML)
    for(i=0; i<data.length;i++){
        whites.innerHTML+= "<button onClick=whiteClick("+i+")><div>"+data[i]+"</div></button>";
        myWhiteCards.push(data[i])
    }
})




btn.addEventListener("click",function(){
    socket.emit("chat",{
        message: message.value
    });
});
message.addEventListener("keyup", function(event) {
    //if you hit enter while typing a message
    if (event.keyCode === 13) {
        socket.emit("chat",{
            message: message.value
        });
    }
  }); 