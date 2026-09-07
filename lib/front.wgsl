struct View { size: vec2f, time: f32, scale: f32, pointer: vec2f, spare: vec2f }
@group(0) @binding(0) var<uniform> view: View;
@group(0) @binding(1) var field: texture_2d<f32>;
struct Vertex { @builtin(position) position: vec4f, @location(0) model: vec3f, @location(1) normal: vec3f, @location(2) uv: vec2f }
fn turn(p:vec3f)->vec3f {
 let ay=-.38+view.pointer.x*.06+.018*sin(view.time*.11);
 let ax=-.58+view.pointer.y*.045;
 let q=vec3f(p.x*cos(ay)+p.z*sin(ay),p.y,-p.x*sin(ay)+p.z*cos(ay));
 let r=vec3f(q.x,q.y*cos(ax)-q.z*sin(ax),q.y*sin(ax)+q.z*cos(ax));
 let az=-.42;
 return vec3f(r.x*cos(az)-r.y*sin(az),r.x*sin(az)+r.y*cos(az),r.z);
}
@vertex fn vs(@builtin(vertex_index) index:u32)->Vertex {
 let corners=array<vec2u,6>(vec2u(0,0),vec2u(1,0),vec2u(0,1),vec2u(1,0),vec2u(1,1),vec2u(0,1));
 let cell=index/6u; let p=vec2u(cell%96u,cell/96u)+corners[index%6u];
 let a=mix(-12.,8.,f32(p.x)/96.);
 let t=mix(-3.5,3.5,f32(p.y)/1024.);
 // Critical-value front of S=t^4/4+a*t^2/2+b*t, with S_t=0.
 let b=-t*t*t-a*t;
 let s=-.75*t*t*t*t-.5*a*t*t;
 // Two triangular shears are an invertible change of control-plane chart.
 let chartA=a+.22*b*b;
 let chartB=b+.035*chartA*chartA;
 let daA=1.-.44*b*t; let dtA=.44*b;
 let daB=-t+.07*chartA*daA; let dtB=1.+.07*chartA*dtA;
 let world=vec3f(-chartA*.29,chartB*.39,s*.115);
 let pa=vec3f(-daA*.29,daB*.39,-.5*t*t*.115);
 let pt=vec3f(-dtA*.29,dtB*.39,t*.115);
 var q=turn(world);
 // Orthographic projection preserves the graphic rhythm of the foliation.
 let aspect=view.size.x/view.size.y;
 var o:Vertex;
 o.position=vec4f(q.x/max(aspect,1.1)+.025, -q.y+.36, .5-q.z*.003,1);
 o.model=vec3f(a,b,t); o.normal=turn(normalize(cross(pa,pt))); o.uv=o.position.xy;
 return o;
}
fn wave(a:f32,b:f32)->vec2f {
 let dims=vec2f(textureDimensions(field));
 let uv=vec2f((b+3.829751)/7.649528,(a+4.4)/5.6);
 let q=clamp(uv,vec2f(0),vec2f(1))*(dims-1);
 let i=vec2i(floor(q)); let f=fract(q);
 let z00=textureLoad(field,i,0).rg; let z10=textureLoad(field,min(i+vec2i(1,0),vec2i(dims)-1),0).rg;
 let z01=textureLoad(field,min(i+vec2i(0,1),vec2i(dims)-1),0).rg; let z11=textureLoad(field,min(i+vec2i(1,1),vec2i(dims)-1),0).rg;
 return mix(mix(z00,z10,f.x),mix(z01,z11,f.x),f.y);
}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
 var n=normalize(v.normal); if(n.z<0){n=-n;}
 let t=v.model.z;
 // Linear parameter foliation, filtered using its screen-space footprint.
 let phase=t*900.+v.model.x*90.;
 let footprint=max(fwidth(phase),.001);
 let attenuation=clamp(sin(footprint*.5)/(footprint*.5),0.,1.);
 let line=.5+.5*cos(phase)*attenuation;
 let light=normalize(vec3f(-.6,-.7,1.3));
 let broad=pow(max(dot(n,normalize(light+vec3f(0,0,1))),0.),18.);
 let rim=pow(1.-max(n.z,0.),3.);
 let z=wave(v.model.x,v.model.y); let intensity=dot(z,z);
 let inDomain=smoothstep(-4.4,-4.15,v.model.x)*(1.-smoothstep(.95,1.2,v.model.x))*(1.-smoothstep(3.6,3.81,abs(v.model.y)));
 let waveInk=log(1.+12.*intensity)*inDomain;
 let paper=vec3f(.943,.923,.884);
 let shade=.83+.15*max(dot(n,light),0.);
 var color=paper*shade-vec3f(.16,.155,.14)*pow(line,6.)*attenuation;
 color+=vec3f(.18,.19,.20)*broad;
 let reflected=reflect(vec3f(0,0,-1),n);
 let strip=exp(-pow((reflected.y-.23)/.095,2.))*exp(-pow((reflected.x+.15)/.8,2.));
 color+=vec3f(.13,.15,.17)*strip;
 color-=vec3f(.018,.021,.025)*waveInk;
 color=mix(color,vec3f(.34,.40,.41),rim*.2);
 color+=vec3f(.035,.016,-.004)*sin(t*5.+.3)*broad;
 let fold=v.model.x+3.*t*t;
 let shadow=exp(-fold*fold*3.2);
 let crest=exp(-fold*fold*95.);
 color-=vec3f(.29,.29,.27)*shadow;
 color+=vec3f(.34,.37,.39)*crest;
 color+=vec3f(-.017,.016,.024)*exp(-pow((fold-.07)*22.,2.));
 // Domain edges dissolve into the substrate, preserving a quiet identity area.
 let boundary=smoothstep(-12.,-8.,v.model.x)*(1.-smoothstep(4.,8.,v.model.x))*(1.-smoothstep(2.7,3.5,abs(t)));
 let fade=smoothstep(-.4,.05,v.uv.x+.95*(1.-v.uv.y))*boundary;
 return vec4f(mix(paper,color,fade),1);
}
