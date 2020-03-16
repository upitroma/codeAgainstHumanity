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
    whites.innerHTML= "";
    for(i=0; i<data.length;i++){
        whites.innerHTML+= "<button><div>"+data[i]+"</div></button>";
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

//networking out
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