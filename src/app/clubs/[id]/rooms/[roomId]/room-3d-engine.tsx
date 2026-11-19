'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Clone, OrbitControls, Sparkles, useAnimations, useGLTF } from '@react-three/drei'
import type { Group } from 'three'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import DJMixer, { DEFAULT_DJ_MIX, type DJMix } from './dj-mixer'
import BartenderStation from './bartender-station'

type Dance = 'groove' | 'bounce' | 'sway' | 'hype'
type Avatar = { person:'sophia'|'daniel'|'priya'|'carlos'; skin: 'warm'|'deep'|'light'|'tan'; hair: 'curly'|'fade'|'braids'|'short'; outfit: 'neon'|'street'|'vip'|'classic'; dance: Dance }
type Position = { x:number; z:number; dance:Dance; seated?:boolean }
type Remote = { id:string; position:Position; avatar:Avatar }
const defaults: Avatar = { person:'daniel', skin:'warm', hair:'curly', outfit:'neon', dance:'groove' }
const choices = {
 dance:[['groove','Groove'],['bounce','Bounce'],['sway','Sway'],['hype','Hype']],
 person:[['sophia','Sophia'],['daniel','Daniel'],['priya','Priya'],['carlos','Carlos']],
} as const
const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n))

function HumanModel({person,dance,seated}:{person:Avatar['person'];dance:Dance;seated:boolean}) {
 const group=useRef<Group>(null)
 const models:Record<Avatar['person'],string>={
  sophia:'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/sophia_formal.glb',
  daniel:'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/daniel_formal.glb',
  priya:'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/priya_casual.glb',
  carlos:'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@main/models/carlos_casual.glb',
 }
 const {scene,animations}=useGLTF(models[person])
 const wanted = seated ? ['idle','stand'] : dance==='hype' ? ['dance','cheer','clap','idle'] : dance==='bounce' ? ['dance','bounce','clap','idle'] : dance==='groove' ? ['dance','groove','idle','clap'] : ['dance','sway','idle']
 const clipName = animations.find(a=>wanted.some(word=>a.name.toLowerCase().includes(word)))?.name ?? animations[0]?.name
 const {actions}=useAnimations(animations,group)
 useEffect(()=>{
  const action=(clipName ? actions[clipName] : undefined) ?? Object.values(actions).find(a=>!!a)
  if(!action)return
  action.reset().fadeIn(.35).setLoop(2201,Infinity).play()
  return()=>{action.fadeOut(.25)}
 },[actions,clipName])
 return <group ref={group}><Clone object={scene}/></group>
}

function Dancer({ position, avatar, me=false, hidden=false, wander=false }: { position:Position; avatar:Avatar; me?:boolean; hidden?:boolean; wander?:boolean }) {
 const ref = useRef<Group>(null)
 const motion = useRef<Group>(null)
 useFrame(({clock}) => {
  if (!ref.current) return
  const t=clock.getElapsedTime()
  if(position.seated){ref.current.position.y=-.18;ref.current.rotation.x=-.06;if(motion.current){motion.current.rotation.set(0,0,0);motion.current.position.y=0}return}
  const driftX=wander?Math.sin(t*.32+position.x*1.7)*.62:0
  const driftZ=wander?Math.cos(t*.27+position.z*1.3)*.42:0
  const beat=t*(position.dance==='hype'?5.8:position.dance==='bounce'?4.4:position.dance==='sway'?2.2:3.1)+position.x*1.7
  ref.current.position.x=position.x+driftX
  ref.current.position.z=position.z+driftZ
  const bounce=position.dance==='hype'?.28:position.dance==='bounce'?.23:position.dance==='sway'?.075:.12
  ref.current.position.y=Math.abs(Math.sin(beat))*bounce
  ref.current.rotation.y=wander?Math.atan2(Math.cos(t*.32+position.x*1.7)*.62,Math.sin(t*.27+position.z*1.3)*.42):Math.sin(t*.9+position.x)*.24
  ref.current.rotation.z=Math.sin(t*1.8+position.z)*(position.dance==='sway'?.2:.085)
  if(motion.current){
   motion.current.rotation.x=Math.sin(beat*.5)*.18
   motion.current.rotation.y=Math.sin(beat*.7)*.22
   motion.current.rotation.z=Math.sin(beat)*(position.dance==='hype'?.3:position.dance==='sway'?.24:.17)
   motion.current.position.y=Math.abs(Math.sin(beat*.5))*.09
  }
 })
 if(hidden)return null
 const person=['sophia','daniel','priya','carlos'].includes(avatar.person)?avatar.person:'daniel'
 return <group ref={ref} position={[position.x,0,position.z]}>
  <group ref={motion}>
   <Suspense fallback={null}>
    <group rotation={[0,Math.PI,0]}><HumanModel person={person} dance={position.dance} seated={!!position.seated}/></group>
   </Suspense>
  </group>
  {me&&<mesh position={[0,2.05,0]}><sphereGeometry args={[.045,8,8]}/><meshBasicMaterial color="#c7ff38"/></mesh>}
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
  </group>)}
  {/* Side-wall inset panels */}
  {[-4.5,-1.5,1.5,4.5].flatMap(z=>[-8.48,8.48].map(x=><group key={'side-panel-'+x+'-'+z} position={[x,2.4,z]}>
   <mesh><boxGeometry args={[.08,3.5,2.5]}/><meshStandardMaterial color={wall}/></mesh>
   <mesh position={[x<0?.06:-.06,0,0]}><boxGeometry args={[.035,3.2,2.2]}/><meshStandardMaterial color={gold} metalness={.8}/></mesh>
  </group>))}
  {/* Recessed ceiling light wells */}
  {[-6,-3,0,3,6].flatMap(x=>[-4,0,4].map(z=><group key={'well-'+x+'-'+z} position={[x,4.84,z]}>
   <mesh><boxGeometry args={[1.1,.035,1.1]}/><meshStandardMaterial color="#090812" metalness={.4}/></mesh>
   <mesh position={[0,-.035,0]}><boxGeometry args={[.72,.025,.72]}/><meshStandardMaterial color="#e3b979" emissive="#e3a94c" emissiveIntensity={1.5}/></mesh>
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

// Keep the freely orbiting third-person camera inside the club perimeter.
function BoundedOrbitControls({position}:{position:Position}) {
 const controls=useRef<any>(null)
 useFrame(({camera})=>{
  const orbit=controls.current
  if(!orbit)return
  const target=orbit.target
  target.x=clamp(target.x,-7.65,7.65)
  target.y=clamp(target.y,.65,3.9)
  target.z=clamp(target.z,-5.85,5.95)
  camera.position.x=clamp(camera.position.x,-8.15,8.15)
  camera.position.y=clamp(camera.position.y,.45,4.72)
  camera.position.z=clamp(camera.position.z,-6.28,6.48)
  orbit.update()
 })
 return <OrbitControls ref={controls} makeDefault enabled enableRotate enablePan enableZoom target={[position.x,1,position.z]} minDistance={3.2} maxDistance={13.5} minPolarAngle={0.18} maxPolarAngle={Math.PI/2.02} enableDamping dampingFactor={.09} rotateSpeed={.72}/>
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
  <LuxuryClubArchitecture/>\n  <RoomFurnishings roomType={roomType}/>
  <mesh position={[0,2.6,-6.7]}><boxGeometry args={[18,5.2,.35]}/><meshStandardMaterial color="#171321"/></mesh>
  <mesh position={[0,4.15,-6.48]}><boxGeometry args={[5.5,.12,.1]}/><meshStandardMaterial color="#d45cff" emissive="#a72cff" emissiveIntensity={2.5}/></mesh>
  <PremiumDJBooth/>
  <mesh position={[-8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[8.7,2.5,0]}><boxGeometry args={[.3,5,14]}/><meshStandardMaterial color="#1a1627"/></mesh>
  <mesh position={[0,2.5,7.05]}><boxGeometry args={[18,5,.3]}/><meshStandardMaterial color="#171321"/></mesh>
  {/* Invisible inner safety perimeter for the club camera enclosure. */}
  <group name="club-camera-collider">
   <mesh position={[-8.18,2.5,0]}><boxGeometry args={[.12,5,13.2]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
   <mesh position={[8.18,2.5,0]}><boxGeometry args={[.12,5,13.2]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
   <mesh position={[0,2.5,-6.32]}><boxGeometry args={[16.3,5,.12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
   <mesh position={[0,2.5,6.52]}><boxGeometry args={[16.3,5,.12]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  </group>




  {(roomType === 'bar' || roomType === 'lounge' || roomType === 'vip_lounge') && <BarDrinks roomType={roomType}/>}

  {high && <Sparkles count={20} scale={[15,4,12]} size={1.5} speed={.18} color="#d7a5ff"/>}
  <Dancer position={position} avatar={avatar} me hidden={view==='first'}/>
  <Dancer position={{x:-5.9,z:-2.05,dance:'sway'}} avatar={{...defaults,person:'sophia',dance:'sway'}} wander/>
  <Dancer position={{x:-5.1,z:-2.85,dance:'sway'}} avatar={{...defaults,person:'daniel',dance:'sway'}} />
  {[
   {x:-5.9,z:-.2,dance:'sway' as Dance,person:'priya' as Avatar['person']},
   {x:5.8,z:.5,dance:'hype' as Dance,person:'carlos' as Avatar['person']},
   {x:-3.8,z:3.1,dance:'bounce' as Dance,person:'sophia' as Avatar['person']},
   {x:3.9,z:3.3,dance:'groove' as Dance,person:'daniel' as Avatar['person']},
  ].map((guest,i)=><Dancer key={'club-guest-'+i} position={{x:guest.x,z:guest.z,dance:guest.dance}} avatar={{...defaults,person:guest.person,dance:guest.dance}} wander/>)}
  {remotes.map(m=><Dancer key={m.id} position={m.position} avatar={m.avatar}/>)}
  {view==='first' && <FollowCamera position={position} mode="first"/>}
  {view==='third' && <BoundedOrbitControls position={position}/>}
 </>
}

export default function Room3DEngine({roomId,clubId,userId,displayName,initialConfig}:{roomId:string;clubId:string;userId:string;displayName:string;initialConfig:Json|null;roomType:string}) {
 const [avatar,setAvatar]=useState<Avatar>(()=>({...defaults,...(initialConfig && typeof initialConfig==='object' && !Array.isArray(initialConfig)?initialConfig:{})}) as Avatar)
 const [position,setPosition]=useState<Position>(()=>{try{const saved=sessionStorage.getItem('nightlife-world:'+clubId);if(saved){const p=JSON.parse(saved);return {x:clamp(Number(p.x)||0,-7,7),z:clamp(Number(p.z)||2.2,-5,5),dance:defaults.dance}}}catch{}return {x:0,z:2.2,dance:defaults.dance}})
 const [introOpen,setIntroOpen]=useState(true)
 const [remotes,setRemotes]=useState<Remote[]>([])
 const [quality,setQuality]=useState<'low'|'high'>('low')
 const [view,setView]=useState<'first'|'third'>('third')
 const [controls,setControls]=useState<Record<string,string>>(()=>{try{return JSON.parse(sessionStorage.getItem('nightlife-controls:'+userId)||'null')||{forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'}}catch{return {forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'}}})
 const [editingControls,setEditingControls]=useState(false)
 const [listeningFor,setListeningFor]=useState<string|null>(null)
 const [bartenderOpen,setBartenderOpen]=useState(false)
 const [selectedDrink,setSelectedDrink]=useState('Tropical mocktail')
 const [drinkChosen,setDrinkChosen]=useState(false)
 const [djMix,setDjMix]=useState<DJMix>(DEFAULT_DJ_MIX)
 const [djOwner,setDjOwner]=useState<string|null>(null)
 const [djName,setDjName]=useState<string|null>(null)
 const [health,setHealth]=useState(100)
 const [blocking,setBlocking]=useState(false)
 const [combatTarget,setCombatTarget]=useState('')
 const [combatNotice,setCombatNotice]=useState('Fighting is off until both players accept a challenge in the arena.')
 const [duelWith,setDuelWith]=useState<string|null>(null)
 const [incomingChallenge,setIncomingChallenge]=useState<string|null>(null)
 const [roomEmote,setRoomEmote]=useState<{emoji:string;from:string}|null>(null)
 const [hitFlash,setHitFlash]=useState(false)
 const blockingRef=useRef(false)
 const lastAttackAt=useRef(0)
 useEffect(()=>{blockingRef.current=blocking},[blocking])
 const speakBartender=useCallback((message:string)=>{
  if(typeof window==='undefined'||!('speechSynthesis' in window))return
  window.speechSynthesis.cancel()
  const utterance=new SpeechSynthesisUtterance(message)
  utterance.lang='en-KE';utterance.rate=.94;utterance.pitch=1.02;utterance.volume=1
  window.speechSynthesis.speak(utterance)
 },[])
 const [pairOpen,setPairOpen]=useState(false)
 const [incomingPair,setIncomingPair]=useState<string|null>(null)
 const [pairedWith,setPairedWith]=useState<string|null>(null)
 const touchInterval=useRef<number|null>(null)
 const [editing,setEditing]=useState(false)
 const [saving,setSaving]=useState(false)
 const [status,setStatus]=useState('Connecting…')
 const channelRef=useRef<RealtimeChannel|null>(null)
 const lastSent=useRef(0)
 const remotesRef=useRef<Remote[]>([])
 const positionRef=useRef(position)
 useEffect(()=>{remotesRef.current=remotes},[remotes])
 useEffect(()=>{positionRef.current=position},[position])
 const publish=useCallback((p:Position,a:Avatar)=>{
  const now=Date.now()
  if(channelRef.current && now-lastSent.current>=80){lastSent.current=now;void channelRef.current.track({x:p.x,z:p.z,dance:p.dance,seated:!!p.seated,skin:a.skin,hair:a.hair,outfit:a.outfit,person:a.person})}
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
    const person=['sophia','daniel','priya','carlos'].includes(String(meta.person))?meta.person as Avatar['person']:'daniel'
    const hair=['curly','fade','braids','short'].includes(String(meta.hair))?meta.hair as Avatar['hair']:'curly'
    const outfit=['neon','street','vip','classic'].includes(String(meta.outfit))?meta.outfit as Avatar['outfit']:'neon'
    list.push({id,position:{x:typeof meta.x==='number'?clamp(meta.x,-7,7):0,z:typeof meta.z==='number'?clamp(meta.z,-5,5):0,dance,seated:meta.seated===true},avatar:{person,skin:skinTone,hair,outfit,dance}})
   }
   setRemotes(list)
  }
  channel.on('presence',{event:'sync'},sync)
  channel.on('broadcast',{event:'dj-claim'},({payload})=>{if(typeof payload?.userId==='string'&&payload.userId!==userId){setDjOwner(payload.userId);setDjName(typeof payload.name==='string'?payload.name:'Guest DJ')}})
  channel.on('broadcast',{event:'dj-release'},({payload})=>{if(payload?.userId===djOwner){setDjOwner(null);setDjName(null)}})
  channel.on('broadcast',{event:'dj-mix'},({payload})=>{if(payload?.mix&&typeof payload.mix==='object'){setDjMix({...DEFAULT_DJ_MIX,...payload.mix} as DJMix);if(typeof payload.djOwner==='string')setDjOwner(payload.djOwner);if(typeof payload.djName==='string')setDjName(payload.djName)}})
  channel.on('broadcast',{event:'sparring-challenge'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string'&&Math.hypot(positionRef.current.x,positionRef.current.z)<=3.4)setIncomingChallenge(payload.from)})
  channel.on('broadcast',{event:'sparring-accepted'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string'){setDuelWith(payload.from);setCombatTarget(payload.from);setCombatNotice('Challenge accepted. Sparring is active — either player can end it.')}})
  channel.on('broadcast',{event:'sparring-declined'},({payload})=>{if(payload?.to===userId)setCombatNotice('Your challenge was declined. No fight started.')})
  channel.on('broadcast',{event:'sparring-ended'},({payload})=>{if(payload?.to===userId){setDuelWith(null);setCombatNotice('Sparring ended. You are safe.')}})
  channel.on('broadcast',{event:'room-emote'},({payload})=>{if(payload?.from!==userId&&typeof payload?.emoji==='string'){setRoomEmote({emoji:payload.emoji,from:String(payload.name||'Guest')});window.setTimeout(()=>setRoomEmote(null),2200)}})
  channel.on('broadcast',{event:'combat-hit'},({payload})=>{
   if(payload?.to!==userId||typeof payload.from!=='string'||duelWith!==payload.from)return
   const attacker=remotesRef.current.find(g=>g.id===payload.from)
   if(!attacker)return
   const dx=attacker.position.x-positionRef.current.x, dz=attacker.position.z-positionRef.current.z
   if(Math.hypot(dx,dz)>2.6||Math.hypot(positionRef.current.x,positionRef.current.z)>3.4||Math.hypot(attacker.position.x,attacker.position.z)>3.4)return
   const damage=blockingRef.current?5:18
   setHealth(current=>{
    const next=Math.max(0,current-damage)
    if(next===0){setCombatNotice('Knocked out — respawning in 3 seconds.');window.setTimeout(()=>{setHealth(100);setCombatNotice('Back in the game.')},3000)}
    else setCombatNotice(blockingRef.current?'Block absorbed most of the hit!':'You were hit!')
    return next
   })
   setHitFlash(true);window.setTimeout(()=>setHitFlash(false),180)
  })
  channel.on('broadcast',{event:'pair-invite'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string')setIncomingPair(payload.from)})
  channel.on('broadcast',{event:'pair-accepted'},({payload})=>{if(payload?.to===userId&&typeof payload.from==='string')setPairedWith(payload.from)})
  channel.on('broadcast',{event:'pair-declined'},({payload})=>{if(payload?.to===userId)setStatus('Pair invitation declined')})
  channel.on('broadcast',{event:'pair-ended'},({payload})=>{if(payload?.to===userId)setPairedWith(null)})
  channel.subscribe(state=>{
   if(state==='SUBSCRIBED'){setStatus('Multiplayer connected');void channel.track({x:position.x,z:position.z,dance:position.dance,skin:avatar.skin,hair:avatar.hair,outfit:avatar.outfit,person:avatar.person})}
   else if(state==='CHANNEL_ERROR'||state==='TIMED_OUT')setStatus('Reconnecting…')
   else if(state==='CLOSED')setStatus('Disconnected')
  })
  return ()=>{channelRef.current=null;void supabase.removeChannel(channel)}
  // Connect once per authenticated room identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[clubId,userId,duelWith])
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
 function attack(){
  const now=Date.now()
  if(now-lastAttackAt.current<650)return
  const target=remotes.find(g=>g.id===combatTarget)
  if(!target||duelWith!==target.id){setCombatNotice('Both players must accept a sparring challenge first.');return}
  const distance=Math.hypot(target.position.x-position.x,target.position.z-position.z)
  if(Math.hypot(position.x,position.z)>3.4||Math.hypot(target.position.x,target.position.z)>3.4){setCombatNotice('Fighting is only enabled inside the marked arena.');return}
  if(distance>2.6){setCombatNotice('Move closer before punching.');return}
  lastAttackAt.current=now
  void channelRef.current?.send({type:'broadcast',event:'combat-hit',payload:{to:target.id,from:userId,damage:18,at:now}})
  setCombatNotice('Punch thrown at '+target.id.slice(0,6)+'!')
 }
 function challenge(){const target=remotes.find(g=>g.id===combatTarget);if(!target){setCombatNotice('Choose a connected player first.');return}if(Math.hypot(position.x,position.z)>3.4||Math.hypot(target.position.x,target.position.z)>3.4){setCombatNotice('Both players must stand inside the marked sparring arena.');return}void channelRef.current?.send({type:'broadcast',event:'sparring-challenge',payload:{to:target.id,from:userId}});setCombatNotice('Challenge sent. No fighting starts until they accept.')}
 function endSparring(){if(duelWith)void channelRef.current?.send({type:'broadcast',event:'sparring-ended',payload:{to:duelWith,from:userId}});setDuelWith(null);setIncomingChallenge(null);setHealth(100);setCombatNotice('Sparring ended. You are safe.')}
 function sendEmote(emoji:string){void channelRef.current?.send({type:'broadcast',event:'room-emote',payload:{from:userId,emoji,name:displayName||'Guest'}});setRoomEmote({emoji,from:'You'});window.setTimeout(()=>setRoomEmote(null),2200)}
}
 return <section className="mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-[#090a12]">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
   <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-lime-300">Immersive 3D club</p><h2 className="mt-1 text-xl font-black">The block party</h2><p className="mt-1 text-xs text-zinc-500">{status} · {remotes.length+1} avatars</p></div>
   <div className="flex items-center gap-3"><label className="text-xs text-zinc-400">Camera <select value={view} onChange={e=>setView(e.target.value as "first"|"third")} className="ml-2 rounded-lg border border-white/10 bg-[#151421] px-2 py-2 text-white"><option value="first">First person</option><option value="third">Third person</option></select></label><label className="text-xs text-zinc-400">Graphics <select value={quality} onChange={e=>setQuality(e.target.value as 'low'|'high')} className="ml-2 rounded-lg border border-white/10 bg-[#151421] px-2 py-2 text-white"><option value="low">Low data</option><option value="high">High quality</option></select></label></div>
  </header>
  <div className="relative h-[420px] touch-none sm:h-[540px]">
   <Canvas shadows={false} dpr={quality==='high'?[1,1.25]:1} camera={{position:[0,3.15,7.8],fov:view==='first'?78:58}} gl={{antialias:quality==='high',powerPreference:'high-performance'}}>
    <Venue position={position} remotes={remotes} avatar={avatar} high={quality==='high'} roomType="club" view={view}/>
   </Canvas>
   {hitFlash&&<div className="pointer-events-none absolute inset-0 z-10 bg-rose-500/20"/>}
   {roomEmote&&<div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-sm text-white shadow-xl">{roomEmote.emoji} {roomEmote.from}</div>}
   <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-black/65 px-3 py-2 text-[11px] text-zinc-200">Keyboard or touch controls · {position.seated?'Seated':'Standing'} · camera follows your character</div>
   {introOpen&&<div className="absolute inset-0 z-20 flex items-center justify-center bg-[#080711]/75 p-5 backdrop-blur-sm"><div className="max-w-lg rounded-3xl border border-lime-200/20 bg-[#11101d]/95 p-7 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.3em] text-lime-300">Nightlife KE presents</p><h2 className="mt-3 text-3xl font-black">The night is yours.</h2><p className="mt-4 text-sm leading-7 text-zinc-300">When the city lights come on, the doors of this club open. The DJ sets the rhythm, the bar is ready, and familiar faces meet new ones. Walk from the dancefloor to the bar, settle into the lounge or find the VIP corner. This is one club, one shared night — the people make the memories.</p><p className="mt-4 text-xs text-zinc-500">Your character and the other guests move through the same persistent venue.</p><button onClick={()=>setIntroOpen(false)} className="mt-6 w-full rounded-xl bg-lime-300 px-5 py-3 font-black text-black">Enter the club</button></div></div>}
   <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5 sm:hidden">
    <span/><button aria-label="Move forward" onPointerDown={e=>{e.preventDefault();move(0,-.55);touchInterval.current=window.setInterval(()=>move(0,-.32),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">↑</button><span/>
    <button aria-label="Move left" onPointerDown={e=>{e.preventDefault();move(-.55,0);touchInterval.current=window.setInterval(()=>move(-.32,0),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">←</button>
    <button aria-label="Move backward" onPointerDown={e=>{e.preventDefault();move(0,.55);touchInterval.current=window.setInterval(()=>move(0,.32),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">↓</button>
    <button aria-label="Move right" onPointerDown={e=>{e.preventDefault();move(.55,0);touchInterval.current=window.setInterval(()=>move(.32,0),110)}} onPointerUp={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} onPointerLeave={()=>{if(touchInterval.current)clearInterval(touchInterval.current);touchInterval.current=null}} className="h-12 w-12 rounded-xl bg-lime-300 text-lg font-black text-black">→</button>
   </div>
  </div>
  <div className="mx-5 my-4 rounded-2xl border border-rose-400/25 bg-[#17101b] p-4">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rose-300">Sparring arena · opt-in only</p><p className="mt-1 text-xs text-zinc-400">Marked centre ring · no attacks outside it · both players must agree</p></div><span className="text-xs font-black text-white">HP {health}/100</span></div>
   <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-rose-400 transition-all" style={{width:health+'%'}}/></div>
   <div className="mt-3 flex flex-wrap items-center gap-2"><select aria-label="Choose sparring opponent" value={combatTarget} onChange={e=>setCombatTarget(e.target.value)} className="min-w-[180px] flex-1 rounded-lg border border-white/10 bg-[#171321] px-3 py-2 text-xs text-white"><option value="">Choose opponent…</option>{remotes.map(g=><option key={g.id} value={g.id}>Guest {g.id.slice(0,6)} · {Math.round(Math.hypot(g.position.x-position.x,g.position.z-position.z)*10)/10}m</option>)}</select>
   {!duelWith?<button onClick={challenge} disabled={!combatTarget} className="rounded-lg bg-rose-400 px-4 py-2 text-xs font-black text-black disabled:opacity-40">Request spar</button>:<><span className="rounded-lg bg-rose-300/10 px-3 py-2 text-xs text-rose-100">Sparring with {duelWith.slice(0,6)}</span><button onClick={attack} disabled={health<=0} className="rounded-lg bg-rose-400 px-4 py-2 text-xs font-black text-black disabled:opacity-40">👊 Punch</button><button onClick={()=>setBlocking(v=>!v)} className={'rounded-lg border px-4 py-2 text-xs font-black '+(blocking?'border-cyan-300 bg-cyan-300/15 text-cyan-100':'border-white/15 text-zinc-200')}>{blocking?'Blocking…':'🛡 Block'}</button><button onClick={endSparring} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Leave spar</button></>}
   </div>
   {incomingChallenge&&<div className="mt-3 rounded-xl border border-rose-300/20 bg-black/30 p-3"><p className="text-sm text-white">Guest {incomingChallenge.slice(0,6)} challenges you to spar. Accept only if you want to fight.</p><div className="mt-2 flex gap-2"><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'sparring-accepted',payload:{to:incomingChallenge,from:userId}});setDuelWith(incomingChallenge);setCombatTarget(incomingChallenge);setIncomingChallenge(null);setCombatNotice('Sparring started by mutual agreement.')}} className="rounded-lg bg-rose-300 px-3 py-2 text-xs font-black text-black">Accept challenge</button><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'sparring-declined',payload:{to:incomingChallenge,from:userId}});setIncomingChallenge(null)}} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Decline</button></div></div>}
   <p className="mt-2 text-[11px] text-zinc-400" aria-live="polite">{combatNotice}</p><p className="mt-1 text-[10px] text-zinc-600">Stand inside the centre ring to challenge. Punching is disabled until the other player accepts. Either player can leave at any time.</p>
  </div>
  <div className="mx-5 mb-4 rounded-2xl border border-white/10 bg-[#11101d] p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Quick reactions</p><div className="mt-2 flex flex-wrap gap-2">{['👋','😂','🔥','❤️','🎉','🕺','👏','✨'].map(emoji=><button key={emoji} onClick={()=>sendEmote(emoji)} aria-label={'Send '+emoji+' reaction'} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-lg hover:border-lime-300/40">{emoji}</button>)}</div></div>
  <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-3"><button onClick={()=>{if(!bartenderOpen)speakBartender("Hey there! Welcome to the club. Would you like something to drink, or are you just looking around?");setBartenderOpen(v=>!v)}} className="rounded-lg border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200">Talk to bartender</button><button onClick={()=>setPosition(p=>p.seated?{...p,seated:false}:{...p,x:6.8,z:-1.7,seated:true})} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">{position.seated?'Stand up':'Sit / stand'}</button><button onClick={()=>setPairOpen(v=>!v)} className="rounded-lg border border-fuchsia-300/30 px-3 py-2 text-xs font-bold text-fuchsia-200">Pair / couple</button><button onClick={()=>setEditingControls(v=>!v)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Customize controls</button></div>
  {bartenderOpen&&<div className="mx-5 mb-4 rounded-2xl border border-amber-300/20 bg-[#171321] p-4"><p className="text-xs font-black uppercase tracking-widest text-amber-200">Bartender · Welcome</p><p className="mt-2 text-sm text-white">Hey there! Would you like something to drink, or are you just looking around?</p><button onClick={()=>speakBartender('Hey there! Welcome to the club. Would you like something to drink, or are you just looking around?')} className="mt-2 rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-100">Play bartender voice</button><div className="mt-3 flex flex-wrap gap-2">{['Tropical mocktail','Virtual cocktail','Soda','Water'].map(drink=><button key={drink} onClick={()=>{setSelectedDrink(drink);setDrinkChosen(false)}} className={`rounded-lg border px-3 py-2 text-xs ${selectedDrink===drink?'border-amber-300 bg-amber-300/15 text-amber-100':'border-white/10 text-zinc-300'}`}>{drink}</button>)}<button onClick={()=>{setDrinkChosen(true);speakBartender(`Coming right up. Enjoy your ${selectedDrink}!`)}} className="rounded-lg bg-amber-300 px-4 py-2 text-xs font-black text-black">That sounds good</button><button onClick={()=>setBartenderOpen(false)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">Maybe later</button></div>{drinkChosen&&<p className="mt-3 text-xs text-emerald-300">You selected {selectedDrink}. This is a virtual in-room interaction; no wallet charge has been made.</p>}</div>}
  {pairOpen&&<div className="mx-5 mb-4 rounded-2xl border border-fuchsia-300/20 bg-[#171321] p-4"><p className="text-xs font-black uppercase tracking-widest text-fuchsia-200">Pair up · mutual consent</p><p className="mt-2 text-sm text-zinc-300">Invite someone to dance or spend time together. Pairing is open to everyone — no gender selection or assumptions.</p>{pairedWith&&<p className="mt-2 text-xs text-emerald-300">Paired with guest {pairedWith.slice(0,6)} · <button className="underline" onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-ended',payload:{to:pairedWith,from:userId}});setPairedWith(null)}}>End pairing</button></p>}<div className="mt-3 flex flex-wrap gap-2">{remotes.map(guest=><button key={guest.id} onClick={()=>void channelRef.current?.send({type:'broadcast',event:'pair-invite',payload:{to:guest.id,from:userId}})} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Invite guest {guest.id.slice(0,6)}</button>)}{remotes.length===0&&<span className="text-xs text-zinc-500">No other guests are connected right now.</span>}</div>{incomingPair&&<div className="mt-3 rounded-xl bg-black/30 p-3"><p className="text-sm text-white">Guest {incomingPair.slice(0,6)} invited you to pair.</p><div className="mt-2 flex gap-2"><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-accepted',payload:{to:incomingPair,from:userId}});setPairedWith(incomingPair);setIncomingPair(null)}} className="rounded-lg bg-fuchsia-300 px-3 py-2 text-xs font-black text-black">Accept</button><button onClick={()=>{void channelRef.current?.send({type:'broadcast',event:'pair-declined',payload:{to:incomingPair,from:userId}});setIncomingPair(null)}} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Decline</button></div></div>}</div>}
  {editingControls&&<div className="mx-5 mb-4 rounded-2xl border border-white/10 bg-[#11101d] p-4"><p className="text-xs font-black uppercase tracking-widest text-lime-200">Choose your keys</p><p className="mt-1 text-xs text-zinc-400">Select an action, then press the key you want to assign. Arrow keys also remain available for movement.</p><div className="mt-3 flex flex-wrap gap-2">{Object.entries({forward:'Move forward',backward:'Move backward',left:'Move left',right:'Move right',sit:'Sit / stand',interact:'Talk to bartender'}).map(([action,label])=><button key={action} onClick={()=>setListeningFor(action)} className={`rounded-lg border px-3 py-2 text-xs ${listeningFor===action?'border-lime-300 bg-lime-300/10 text-lime-100':'border-white/10 text-zinc-200'}`}>{listeningFor===action?'Press a key…':`${label}: ${controls[action]}`}</button>)}</div><button onClick={()=>{setControls({forward:'w',backward:'s',left:'a',right:'d',sit:'c',interact:'e'});setListeningFor(null)}} className="mt-3 text-xs text-zinc-400 underline">Reset controls</button></div>}
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
   <div><p className="font-bold">{displayName||'Your avatar'}</p><p className="text-xs text-zinc-500">Fixed club environment · {remotes.length+1} people connected · {position.seated?'Seated':'Standing'}</p></div>
   <div className="flex flex-wrap gap-2"><span className="self-center text-[10px] uppercase tracking-wider text-zinc-500">Move to</span>{[{label:'Dancefloor',x:0,z:2.2},{label:'Bar',x:-5,z:-1},{label:'Lounge',x:5,z:1},{label:'VIP',x:0,z:4.5},{label:'DJ stage',x:0,z:-4}].map(zone=><button key={zone.label} onClick={()=>setPosition(p=>({...p,x:zone.x,z:zone.z}))} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200">{zone.label}</button>)}{(['groove','bounce','sway','hype'] as Dance[]).map(d=><button key={d} onClick={()=>dance(d)} className="rounded-lg border border-white/10 px-3 py-2 text-xs capitalize text-zinc-200">{d}</button>)}<button onClick={()=>setEditing(v=>!v)} className="rounded-lg border border-lime-300/30 px-3 py-2 text-xs font-bold text-lime-200">Customize</button></div>
  </footer>
  <DJMixer roomId={roomId} userId={userId} mix={djMix} isDJ={djOwner===userId} djName={djName} onClaim={()=>{setDjOwner(userId);setDjName(displayName||'Guest DJ');void channelRef.current?.send({type:'broadcast',event:'dj-claim',payload:{userId,name:displayName||'Guest DJ'}})}} onMixChange={next=>{setDjMix(next);void channelRef.current?.send({type:'broadcast',event:'dj-mix',payload:{mix:next,djOwner:userId,djName:displayName||'Guest DJ'}})}}/>
  <BartenderStation roomId={roomId} userId={userId} displayName={displayName||'Guest'}/>
  {editing&&<div className="grid gap-4 p-5 sm:grid-cols-2">{(Object.keys(choices) as (keyof typeof choices)[]).map(key=><label key={key} className="text-xs font-bold capitalize text-zinc-400">{key}<select value={avatar[key]} onChange={e=>setAvatar(a=>({...a,[key]:e.target.value} as Avatar))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#12141e] px-4 py-3 text-sm text-white">{choices[key].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}<div className="sm:col-span-2"><button onClick={()=>void save()} disabled={saving} className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black disabled:opacity-50">{saving?'Saving…':'Save character'}</button></div></div>}
 </section>
}
