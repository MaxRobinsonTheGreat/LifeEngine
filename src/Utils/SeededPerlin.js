//seeded perlin noise. same seed always produces the same noise field, letting the
//group reuse fixed fertility layouts. independent of the original Perlin.js used by walls.

//deterministic replacement for Math.random() - same seed, same sequence every time.
function mulberry32(seed) {
    return function() {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

//returns one independent noise generator seeded by seed.
function createSeededPerlin(seed) {
    let rand = mulberry32(seed);
    let gradients = {}; //cached random direction per grid corner
    let memory = {};    //cached noise result per coordinate

    function rand_vect(){
        let theta = rand() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    }

    function dot_prod_grid(x, y, vx, vy){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if (gradients[[vx,vy]]){
            g_vect = gradients[[vx,vy]];
        } else {
            g_vect = rand_vect();
            gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    }

    function smootherstep(x){
        return 6*x**5 - 15*x**4 + 10*x**3;
    }

    function interp(x, a, b){
        return a + smootherstep(x) * (b-a);
    }

    return {
        get: function(x, y) {
            if (memory.hasOwnProperty([x,y]))
                return memory[[x,y]];
            let xf = Math.floor(x);
            let yf = Math.floor(y);
            let tl = dot_prod_grid(x, y, xf,   yf);
            let tr = dot_prod_grid(x, y, xf+1, yf);
            let bl = dot_prod_grid(x, y, xf,   yf+1);
            let br = dot_prod_grid(x, y, xf+1, yf+1);
            let xt = interp(x-xf, tl, tr);
            let xb = interp(x-xf, bl, br);
            let v = interp(y-yf, xt, xb);
            memory[[x,y]] = v;
            return v;
        }
    };
}

module.exports = createSeededPerlin;