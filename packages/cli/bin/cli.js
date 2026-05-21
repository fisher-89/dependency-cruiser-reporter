#!/usr/bin/env node
import{program as e}from"commander";import{existsSync as t,mkdirSync as n,readFileSync as r,readdirSync as i,writeFileSync as a}from"node:fs";import{basename as o,dirname as s,join as c,relative as l,resolve as u}from"node:path";import{cruise as d}from"dependency-cruiser";import f from"dependency-cruiser/config-utl/extract-depcruise-options";import p from"dependency-cruiser/config-utl/extract-ts-config";import m from"express";import{fileURLToPath as h}from"node:url";async function g(e){let{path:r=`.`,output:i,config:c,cwd:m=`.`}=e,h=u(m),g=u(h,r),_=i||u(h,`.dc-reporter`,`scans`,`${o(g)}-graph.json`),v=s(_);t(v)||n(v,{recursive:!0});let y;c?y=u(h,c):(y=u(g,`.dependency-cruiser.json`),t(y)||(y=u(g,`.dependency-cruiser.js`)),t(y)||(y=u(h,`.dependency-cruiser.json`)),t(y)||(y=u(h,`.dependency-cruiser.js`)));let b={outputType:`json`};if(y&&t(y)){console.log(`Using config: ${y}`);try{b={...await f(y),...b}}catch(e){console.warn(`Failed to extract config from ${y}:`,e)}}let x=u(g,`tsconfig.json`),S={};if(t(x)){console.log(`Using tsconfig: ${x}`);try{S.tsConfig=p(x)}catch(e){console.warn(`Failed to extract tsconfig from ${x}:`,e)}}console.log(`Analyzing: ${g}`);let C=Date.now(),w=await d([l(String(b.baseDir)??process.cwd(),g)],b,void 0,S);w.output||(console.error(`dependency-cruiser did not produce output`),process.exit(1)),a(_,typeof w.output==`string`?w.output:JSON.stringify(w.output,null,2));let T=Math.round((Date.now()-C)/1e3);return console.log(`Graph written to: ${_}, takes ${T} s`),_}let _=null,v=null;async function y(){if(!_)return v||(v=(async()=>{try{_=(await import(`@dcr-reporter/wasm`)).aggregate}catch(e){throw console.warn(`WASM module not available, falling back to native binary:`,e),v=null,e}})(),v)}async function b(e,t=200,n){if(await y(),!_)throw Error(`WASM module init failed`);return _(e,t,n||null)}var x=`specification {
  element outer { // 系统外实体（例：用户、其他服务）
    style {
      color muted
      size small
    }
  }
  element project { // 工程
    style {
      shape browser
    }
  }
  element package // 包
  element module // 模块、组件

  relationship dependency { // 依赖
    line solid
  }
}
model {
  root = project 'Project' {
    // 此处拆分packages 或 module
  }
  user = outer 'User'
  
  user -> root 'use'
}

views {
  view all of root {
    title 'all'
    include *, root.**
  }
  view top {
    title 'top-only'
    include root.*
  }
}
`;function S(e,o){e.get(`/api/architecture/model`,async(e,n)=>{let a=c(u(o),`.dc-reporter`,`architecture`);if(!t(a)){n.status(404).json({error:`Architecture directory not found`});return}let s;try{s=i(a).filter(e=>e.endsWith(`.c4`))}catch{n.status(500).json({error:`Failed to read architecture directory`});return}if(s.length===0){n.status(404).json({error:`No .c4 files found in architecture directory`});return}try{let e={};for(let t of s)e[t]=r(c(a,t),`utf-8`);let{fromSources:t}=await import(`@likec4/language-services/node`),i=await t(e);if(i.hasErrors()){let e=i.getErrors();n.status(422).json({error:`C4 parse errors`,details:JSON.stringify(e)});return}let o=i.syncComputedModel();n.json(o.$data)}catch(e){let t=e instanceof Error?e.message:String(e);n.status(422).json({error:`Failed to parse C4 files`,details:t})}}),e.post(`/api/architecture/generate`,async(e,r)=>{let i=c(u(o),`.dc-reporter`,`architecture`);try{t(i)||n(i,{recursive:!0}),a(c(i,`main.c4`),x,`utf-8`),r.json({success:!0})}catch(e){let t=e instanceof Error?e.message:String(e);r.status(500).json({error:`Failed to generate architecture model`,details:t})}})}var C=class{get port(){return this._port}constructor(e){this._port=e.port,this.host=e.host,this.graphFile=e.graphFile,this.maxNodes=e.maxNodes??200,this.cwd=e.cwd??`.`,this.app=m(),this.app.use(m.json()),this.setupRoutes()}setupRoutes(){let e=h(new URL(`../../frontend/dist`,import.meta.url).href);S(this.app,this.cwd),this.app.post(`/api/graph`,async(e,n)=>{if(!this.graphFile){n.status(404).json({error:`No graph file specified`});return}if(!t(this.graphFile)){n.status(404).json({error:`Graph file not found: ${this.graphFile}`});return}try{let t=r(this.graphFile,`utf-8`),i=JSON.parse(t),a=e.body?.expanded_dirs?.length?e.body.expanded_dirs:void 0;if(i.modules&&Array.isArray(i.modules)){let e=await b(t,this.maxNodes,a);n.json(e);return}n.status(400).json({error:`Unrecognized graph file format`})}catch(e){n.status(500).json({error:`Failed to read graph file`,details:String(e)})}}),this.app.use(m.static(e)),this.app.get(`*`,(n,r)=>{let i=u(e,`index.html`);t(i)?r.sendFile(i):r.status(404).send(`Frontend not built. Run 'pnpm build' in packages/frontend.(PATH:${i})`)})}async start(){return new Promise((e,t)=>{let n=r=>{let i=this.app.listen(r,this.host,()=>{this._port=r,this.server=i,e()});i.on(`error`,e=>{e.code===`EADDRINUSE`&&r<65535?(console.log(`Port ${r} is in use, trying ${r+1}...`),i.close(),n(r+1)):t(e)})};n(this.port)})}stop(){this.server?.close()}};function w(e){return new C(e)}async function T(e){let{file:n,port:r=3e3,host:i=`localhost`,maxNodes:a=500,cwd:s=`.`}=e,c=n;if(!c){let e=u(s),n=u(e,`.dc-reporter`,`scans`,`${o(e)}-graph.json`);t(n)&&(c=n,console.log(`Using graph file: ${c}`))}let l=w({port:r,host:i,graphFile:c,maxNodes:a,cwd:s});await l.start(),console.log(`Server running at http://${i}:${l.port}`),n&&console.log(`Graph file: ${n}`),console.log(`Press Ctrl+C to stop`),process.on(`SIGINT`,()=>{console.log(`
Shutting down...`),l.stop(),process.exit(0)})}e.name(`dep-report`).description(`dependency-cruiser result visualizer`).version(`0.1.0`),e.option(`--cwd <path>`,`Workspace root directory`,`.`),e.command(`analyze`).description(`Analyze a project directory and generate visualization`).option(`-p, --path <dir>`,`Project directory to analyze`,`.`).option(`-o, --output <path>`,`Output graph JSON file`).option(`-c, --config <path>`,`dependency-cruiser config file`).action(async t=>{let n=e.opts().cwd,r=await g({path:t.path,output:t.output,config:t.config,cwd:n});console.log(`\nTo view the result, run:\n  dep-report open -f ${r}`)}),e.command(`open`).description(`Open web viewer with HTTP server`).option(`-f, --file <path>`,`Pre-processed graph JSON to load`).option(`-p, --port <number>`,`Server port`,`3000`).option(`--host <host>`,`Server host`,`localhost`).action(async t=>{let n=e.opts().cwd;await T({file:t.file,port:Number.parseInt(t.port,10),host:t.host,cwd:n})}),e.parse();export{};
//# sourceMappingURL=cli.js.map