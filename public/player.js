//Make connection
var socket = io.connect(window.location.href);//server location = browser url (in this case)

//get objects from html
var message = document.getElementById('message'),
    btn = document.getElementById('send'),
    output = document.getElementById('output'),
    serverInfo = document.getElementById("serverInfo"),
    chatBox = document.getElementById("chat");

//networking in
socket.on("serverPrivate",function(data){
    serverInfo.innerHTML= "<p>"+"Server"+": "+data+"</p>";
});
socket.on("serverPublic",function(data){
    output.innerHTML+= "<p>"+"Server"+": "+data+"</p>";
});
socket.on("chat",function(data){
    output.innerHTML+= "<p>"+data.message+"</p>";
    output.scrollTop = output.scrollHeight
    chatBox.scrollTop = chatBox.scrollHeight
});

//networking out
btn.addEventListener("click",function(){
    socket.emit("chat",{
        message: message.value
    });
});