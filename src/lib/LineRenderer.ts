import * as THREE from "three";

const LINE_BUFFER_SIZE = 10000000;
const LINE_WIDTH = 4;
const ERASE_DISTANCE_SQ = 20 * 20;

export class Line{
    positions: THREE.Vector3[] = [];
}

export class LineRenderer{
    buffer: Float32Array = new Float32Array( LINE_BUFFER_SIZE * 3 );
    bufferIndex: int = 0;
    geometry: THREE.BufferGeometry;
    mesh: THREE.LineSegments;
    lines = new Map<string, Line>();
    bufferPositions = new Map<string, int[]>();
    id: String;

    constructor(id: String, color:int=0x0077ff){
        this.id = id;
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
        let a = null;
        let c = null;
        for (let i = 1; i < line.positions.length-1; i++){
            const p0 = line.positions[i-1];
            const p1 = line.positions[i];
            const p2 = line.positions[i+1];
            /*
                A      ^     B    M2
                     n1|        /
                p0 --------- p1
                           / |
                C        M1 D| ->
                             | n2
                             p2

                (a,b,c), (c,m1,b), (m1, m2, b)
                (a,c,d), (d,m1,b), (m1, m2, b)
            */  
            const width = p1.z;
            const dir1 = p1.clone().sub(p0).normalize().multiplyScalar(LINE_WIDTH/2 * width);
            const dir2 = p2.clone().sub(p1).normalize().multiplyScalar(LINE_WIDTH/2 * width);
            const norm1 = new THREE.Vector3(-dir1.y, dir1.x,0);
            const norm2 = new THREE.Vector3(-dir2.y, dir2.x,0);
            const norm = norm1.clone().add(norm2).normalize().multiplyScalar(LINE_WIDTH/2 * width);
            if(a == null){
                a = p0.clone().sub(norm1);
                c = p0.clone().add(norm1);
            }
            const b = p1.clone().sub(norm1);
            const d = p1.clone().add(norm1);
            const m2 = p1.clone().add(norm);
            const m1 = p1.clone().sub(norm);

            if (norm1.dot(dir2) >= 0) {
                for (let p of [a,b,c,b,c,m2,b,m1,m2]){
                    this.buffer[this.bufferIndex++] = p.x;
                    this.buffer[this.bufferIndex++] = p.y;
                    this.buffer[this.bufferIndex++] = 0;
                    elementCount += 3;
                }
                a = m1
                c = m2
            }else{
                for (let p of [a,c,d,d,m2,b,a,b,d]){
                    this.buffer[this.bufferIndex++] = p.x;
                    this.buffer[this.bufferIndex++] = p.y;
                    this.buffer[this.bufferIndex++] = 0;
                    elementCount += 3;
                }
                a = b
                c = m2
            }
        }
        this.geometry.attributes.position.addUpdateRange(startIndex, elementCount);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.setDrawRange(0, this.bufferIndex/3);
        if (typeof lineID === "undefined")
            lineID = this.id + "_" + this.lines.size;
        this.lines.set(lineID, line);
        this.bufferPositions.set(lineID, [startIndex, startIndex + elementCount]);
        return lineID;
    }

    erase(erasePos: THREE.Vector2): string[] {
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
        const [startIndex, endIndex] = this.bufferPositions.get(lineID);
        for (let i = startIndex; i < endIndex; i++){
            this.buffer[i] = 0;
        }
        this.geometry.attributes.position.addUpdateRange(startIndex, endIndex - startIndex);
        this.geometry.attributes.position.needsUpdate = true;
        delete this.lines.get(lineID);
    }

    clear() {
        this.bufferIndex = 0;
        this.geometry.setDrawRange(0, 0);
        this.lines = new Map()
    }

}
