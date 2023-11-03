const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");

canvas.width = 512;
canvas.height = 512;

/* 3d Data */
let triangles = [
    {
        matrices: [[ -1, 1, 0 ], [ -1, 1, 1 ], [ 1, -1, 0 ]],
        color: "#f00"
    },

    {
        matrices: [[ -1, 1, 1 ], [ 1, -1, 1 ], [ 1, -1, 0 ]],
        color: "#f00"
    },

    {
        matrices: [[ 1, 1, 1 ], [ 1, 1, 0 ], [ -1, -1, 0 ]],
        color: "#00f"
    },

    {
        matrices: [[ 1, 1, 1 ], [ -1, -1, 1 ], [ -1, -1, 0 ]],
        color: "#00f"
    },
]

/* Variables */
let cBuffer = [];
let zBuffer = [];
let pMatrix = [];
let triangles2d = [];

let fov = 90;
let aspectRatio = canvas.height / canvas.width;
let near = 0.1;
let far = 1000;
let fovRad = 1 / Math.tan(fov * 0.5 / 180 * Math.PI);
let angle = 0;

/* Functions */
function matrixMultiply(m1, m2){
    let result = [];
    for(let i = 0; i < m2.length; i++){
        result.push(
            m1[0] * m2[i][0] +
            m1[1] * m2[i][1] +
            m1[2] * m2[i][2]
        )
    }

    return result;
}

function area(p1, p2, p3) {
    return Math.abs(
        p1.x * (p2.y - p3.y) +
        p2.x * (p3.y - p1.y) +
        p3.x * (p1.y - p2.y)
    ) / 2;
}

/* Animation Loop */
refresh();
function refresh() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Initialize Color Buffer */
    for(let x = 0; x < canvas.width; x++){
        let arr = [];
        for(let y = 0; y < canvas.height; y++){
            arr.push("#000");
        }
        cBuffer.push(arr);
    }

    /* Initialize Z Buffer */
    for(let x = 0; x < canvas.width; x++){
        let arr = [];
        for(let y = 0; y < canvas.height; y++){
            arr.push(Infinity);
        }
        zBuffer.push(arr);
    }

    /* Projection Matrix */
    for(let x = 0; x <= 3; x++){
        let arr = [];
        for(let y = 0; y <= 3; y++){
            arr.push(0);
        }
        pMatrix.push(arr);
    }

    pMatrix[0][0] = aspectRatio * fovRad;
    pMatrix[1][1] = fovRad;
    pMatrix[2][2] = far / (far - near);
    pMatrix[2][3] = 1;
    pMatrix[3][2] = (-far * near) / (far - near);

    /* Convert To 2d */
    angle += 0.5;

    let rotationX = [
        [ 1, 0, 0, 0 ],
        [ 0, Math.cos(angle), Math.sin(angle), 0 ],
        [ 0, -Math.sin(angle), Math.cos(angle), 0 ],
        [ 0, 0, 1, 0 ]
    ]

    let rotationY = [
        [ Math.cos(angle), 0, Math.sin(angle), 0 ],
        [ 0, 1, 0, 0 ],
        [ -Math.sin(angle), 0, Math.cos(angle), 0 ],
        [ 0, 0, 0, 1 ]
    ]

    let rotationZ = [
        [ Math.cos(angle), Math.sin(angle), 0, 0 ],
        [ -Math.sin(angle), Math.cos(angle), 0, 1 ],
        [ 0, 0, 1, 0 ],
        [ 0, 0, 0, 1 ]
    ]

    for(let i = 0; i < triangles.length; i++){
        let triangle2d = [];
        for(let j = 0; j < triangles[i].matrices.length; j++){
            let rotated3d;
            rotated3d = matrixMultiply(triangles[i].matrices[j], rotationZ);
            rotated3d = matrixMultiply(rotated3d, rotationY);
            rotated3d = matrixMultiply(rotated3d, rotationX);

            let point2d = matrixMultiply(rotated3d, pMatrix);

            let x = Math.round(point2d[0] * 100 + canvas.width / 2);
            let y = Math.round(point2d[1] * 100 + canvas.height / 2);

            triangle2d.push({ x: x, y: y, z: point2d[2] });
        }

        triangles2d.push({
            points: triangle2d,
            color: triangles[i].color
        });
    }

    /* Rasterize Image */
    for(let i = 0; i < triangles2d.length; i++){
        let allX = triangles2d[i].points.map(({x}) => x);
        let allY = triangles2d[i].points.map(({y}) => y);

        let xMin = Math.min(...allX);
        let yMin = Math.min(...allY);

        let xMax = Math.max(...allX);
        let yMax = Math.max(...allY);

        let triangleArea = area(
            triangles2d[i].points[0],
            triangles2d[i].points[1],
            triangles2d[i].points[2]
        );

        for(let y = yMin; y < yMax; y++){
            if(y >= canvas.height) continue;

            for(let x = xMin; x < xMax; x++){
                if(x >= canvas.width) continue;

                let sum = 0;
                sum += area(
                    {x: x, y: y},
                    triangles2d[i].points[1],
                    triangles2d[i].points[2]
                );

                sum += area(
                    triangles2d[i].points[0],
                    {x: x, y: y},
                    triangles2d[i].points[2]
                );

                sum += area(
                    triangles2d[i].points[0],
                    triangles2d[i].points[1],
                    {x: x, y: y}
                );

                if(sum == triangleArea){
                    let x1, x2, x3, y1, y2, y3, z1, z2, z3;

                    x1 = triangles2d[i].points[0].x;
                    x2 = triangles2d[i].points[1].x;
                    x3 = triangles2d[i].points[2].x;

                    y1 = triangles2d[i].points[0].y;
                    y2 = triangles2d[i].points[1].y;
                    y3 = triangles2d[i].points[2].y;

                    z1 = triangles2d[i].points[0].z;
                    z2 = triangles2d[i].points[1].z;
                    z3 = triangles2d[i].points[2].z;

                    let z = (
                        z3 * (x - x1) * (y - y2) +
                        z1 * (x - x2) * (y - y3) +
                        z2 * (x - x3) * (y - y1) -
                        z2 * (x - x1) * (y - y3) -
                        z3 * (x - x2) * (y - y1) -
                        z1 * (x - x3) * (y - y2)
                    ) /
                    (
                        (x - x1) * (y - y2) +
                        (x - x2) * (y - y3) +
                        (x - x3) * (y - y1) -
                        (x - x1) * (y - y3) -
                        (x - x2) * (y - y1) -
                        (x - x3) * (y - y2)
                    )

                    if(zBuffer[x][y] > z){
                        zBuffer[x][y] = z;
                        cBuffer[x][y] = triangles2d[i].color;
                    }
                }
            }
        }
    }

    /* Render Screen */
    for(let x = 0; x < canvas.width; x++){
        for(let y = 0; y < canvas.height; y++){
            ctx.fillStyle = cBuffer[x][y];
            ctx.fillRect(x, y, 1, 1);
        }
    }

    /* Delete Data */
    cBuffer = [];
    zBuffer = [];
    pMatrix = [];
    triangles2d = [];

    setTimeout(refresh, 1000);
}