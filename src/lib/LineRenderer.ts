import * as THREE from "three";

const LINE_BUFFER_SIZE = 1000000;

export class Line{
    positions: THREE.Vector2[] = [];
}

export class LineRenderer{
    buffer: Float32Array = new Float32Array( LINE_BUFFER_SIZE * 3 );
    bufferIndex: int = 0;
    geometry: THREE.BufferGeometry;
    lineSegments: THREE.LineSegments;
    lines: {[id: String]: Line} = {};
    id: String;

    constructor(id: String){
        this.id = id;
        this.geometry = new THREE.BufferGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x0077ff });
        this.geometry.setAttribute( 'position', new THREE.BufferAttribute( this.buffer, 3 ) );
        this.lineSegments = new THREE.LineSegments(this.geometry, material);
        this.lineSegments.frustumCulled = false;
    }

    addLine(line: Line){
        let elementCount = 0;
        const startIndex = this.bufferIndex;
        for (let i = 0; i < line.positions.length-1; i++){
            const pos1 = line.positions[i];
            this.buffer[this.bufferIndex++] = pos1.x;
            this.buffer[this.bufferIndex++] = pos1.y;
            this.buffer[this.bufferIndex++] = 0;
            const pos2 = line.positions[i+1];
            this.buffer[this.bufferIndex++] = pos2.x;
            this.buffer[this.bufferIndex++] = pos2.y;
            this.buffer[this.bufferIndex++] = 0;
            elementCount += 2 * 3;
        }
        this.geometry.attributes.position.addUpdateRange(startIndex, elementCount);
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.setDrawRange(0, linebufferIndex / 3);
        const lineID = this.id + "_" + Object.keys(this.lines).length;
        this.lines[lineID] = line;
    }

}
