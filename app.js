// Taras Bulba — stacked layout with special labels.

let deck = [];
let currentCard = null;
let isRevealing = false;
let deckLabel, lastLabel;

const SPECIALS = ["Blank", "Skip","Skip","Pass","Pass","Reverse","Reverse"];

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildDeck(){return [...Array.from({length:14},(_,i)=>i+1),...SPECIALS];}

function setStatus(msg){document.getElementById("status").textContent=msg;}
function updateRemaining(){document.getElementById("remaining").textContent=`Deck: ${deck.length}`;}
function drawReference(v){document.getElementById("lastText").textContent=v;document.getElementById("refHint").textContent=`Compare against: ${v}`;}
function resetDeckFace(){document.getElementById("deckFront").textContent="?";document.getElementById("deckBack").textContent="?";}
function showLabel(el,text){if(!el)return;if(text){el.textContent=text;el.classList.remove("hidden");}else{el.textContent="";el.classList.add("hidden");}}

function newRound(){
  deck = shuffle(buildDeck());
  while(typeof deck[deck.length-1]!=="number"){deck.unshift(deck.pop());}
  currentCard = deck.pop();
  drawReference(currentCard);
  resetDeckFace();
  updateRemaining();
  hideLoseScreen();
  setStatus("Guess Higher, Lower, or Blank");
  showLabel(deckLabel,null);
  showLabel(lastLabel,null);
}

function computeSlideDelta(){
  const a=document.getElementById("deckCard").getBoundingClientRect();
  const b=document.getElementById("lastCard").getBoundingClientRect();
  return {dx:(b.left+b.width/2)-(a.left+a.width/2),dy:(b.top+b.height/2)-(a.top+a.height/2)};
}

function revealNext(guess){
  if(isRevealing)return;
  if(!deck.length){newRound();return;}
  isRevealing=true;disableButtons(true);setStatus("Sliding…");

  const next=deck.pop();updateRemaining();
  const {dx,dy}=computeSlideDelta();

  document.getElementById("deckBack").textContent=next;
  const card=document.getElementById("deckCard");
  card.classList.add("animating");

  const slide=card.animate([{transform:"translate(0,0)"},{transform:`translate(${dx}px,${dy}px)`}],{duration:3000,easing:"ease",fill:"forwards"});
  slide.onfinish=()=>{
    card.classList.remove("animating");
    evaluate(next,guess);
    finishReveal();
  }
}

function evaluate(next,guess){
  showLabel(deckLabel,null);showLabel(lastLabel,null);
  const blankLoss=(guess==="blank"&&typeof next==="number");
  if(blankLoss){setStatus("Wrong guess — called Blank but drew a number.");showLoseScreen(next);return;}
  if(typeof next==="number"){
    const correct=(guess==="higher"&&next>currentCard)||(guess==="lower"&&next<currentCard);
    if(correct){currentCard=next;drawReference(currentCard);setStatus("Nice! Keep going.");}
    else{setStatus("Wrong guess.");showLoseScreen(next);}
  }else{
    if(next==="Blank"){setStatus("Correct: Blank! Previous number stays.");showLabel(deckLabel,"Blank");showLabel(lastLabel,"Blank");}
    else{setStatus(`${next}! Previous number (${currentCard}) stays.`);showLabel(deckLabel,next);showLabel(lastLabel,next);}
  }
}

function finishReveal(){
  const card=document.getElementById("deckCard");
  card.animate([{transform:getComputedStyle(card).transform},{transform:"translate(0,0)"}],{duration:250,fill:"forwards"}).onfinish=()=>{
    resetDeckFace();disableButtons(false);isRevealing=false;
  }
}

function disableButtons(d){["btnHigher","btnLower","btnBlank","newGame"].forEach(id=>{document.getElementById(id).classList.toggle("disabled",d);});}
function showLoseScreen(v){document.getElementById("loseMsg").textContent=`You revealed ${v}.`;document.getElementById("loseOverlay").classList.remove("hidden");}
function hideLoseScreen(){document.getElementById("loseOverlay").classList.add("hidden");}

window.addEventListener("load",()=>{
  deckLabel=document.getElementById("deckLabel");
  lastLabel=document.getElementById("lastLabel");
  document.getElementById("btnHigher").onclick=()=>revealNext("higher");
  document.getElementById("btnLower").onclick=()=>revealNext("lower");
  document.getElementById("btnBlank").onclick=()=>revealNext("blank");
  document.getElementById("newGame").onclick=()=>newRound();
  document.getElementById("restartBtn").onclick=()=>newRound();
  newRound();
});