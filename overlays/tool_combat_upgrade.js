(()=>{
  const ACTION=document.getElementById('action');
  const WORLD=document.getElementById('world');
  if(!ACTION||!WORLD)return;

  const DEF={
    fists:{icon:'👊',name:'Pěsti',anim:'punch'},
    club:{icon:'🪵',name:'Kyj',anim:'smash'},
    spear:{icon:'🗡️',name:'Kopí',anim:'thrust'},
    hardenedSpear:{icon:'🔱',name:'Zpevněné kopí',anim:'thrust'},
    axe:{icon:'🪓',name:'Sekera',anim:'chop'},
    flintBlade:{icon:'🔪',name:'Pazourkový nůž',anim:'slash'},
    stoneHammer:{icon:'🔨',name:'Kamenné kladivo',anim:'smash'}
  };
  const WORK_HITS={axe:3,stoneHammer:3,flintBlade:2};
  const work=new Map();
  let bypass=false,lastSwing=0,pointerStart=null;

  const vm=document.createElement('div');
  vm.id='weaponViewmodel';
  vm.innerHTML='<div class="weaponGhost"></div><div class="weaponHand"><span class="weaponIcon">👊</span></div><div class="weaponInfo"><b>PĚSTI</b><small>AKTIVNÍ</small></div><div class="hitSpark"></div>';
  document.body.appendChild(vm);

  function weapon(){try{return activeWeapon()}catch(_){return globalThis.state?.equipped||'fists'}}
  function target(){try{return visibleObj||nearbyObject()}catch(_){return null}}
  function text(o){return ((o?.type||'')+' '+(o?.name||'')).toLowerCase()}
  function tree(o){return !!o&&/(tree|palm|wood|log|strom|palma|kmen|dřevo|dřeva)/i.test(text(o))}
  function rock(o){return !!o&&/(stone|rock|ore|flint|kámen|skála|pazourek|ruda)/i.test(text(o))}
  function fiber(o){return !!o&&/(fiber|reed|bush|plant|vlák|rákos|keř|rostlin)/i.test(text(o))}
  function animal(o){return !!o&&/(boar|rabbit|snake|animal|kanec|králík|had)/i.test(text(o))}
  function workTarget(w,o){return (w==='axe'&&tree(o))||(w==='stoneHammer'&&rock(o))||(w==='flintBlade'&&fiber(o))}
  function keyFor(o){return o?.id||[o?.type,o?.name,Math.round(o?.x||0),Math.round(o?.z||0)].join(':')}
  function notify(msg){try{flash(msg)}catch(_){const n=document.getElementById('notice');if(n){n.textContent=msg;n.classList.add('show')}}}
  function spendEnergy(n){try{if(state&&typeof state.energy==='number'){state.energy=Math.max(0,state.energy-n);changed=true;updateUI?.()}}catch(_){}}

  function showWeapon(){
    const id=weapon(),d=DEF[id]||DEF.fists;
    vm.dataset.weapon=id;
    vm.querySelector('.weaponIcon').textContent=d.icon;
    vm.querySelector('.weaponInfo b').textContent=d.name.toUpperCase();
  }
  function swing(hit=false){
    const id=weapon(),d=DEF[id]||DEF.fists,now=performance.now();
    if(now-lastSwing<180)return;lastSwing=now;
    showWeapon();
    vm.classList.remove('punch','thrust','chop','slash','smash','hit');
    void vm.offsetWidth;
    vm.classList.add(d.anim);
    if(hit)vm.classList.add('hit');
    setTimeout(()=>vm.classList.remove(d.anim,'hit'),360);
  }
  function dust(o,w){
    const burst=document.createElement('div');
    burst.className='toolBurst '+(w==='axe'?'wood':w==='stoneHammer'?'stone':'combat');
    burst.textContent=w==='axe'?'✦  ✧':w==='stoneHammer'?'· ✦ ·':'✧';
    document.body.appendChild(burst);
    setTimeout(()=>burst.remove(),420);
  }
  function doOriginal(){bypass=true;ACTION.click();bypass=false}

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#action');
    if(!btn||bypass)return;
    const w=weapon(),o=target();
    swing(!!o);dust(o,w);
    if(!workTarget(w,o))return;

    e.preventDefault();e.stopImmediatePropagation();
    const k=w+'|'+keyFor(o),need=WORK_HITS[w]||3,next=(work.get(k)||0)+1;
    spendEnergy(w==='axe'?1.8:1.35);
    if(next<need){
      work.set(k,next);
      const verb=w==='axe'?'ZÁŘEZ':w==='stoneHammer'?'ÚDER':'ŘEZ';
      notify((DEF[w]?.icon||'⚒')+' '+verb+' '+next+'/'+need+' · '+(o?.name||'cíl'));
      return;
    }
    work.delete(k);
    notify((DEF[w]?.icon||'⚒')+' Dokončeno · '+(o?.name||'cíl'));
    setTimeout(doOriginal,120);
  },true);

  WORLD.addEventListener('pointerdown',e=>{if(e.button===0)pointerStart={x:e.clientX,y:e.clientY,t:performance.now()}},{passive:true});
  WORLD.addEventListener('pointerup',e=>{
    if(e.button!==0||!pointerStart)return;
    const d=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y),dt=performance.now()-pointerStart.t;
    pointerStart=null;
    if(d>7||dt>420)return;
    const o=target(),w=weapon();
    if(!o)return;
    if(animal(o)||workTarget(w,o))ACTION.click();
  },{passive:true});

  document.addEventListener('keydown',e=>{
    if((e.key==='e'||e.key==='E')&&!e.repeat)setTimeout(()=>swing(!!target()),0);
  });

  setInterval(showWeapon,350);
  showWeapon();
})();
