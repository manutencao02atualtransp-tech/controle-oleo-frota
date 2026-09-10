const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltam SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY.');
}
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireDb(req, res, next) {
  if (!supabase) return res.status(500).json({ error: 'Supabase não configurado no servidor.' });
  next();
}
function fail(res, error) { console.error(error); return res.status(500).json({ error: error.message || String(error) }); }

app.get('/api/state', requireDb, async (req, res) => {
  try {
    const [f, e, t, forn, a, c] = await Promise.all([
      supabase.from('frota').select('*').order('placa'),
      supabase.from('estoque').select('*').order('produto'),
      supabase.from('trocas').select('*').order('data', { ascending: false }),
      supabase.from('fornecedores').select('*').order('fornecedor'),
      supabase.from('alertas').select('*').order('placa'),
      supabase.from('consumo_mensal').select('*').order('mes', { ascending: false })
    ]);
    for (const x of [f,e,t,forn,a,c]) if (x.error) throw x.error;
    const frota = f.data || [], estoque = e.data || [], trocas = t.data || [], fornecedores = forn.data || [];
    const alertas = a.data || [], consumo = c.data || [];
    const estoqueRows = estoque.map(x => ({...x, saldo_atual: Number(x.estoque_inicial||0)+Number(x.entradas||0)-Number(x.saidas||0)}));
    const estoqueLitros = estoqueRows.reduce((s,x)=>s+(x.unidade==='L'?x.saldo_atual:0),0);
    const valorEstoque = estoqueRows.reduce((s,x)=>s+x.saldo_atual*Number(x.custo_medio||0),0);
    const mesAtual = new Date().toISOString().slice(0,7);
    const tm = trocas.filter(x => String(x.data||'').slice(0,7) === mesAtual);
    const dashboard = {
      veiculos: frota.length,
      vencidas: alertas.filter(x=>x.status==='VENCIDA').length,
      proximas: alertas.filter(x=>x.status==='PRÓXIMA').length,
      emDia: alertas.filter(x=>x.status==='EM DIA').length,
      estoque: estoqueLitros,
      valorEstoque,
      litrosMes: tm.reduce((s,x)=>s+Number(x.quantidade_litros||0),0),
      custoMes: tm.reduce((s,x)=>s+Number(x.custo_total||0),0),
      itensComprar: estoqueRows.filter(x=>x.saldo_atual<=Number(x.estoque_minimo||0)).length,
      km: frota.reduce((s,x)=>s+Number(x.km_atual||0),0)
    };
    res.json({db:{frota,estoque:estoqueRows,trocas,fornecedores},alertas,consumo,dashboard});
  } catch (e) { fail(res,e); }
});

app.post('/api/frota', requireDb, async (req,res)=>{
  try { const {data,error}=await supabase.from('frota').insert([req.body]).select().single(); if(error)throw error; res.json(data); } catch(e){fail(res,e);} });
app.post('/api/estoque', requireDb, async (req,res)=>{
  try { const {data,error}=await supabase.from('estoque').insert([req.body]).select().single(); if(error)throw error; res.json(data); } catch(e){fail(res,e);} });
app.post('/api/fornecedores', requireDb, async (req,res)=>{
  try { const {data,error}=await supabase.from('fornecedores').insert([req.body]).select().single(); if(error)throw error; res.json(data); } catch(e){fail(res,e);} });
app.post('/api/trocas', requireDb, async (req,res)=>{
  try {
    const x=req.body;
    const {data:troca,error}=await supabase.from('trocas').insert([x]).select().single();
    if(error)throw error;
    const {data:item,error:e1}=await supabase.from('estoque').select('*').eq('produto',x.produto).eq('viscosidade_ref',x.viscosidade).limit(1).maybeSingle();
    if(e1)throw e1;
    if(item){
      const novoSaldo=Number(item.saidas||0)+Number(x.quantidade_litros||0);
      const {error:e2}=await supabase.from('estoque').update({saidas:novoSaldo}).eq('id',item.id);
      if(e2)throw e2;
    }
    const {error:e3}=await supabase.from('frota').update({km_atual:x.km,km_ultima_troca:x.km,ultima_troca:x.data}).eq('placa',x.placa);
    if(e3)throw e3;
    res.json(troca);
  } catch(e){fail(res,e);} });

app.get('/health', (req,res)=>res.json({ok:true, supabase:!!supabase}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Controle de Óleo Supabase na porta ${PORT}`));
