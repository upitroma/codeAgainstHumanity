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
    redrawCards = document.getElementById("redrawCards"),
    chatBox = document.getElementById("chat");




//get username
//socket.emit("username",{
    //FIXME: uncomment this
    //TODO: uncomment this
    //name: prompt("Please enter your name", "anonymous")
    //name: "test"
//});

//login

function signUp(){
    let u=document.getElementById("usernameInput").value
    let p=document.getElementById("passwordInput").value
    if(u&&u.length>1&&p&&p.length>1){
        socket.emit("signUp",{
            username: u,
            password: p
        });
    }
    else{
        document.getElementById("usernameInput").placeholder="New Username"
        document.getElementById("passwordInput").placeholder="New Password"
    }
}
function login(){
    let u=document.getElementById("usernameInput").value
    let p=document.getElementById("passwordInput").value
    if(u&&u.length>1&&p&&p.length>1){
        socket.emit("login",{
            username: u,
            password: p
        });
    }
    else{
        document.getElementById("usernameInput").placeholder="Username"
        document.getElementById("passwordInput").placeholder="Password"
    }
}


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
socket.on("connected",function(data){
    gamestate.innerHTML="<p>"+"login"+"</p>"
    black.innerHTML="<p>"+"My login credentials for Code Against Humanity are _."+"</p>"
    whites.innerHTML=
    '<login><input type="text" placeholder="Username" id="usernameInput"><br>'+
    '<input type="password" placeholder="Password" id="passwordInput"><br><br>'+
    '<button onclick="login()">login</button><br>'+
    '<button onclick="signUp()">sign up</button></login>'

})
socket.on("serverPrivate",function(data){
    serverInfo.innerHTML= "<p>"+"Server"+": "+data+"</p>";
});
socket.on("serverPublic",function(data){
    output.innerHTML+= "<p><server>"+"[Server]"+":</server> "+data+"</p>"; //TODO: server css
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
    for(i=0; i<data.length;i++){
        whites.innerHTML+= "<button onClick=whiteClick("+i+")><div>"+data[i]+"</div></button>";
        myWhiteCards.push(data[i])
    }
})
socket.on("results",function(data){
    whites.innerHTML= "";
    whites.innerHTML+= "<button onClick=whiteClick("+i+")><div>"+data.winningCard+"<br>Played by: "+data.winningPlayer+"</div></button>";
})
socket.on("ban",function(data){
    alert(data)
    gamestate.innerHTML="<p>"+data+"</p>"
})
socket.on("loginError",function(data){
    alert(data)
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
redrawCards.addEventListener("click",function(){
    //request redraw
    socket.emit("redraw","")
    console.log("redraw requested")
})