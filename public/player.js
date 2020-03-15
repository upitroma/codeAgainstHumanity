//Make connection
var socket = io.connect(window.location.href);//server location = browser url (in this case)

//get objects from html
var message = document.getElementById('message'),
    btn = document.getElementById('send'),
    output = document.getElementById('output');

//networking in
socket.on("serverPrivate",function(data){
    output.innerHTML+= "<p><server>"+"Server (only you can read this)"+": </server>"+data+"</p>";
});
socket.on("chat",function(data){
    output.innerHTML+= "<p>"+data.message+"</p>";
});

//networking out
btn.addEventListener("click",function(){
    socket.emit("chat",{
        message: message.value
    });
});