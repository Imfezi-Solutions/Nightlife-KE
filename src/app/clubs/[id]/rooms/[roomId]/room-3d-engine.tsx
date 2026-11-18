'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { Group } from 'three'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Dance = 'groove' | 'bounce' | 'sway' | 'hype'
type Avatar = { skin: 'warm'|'deep'|'light'|'tan'; hair: 'curly'|'fade'|'braids'|'short'; outfit: 'neon'|'street'|'vip'|'classic'; dance: Dance }
type Position = { x:number; z:number; dance:Dance; seated?:boolean }
type Remote = { id:string; position:Position; avatar:Avatar }
const defaults: Avatar = { skin:'warm', hair:'curly', outfit:'neon', dance:'groove' }
const skin: Record<Avatar['skin'],string> = { warm:'#a96745', deep:'#613b2d', light:'#e0ad83', tan:'#c9875c' }
const clothes: Record<Avatar['outfit'],string> = { neon:'#c7ff38', street:'#6478ff', vip:'#e7bd75', classic:'#d5d9e2' }
const choices = {
 skin:[['warm','Warm brown'],['deep','Deep brown'],['light','Light'],['tan','Tan']],
 hair:[['curly','Curly'],['fade','Fade'],['braids','Braids'],['short','Short']],
 outfit:[['neon','Neon'],['street','Streetwear'],['vip','VIP'],['classic','Classic']],
 dance:[['groove','Groove'],['bounce','Bounce'],['sway','Sway'],['hype','Hype']],
} as const
const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n))

function Dancer({ position, avatar, me=false, hidden=false }: { position:Position; avatar:Avatar; me?:boolean; hidden?:boolean }) {
 const ref = useRef<Group>(null)
 const leftArm = useRef<Group>(null)
 const rightArm = useRef<Group>(null)
 const leftLeg = useRef<Group>(null)
 const rightLeg = useRef<Group>(null)
 useFrame(({clock}) => {
  if (!ref.current) return
  const t = clock.getElapsedTime()
  const speed = avatar.dance === 'hype' ? 8 : avatar.dance === 'bounce' ? 5 : avatar.dance === 'sway' ? 2.2 : 3
  const phase = t * speed + position.x * .7
  if(position.seated){ref.current.position.y=-.38;ref.current.rotation.x=-.12;if(leftArm.current)leftArm.current.rotation.z=-.08;if(rightArm.current)rightArm.current.rotation.z=.08;return}
  ref.current.position.y = Math.abs(Math.sin(phase)) * (avatar.dance === 'hype' ? .3 : avatar.dance === 'bounce' ? .2 : .1)
  ref.current.rotation.z = Math.sin(t*2.2 + position.z) * (avatar.dance === 'sway' ? .22 : .09)
  ref.current.rotation.y = Math.sin(t*1.4 + position.x) * .12
  if (leftArm.current) leftArm.current.rotation.z = -.25 + Math.sin(phase + Math.PI) * (avatar.dance === 'hype' ? .95 : .55)
  if (rightArm.current) rightArm.current.rotation.z = .25 + Math.sin(phase) * (avatar.dance === 'hype' ? .95 : .55)
  if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(phase) * .24
  if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(phase + Math.PI) * .24
 })
 if(hidden)return null
 if(hidden)return null
 return <group ref={ref} position={[position.x,0,position.z]}>
  <mesh position={[0,1.55,0]} castShadow><sphereGeometry args={[.25,24,20]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh>
  {avatar.hair === 'curly' && <group>{[-.16,-.05,.06,.17].map((x,i)=><mesh key={i} position={[x,1.78+(i%2)*.04,-.03]}><boxGeometry args={[.22,.16,.22]}/><meshStandardMaterial color="#20151f"/></mesh>)}</group>}
  {avatar.hair === 'fade' && <mesh position={[0,1.78,-.02]}><boxGeometry args={[.5,.12,.48]}/><meshStandardMaterial color="#20151f"/></mesh>}
  {avatar.hair === 'short' && <mesh position={[0,1.75,-.02]}><boxGeometry args={[.5,.09,.48]}/><meshStandardMaterial color="#20151f"/></mesh>}
  {avatar.hair === 'braids' && <group>{[-.18,-.06,.06,.18].map((x,i)=><mesh key={i} position={[x,1.72,-.02]} rotation={[0,0,x*.4]}><boxGeometry args={[.07,.38,.08]}/><meshStandardMaterial color="#20151f"/></mesh>)}</group>}
  <mesh position={[0,1.02,0]} castShadow><capsuleGeometry args={[.29,.25,6,16]}/><meshStandardMaterial color={clothes[avatar.outfit]} metalness={.12} roughness={.6}/></mesh>
  <group ref={leftArm} position={[-.37,1.03,0]} rotation={[0,0,-.35]}><mesh position={[0,-.22,0]}><capsuleGeometry args={[.085,.35,5,12]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh></group>
  <group ref={rightArm} position={[.37,1.03,0]} rotation={[0,0,.35]}><mesh position={[0,-.22,0]}><capsuleGeometry args={[.085,.35,5,12]}/><meshStandardMaterial color={skin[avatar.skin]}/></mesh></group>
  <group ref={leftLeg} position={[-.15,.65,0]}><mesh position={[0,-.25,0]}><capsuleGeometry args={[.105,.36,5,12]}/><meshStandardMaterial color="#242330"/></mesh></group>
  <group ref={rightLeg} position={[.15,.65,0]}><mesh position={[0,-.25,0]}><capsuleGeometry args={[.105,.36,5,12]}/><meshStandardMaterial color="#242330"/></mesh></group>
  {me && <mesh position={[0,2.08,0]}><sphereGeometry args={[.045,8,8]}/><meshBasicMaterial color="#c7ff38"/></mesh>}
 </group>
}

function MovingClubLights() {
 const rig = useRef<Group>(null)
 useFrame(({clock}) => {
  if (!rig.current) return
  rig.current.rotation.y = Math.sin(clock.elapsedTime * .42) * .8
  rig.current.rotation.z = Math.sin(clock.elapsedTime * .7) * .12
 })
 return <group ref={rig} position={[0,5.5,-1]}>
  <spotLight position={[-4,0,0]} target-position={[0,-5,-1]} angle={.42} penumbra={.8} intensity={48} color="#c05aff" distance={18}/>
  <spotLight position={[4,0,0]} target-position={[0,-5,-1]} angle={.42} penumbra={.8} intensity={42} color="#42dfff" distance={18}/>
  <mesh position={[-2.5,-3.5,-.4]} rotation={[Math.PI,0,0]}><coneGeometry args={[2.1,7,24,1,true]}/><meshBasicMaterial color="#bd52ff" transparent opacity={.075} depthWrite={false}/></mesh>
  <mesh position={[2.5,-3.5,-.4]} rotation={[Math.PI,0,0]}><coneGeometry args={[2.1,7,24,1,true]}/><meshBasicMaterial color="#38dfff" transparent opacity={.075} depthWrite={false}/></mesh>
 </group>
}

function BarDrinks({ roomType }: { roomType:string }) {
 const spots = roomType === 'bar' ? [-1.65,-.55,.55,1.65] : [-2.4,2.4]
 return <group>
  {spots.map((x,i)=><group key={x} position={[x,1.22,roomType==='bar'?-2.45:-2.15]}>
   <mesh position={[0,.34,0]}><cylinderGeometry args={[.095,.12,.68,12]}/><meshStandardMaterial color={i%2?'#d99b42':'#5baf83'} roughness={.25} metalness={.15}/></mesh>
   <mesh position={[0,.72,0]}><cylinderGeometry args={[.075,.095,.16,12]}/><meshStandardMaterial color={i%2?'#d99b42':'#5baf83'}/></mesh>
   <mesh position={[.24,.13,.08]}><cylinderGeometry args={[.09,.075,.26,16]}/><meshStandardMaterial color="#9fe8ed" transparent opacity={.55} roughness={.12}/></mesh>
   <mesh position={[.24,.28,.08]}><cylinderGeometry args={[.075,.075,.025,16]}/><meshStandardMaterial color="#f0d47a" emissive="#9a6725" emissiveIntensity={.18}/></mesh>
  </group>)}
 </group>
}

function Sofa({position,color='#342843',width=2.8}:{position:[number,number,number];color?:string;width?:number}) {
 return <group position={position}>
  <mesh position={[0,.42,0]} castShadow><boxGeometry args={[width,.62,.9]}/><meshStandardMaterial color={color}/></mesh>
  <mesh position={[0,.83,-.34]}><boxGeometry args={[width,.42,.22]}/><meshStandardMaterial color={color}/></mesh>
  {[-width*.36,width*.36].map(x=><mesh key={x} position={[x,.77,0]}><boxGeometry args={[.16,.55,.94]}/><meshStandardMaterial color={color}/></mesh>)}
  {[-.55,.55].map(x=><mesh key={x} position={[x,.76,.02]}><boxGeometry args={[.72,.12,.66]}/><meshStandardMaterial color="#a88ab7"/></mesh>)}
 </group>
}
function CocktailTable({position}:{position:[number,number,number]}) {
 return <group position={position}>
  <mesh position={[0,.65,0]} castShadow><cylinderGeometry args={[.62,.7,.12,32]}/><meshStandardMaterial color="#292633" metalness={.65}/></mesh>
  <mesh position={[0,.32,0]}><cylinderGeometry args={[.09,.16,.58,12]}/><meshStandardMaterial color="#b58b55" metalness={.7}/></mesh>
  <mesh position={[0,.06,0]}><cylinderGeometry args={[.38,.38,.08,24]}/><meshStandardMaterial color="#302b38"/></mesh>
  <mesh position={[.22,.75,.06]}><cylinderGeometry args={[.07,.08,.2,12]}/><meshStandardMaterial color="#62c7a4"/></mesh>
 </group>
}
function Stool({position}:{position:[number,number,number]}) {
 return <group position={position}><mesh position={[0,.58,0]}><cylinderGeometry args={[.28,.28,.13,20]}/><meshStandardMaterial color="#b98d55"/></mesh><mesh position={[0,.29,0]}><cylinderGeometry args={[.055,.07,.5,12]}/><meshStandardMaterial color="#25232d" metalness={.7}/></mesh><mesh position={[0,.06,0]}><cylinderGeometry args={[.24,.24,.08,20]}/><meshStandardMaterial color="#25232d"/></mesh></group>
}
function SpeakerStack({position}:{position:[number,number,number]}) {
 return <group position={position}><mesh position={[0,1.05,0]} castShadow><boxGeometry args={[.85,2.1,.7]}/><meshStandardMaterial color="#101018"/></mesh>{[.52,1.48].map((y,i)=><group key={y} position={[0,y,.36]}><mesh><cylinderGeometry args={[i?.22:.29,i?.22:.29,.08,24]}/><meshStandardMaterial color="#242330"/></mesh><mesh position={[0,0,.05]}><cylinderGeometry args={[i?.12:.17,i?.12:.17,.025,24]}/><meshStandardMaterial color={i?'#a94cff':'#38dfff'} emissive={i?'#a94cff':'#38dfff'} emissiveIntensity={1.5}/></mesh></group>)}</group>
}
function Plant({position}:{position:[number,number,number]}) {
 return <group position={position}><mesh position={[0,.28,0]}><cylinderGeometry args={[.28,.22,.55,16]}/><meshStandardMaterial color="#8d563a"/></mesh>{[0,1,2,3,4].map(i=><mesh key={i} position={[Math.sin(i*1.25)*.18,.8+(i%2)*.12,Math.cos(i*1.25)*.16]}><coneGeometry args={[.18,.65,7]}/><meshStandardMaterial color="#276b4c"/></mesh>)}</group>
}
function RoomFurnishings({roomType:_roomType}:{roomType:string}) {
 return <group>
  <group position={[-5.1,0,0]} scale={.72}>
   <mesh position={[0,.65,-2.15]} castShadow><boxGeometry args={[6.8,1.25,1.35]}/><meshStandardMaterial color="#402b3b" metalness={.38}/></mesh>
   <mesh position={[0,1.3,-2.15]}><boxGeometry args={[6.95,.12,1.42]}/><meshStandardMaterial color="#c99b62" metalness={.65}/></mesh>
   {[-2.5,-1.25,0,1.25,2.5].map(x=><Stool key={x} position={[x,.02,-.95]}/>)}
   <mesh position={[0,2.4,-5.8]}><boxGeometry args={[5.8,1.5,.25]}/><meshStandardMaterial color="#211a2b"/></mesh>
   {[-2,-1,0,1,2].map(x=><mesh key={x} position={[x,2.45,-5.62]}><boxGeometry args={[.08,1.2,.05]}/><meshStandardMaterial color="#d7a96d" emissive="#8d542a" emissiveIntensity={.5}/></mesh>)}
   <BarDrinks roomType="bar"/>
  </group>
  <group position={[5.1,0,0]} scale={.72}>
   <Sofa position={[-3.7,0,-2.4]}/><Sofa position={[3.7,0,-2.4]}/>
   <Sofa position={[-3.7,0,2.2]} color="#263c49"/><Sofa position={[3.7,0,2.2]} color="#263c49"/>
   <CocktailTable position={[-3.7,0,-.7]}/><CocktailTable position={[3.7,0,-.7]}/>
  </group>
  <group position={[0,0,4.0]} scale={.55}>
   {[-4.1,0,4.1].map(x=><group key={x}><Sofa position={[x,0,-2.1]} color="#684b32" width={2.5}/><CocktailTable position={[x,0,-.45]}/><mesh position={[x,1.1,-3]}><boxGeometry args={[2.55,.12,.08]}/><meshStandardMaterial color="#e4c17d" emissive="#d4a85d" emissiveIntensity={.8}/></mesh></group>)}
  </group>
  <Plant position={[-8,0,-5.5]}/><Plant position={[8,0,-5.5]}/>
  <SpeakerStack position={[-7.5,0,-4.6]}/><SpeakerStack position={[7.5,0,-4.6]}/>
  <mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.5,1.58,64]}/><meshBasicMaterial color="#c45cff"/></mesh>
  <mesh position={[0,.018,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3,3.06,64]}/><meshBasicMaterial color="#38dfff"/></mesh>
 </group>
}

function LuxuryClubArchitecture() {
 const gold = '#c79b62'
 const dark = '#211a2b'
 const wall = '#30243b'
 return <group>
  {/* Architectural ceiling, layered cornices and acoustic beams */}
  <mesh position={[0,5.05,0]}><boxGeometry args={[18,.28,14]}/><meshStandardMaterial color="#100e1a" metalness={.35} roughness={.55}/></mesh>
  {[-6,-3,0,3,6].map(x=><group key={'ceiling-'+x} position={[x,4.82,0]}>
   <mesh><boxGeometry args={[.13,.2,13.6]}/><meshStandardMaterial color={gold} metalness={.8} roughness={.25}/></mesh>
   <mesh position={[0,-.13,0]}><boxGeometry args={[.32,.08,13.6]}/><meshStandardMaterial color="#6d3c91" emissive="#6d3c91" emissiveIntensity={.65}/></mesh>
  </group>)}
  {[-5.8,0,5.8].map(z=><mesh key={'crossbeam-'+z} position={[0,4.72,z]}><boxGeometry args={[17.7,.16,.16]}/><meshStandardMaterial color={gold} metalness={.75}/></mesh>)}
  {/* Tall fluted columns and brass bases */}
  {[-8.15,8.15].flatMap(x=>[-5.5,0,5.5].map(z=><group key={'column-'+x+'-'+z} position={[x,0,z]}>
   <mesh position={[0,2.25,0]}><cylinderGeometry args={[.3,.38,4.5,20]}/><meshStandardMaterial color={wall} metalness={.25} roughness={.48}/></mesh>
   {[-.18,-.06,.06,.18].map(dx=><mesh key={dx} position={[dx,2.25,.28]}><boxGeometry args={[.035,4.15,.035]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>)}
   <mesh position={[0,.16,0]}><cylinderGeometry args={[.48,.48,.24,24]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
   <mesh position={[0,4.48,0]}><cylinderGeometry args={[.48,.38,.2,24]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
  </group>))}
  {/* Wall treatment: inset panels, brass reveals and sconces */}
  {[-6,-3,0,3,6].map(x=><group key={'back-panel-'+x} position={[x,2.45,-6.48]}>
   <mesh><boxGeometry args={[2.55,3.7,.09]}/><meshStandardMaterial color={wall} metalness={.22} roughness={.6}/></mesh>
   <mesh position={[0,0,.07]}><boxGeometry args={[2.32,3.45,.035]}/><meshStandardMaterial color={dark} metalness={.2}/></mesh>
   <mesh position={[0,0,.1]}><boxGeometry args={[.035,3.25,.025]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
   <mesh position={[0,-1.58,.12]}><boxGeometry args={[2.1,.035,.025]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
   <pointLight position={[0,1.3,.55]} color="#b45cff" intensity={1.3} distance={4}/>
  </group>)}
  {/* Side-wall inset panels */}
  {[-4.5,-1.5,1.5,4.5].flatMap(z=>[-8.48,8.48].map(x=><group key={'side-panel-'+x+'-'+z} position={[x,2.4,z]}>
   <mesh><boxGeometry args={[.08,3.5,2.5]}/><meshStandardMaterial color={wall}/></mesh>
   <mesh position={[x<0?.06:-.06,0,0]}><boxGeometry args={[.035,3.2,2.2]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
   <pointLight position={[x<0?.35:-.35,.5,0]} color="#35dfff" intensity={.8} distance={3}/>
  </group>))}
  {/* Recessed ceiling light wells */}
  {[-6,-3,0,3,6].flatMap(x=>[-4,0,4].map(z=><group key={'well-'+x+'-'+z} position={[x,4.84,z]}>
   <mesh><boxGeometry args={[1.1,.035,1.1]}/><meshStandardMaterial color="#090812" metalness={.4}/></mesh>
   <mesh position={[0,-.035,0]}><boxGeometry args={[.72,.025,.72]}/><meshStandardMaterial color="#e3b979" emissive="#e3a94c" emissiveIntensity={1.5}/></mesh>
   <pointLight position={[0,-.18,0]} color="#ffcf91" intensity={1.1} distance={4}/>
  </group>))}
  {/* Floor inlays and perimeter lighting */}
  {Array.from({length:11},(_,i)=>-5+i).map(x=><mesh key={'floor-x-'+x} position={[x,.006,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.018,13.7]}/><meshBasicMaterial color="#59436b" transparent opacity={.65}/></mesh>)}
  {Array.from({length:9},(_,i)=>-4+i).map(z=><mesh key={'floor-z-'+z} position={[0,.007,z]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[17.7,.018]}/><meshBasicMaterial color="#59436b" transparent opacity={.65}/></mesh>)}
  {[-8.25,8.25].map(x=><mesh key={'edge-'+x} position={[x,.025,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.055,13.5]}/><meshBasicMaterial color="#42dfff"/></mesh>)}
  {/* Suspended crystal-style chandeliers */}
  {[-4.8,4.8].map(x=><group key={'chandelier-'+x} position={[x,4.35,-1]}>
   <mesh position={[0,-.25,0]}><cylinderGeometry args={[.08,.08,.5,12]}/><meshStandardMaterial color={gold} metalness={.9}/></mesh>
   <mesh position={[0,-.58,0]}><torusGeometry args={[.72,.045,8,32]}/><meshStandardMaterial color={gold} metalness={.85}/></mesh>
   {Array.from({length:8},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/4)*.58,-.78,Math.sin(i*Math.PI/4)*.58]}><octahedronGeometry args={[.13]}/><meshPhysicalMaterial color="#d9c9ff" roughness={.08} metalness={.15} transmission={.35}/></mesh>)}
   <pointLight position={[0,-.65,0]} color="#e4c8ff" intensity={3} distance={7}/>
  </group>)}
 </group>
}

function PremiumDJBooth() {
 return <group position={[0,0,-4.7]}>
  <mesh position={[0,.48,0]} castShadow><boxGeometry args={[4.8,.96,1.65]}/><meshStandardMaterial color="#17131f" metalness={.72} roughness={.25}/></mesh>
  <mesh position={[0,.99,0]}><boxGeometry args={[4.85,.09,1.7]}/><meshStandardMaterial color="#8d48bb" emissive="#8d48bb" emissiveIntensity={1.5} metalness={.55}/></mesh>
  {[-1.35,1.35].map(x=><group key={x} position={[x,1.12,.05]}>
   <cylinderGeometry args={[.32,.32,.08,32]}/>
   <mesh><cylinderGeometry args={[.32,.32,.08,32]}/><meshStandardMaterial color="#090910" metalness={.8}/></mesh>
   <mesh position={[0,.055,0]}><torusGeometry args={[.23,.018,8,32]}/><meshBasicMaterial color="#38dfff"/></mesh>
   <mesh position={[0,.06,0]}><cylinderGeometry args={[.055,.055,.025,16]}/><meshStandardMaterial color="#b8a2cf" metalness={.8}/></mesh>
  </group>)}
  <mesh position={[0,1.18,-.43]}><boxGeometry args={[.9,.28,.06]}/><meshStandardMaterial color="#080811" emissive="#a94cff" emissiveIntensity={1.4}/></mesh>
  {[-2.1,2.1].map(x=><group key={'dj-speaker-'+x} position={[x,.9,-.1]}>
   <mesh><boxGeometry args={[.42,1.15,.48]}/><meshStandardMaterial color="#090910" metalness={.5}/></mesh>
   <mesh position={[0,.18,.25]}><cylinderGeometry args={[.14,.14,.035,24]}/><meshStandardMaterial color="#282333"/></mesh>
   <mesh position={[0,.18,.28]}><torusGeometry args={[.1,.018,8,24]}/><meshBasicMaterial color="#c45cff"/></mesh>
  </group>)}
 </group>
}


function FollowCamera({position,mode}:{position:Position;mode:'first'|'third'}) {
 useFrame(({camera})=>{
  if(mode==='first'){camera.position.set(position.x,1.63,position.z+.02);camera.lookAt(position.x,1.58,position.z-8)}
  else{camera.position.set(position.x,3.15,position.z+5.6);camera.lookAt(position.x,1.15,position.z-1.6)}
 })
 return null
}

function Venue({ position, remotes, avatar, high, roomType, view }: { position:Position; remotes:Remote[]; avatar:Avatar; high:boolean; roomType:string; view:'first'|'third' }) {
 return <>
  <color attach="background" args={['#080711']}/>
  <fog attach="fog" args={['#080711',14,28]}/>
  <ambientLight intensity={.55}/>
  <hemisphereLight args={['#aaa4ff','#161020',.7]}/>
  <spotLight position={[0,9,-5]} angle={.8} penumbra={.8} intensity={high?65:30} color="#c05aff" castShadow={high}/>
  <pointLight position={[-5,3,1]} intensity={high?16:7} color="#42dfff"/>
  <pointLight position={[5,3,1]} intensity={high?16:7} color="#c7ff38"/>
  <MovingClubLights/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.04,0]} receiveShadow><planeGeometry args={[18,14]}/><meshStandardMaterial color="#171426" metalness={.62} roughness={.24}/></mesh>
  {/* Glossy club floor: individual dark stone tiles with fine brass seams. */}
  {Array.from({length:12},(_,ix)=>Array.from({length:9},(_,iz)=><mesh key={'floor-tile-'+ix+'-'+iz} position={[-8.25+ix*1.5,-.022,-5.6+iz*1.4]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[1.44,1.34]}/><meshStandardMaterial color={(ix+iz)%2===0?'#211c31':'#292238'} metalness={.58} roughness={.22}/></mesh>))}
  {Array.from({length:12},(_,ix)=>Array.from({length:9},(_,iz)=><mesh key={'floor-glint-'+ix+'-'+iz} position={[-8.25+ix*1.5,-.019,-5.6+iz*1.4]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.025,1.32]}/><meshBasicMaterial color="#8d6b9f" transparent opacity={.3}/></mesh>))}
  <LuxuryClubArchitecture/>\n  <RoomFurnishings roomType={roomType}/>
  <mesh position={[0,2.6,-6.7]}><boxGeometry args={[18,5.2,.35]}/><meshStandardMaterial color="#171321"/></mesh>
  <mesh position={[0,4.15,-6.48]}><boxGeometry args={[5.5,.12,.1]}/><meshStandardMaterial color="#d45cff" emissive="#a72cff" emissiveIntensity={2.5}/></mesh>
  <PremiumDJBooth/>
  <mesh position={[-8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[0,2.5,7.05]}><boxGeometry args={[18,5,.3]}/><meshStandardMaterial color="#171321"/></mesh>
  <mesh position={[0,2.5,7.05]}><boxGeometry args={[18,5,.3]}/><meshStandardMaterial color="#171321"/></mesh>




  {(roomType === 'bar' || roomType === 'lounge' || roomType === 'vip_lounge') && <BarDrinks roomType={roomType}/>}

  {high && <Sparkles count={65} scale={[15,4,12]} size={2} speed={.25} color="#d7a5ff"/>}
  <Dancer position={position} avatar={avatar} me hidden={view==='first'}/>
  <Dancer position={{x:-5.9,z:-2.05,dance:'sway'}} avatar={{...defaults,skin:'deep',hair:'fade',outfit:'classic',dance:'sway'}}/>
  {[
   {x:-5.9,z:-.2,dance:'sway' as Dance,skin:'deep' as Avatar['skin'],outfit:'street' as Avatar['outfit']},
   {x:5.8,z:.5,dance:'hype' as Dance,skin:'tan' as Avatar['skin'],outfit:'vip' as Avatar['outfit']},
   {x:-3.8,z:3.1,dance:'bounce' as Dance,skin:'light' as Avatar['skin'],outfit:'classic' as Avatar['outfit']},
   {x:3.9,z:3.3,dance:'groove' as Dance,skin:'warm' as Avatar['skin'],outfit:'neon' as Avatar['outfit']},
  ].map((guest,i)=><Dancer key={'club-guest-'+i} position={{x:guest.x,z:guest.z,dance:guest.dance}} avatar={{...defaults,skin:guest.skin,outfit:guest.outfit,dance:guest.dance}}/>)}
  {remotes.map(m=><Dancer key={m.id} position={m.position} avatar={m.avatar}/>)}
  <FollowCamera position={position} mode={view}/>
 </>
}

export default function Room3DEngine({clubId,userId,displayName,initialConfig}:{roomId:string;clubId:string;userId:string;displayName:string;initialConfig:Json|null;roomType:string}) {
 const [avatar,setAvatar]=useState<Avatar>(()=>({...defaults,...(initialConfig && typeof initialConfig==='object' && !Array.isArray(initialConfig)?initialConfig:{})}) as Avatar)
 const [position,setPosition]=useState<Position>(()=>{try{const saved=sessionStorage.getItem('nightlife-world:'+clubId);if(saved){const p=JSON.parse(saved);return {x:clamp(Number(p.x)||0,-7,7),z:clamp(Number(p.z)||2.2,-5,5),dance:defaults.dance}}}catch{}return {x:0,z:2.2,dance:defaults.dance}})
 const [introOpen,setIntroOpen]=useState(true)
 const [remotes,setRemotes]=useState<Remote[]>([])
 const [quality,setQuality]=useState<'low'|'high'>('high')
 const [view,setView]=useState<'first'|'third'>('third')
 const [controls,setControls]=useState<Record<string,string>>(()=>{try{return JSON.parse(sessionStorage.getItem('nightlife-controls:'+userId)||'null')||{forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'}}catch{return {forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'}}})
 const [editingControls,setEditingControls]=useState(false)
 const [listeningFor,setListeningFor]=useState<string|null>(null)
 const [bartenderOpen,setBartenderOpen]=useState(false)
 const [selectedDrink,setSelectedDrink]=useState('Tropical mocktail')
 const [drinkChosen,setDrinkChosen]=useState(false)
 const [pairOpen,setPairOpen]=useState(false)
 const [incomingPair,setIncomingPair]=useState<string|null>(null)
 const [pairedWith,setPairedWith]=useState<string|null>(null)
 const touchInterval=useRef<ReturnType<typeof setInterval>|null>(null)
 const [editing,setEditing]=useState(false)
 const [saving,setSaving]=useState(false)
 const [status,setStatus]=useState('Connecting…')
 const channelRef=useRef<RealtimeChannel|null>(null)
 const lastSent=useRef(0)
 const publish=useCallback((p:Position,a:Avatar)=>{
  const now=Date.now()
  if(channelRef.current && now-lastSent.current>=80){lastSent.current=now;void channelRef.current.track({x:p.x,z:p.z,dance:p.dance,seated:!!p.seated,skin:a.skin,hair:a.hair,outfit:a.outfit})}
 },[])
 useEffect(()=>{publish(position,avatar)},[position,avatar,publish])
 useEffect(()=>{try{sessionStorage.setItem('nightlife-world:'+clubId,JSON.stringify({x:position.x,z:position.z}))}catch{}},[clubId,position.x,position.z])
 const move=useCallback((dx:number,dz:number)=>{
  setPosition(current=>{
   const x=clamp(current.x+dx,-7,7)
   const z=clamp(current.z+dz,-5,5)
   const blockedStage=Math.abs(x)<2.5 && z < -3.7
   const blockedLeftLounge=Math.abs(x+5.2)<1.5 && z>-2.8 && z<-.8
   const blockedRightLounge=Math.abs(x-5.2)<1.5 && z>-2.8 && z<-.8
   return blockedStage||blockedLeftLounge||blockedRightLounge?current:{x,z,dance:current.dance,seated:false}
  })
 },[])
 useEffect(()=>{
  const supabase=createClient()
  const channel=supabase.channel('club-world:'+clubId,{config:{private:true,presence:{key:userId}}})
  channelRef.current=channel
  const sync=()=>{
   const state=channel.presenceState() as Record<string,Array<Record<string,unknown>>>
   const list:Remote[]=[]
   for(const [id,metas] of Object.entries(state)){
    if(id===userId||!metas?.length)continue
    const meta=metas[metas.length-1]
    const dance=['groove','bounce','sway','hype'].includes(String(meta.dance))?meta.dance as Dance:'groove'
    const skinTone=['warm','deep','light','tan'].includes(String(meta.skin))?meta.skin as Avatar['skin']:'warm'
    const hair=['curly','fade','braids','short'].includes(String(meta.hair))?meta.hair as Avatar['hair']:'curly'
    const outfit=['neon','street','vip','classic'].includes(String(meta.outfit))?meta.outfit as Avatar['outfit']:'neon'
    list.push({id,position:{x:typeof meta.x==='number'?clamp(meta.x,-7,7):0,z:typeof meta.z==='number'?clamp(meta.z,-5,5):0,dance,seated:meta.seated===true},avatar:{skin:skinTone,hair,outfit,dance}})
   }
   setRemotes(list)
  }
  channel.on('presence',{event:'sync'},sync)
  channel.on('broadcast',{event:'pair-invite'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string')setIncomingPair(payload.from)})
  channel.on('broadcast',{event:'pair-accepted'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string')setPairedWith(payload.from)})
  channel.on('broadcast',{event:'pair-declined'},({payload})=>{if(payload?.to===userId)setStatus('Pair invitation declined')})
  channel.on('broadcast',{event:'pair-ended'},({payload})=>{if(payload?.to===userId)setPairedWith(null)})
  channel.subscribe(state=>{
   if(state==='SUBSCRIBED'){setStatus('Multiplayer connected');void channel.track({x:position.x,z:position.z,dance:position.dance,skin:avatar.skin,hair:avatar.hair,outfit:avatar.outfit})}
   else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')setStatus('Reconnecting…')
   else if(state==='CLOSED')setStatus('Disconnected')
  })
  return ()=>{channelRef.current=null;void supabase.removeChannel(channel)}
  // Connect once per authenticated room identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[clubId,userId])
 useEffect(()=>{try{sessionStorage.setItem('nightlife-controls:'+userId,JSON.stringify(controls))}catch{}},[controls,userId])
 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if(['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement|null)?.tagName??''))return
   if(listeningFor){e.preventDefault();setControls(c=>({...c,[listeningFor]:e.key}));setListeningFor(null);return}
   const key=e.key.toLowerCase()
   if(key===String(controls.forward).toLowerCase()||e.key==='ArrowUp'){e.preventDefault();move(0,-.35)}
   else if(key===String(controls.backward).toLowerCase()||e.key==='ArrowDown'){e.preventDefault();move(0,.35)}
   else if(key===String(controls.left).toLowerCase()||e.key==='ArrowLeft'){e.preventDefault();move(-.35,0)}
   else if(key===String(controls.right).toLowerCase()||e.key==='ArrowRight'){e.preventDefault();move(.35,0)}
   else if(key===String(controls.sit).toLowerCase()){e.preventDefault();setPosition(p=>p.seated?{...p,seated:false}:{...p,x:6.8,z:-1.7,seated:true})}
   else if(key===String(controls.interact).toLowerCase()){e.preventDefault();setBartenderOpen(v=>!v)}
  }
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)
 },[move,controls,listeningFor])
 async function save(){
  setSaving(true);const supabase=createClient()
  const {error}=await supabase.from('profiles').update({avatar_config:avatar as unknown as Json,updated_at:new Date().toISOString()}).eq('id',userId)
  setSaving(false);setStatus(error?'Avatar save failed':'Avatar saved')
 }
 function dance(d:Dance){setPosition(current=>({...current,dance:d}));setAvatar(a=>({...a,dance:d}))}
 return <section className="mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[#090a12]">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-lime-300">Immersive 3D club</p><h2 className="mt-1 text-xl font-black">The block party</h2><p className="mt-1 text-xs text-zinc-500">{status} · {remotes.length+1} avatars</p></div>
   <div className="flex items-center gap-3"><label className="text-xs text-zinc-400">Camera <select value={view} onChange={e=>setView(e.target.value as "first"|"third")} className="ml-2 rounded-lg border border-white/10 bg-[#151421] px-2 py-2 text-white"><option value="first">First person</option><option value="third">Third person</option></select></label><label className="text-xs text-zinc-400">Graphics <select value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')} className="ml-2 rounded-lg border border-white/10 bg-[#151421] px-2 py-2 text-white"><option value="low">Low data</option><option value="high">High quality</option></select></label></div>
  </header>
  <div className="relative h-[420px] touch-none sm:h-[540px]">
   <Canvas shadows={quality==='high'} dpr={quality==='high'?[1,1.5]:1} camera={{position:[0,3.15,7.8],fov:view==='first'?78:58}} gl={{antialias:quality==='high',powerPreference:'high-performance'}}>
    <Venue position={position} remotes={remotes} avatar={avatar} high={quality==='high'} roomType="club" view={view}/>
   </Canvas>
   <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/65 px-3 py-2 text-[11px] text-zinc-200">Keyboard or touch controls · {position.seated?'Seated':'Standing'} · camera follows your character</div>
   {introOpen&&<div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080711]/75 p-5 backdrop-blur-sm"><div className="max-w-lg rounded-3xl border border-lime-200/20 bg-[#11101d]/95 p-7 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.3em] text-lime-300">Nightlife KE presents</p><h2 className="mt-3 text-3xl font-black">The night is yours.</h2><p className="mt-4 text-sm leading-7 text-zinc-300">When the city lights come on, the doors of this club open. The DJ sets the rhythm, the bar is ready, and familiar faces meet new ones. Walk from the dancefloor to the bar, settle into the lounge or find the VIP corner. This is one club, one shared night — the people make the memories.</p><p className="mt-4 text-xs text-zinc-500">Your character and the other guests move through the same persistent venue.</p><button onClick={()=>setIntroOpen(false)} className="mt-6 w-full rounded-xl bg-lime-300 px-5 py-3 font-black text-black">Enter the club</button></div></div>}
   <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5 sm:hidden">
    <span/><button aria-label="Move forward" onPointerDown={e=>{e.preventDefault();move(0,-.55);touchInterval.current=window.setInterval(()=>move(0,-.32),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">↑</button><span/>
    <button aria-label="Move left" onPointerDown={e=>{e.preventDefault();move(-.55,0);touchInterval.current=window.setInterval(()=>move(-.32,0),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">←</button>
    <button aria-label="Move backward" onPointerDown={e=>{e.preventDefault();move(0,.55);touchInterval.current=window.setInterval(()=>move(0,.32),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">↓</button>
    <button aria-label="Move right" onPointerDown={e=>{e.preventDefault();move(.55,0);touchInterval.current=window.setInterval(()=>move(.32,0),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">→</button>
   </div>
  </div>
  <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-3"><button onClick={()=>setBartenderOpen(v=>!v)} className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200">Talk to bartender</button><button onClick={()=>setPosition(p=>p.seated?{...p,seated:false}:{...p,x:6.8,z:-1.7,seated:true})} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">{position.seated?'Stand up':'Sit / stand'}</button><button onClick={()=>setPairOpen(v=>!v)} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs font-bold text-fuchsia-200">Pair / couple</button><button onClick={()=>setEditingControls(v=>!v)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Customize controls</button></div>
  {bartenderOpen&&<div className="mx-5 mb-4 rounded-2xl border border-amber-300/20 bg-[#171321] p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-200">Bartender · Welcome</p><p className="mt-2 text-sm text-white">Hey there! Would you like something to drink, or are you just looking around?</p><div className="mt-3 flex flex-wrap gap-2">{['Tropical mocktail','Virtual cocktail','Soda','Water'].map(drink=><button key={drink} onClick={()=>{setSelectedDrink(drink);setDrinkChosen(false)}} className={`rounded-lg border px-3 py-2 text-xs ${selectedDrink===drink?'border-amber-300 bg-amber-300/15 text-amber-100':'border-white/10 text-zinc-300'}`}>{drink}</button>)}<button onClick={()=>setDrinkChosen(true)} className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-black text-black">That sounds good</button><button onClick={()=>setBartenderOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Maybe later</button></div>{drinkChosen&&<p className="mt-3 text-xs text-emerald-300">You selected {selectedDrink}. This is a virtual in-room interaction; no wallet charge has been made.</p>}</div>}
  {pairOpen&&<div className="mx-5 mb-4 rounded-2xl border border-fuchsia-300/20 bg-[#171321] p-4"><p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">Pair up · mutual consent</p><p className="mt-2 text-sm text-zinc-300">Invite someone to dance or spend time together. Pairing is open to everyone — no gender selection or assumptions.</p>{pairedWith&&<p className="mt-2 text-xs text-emerald-300">Paired with guest {pairedWith.slice(0,6)} · <button className="underline" onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-ended',payload:{to:pairedWith,from:userId}});setPairedWith(null)}}>End pairing</button></p>}<div className="mt-3 flex flex-wrap gap-2">{remotes.map(guest=><button key={guest.id} onClick={()=>void channelRef.current?.send({type:'broadcast',event:'pair-invite',payload:{to:guest.id,from:userId}})} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Invite guest {guest.id.slice(0,6)}</button>)}{remotes.length===0&&<span className="text-xs text-zinc-500">No other guests are connected right now.</span>}</div>{incomingPair&&<div className="mt-3 rounded-xl bg-black/30 p-3"><p className="text-sm text-white">Guest {incomingPair.slice(0,6)} invited you to pair.</p><div className="mt-2 flex gap-2"><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-accepted',payload:{to:incomingPair,from:userId}});setPairedWith(incomingPair);setIncomingPair(null)}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Accept</button><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-declined',payload:{to:incomingPair,from:userId}});setIncomingPair(null)}} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Decline</button></div></div>}</div>}
  {editingControls&&<div className="mx-5 mb-4 rounded-2xl border border-white/10 bg-[#11101d] p-4"><p className="text-xs font-black uppercase tracking-widest text-lime-200">Choose your keys</p><p className="mt-1 text-xs text-zinc-400">Select an action, then press the key you want to assign. Arrow keys also remain available for movement.</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries({forward:'Move forward',backward:'Move backward',left:'Move left',right:'Move right',sit:'Sit / stand',interact:'Talk to bartender'}).map(([action,label])=><button key={action} onClick={()=>setListeningFor(action)} className={`rounded-lg border px-3 py-2 text-xs ${listeningFor===action?'border-lime-300 bg-lime-300/10 text-lime-100':'border-white/10 text-zinc-200'}`}>{listeningFor===action?'Press a key…':`${label}: ${controls[action]}`}</button>)}</div><button onClick={()=>{setControls({forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'});setListeningFor(null)}} className="mt-3 text-xs text-zinc-400 underline">Reset controls</button></div>}
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
   <div><p className="font-bold">{displayName||'Your avatar'}</p><p className="text-xs text-zinc-500">Fixed club environment · {remotes.length+1} people connected · {position.seated?'Seated':'Standing'}</p></div>
   <div className="flex flex-wrap gap-2"><span className="self-center text-[10px] uppercase tracking-wider text-zinc-500">Move to</span>{[{label:'Dancefloor',x:0,z:2.2},{label:'Bar',x:-5,z:-1},{label:'Lounge',x:5,z:1},{label:'VIP',x:0,z:4.5},{label:'DJ stage',x:0,z:-4}].map(zone=><button key={zone.label} onClick={()=>setPosition(p=>({...p,x:zone.x,z:zone.z}))} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200">{zone.label}</button>)}{(['groove','bounce','sway','hype'] as Dance[]).map(d=><button key={d} onClick={()=>dance(d)} className="rounded-lg border border-white/10 px-3 py-2 text-xs capitalize text-zinc-200">{d}</button>)}<button onClick={()=>setEditing(v=>!v)} className="rounded-lg border border-lime-300/30 px-3 py-2 text-xs font-bold text-lime-200">Customize</button></div>
  </footer>
  {editing&&<div className="grid gap-4 p-5 sm:grid-cols-2">{(Object.keys(choices) as (keyof Avatar)[]).map(key=><label key={key} className="text-xs font-bold capitalize text-zinc-400">{key}<select value={avatar[key]} onChange={e=>setAvatar(a=>({...a,[key]:e.target.value} as Avatar))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#12141e] px-4 py-3 text-sm text-white">{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}<div className="sm:col-span-2"><button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50">{saving?'Saving…':'Save character'}</button></div></div>}
 </section>
}
