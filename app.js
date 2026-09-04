const Q=window.QUESTIONS,MAX=50,REPORT_EMAIL="ricardo.santos@sesisp.org.br",L=["A","B","C","D"];
let i=0,score=0,answers=[],student="",group="",sending=false;
const $=id=>document.getElementById(id);
const screens={start:$("start"),quiz:$("quiz"),result:$("result"),review:$("review")};
const icons={"Biodiversidade e Tapete":"🌿","Missões BIOGLOW":"🧩","Regras do Robot Game":"📘","Estratégia":"🧠","Situações-problema":"⚡"};

function show(name){Object.values(screens).forEach(x=>x.classList.remove("active"));screens[name].classList.add("active");scrollTo({top:0,behavior:"smooth"})}

function start(){
  student=$("name").value.trim(); group=$("group").value.trim();
  if(!student){$("name").setCustomValidity("Informe o nome do aluno ou da equipe.");$("name").reportValidity();$("name").focus();return}
  $("name").setCustomValidity("");i=0;score=0;answers=[];sending=false;$("emailStatus").textContent="";$("resendBtn").hidden=true;show("quiz");render()
}

function render(){
  const q=Q[i];$("badge").textContent=`${icons[q.category]||"•"} ${q.category}`;$("score").textContent=`Pontuação: ${score} / ${MAX}`;
  $("count").textContent=`Questão ${i+1} de ${Q.length} • vale ${q.points} ponto${q.points>1?"s":""}`;$("question").textContent=q.question;$("progress").style.width=`${i/Q.length*100}%`;
  $("options").innerHTML="";
  q.options.forEach((txt,n)=>{const b=document.createElement("button");b.className="opt";b.innerHTML=`<span class="letter">${L[n]}</span><span>${txt}</span>`;b.onclick=()=>choose(n);$("options").appendChild(b)});
  $("feedback").className="feedback";$("feedback").innerHTML="";$("nextBtn").hidden=true
}

function choose(n){
  const q=Q[i],ok=n===q.answer,buttons=[...document.querySelectorAll(".opt")];
  buttons.forEach((b,x)=>{b.disabled=true;if(x===q.answer)b.classList.add("correct");if(x===n&&!ok)b.classList.add("wrong")});
  if(ok)score+=q.points;answers.push({selected:n,correct:ok,points:ok?q.points:0});
  $("score").textContent=`Pontuação: ${score} / ${MAX}`;
  $("feedback").className=`feedback show ${ok?"ok":"bad"}`;$("feedback").innerHTML=`<strong>${ok?"✅ Muito bem!":"🔎 Quase lá!"}</strong><div>${q.explanation}</div>`;
  $("nextBtn").hidden=false;$("nextBtn").textContent=i===Q.length-1?"Ver resultado →":"Próxima questão →"
}

function next(){if(i<Q.length-1){i++;render()}else finish()}

function categorySummary(){
  const g={};
  Q.forEach(q=>{if(!g[q.category])g[q.category]={total:0,earned:0,correct:0,count:0};g[q.category].total+=q.points;g[q.category].count++});
  answers.forEach((a,x)=>{const q=Q[x];g[q.category].earned+=a.points;if(a.correct)g[q.category].correct++});return g
}

function finish(){
  const correct=answers.filter(a=>a.correct).length,wrong=Q.length-correct,percent=Math.round(score/MAX*100);
  let msg=percent>=90?"Excelente! Domínio muito forte do conteúdo.":percent>=75?"Ótimo desempenho! Falta pouco para ficar afiado para a competição.":percent>=60?"Bom caminho. Revise as questões erradas e tente novamente.":"Hora de revisar com calma. Use a revisão para descobrir onde melhorar.";
  $("resultScore").textContent=`${score} / ${MAX}`;$("percent").textContent=`${percent}%`;$("correct").textContent=correct;$("wrong").textContent=wrong;$("message").textContent=`${student}, ${msg.charAt(0).toLowerCase()+msg.slice(1)}`;
  const g=categorySummary();$("catResults").innerHTML=Object.entries(g).map(([c,d])=>`<div class="catrow"><div>${icons[c]||""} <strong>${c}</strong><br><span style="color:var(--muted)">${d.correct} de ${d.count} questões corretas</span></div><strong>${d.earned} / ${d.total} pts</strong></div>`).join("");
  show("result");sendReport({correct,wrong,percent})
}

function buildReport(stats){
  const g=categorySummary(),cats=Object.entries(g).map(([c,d])=>`${c}: ${d.correct}/${d.count} acertos | ${d.earned}/${d.total} pontos`).join("\n");
  const detail=Q.map((q,x)=>{const a=answers[x];return [
    `${q.id}. ${q.question}`,
    `Categoria: ${q.category}`,
    `Resposta do aluno: ${L[a.selected]}) ${q.options[a.selected]}`,
    `Resposta correta: ${L[q.answer]}) ${q.options[q.answer]}`,
    `Resultado: ${a.correct?"CORRETA":"INCORRETA"}`,
    `Pontos: ${a.points}/${q.points}`,
    `Explicação: ${q.explanation}`
  ].join("\n")}).join("\n\n");
  return [
    "QUIZ FLL BIOGLOW — RELATÓRIO COMPLETO","",
    `Aluno/equipe: ${student}`,`Turma/grupo: ${group||"Não informada"}`,`Data/hora: ${new Date().toLocaleString("pt-BR")}`,
    `Pontuação: ${score}/${MAX}`,`Aproveitamento: ${stats.percent}%`,`Acertos: ${stats.correct}/${Q.length}`,`Erros: ${stats.wrong}/${Q.length}`,"",
    "DESEMPENHO POR CATEGORIA",cats,"","RESPOSTAS QUESTÃO A QUESTÃO",detail
  ].join("\n")
}

async function sendReport(stats){
  if(sending)return;sending=true;$("resendBtn").hidden=true;$("emailStatus").textContent=`📨 Enviando relatório completo para ${REPORT_EMAIL}...`;
  try{
    const r=await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(REPORT_EMAIL)}`,{
      method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify({
        _subject:`BIOGLOW Quiz — ${student} — ${score}/${MAX}`,_template:"table",
        aluno_ou_equipe:student,turma_ou_grupo:group||"Não informada",pontuacao:`${score}/${MAX}`,
        aproveitamento:`${stats.percent}%`,acertos:`${stats.correct}/${Q.length}`,erros:`${stats.wrong}/${Q.length}`,
        relatorio_completo:buildReport(stats),pagina_origem:location.href
      })
    });
    const data=await r.json().catch(()=>({}));if(!r.ok||data.success===false)throw new Error(data.message||"Falha no envio");
    $("emailStatus").textContent=`✅ Relatório processado para envio a ${REPORT_EMAIL}. Se este for o primeiro envio, o responsável deve confirmar a ativação recebida por e-mail.`
  }catch(e){
    console.error(e);$("emailStatus").textContent="⚠️ O resultado foi calculado, mas o envio automático falhou.";$("resendBtn").hidden=false
  }finally{sending=false}
}

function statsNow(){const correct=answers.filter(a=>a.correct).length;return{correct,wrong:Q.length-correct,percent:Math.round(score/MAX*100)}}

function review(){
  $("reviewList").innerHTML=Q.map((q,x)=>{const a=answers[x];return `<div class="ritem"><div class="badge" style="margin-bottom:10px">${icons[q.category]||""} ${q.category}</div><h4>${q.id}. ${q.question}</h4><div class="rline">Sua resposta: <strong>${L[a.selected]}) ${q.options[a.selected]}</strong> ${a.correct?"✅":"❌"}</div>${a.correct?"":`<div class="rline">Resposta correta: <strong>${L[q.answer]}) ${q.options[q.answer]}</strong></div>`}<div class="rline" style="color:var(--muted)">${q.explanation}</div></div>`}).join("");show("review")
}

$("startBtn").onclick=start;$("nextBtn").onclick=next;$("reviewBtn").onclick=review;$("backBtn").onclick=()=>show("result");$("restartBtn").onclick=()=>show("start");$("resendBtn").onclick=()=>sendReport(statsNow());
$("name").oninput=e=>e.target.setCustomValidity("");$("name").onkeydown=e=>{if(e.key==="Enter")start()};$("group").onkeydown=e=>{if(e.key==="Enter")start()};
