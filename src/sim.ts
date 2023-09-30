import {CSS, ELEM} from "htmlgen";
import {FlatFFT} from "flat-fft"

const width = 512/2;
const height = 512/2/2;

CSS.add(`
.sim{
    display: grid;
    justify-content: center;
    align-content: center; 
    grid-template-columns: ${Math.max(512,width)}px 15em;
    grid-template-rows: ${Math.max(512,height)}px;
    column-gap: 1em;
    row-gap: 1em;
    padding: 1em;
    box-sizing: border-box;
    height: 100vh;
    width: 100vw;
}

.sim>div{
    margin: 0px;
    box-sizing: border-box;
}

.main{
    grid-area: 1/1/2/2;
}

.right{
    grid-area: 1/2/2/3;
}
`);


const toColor = function(v: number){
    if(v > 1)v = 1;
    if(v < 0)v = 0;
    const r = v*256;
    const g = Math.cos((v-0.5)*4)*255;
    //const g = (0.5-Math.abs(v-0.5))*2*256;
    const b = (1-v)*256;
    const a = 255;
    return [r,g,b,a];
};

const squash = function(x,slope=0.01){
    slope = 0.2e-31;
    if(x === Infinity)return 1;
    // log => sigmoid
    return -2/(1+Math.E**(2*Math.log(slope*x+1)))+1;
};


//const fft = new FlatFFT(Math.round(Math.log(width)/Math.log(2)));

const fftCache = new Map();
const getFFT = function(size: number){
    const order = Math.round(Math.log(size)/Math.log(2));
    let res;
    if(!(res = fftCache.get(order))){
        res = new FlatFFT(order);
        fftCache.set(order,res);
    }
    return res;
};

const fft = function(arr: Float32Array){
    const transformer = getFFT(arr.length/2);
    return transformer.fft(arr);
};

const ifft = function(arr: Float32Array){
    const transformer = getFFT(arr.length/2);
    return transformer.ifft(arr);
};


const fft2d = function(buff: Float32Array, width: number, height: number){
    const w2 = width*2;
    const h2 = height*2;
    const rows = [];
    for(let i = 0; i < height; i++){
        rows.push(fft(buff.slice(i*w2, (i+1)*w2)));
    }
    let res = new Float32Array(width*height*2);
    for(let i = 0; i < width; i++){
        let column = new Float32Array(h2);
        for(let j = 0; j < height; j++){
            column[j*2+0] = rows[j][i*2+0];
            column[j*2+1] = -rows[j][i*2+1];//idek how it works but like bruh
        }
        column = fft(column);
        for(let j = 0; j < height; j++){
            res[j*w2+i*2+0] = column[j*2+0];
            res[j*w2+i*2+1] = column[j*2+1];
        }
    }
    return res;
};

const ifft2d = function(buff: Float32Array, width: number, height: number){
    const w2 = width*2;
    const h2 = height*2;
    const rows = [];
    for(let i = 0; i < height; i++){
        rows.push(ifft(buff.slice(i*w2, (i+1)*w2)));
    }
    let res = new Float32Array(width*height*2);
    for(let i = 0; i < width; i++){
        let column = new Float32Array(h2);
        for(let j = 0; j < height; j++){
            column[j*2+0] = rows[j][i*2+0];
            column[j*2+1] = rows[j][i*2+1];
        }
        column = ifft(column);
        for(let j = 0; j < height; j++){
            res[j*w2+i*2+0] = column[j*2+0];
            res[j*w2+i*2+1] = column[j*2+1];
        }
    }
    return res;
};




const convolveComplex = function(arr1: Float32Array, arr2: Float32Array){
    let f1 = fft(arr1);
    let f2 = fft(arr2);
    //multiply two complex vectors
    for(let i = 0; i < f1.length; i+= 2){
        const r1 = f1[i];
        const r2 = f2[i];
        const i1 = f1[i+1];
        const i2 = f2[i+1];
        f1[i] = r1*r2-i1*i2;
        f1[i+1] = r1*i2+r2*i1
    }
    let res = ifft(f1);
    return res;
};

const convolve = function(arr1,arr2){
    return convolveComplex(FlatFFT.toComplex(arr1),FlatFFT.toComplex(arr2));
};


const convolve2dComplex = function(arr1: Float32Array, arr2: Float32Array, width: number, height: number){
    let f1 = fft2d(arr1,width,height);
    let f2 = fft2d(arr2,width,height);
    //multiply two complex vectors
    for(let i = 0; i < f1.length; i+= 2){
        const r1 = f1[i];
        const r2 = f2[i];
        const i1 = f1[i+1];
        const i2 = f2[i+1];
        f1[i] = r1*r2-i1*i2;
        f1[i+1] = r1*i2+r2*i1
    }
    // let res = ifft2d(f1,width,height);
    // let f2 = fft2d(arr2,width,height);
    // let f1 = fft2d(arr1,width,height);
    let res = ifft2d(f1,width,height);
    
    return res;
};

const convolve2d = function(arr1: number[], arr2: number[], width: number, height: number){
    return convolve2dComplex(FlatFFT.toComplex(arr1),FlatFFT.toComplex(arr2), width, height);
};


const convolveSlow = function(a,b){
    let res = [];
    for(let i = 0; i < a.length; i++){
        let r = 0;
        for(let j = 0; j < b.length; j++){
            r += a[i]*b[j];
        }
        res.push(r);
    }
    return FlatFFT.toComplex(res);
}



//console.log(convolve([0,0,0,1],[2,1,0,1]));
//console.log(convolve([0,2,0,0],[2,1,1,1]));
let r = convolve2d(
    [
    //     11,12,13,14,
    //     21,22,23,24,
    //     31,32,33,34,
    //     41,42,43,44,
        0,0,0,0,
        0,0,0,0,
        0,0,1,0,
        0,0,0,0,
    ],
    [
        2,1,0,1,
        1,1,0,1,
        0,0,0,0,
        1,1,0,1,
    ],
    4,4);

r = [...r].map(v=>Math.round(v*100000)/100000);

console.log(`
${r[0]} ${r[2]} ${r[4]} ${r[6]}
${r[8]} ${r[10]} ${r[12]} ${r[14]}
${r[16]} ${r[18]} ${r[20]} ${r[22]}
${r[24]} ${r[26]} ${r[28]} ${r[30]}
`);







class SimCanvas extends ELEM{
    constructor(){
        super("canvas");
        const canvas = this.canvas = this.e;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.font = "60px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Fuck You",width/2,height*0.7);
        const objects = [];// mass, x, y, vx, vy
        const imgdata = ctx.getImageData(0,0,width,height);
        const data = imgdata.data;
        for(let y = 0; y < width; y++){
            for(let x = 0; x < width; x++){
                const idx = (y*width+x)*4;
                const alpha = data[idx+3];
                if(alpha > 100){
                    for(let dx = 0; dx < 1; dx += 0.2){
                        for(let dy = 0; dy < 1; dy += 0.2){
                            objects.push([1.989e+30,x+dx,y+dy,0,0]);
                        }
                    }
                }
            }
        }
        console.log(objects.length);
        this.objects = objects;
        this.imgdata = imgdata;
        this.ctx = ctx;

        const size = width*height;
        const hw = Math.floor(width/2);
        const hh = Math.floor(height/2);
        this.densityMask = new Float32Array(size*2);
        this.kernelX     = new Float32Array(size*2);
        this.kernelY     = new Float32Array(size*2);

        for(let y = 0; y < width; y++){
            for(let x = 0; x < width; x++){
                const idx = (y*width+x);
                let x1 = (x+hw)%width;
                let y1 = (y+hh)%height;
                let dx = hw-x1;
                let dy = hh-y1;
                if(dx === 0 && dy === 0){
                    this.kernelX[idx*2] = 0;
                    this.kernelY[idx*2] = 0;
                    continue;
                }
                // multiply with pixel width
                dx *= this.pw;
                dy *= this.pw;
                // inverse square
                const r2 = dx*dx+dy*dy;
                const r = Math.sqrt(r2);
                const isq = 1/r2;
                const xcomp = isq*(dx/r);
                const ycomp = isq*(dy/r);
                this.kernelX[idx*2] = xcomp*this.G;
                this.kernelY[idx*2] = ycomp*this.G;
            }
        }
        this.start();
    }
    G = 6.6743015e-11;
    pw = 150e+9;//1au
    step(dt: number){
        console.log("stepping");
        //calculate density field
        const density = this.densityMask;
        const objects = this.objects;
        const {ctx, imgdata} = this;
        const {data} = imgdata;
        density.fill(0);
        for(let object of objects){
            let m = object[0];
            let x = Math.floor(object[1]);
            let y = Math.floor(object[2]);
            const idx = y*width+x;
            density[idx*2] += m;
        }
        for(let y = 0; y < width; y++){
            for(let x = 0; x < width; x++){
                let idx = y*width+x;
                const [r,g,b,a] = toColor(squash(density[idx*2],1));
                data[idx*4+0] = r;
                data[idx*4+1] = g;
                data[idx*4+2] = b;
                data[idx*4+3] = a;
            }
        }
        ctx.putImageData(imgdata,0,0);

        //Actual calculation
        const xaccs = convolve2dComplex(density, this.kernelX, width, height);
        const yaccs = convolve2dComplex(density, this.kernelY, width, height);
        //console.log(density,this.kernelX,xaccs);
        //
        
        //for now calculate without close field interaction
        for(let object of objects){
            const x_ = Math.floor(object[1]);
            const y_ = Math.floor(object[2]);
            const idx = y_*width+x_;
            object[3] += xaccs[idx*2]*dt;
            object[4] += yaccs[idx*2]*dt;
            object[1] += object[3]*dt;
            object[2] += object[4]*dt;
        }
    }
    async start(){
        while(true){
            this.step(0.8);
            //console.log(this.objects);
            //return;
            await new Promise(res=>setTimeout(res,100));
        }
    }
        // ctx.putImageData(imgdata,0,0);
        // const imgdata = ctx.getImageData(0,0,width,height);
        // const data = imgdata.data;
        // for(let y = 0; y < width; y++){
        //     for(let x = 0; x < width; x++){
        //         const idx = (y*width+x)*4;
        //         let gf = 1/(x*x+y*y);
        //         const [r,g,b,a] = toColor(squash(gf,100000));
        //         data[idx+0] = r;
        //         data[idx+1] = g;
        //         data[idx+2] = b;
        //         data[idx+3] = a;
        //     }
        // }
        // ctx.putImageData(imgdata,0,0);
}


CSS.add(`
.sim canvas{
    margin-left: ${(512-width)/2}px;
    margin-top: ${(512-height)/2}px;
}
`);


export class Sim extends ELEM{
    constructor(){
        super("div","class: sim");
        const main = this.add("div","class: stdbox main",0,"padding:0px;");
        const right = this.add("div","class: stdbox right");
        const sim = main.add(new SimCanvas());
        right.add("div",0,`Number of particles: ${sim.objects.length}`);
    }
}


