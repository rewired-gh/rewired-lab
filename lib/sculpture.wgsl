struct Params { time:f32, aspect:f32, px:f32, py:f32 }
@group(0) @binding(0) var<uniform> p:Params;
struct Out { @builtin(position) clip:vec4f, @location(0) world:vec3f, @location(1) normal:vec3f, @location(2) uv:vec2f }
fn turn(v:vec3f)->vec3f {
 let ax=-.58+p.py*.18;let ay=.32+p.px*.28+.12*sin(p.time*.075);let az=-.24;
 let a=vec3f(v.x*cos(az)-v.y*sin(az),v.x*sin(az)+v.y*cos(az),v.z);
 let b=vec3f(a.x,a.y*cos(ax)-a.z*sin(ax),a.y*sin(ax)+a.z*cos(ax));
 return vec3f(b.x*cos(ay)+b.z*sin(ay),b.y,-b.x*sin(ay)+b.z*cos(ay));
}
@vertex fn vs(@location(0) a:vec3f,@location(1) b:vec3f,@location(2) n:vec3f,@location(3) uv:vec2f)->Out {
 let phase=.24*sin(p.time*.11+.55);
 let world=turn(a*cos(phase)-b*sin(phase));
 let depth=3.65-world.z;
 let size=min(1.82,p.aspect*2.1);
 var o:Out;o.clip=vec4f(world.x*size/p.aspect,world.y*size+.32,(depth-.1)*20.0/19.9,depth);
 o.world=world;o.normal=turn(n);o.uv=uv;return o;
}
fn studio(d:vec3f)->vec3f {
 let key=exp(-pow((d.x+.44)/.18,2.0)-pow((d.y-.4)/.8,2.0));
 let strip=exp(-pow((d.x-.64)/.075,2.0)-pow((d.y-.05)/.9,2.0));
 let top=pow(max(d.y,0.0),7.0);
 return vec3f(.065,.075,.085)+key*vec3f(3.8,3.65,3.25)+strip*vec3f(2.0,2.3,2.7)+top*vec3f(.8,.65,.46);
}
fn film(cosine:f32,thickness:f32)->vec3f {
 // Three-band Airy approximation. Phase follows optical path length through
 // a dielectric film; this is an artistic RGB approximation, not spectral transport.
 let eta=1.46;let ct=sqrt(1.0-(1.0-cosine*cosine)/(eta*eta));
 let phase=12.5663706*eta*thickness*ct/vec3f(650.0,510.0,475.0);
 let r12=.035;let r23=.55;let interference=2.0*sqrt(r12*r23)*cos(phase);
 return (vec3f(r12+r23)+interference)/(vec3f(1.0+r12*r23)+interference);
}
fn aces(x:vec3f)->vec3f {return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),vec3f(0),vec3f(1));}
@fragment fn fs(o:Out)->@location(0) vec4f {
 let view=normalize(vec3f(0,0,3.65)-o.world);
 var n=normalize(o.normal);if(dot(n,view)<0.0){n=-n;}
 let nv=max(dot(n,view),.001);
 let radius=length(o.uv);let groove=radius*176.0;
 let aa=max(fwidth(groove),.001);
 let etch=1.0-smoothstep(.05,.05+aa,abs(fract(groove)-.5));
 let thickness=260.0+65.0*sin(o.uv.x*1.7+o.uv.y*2.4)+32.0*radius;
 let iridescence=film(nv,thickness);
 let metal=mix(vec3f(.52,.44,.32),iridescence,.63);
 let reflection=reflect(-view,n);
 let fresnel=metal+(vec3f(1)-metal)*pow(1.0-nv,5.0);
 let key=normalize(vec3f(-.5,.8,1.2));let ndl=max(dot(n,key),0.0);
 let halfV=normalize(key+view);let nh=max(dot(n,halfV),0.0);
 let rough=.19+.024*etch;let a2=rough*rough*rough*rough;
 let D=a2/(3.14159265*pow(nh*nh*(a2-1.0)+1.0,2.0));
 let k=pow(rough+1.0,2.0)/8.0;
 let G=nv/(nv*(1.0-k)+k)*ndl/(ndl*(1.0-k)+k);
 let direct=D*G*fresnel/(4.0*nv*max(ndl,.001));
 let cavity=.65+.35*smoothstep(-.6,1.1,o.world.z);
 var color=(studio(reflection)*fresnel*.58 + metal*(.10+.27*ndl) + direct*ndl*.45)*cavity;
 color*=1.0-.055*etch;
 let edge=pow(1.0-nv,3.0);color+=edge*vec3f(.06,.10,.11);
 return vec4f(pow(aces(color),vec3f(1.0/2.2)),1.0);
}
