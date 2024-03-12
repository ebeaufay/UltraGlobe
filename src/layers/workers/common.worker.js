const common = {
    getGenerateTerrainTile: ()=>{
        return `
        generateNorthPoleTile = function (resolution, bounds, elevation) {
            if (resolution < 2) {
                console.log("unsupported resolution");
                return;
            }
        
        
            const stepY = (bounds.max.y - bounds.min.y) / (resolution - 1);
            let stepX = (bounds.max.x - bounds.min.x) / (resolution - 1);
            const tempVector = {};
            const tempVector2 = {};
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    let lon = bounds.min.x + stepX * x;
                    let lat = bounds.min.y + stepY * y
                    if (lat > 1.5707963267) {
                        lon += Math.PI;
                        lat = 1.5707963267 - (lat - 1.5707963267)
                    } else if (lat < -1.5707963267) {
                        lon += Math.PI;
                        lat = -1.5707963267 - (lat + 1.5707963267)
                    }
                    tempVector.x = lon;
                    tempVector.y = lat;
                    tempVector.z = elevation[(y + 1) * (resolution + 2) + x + 1];
                    _llhToCartesianFastSFCT(tempVector, true);
                    verticesIncludingBorder.push(tempVector.x, tempVector.y, tempVector.z);
                }
            }
        
            var indices = [];
            var skirtIndices = [];
            var vertices = [];
            var skirts = [];
            var normals = [];
            var skirtNormals = [];
            var uvs = [];
            var skirtUVs = [];
        
            tempVector.x = bounds.max.x;
            tempVector.y = bounds.max.y;
            tempVector.z = 0;
        
            _llhToCartesianFastSFCT(tempVector, true);
            const shift = { x: 0, y: 0, z: tempVector.z };
        
            stepX = 0;
            let stepsX = 0;
        
            //// vertices
            for (var y = 0; y <= resolution - 1; y += 1) {
                stepsX = resolution - y;
                stepX = stepsX > 1 ? (bounds.max.x - bounds.min.x) / (stepsX - 1) : 0;
                for (var x = 0; x <= stepsX - 1; x += 1) {
                    let indexX = stepsX == 1 ? (resolution - 1) * 0.5 : ((resolution - 1) / (stepsX - 1)) * x + 1;
                    uvs.push((indexX - 1) / (resolution - 1), y / (resolution - 1));
                    if (Number.isInteger(indexX) && y < resolution - 1) {
                        //console.log(indexX)
                        const centerPointIndex = ((y + 1) * (resolution + 2) + indexX) * 3;
                        vertices.push(verticesIncludingBorder[centerPointIndex] - shift.x,
                            verticesIncludingBorder[centerPointIndex + 1] - shift.y,
                            verticesIncludingBorder[centerPointIndex + 2] - shift.z);
        
                        const southPointIndex = centerPointIndex - (resolution + 2) * 3;
                        const northPointIndex = centerPointIndex + (resolution + 2) * 3;
                        const westPointIndex = centerPointIndex - 3;
                        const easthPointIndex = centerPointIndex + 3;
                        tempVector.x = verticesIncludingBorder[northPointIndex] - verticesIncludingBorder[southPointIndex];
                        tempVector.y = verticesIncludingBorder[northPointIndex + 1] - verticesIncludingBorder[southPointIndex + 1];
                        tempVector.z = verticesIncludingBorder[northPointIndex + 2] - verticesIncludingBorder[southPointIndex + 2];
        
                        tempVector2.x = verticesIncludingBorder[easthPointIndex] - verticesIncludingBorder[westPointIndex];
                        tempVector2.y = verticesIncludingBorder[easthPointIndex + 1] - verticesIncludingBorder[westPointIndex + 1];
                        tempVector2.z = verticesIncludingBorder[easthPointIndex + 2] - verticesIncludingBorder[westPointIndex + 2];
        
        
                        crossProductSFCT(tempVector2, tempVector, tempVector)
                        normalize(tempVector);
                        normals.push(tempVector.x, tempVector.y, tempVector.z);
                        if (y == 0 || y == resolution - 1 || x == 0 || x == stepsX - 1) {
                            skirts.push(verticesIncludingBorder[centerPointIndex] - shift.x,
                                verticesIncludingBorder[centerPointIndex + 1] - shift.y,
                                verticesIncludingBorder[centerPointIndex + 2] - shift.z);
                            skirts.push(verticesIncludingBorder[centerPointIndex] * 0.99 - shift.x,
                                verticesIncludingBorder[centerPointIndex + 1] * 0.99 - shift.y,
                                verticesIncludingBorder[centerPointIndex + 2] * 0.99 - shift.z);
                            skirtUVs.push((indexX - 1) / (resolution - 1), y / (resolution - 1), (indexX - 1) / (resolution - 1), y / (resolution - 1));
                            skirtNormals.push(tempVector.x, tempVector.y, tempVector.z, tempVector.x, tempVector.y, tempVector.z);
        
        
                        }
                    } else {
                        const leftIndex = ((y + 1) * (resolution + 2) + Math.floor(indexX)) * 3;
                        const rightIndex = ((y + 1) * (resolution + 2) + Math.ceil(indexX)) * 3;
                        const remainder = indexX - Math.floor(indexX);
                        const xx = verticesIncludingBorder[leftIndex] * (1 - remainder) + verticesIncludingBorder[rightIndex] * remainder;
                        const yy = verticesIncludingBorder[leftIndex + 1] * (1 - remainder) + verticesIncludingBorder[rightIndex + 1] * remainder;
                        const zz = verticesIncludingBorder[leftIndex + 2] * (1 - remainder) + verticesIncludingBorder[rightIndex + 2] * remainder;
                        vertices.push(xx - shift.x,
                            yy - shift.y,
                            zz - shift.z);
        
                        const southWest = leftIndex - (resolution + 2) * 3;
                        const southEast = rightIndex - (resolution + 2) * 3;
                        const northWest = leftIndex + (resolution + 2) * 3;
                        const northEast = rightIndex + (resolution + 2) * 3;
        
                        if (y < resolution - 1) {
        
                            tempVector.x = verticesIncludingBorder[northEast] - verticesIncludingBorder[southWest];
                            tempVector.y = verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southWest + 1];
                            tempVector.z = verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southWest + 2];
        
                            tempVector2.x = verticesIncludingBorder[northWest] - verticesIncludingBorder[southEast];
                            tempVector2.y = verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southEast + 1];
                            tempVector2.z = verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southEast + 2];
        
                        } else {
        
                            tempVector.x = verticesIncludingBorder[northWest] - verticesIncludingBorder[southWest];
                            tempVector.y = verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southWest + 1];
                            tempVector.z = verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southWest + 2];
        
                            tempVector2.x = verticesIncludingBorder[northEast] - verticesIncludingBorder[southEast];
                            tempVector2.y = verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southEast + 1];
                            tempVector2.z = verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southEast + 2];
        
                        }
                        crossProductSFCT(tempVector, tempVector2, tempVector)
                        normalize(tempVector);
                        normals.push(tempVector.x, tempVector.y, tempVector.z);
        
        
                        if (y == 0 || y == resolution - 1 || x == 0 || x == stepsX - 1) {
                            skirtUVs.push((indexX - 1) / (resolution - 1), y / (resolution - 1), (indexX - 1) / (resolution - 1), y / (resolution - 1));
                            skirtNormals.push(tempVector.x, tempVector.y, tempVector.z, tempVector.x, tempVector.y, tempVector.z);
                            skirts.push(xx - shift.x,
                                yy - shift.y,
                                zz - shift.z);
                            skirts.push(xx * 0.99 - shift.x,
                                yy * 0.99 - shift.y,
                                zz * 0.99 - shift.z);
                        }
                    }
        
        
                }
            }
            let startCurrentRow = 0;
            let startNextRow = 0;
            const leftColumnIndexes = [];
            const rightColumnIndexes = [];
            for (let row = 0; row < resolution - 1; row++) {
                const columns = resolution - row;
                startCurrentRow = startNextRow;
                startNextRow += columns;
                leftColumnIndexes.push(startCurrentRow);
                rightColumnIndexes.push(startNextRow - 1);
                for (let col = 0; col < columns - 1; col++) {
        
                    // First triangle
                    indices.push(startCurrentRow + col);
                    indices.push(startCurrentRow + col + 1);
                    indices.push(startNextRow + col);
        
                    // Second triangle (avoid creating triangles in the last column)
                    if (col < columns - 2) {
                        indices.push(startCurrentRow + col + 1);
                        indices.push(startNextRow + col + 1);
                        indices.push(startNextRow + col);
                    }
                }
        
            }
        
            leftColumnIndexes.push(startNextRow);
            rightColumnIndexes.push(startNextRow);
        
        
            //first skirt
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(i * 2, i * 2 + 1, (i + 1) * 2);
                skirtIndices.push((i + 1) * 2, i * 2 + 1, (i + 1) * 2 + 1);
            }
        
            //second skirt
            skirtIndices.push(0, resolution * 2, 1);
            skirtIndices.push(resolution * 2, resolution * 2 + 1, 1);
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push(resolution * 2 + i * 4, resolution * 2 + (i + 1) * 4, resolution * 2 + i * 4 + 1);
                skirtIndices.push(resolution * 2 + (i + 1) * 4, resolution * 2 + (i + 1) * 4 + 1, resolution * 2 + i * 4 + 1);
            }
        
            //third skirt
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push((resolution - 1) * 2 + (i * 4), (resolution - 1) * 2 + (i * 4) + 1, (resolution - 1) * 2 + ((i + 1) * 4));
                skirtIndices.push((resolution - 1) * 2 + ((i + 1) * 4), (resolution - 1) * 2 + (i * 4) + 1, (resolution - 1) * 2 + ((i + 1) * 4) + 1);
            }
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4), (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (skirts.length / 3) - 2);
            skirtIndices.push((skirts.length / 3) - 2, (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (skirts.length / 3) - 1);
        
            const indicesBuffer = new ArrayBuffer(indices.length * Int32Array.BYTES_PER_ELEMENT);
            const verticesSharedbuffer = new ArrayBuffer(vertices.length * Float32Array.BYTES_PER_ELEMENT);
            const normalsSharedbuffer = new ArrayBuffer(normals.length * Float32Array.BYTES_PER_ELEMENT);
            const uvsSharedbuffer = new ArrayBuffer(uvs.length * Float32Array.BYTES_PER_ELEMENT);
            
            const skirtIndicesBuffer = new ArrayBuffer(skirtIndices.length * Int32Array.BYTES_PER_ELEMENT);
            const skirtVerticesSharedbuffer = new ArrayBuffer(skirts.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtNormalsSharedbuffer = new ArrayBuffer(skirtNormals.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtUVsSharedbuffer = new ArrayBuffer(skirtUVs.length * Float32Array.BYTES_PER_ELEMENT);
        
            const indicesArray = new Int32Array(indicesBuffer);
            const verticesArray = new Float32Array(verticesSharedbuffer);
            const normalsArray = new Float32Array(normalsSharedbuffer);
            const uvsArray = new Float32Array(uvsSharedbuffer);
            const skirtIndicesArray = new Int32Array(skirtIndicesBuffer);
            const skirtVerticesArray = new Float32Array(skirtVerticesSharedbuffer);
            const skirtNormalsArray = new Float32Array(skirtNormalsSharedbuffer);
            const skirtUVsArray = new Float32Array(skirtUVsSharedbuffer);
        
            // Copy the numbers into the Float32Array
            indicesArray.set(indices);
            verticesArray.set(vertices);
            normalsArray.set(normals);
            uvsArray.set(uvs);
            skirtIndicesArray.set(skirtIndices);
            skirtVerticesArray.set(skirts);
            skirtNormalsArray.set(skirtNormals);
            skirtUVsArray.set(skirtUVs);
            return {
                shift: shift,
                indices: indicesBuffer,
                vertices: verticesSharedbuffer,
                normals: normalsSharedbuffer,
                uvs: uvsSharedbuffer,
                skirtIndices: skirtIndicesBuffer,
                skirts: skirtVerticesSharedbuffer,
                skirtNormals: skirtNormalsSharedbuffer,
                skirtUVs: skirtUVsSharedbuffer
            }
        
            
        
        };
        generateSouthPoleTile = function (resolution, bounds, elevation) {
            if (resolution < 2) {
                console.log("unsupported resolution");
                return;
            }
        
        
            const stepY = (bounds.max.y - bounds.min.y) / (resolution - 1);
            let stepX = (bounds.max.x - bounds.min.x) / (resolution - 1);
            const tempVector = {};
            const tempVector2 = {};
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    let lon = bounds.min.x + stepX * x;
                    let lat = bounds.min.y + stepY * y
                    if (lat > 1.5707963267) {
                        lon += Math.PI;
                        lat = 1.5707963267 - (lat - 1.5707963267)
                    } else if (lat < -1.5707963267) {
                        lon += Math.PI;
                        lat = -1.5707963267 - (lat + 1.5707963267)
                    }
                    tempVector.x = lon;
                    tempVector.y = lat;
                    tempVector.z = elevation[(y + 1) * (resolution + 2) + x + 1];
        
                    _llhToCartesianFastSFCT(tempVector, true);
                    verticesIncludingBorder.push(tempVector.x, tempVector.y, tempVector.z);
                }
            }
        
            var indices = [];
            var skirtIndices = [];
            var vertices = [];
            var skirts = [];
            var normals = [];
            var skirtNormals = [];
            var uvs = [];
            var skirtUVs = [];
        
            tempVector.x = bounds.min.x;
            tempVector.y = bounds.min.y;
            tempVector.z = 0;
        
            _llhToCartesianFastSFCT(tempVector, true);
            const shift = { x: 0, y: 0, z: tempVector.z };
        
            stepX = 0;
            let stepsX = 0;
        
            //// vertices
            for (var y = 0; y <= resolution - 1; y += 1) {
                stepsX = y + 1;
                stepX = stepsX > 1 ? (bounds.max.x - bounds.min.x) / (stepsX - 1) : 0;
                for (var x = 0; x <= stepsX - 1; x += 1) {
                    let indexX = stepsX == 1 ? (resolution - 1) * 0.5 : ((resolution - 1) / (stepsX - 1)) * x + 1;
                    uvs.push((indexX - 1) / (resolution - 1), y / (resolution - 1));
                    if (Number.isInteger(indexX) && y > 0) {
                        //console.log(indexX)
                        const centerPointIndex = ((y + 1) * (resolution + 2) + indexX) * 3;
                        vertices.push(verticesIncludingBorder[centerPointIndex] - shift.x,
                            verticesIncludingBorder[centerPointIndex + 1] - shift.y,
                            verticesIncludingBorder[centerPointIndex + 2] - shift.z);
        
                        const southPointIndex = centerPointIndex - (resolution + 2) * 3;
                        const northPointIndex = centerPointIndex + (resolution + 2) * 3;
                        const westPointIndex = centerPointIndex - 3;
                        const easthPointIndex = centerPointIndex + 3;
        
                        tempVector.x = verticesIncludingBorder[northPointIndex] - verticesIncludingBorder[southPointIndex];
                        tempVector.y = verticesIncludingBorder[northPointIndex + 1] - verticesIncludingBorder[southPointIndex + 1];
                        tempVector.z = verticesIncludingBorder[northPointIndex + 2] - verticesIncludingBorder[southPointIndex + 2];
        
                        tempVector2.x = verticesIncludingBorder[easthPointIndex] - verticesIncludingBorder[westPointIndex];
                        tempVector2.y = verticesIncludingBorder[easthPointIndex + 1] - verticesIncludingBorder[westPointIndex + 1];
                        tempVector2.z = verticesIncludingBorder[easthPointIndex + 2] - verticesIncludingBorder[westPointIndex + 2];
        
        
                        crossProductSFCT(tempVector2, tempVector, tempVector)
                        normalize(tempVector);
                        normals.push(tempVector.x, tempVector.y, tempVector.z);
        
                        if (y == 0 || y == resolution - 1 || x == 0 || x == stepsX - 1) {
                            skirts.push(verticesIncludingBorder[centerPointIndex] - shift.x,
                                verticesIncludingBorder[centerPointIndex + 1] - shift.y,
                                verticesIncludingBorder[centerPointIndex + 2] - shift.z);
                            skirts.push(verticesIncludingBorder[centerPointIndex] * 0.99 - shift.x,
                                verticesIncludingBorder[centerPointIndex + 1] * 0.99 - shift.y,
                                verticesIncludingBorder[centerPointIndex + 2] * 0.99 - shift.z);
                            skirtNormals.push(tempVector.x, tempVector.y, tempVector.z, tempVector.x, tempVector.y, tempVector.z);
                            skirtUVs.push((indexX - 1) / (resolution - 1), y / (resolution - 1), (indexX - 1) / (resolution - 1), y / (resolution - 1));
                        }
                    } else {
                        const leftIndex = ((y + 1) * (resolution + 2) + Math.floor(indexX)) * 3;
                        const rightIndex = ((y + 1) * (resolution + 2) + Math.ceil(indexX)) * 3;
                        const remainder = indexX - Math.floor(indexX);
                        const xx = verticesIncludingBorder[leftIndex] * (1 - remainder) + verticesIncludingBorder[rightIndex] * remainder;
                        const yy = verticesIncludingBorder[leftIndex + 1] * (1 - remainder) + verticesIncludingBorder[rightIndex + 1] * remainder;
                        const zz = verticesIncludingBorder[leftIndex + 2] * (1 - remainder) + verticesIncludingBorder[rightIndex + 2] * remainder;
                        vertices.push(xx - shift.x,
                            yy - shift.y,
                            zz - shift.z);
        
                        const southWest = leftIndex - (resolution + 2) * 3;
                        const southEast = rightIndex - (resolution + 2) * 3;
                        const northWest = leftIndex + (resolution + 2) * 3;
                        const northEast = rightIndex + (resolution + 2) * 3;
        
        
                        if (y > 0) {
        
                            tempVector.x = verticesIncludingBorder[northEast] - verticesIncludingBorder[southWest];
                            tempVector.y = verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southWest + 1];
                            tempVector.z = verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southWest + 2];
        
                            tempVector2.x = verticesIncludingBorder[northWest] - verticesIncludingBorder[southEast];
                            tempVector2.y = verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southEast + 1];
                            tempVector2.z = verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southEast + 2];
        
                        } else {
                            tempVector.x = verticesIncludingBorder[northEast] - verticesIncludingBorder[southEast];
                            tempVector.y = verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southEast + 1];
                            tempVector.z = verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southEast + 2];
        
                            tempVector2.x = verticesIncludingBorder[northWest] - verticesIncludingBorder[southWest];
                            tempVector2.y = verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southWest + 1];
                            tempVector2.z = verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southWest + 2];
                        }
        
        
                        crossProductSFCT(tempVector, tempVector2, tempVector)
                        normalize(tempVector);
                        normals.push(tempVector.x, tempVector.y, tempVector.z);
        
                        if (y == 0 || y == resolution - 1 || x == 0 || x == stepsX - 1) {
                            skirtUVs.push((indexX - 1) / (resolution - 1), y / (resolution - 1), (indexX - 1) / (resolution - 1), y / (resolution - 1));
                            skirtNormals.push(tempVector.x, tempVector.y, tempVector.z, tempVector.x, tempVector.y, tempVector.z);
                            skirts.push(xx - shift.x,
                                yy - shift.y,
                                zz - shift.z);
                            skirts.push(xx * 0.99 - shift.x,
                                yy * 0.99 - shift.y,
                                zz * 0.99 - shift.z);
                        }
                    }
        
        
                }
            }
            let startCurrentRow = 0;
            let startNextRow = 0;
            const leftColumnIndexes = [];
            const rightColumnIndexes = [];
            for (let row = 0; row < resolution - 1; row++) {
                const columns = row + 1;
                startCurrentRow = startNextRow;
                startNextRow += columns;
                leftColumnIndexes.push(startCurrentRow);
                rightColumnIndexes.push(startNextRow - 1);
                for (let col = 0; col < columns; col++) {
        
                    // First triangle
        
        
                    indices.push(startCurrentRow + col);
                    indices.push(startNextRow + col + 1);
                    indices.push(startNextRow + col);
        
                    // Second triangle (avoid creating triangles in the last column)
                    if (col < columns - 1) {
        
                        indices.push(startCurrentRow + col);
                        indices.push(startCurrentRow + col + 1);
                        indices.push(startNextRow + col + 1);
                    }
                }
        
            }
        
            leftColumnIndexes.push(startNextRow);
            rightColumnIndexes.push(startNextRow + resolution - 1);
        
        
            //first skirt
            skirtIndices.push(0, 2, 1);
            skirtIndices.push(2, 3, 1);
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push(2 + i * 4, 2 + (i + 1) * 4, 2 + i * 4 + 1);
                skirtIndices.push(2 + (i + 1) * 4, 2 + (i + 1) * 4 + 1, 2 + i * 4 + 1);
            }
        
            //second skirt
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push((i * 4), (i * 4) + 1, ((i + 1) * 4));
                skirtIndices.push(((i + 1) * 4), (i * 4) + 1, ((i + 1) * 4) + 1);
            }
            skirtIndices.push((resolution - 2) * 4, (resolution - 2) * 4 + 1, (resolution - 2) * 4 + resolution * 2);
            skirtIndices.push((resolution - 2) * 4 + resolution * 2, (resolution - 2) * 4 + 1, (resolution - 2) * 4 + resolution * 2 + 1);
        
            //third skirt
            const first = (skirts.length / 3) - resolution * 2;
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(first + i * 2, first + (i + 1) * 2, first + i * 2 + 1);
                skirtIndices.push(first + (i + 1) * 2, first + (i + 1) * 2 + 1, first + i * 2 + 1);
            }
        
    
    
            const indicesBuffer = new ArrayBuffer(indices.length * Int32Array.BYTES_PER_ELEMENT);
            const verticesSharedbuffer = new ArrayBuffer(vertices.length * Float32Array.BYTES_PER_ELEMENT);
            const normalsSharedbuffer = new ArrayBuffer(normals.length * Float32Array.BYTES_PER_ELEMENT);
            const uvsSharedbuffer = new ArrayBuffer(uvs.length * Float32Array.BYTES_PER_ELEMENT);
            
            const skirtIndicesBuffer = new ArrayBuffer(skirtIndices.length * Int32Array.BYTES_PER_ELEMENT);
            const skirtVerticesSharedbuffer = new ArrayBuffer(skirts.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtNormalsSharedbuffer = new ArrayBuffer(skirtNormals.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtUVsSharedbuffer = new ArrayBuffer(skirtUVs.length * Float32Array.BYTES_PER_ELEMENT);
        
            const indicesArray = new Int32Array(indicesBuffer);
            const verticesArray = new Float32Array(verticesSharedbuffer);
            const normalsArray = new Float32Array(normalsSharedbuffer);
            const uvsArray = new Float32Array(uvsSharedbuffer);
            const skirtIndicesArray = new Int32Array(skirtIndicesBuffer);
            const skirtVerticesArray = new Float32Array(skirtVerticesSharedbuffer);
            const skirtNormalsArray = new Float32Array(skirtNormalsSharedbuffer);
            const skirtUVsArray = new Float32Array(skirtUVsSharedbuffer);
        
            // Copy the numbers into the Float32Array
            indicesArray.set(indices);
            verticesArray.set(vertices);
            normalsArray.set(normals);
            uvsArray.set(uvs);
            skirtIndicesArray.set(skirtIndices);
            skirtVerticesArray.set(skirts);
            skirtNormalsArray.set(skirtNormals);
            skirtUVsArray.set(skirtUVs);
            return {
                shift: shift,
                indices: indicesBuffer,
                vertices: verticesSharedbuffer,
                normals: normalsSharedbuffer,
                uvs: uvsSharedbuffer,
                skirtIndices: skirtIndicesBuffer,
                skirts: skirtVerticesSharedbuffer,
                skirtNormals: skirtNormalsSharedbuffer,
                skirtUVs: skirtUVsSharedbuffer
            }
        
        };
        generateBaseTile = function (resolution, bounds, elevation) {
            if (resolution < 2) {
                console.log("unsupported resolution");
                return;
            }
            
            var indices = [];
            var skirtIndices = [];
            var vertices = [];
            var skirts = [];
            var normals = [];
            var skirtNormals = [];
            var uvs = [];
            var skirtUVs = [];
        
            
            const stepX = (bounds.max.x - bounds.min.x) / (resolution - 1);
            const stepY = (bounds.max.y - bounds.min.y) / (resolution - 1);
        
            const tempVector = {};
            const tempVector2 = {};
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    tempVector.x = bounds.min.x + stepX * x;
                    tempVector.y = bounds.min.y + stepY * y;
                    tempVector.z = elevation[(y + 1) * (resolution + 2) + x + 1];
        
                    _llhToCartesianFastSFCT(tempVector, true);
                    verticesIncludingBorder.push(tempVector.x, tempVector.y, tempVector.z);
                }
            }
        
            tempVector.x = bounds.max.x;
            tempVector.y = bounds.max.y;
            tempVector.z = 0;
        
            _llhToCartesianFastSFCT(tempVector, true);
            const shift = { x: tempVector.x, y: tempVector.y, z: tempVector.z };
        
            //// vertices
            for (var y = 0; y <= resolution - 1; y += 1) {
                for (var x = 0; x <= resolution - 1; x += 1) {
        
                    const xx = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 1) * 3];
                    const yy = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 1) * 3 + 1];
                    const zz = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 1) * 3 + 2];
                    vertices.push(xx - shift.x, yy - shift.y, zz - shift.z);
        
                    const xxN = verticesIncludingBorder[((y + 2) * (resolution + 2) + x + 1) * 3];
                    const yyN = verticesIncludingBorder[((y + 2) * (resolution + 2) + x + 1) * 3 + 1];
                    const zzN = verticesIncludingBorder[((y + 2) * (resolution + 2) + x + 1) * 3 + 2];
        
                    const xxS = verticesIncludingBorder[((y) * (resolution + 2) + x + 1) * 3];
                    const yyS = verticesIncludingBorder[((y) * (resolution + 2) + x + 1) * 3 + 1];
                    const zzS = verticesIncludingBorder[((y) * (resolution + 2) + x + 1) * 3 + 2];
        
                    const xxE = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 2) * 3];
                    const yyE = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 2) * 3 + 1];
                    const zzE = verticesIncludingBorder[((y + 1) * (resolution + 2) + x + 2) * 3 + 2];
        
                    const xxW = verticesIncludingBorder[((y + 1) * (resolution + 2) + x) * 3];
                    const yyW = verticesIncludingBorder[((y + 1) * (resolution + 2) + x) * 3 + 1];
                    const zzW = verticesIncludingBorder[((y + 1) * (resolution + 2) + x) * 3 + 2];
        
                    tempVector.x = xxN - xxS;
                    tempVector.y = yyN - yyS;
                    tempVector.z = zzN - zzS;
        
                    tempVector2.x = xxE - xxW;
                    tempVector2.y = yyE - yyW;
                    tempVector2.z = zzE - zzW;
        
                    
        
                    
                    crossProductSFCT(tempVector2, tempVector, tempVector);
                    normalize(tempVector);
                    
        
                    normals.push(tempVector.x, tempVector.y, tempVector.z);
                    uvs.push(x / (resolution - 1), y / (resolution - 1));
        
                    if (y == 0 || y == resolution - 1 || x == 0 || x == resolution - 1) {
        
                        skirts.push(xx - shift.x, yy - shift.y, zz - shift.z);
                        skirts.push(xx * 0.99 - shift.x, yy * 0.99 - shift.y, zz * 0.99 - shift.z);
                        skirtNormals.push(tempVector.x, tempVector.y, tempVector.z, tempVector.x, tempVector.y, tempVector.z);
                        skirtUVs.push(x / (resolution - 1), y / (resolution - 1), x / (resolution - 1), y / (resolution - 1));
                    }
        
                }
            }
        
            //// faces
        
            // tile
            for (var i = 0; i < (vertices.length / 3) - resolution - 1; i++) {
                if ((i + 1) % resolution != 0) {
                    indices.push(i, i + 1, i + resolution);
                    indices.push(i + resolution, i + 1, i + 1 + resolution);
                }
            }
        
            //first skirt
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(i * 2, i * 2 + 1, (i + 1) * 2);
                skirtIndices.push((i + 1) * 2, i * 2 + 1, (i + 1) * 2 + 1);
            }
        
            //second skirt
            skirtIndices.push(0, resolution * 2, 1);
            skirtIndices.push(resolution * 2, resolution * 2 + 1, 1);
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push(resolution * 2 + i * 4, resolution * 2 + (i + 1) * 4, resolution * 2 + i * 4 + 1);
                skirtIndices.push(resolution * 2 + (i + 1) * 4, resolution * 2 + (i + 1) * 4 + 1, resolution * 2 + i * 4 + 1);
            }
        
            //third skirt
            for (let i = 0; i < resolution - 2; i++) {
                skirtIndices.push((resolution - 1) * 2 + (i * 4), (resolution - 1) * 2 + (i * 4) + 1, (resolution - 1) * 2 + ((i + 1) * 4));
                skirtIndices.push((resolution - 1) * 2 + ((i + 1) * 4), (resolution - 1) * 2 + (i * 4) + 1, (resolution - 1) * 2 + ((i + 1) * 4) + 1);
            }
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4), (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (resolution - 1) * 2 + ((resolution - 2) * 4) + resolution * 2);
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4) + resolution * 2, (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (resolution - 1) * 2 + ((resolution - 2) * 4) + resolution * 2 + 1);
        
            //fourth skirt
            const first = resolution * 2 + (resolution - 2) * 4;
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(first + i * 2, first + (i + 1) * 2, first + i * 2 + 1);
                skirtIndices.push(first + (i + 1) * 2, first + (i + 1) * 2 + 1, first + i * 2 + 1);
            }
        
            const indicesBuffer = new ArrayBuffer(indices.length * Int32Array.BYTES_PER_ELEMENT);
            const verticesSharedbuffer = new ArrayBuffer(vertices.length * Float32Array.BYTES_PER_ELEMENT);
            const normalsSharedbuffer = new ArrayBuffer(normals.length * Float32Array.BYTES_PER_ELEMENT);
            const uvsSharedbuffer = new ArrayBuffer(uvs.length * Float32Array.BYTES_PER_ELEMENT);
            
            const skirtIndicesBuffer = new ArrayBuffer(skirtIndices.length * Int32Array.BYTES_PER_ELEMENT);
            const skirtVerticesSharedbuffer = new ArrayBuffer(skirts.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtNormalsSharedbuffer = new ArrayBuffer(skirtNormals.length * Float32Array.BYTES_PER_ELEMENT);
            const skirtUVsSharedbuffer = new ArrayBuffer(skirtUVs.length * Float32Array.BYTES_PER_ELEMENT);
        
            const indicesArray = new Int32Array(indicesBuffer);
            const verticesArray = new Float32Array(verticesSharedbuffer);
            const normalsArray = new Float32Array(normalsSharedbuffer);
            const uvsArray = new Float32Array(uvsSharedbuffer);
            const skirtIndicesArray = new Int32Array(skirtIndicesBuffer);
            const skirtVerticesArray = new Float32Array(skirtVerticesSharedbuffer);
            const skirtNormalsArray = new Float32Array(skirtNormalsSharedbuffer);
            const skirtUVsArray = new Float32Array(skirtUVsSharedbuffer);
        
            // Copy the numbers into the Float32Array
            indicesArray.set(indices);
            verticesArray.set(vertices);
            normalsArray.set(normals);
            uvsArray.set(uvs);
            skirtIndicesArray.set(skirtIndices);
            skirtVerticesArray.set(skirts);
            skirtNormalsArray.set(skirtNormals);
            skirtUVsArray.set(skirtUVs);
            return {
                shift: shift,
                indices: indicesBuffer,
                vertices: verticesSharedbuffer,
                normals: normalsSharedbuffer,
                uvs: uvsSharedbuffer,
                skirtIndices: skirtIndicesBuffer,
                skirts: skirtVerticesSharedbuffer,
                skirtNormals: skirtNormalsSharedbuffer,
                skirtUVs: skirtUVsSharedbuffer
            }
        }
        
        function _llhToCartesianFastSFCT(llh, radians = false) {
            const lon = radians ? llh.x : 0.017453292519 * llh.x;
            const lat = radians ? llh.y : 0.017453292519 * llh.y;
            const N = 6378137.0 / (Math.sqrt(1.0 - (0.006694379990141316 * Math.pow(Math.sin(lat), 2.0))));
            const cosLat = Math.cos(lat);
            const cosLon = Math.cos(lon);
            const sinLat = Math.sin(lat);
            const sinLon = Math.sin(lon);
            const nPh = (N + llh.z);
        
            llh.x = nPh * cosLat * cosLon;
            llh.y = nPh * cosLat * sinLon;
            llh.z = (0.993305620009858684 * N + llh.z) * sinLat;
        }
        
        function crossProductSFCT(a, b, sfct) {

            const ax = a.x, ay = a.y, az = a.z;
		    const bx = b.x, by = b.y, bz = b.z;

            sfct.x = ay * bz - az * by;
            sfct.y = az * bx - ax * bz;
            sfct.z = ax * by - ay * bx;
        }
        
        function normalize(v) {
            var length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            v.x= v.x / length
            v.y = v.y / length;
            v.z = v.z / length;
        }
        `;
    }
};
export{common};