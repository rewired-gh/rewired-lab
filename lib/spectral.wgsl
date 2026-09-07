struct View { size: vec2f, time: f32, mu: f32, pointer: vec2f, spare: vec2f }
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var outputField: texture_storage_2d<rg32float,write>;
var<workgroup> values: array<vec2f,2048>;
fn multiply(a:vec2f,b:vec2f)->vec2f{return vec2f(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
@compute @workgroup_size(256) fn compute(@builtin(local_invocation_index) lane:u32,@builtin(workgroup_id) group:vec3u){
 let a=mix(-4.,3.,f32(group.x)/127.);
 for(var j=lane;j<2048u;j+=256u){
  let t=-2.4+4.8*f32(j)/2048.; let t2=t*t;
  let q=t/1.3;let q2=q*q;let q4=q2*q2;
  let amplitude=exp(-q4*q4);
  let phase=30.*(t2*t2*t2/6.+view.mu*t2*t2/4.+a*t2/2.);
  values[reverseBits(j)>>21u]=amplitude*vec2f(cos(phase),sin(phase));
 }
 workgroupBarrier();
 for(var width=2u;width<=2048u;width*=2u){
  let halfWidth=width/2u;
  for(var k=lane;k<1024u;k+=256u){
   let offset=k%halfWidth;let i=(k/halfWidth)*width+offset;
   let angle=6.283185307179586*f32(offset)/f32(width);
   let a0=values[i];let b=multiply(values[i+halfWidth],vec2f(cos(angle),sin(angle)));
   values[i]=a0+b;values[i+halfWidth]=a0-b;
  }
  workgroupBarrier();
 }
 let k=i32(lane)-128;
 let scale=(4.8/2048.)*select(1.,-1.,(lane&1u)==1u);
 let z=values[u32((k+2048)%2048)]*scale;
 textureStore(outputField,vec2i(i32(lane),i32(group.x)),vec4f(z,0,0));
}
