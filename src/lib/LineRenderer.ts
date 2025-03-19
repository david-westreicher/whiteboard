import * as THREE from "three";

const LINE_BUFFER_SIZE = 10000000;
const LINE_WIDTH = 4;
const ERASE_DISTANCE_SQ = 20 * 20;
const MAX_FAN_STEPS = 4;

export class Line{
    positions: THREE.Vector3[] = [];
}

export class LineRenderer{
    buffer: Float32Array;
    bufferIndex: number = 0;
    geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh;
    lines = new Map<string, Line>();
    bufferPositions = new Map<string, [number, number]>();
    id: String;
    lineID: number = 0;

    constructor(id: String, color:number=0x0077ff, buffer_size:number=LINE_BUFFER_SIZE){
        this.id = id;
        this.buffer = new Float32Array( buffer_size * 3 );
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial( { color: color , wireframe: false, side: THREE.DoubleSide} );
        this.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.mesh = new THREE.Mesh(this.geometry, material);
        this.mesh.frustumCulled = false;
        //for (let i = 0; i < 100; i++){
        //    console.log(i)
        //    for (let j = 0; j < 1000 ; j++){
        //        const l = new Line()
        //        l.positions.push(new THREE.Vector3(j*4,i*4,1))
        //        l.positions.push(new THREE.Vector3(j*4,i*4,1))
        //        l.positions.push(new THREE.Vector3(j*4+1,i*4,1))
        //        l.positions.push(new THREE.Vector3(j*4+1,i*4,1))
        //        this.addLine(l);
        //    }
        //}
    }

    addLine(line: Line, lineID?: string): string{
        let elementCount = 0;
        const startIndex = this.bufferIndex;
        for (let i = 0; i < line.positions.length; i++){
            line.positions[i] = new THREE.Vector3(line.positions[i].x, line.positions[i].y, line.positions[i].z);
        }
        // draw begin circle
        const start = new THREE.Vector2(line.positions[0].x, line.positions[0].y);
        const startWidth = ((line.positions.length == 1) ? 0.5 : 0.5 ) * LINE_WIDTH * line.positions[0].z;
        const startCircle = start.clone().add(new THREE.Vector2(0, startWidth));
        elementCount += this.drawFan(start, startCircle, 2 * Math.PI, MAX_FAN_STEPS * 2);

        // draw rest of line
        for (let i = 0; i < line.positions.length; i++){
            const p0 = i > 0 ? line.positions[i-1] : line.positions[0];
            const p1 = line.positions[i];
            const p2 = i+1 < line.positions.length ? line.positions[i+1] : line.positions[i];
            /*
                A      ^     B
                     n1|
                p0 --------- p1
                             |
                C           D| ->
                             | n2
                             p2

                (a,b,c), (c,m1,b), (m1, m2, b)
                (a,c,d), (d,m1,b), (m1, m2, b)
            */  
            const width0 = p0.z;
            const width1 = p1.z;
            const dir1 = p1.clone().sub(p0).normalize().multiplyScalar(LINE_WIDTH/2 * width0);
            const dir2 = p2.clone().sub(p1).normalize().multiplyScalar(LINE_WIDTH/2 * width1);
            const norm1 = new THREE.Vector3(-dir1.y, dir1.x,0);
            const norm2 = new THREE.Vector3(-dir2.y, dir2.x,0);
            const a = p0.clone().sub(norm1);
            const c = p0.clone().add(norm1);
            norm1.multiplyScalar(width1 / width0);
            const b = p1.clone().sub(norm1);
            const d = p1.clone().add(norm1);
            for (let p of [a,b,c,b,d,c]){
                this.buffer[this.bufferIndex++] = p!.x;
                this.buffer[this.bufferIndex++] = p!.y;
                this.buffer[this.bufferIndex++] = 0;
                elementCount += 3;
            }

            const leftBending = norm1.dot(dir2) >= 0;
            const center = new THREE.Vector2(p1.x, p1.y);
            let prevFanPoint = leftBending ? new THREE.Vector2(b.x, b.y) : new THREE.Vector2(d.x, d.y) ;
            let angle = norm1.angleTo(norm2) * (leftBending ? 1: -1);
            if (i == line.positions.length-1){
                angle = Math.PI;
            }
            const fanSteps = Math.max(1, Math.min(MAX_FAN_STEPS, Math.ceil(4 * Math.abs(angle) / Math.PI)))
            elementCount += this.drawFan(center, prevFanPoint, angle, fanSteps);
        }
        this.geometry.attributes.position.addUpdateRange(startIndex, elementCount);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.setDrawRange(0, this.bufferIndex/3);
        if (typeof lineID === "undefined")
            lineID = this.id + "_" + this.lineID++;
        this.lines.set(lineID, line);
        this.bufferPositions.set(lineID, [startIndex, startIndex + elementCount]);
        return lineID;
    }

    drawFan(center: Vector2, prevFanPoint: Vector2, angle: number, fanSteps: number): number{
        let elementCount = 0;
        for (let t = 0; t < fanSteps; t++){
            const nextFanPoint = prevFanPoint.clone().rotateAround(center, angle / fanSteps)
            for (let p of [prevFanPoint, center, nextFanPoint]){
                this.buffer[this.bufferIndex++] = p!.x;
                this.buffer[this.bufferIndex++] = p!.y;
                this.buffer[this.bufferIndex++] = 0;
                elementCount += 3;
            }
            prevFanPoint = nextFanPoint;
        }
        return elementCount;
    }

    erase(erasePos: THREE.Vector3): string[] {
        const linesToRemove = [];

        for (let [lineID, line] of this.lines){
            for (let pos of line.positions){
                if (pos.distanceToSquared(erasePos) < ERASE_DISTANCE_SQ){
                    linesToRemove.push(lineID);
                    break;
                }
            }
        }
        for (let lineID of linesToRemove){
            this.removeLine(lineID);
        }
        return linesToRemove;
    }

    removeLine(lineID: string) {
        const [startIndex, endIndex] = this.bufferPositions.get(lineID) || [0, 0];
        for (let i = startIndex; i < endIndex; i++){
            this.buffer[i] = 0;
        }
        this.geometry.attributes.position.addUpdateRange(startIndex, endIndex - startIndex);
        this.geometry.attributes.position.needsUpdate = true;
        this.lines.delete(lineID);
    }

    clear() {
        this.bufferIndex = 0;
        this.geometry.setDrawRange(0, 0);
        this.lines.clear();
    }

}
