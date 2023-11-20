import * as THREE from 'three';

const halfPI = Math.PI * 0.5;
function TerrainMeshGenerator() {
    return {
        generateNorthPoleTile: (geometry, skirtGeometry, resolution, bounds, elevation, llhToCartesian) => {
            if (resolution < 2) {
                console.log("unsupported resolution");
                return;
            }


            const stepY = (bounds.max.y - bounds.min.y) / (resolution - 1);
            let stepX = (bounds.max.x - bounds.min.x) / (resolution - 1);
            const tempVector = new THREE.Vector3();
            const tempVector2 = new THREE.Vector3();
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    let lon = bounds.min.x + stepX * x;
                    let lat = bounds.min.y + stepY * y
                    if (lat > halfPI) {
                        lon += Math.PI;
                        lat = halfPI - (lat - halfPI)
                    } else if (lat < -halfPI) {
                        lon += Math.PI;
                        lat = -halfPI - (lat + halfPI)
                    }
                    tempVector.set(
                        lon,
                        lat,
                        elevation[(y + 1) * (resolution + 2) + x + 1]
                    )
                    llhToCartesian(tempVector, true);
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

            tempVector.set(bounds.max.x, bounds.max.y, 0);

            llhToCartesian(tempVector, true);
            const shift = new THREE.Vector3(0, 0, tempVector.z);

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
                        tempVector.set(
                            verticesIncludingBorder[northPointIndex] - verticesIncludingBorder[southPointIndex],
                            verticesIncludingBorder[northPointIndex + 1] - verticesIncludingBorder[southPointIndex + 1],
                            verticesIncludingBorder[northPointIndex + 2] - verticesIncludingBorder[southPointIndex + 2]
                        )
                        tempVector2.set(
                            verticesIncludingBorder[easthPointIndex] - verticesIncludingBorder[westPointIndex],
                            verticesIncludingBorder[easthPointIndex + 1] - verticesIncludingBorder[westPointIndex + 1],
                            verticesIncludingBorder[easthPointIndex + 2] - verticesIncludingBorder[westPointIndex + 2]
                        )
                        tempVector.crossVectors(tempVector2, tempVector).normalize();
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

                            tempVector.set(
                                verticesIncludingBorder[northEast] - verticesIncludingBorder[southWest],
                                verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southWest + 1],
                                verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southWest + 2]
                            )
                            tempVector2.set(
                                verticesIncludingBorder[northWest] - verticesIncludingBorder[southEast],
                                verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southEast + 1],
                                verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southEast + 2]
                            )
                        } else {
                            tempVector2.set(
                                verticesIncludingBorder[northEast] - verticesIncludingBorder[southEast],
                                verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southEast + 1],
                                verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southEast + 2]
                            )
                            tempVector.set(
                                verticesIncludingBorder[northWest] - verticesIncludingBorder[southWest],
                                verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southWest + 1],
                                verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southWest + 2]
                            )
                        }
                        tempVector.crossVectors(tempVector, tempVector2).normalize();
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
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4), (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (skirts.length/3) - 2);
            skirtIndices.push((skirts.length/3) - 2, (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (skirts.length/3) - 1);



            geometry.setIndex(indices);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

            skirtGeometry.setIndex(skirtIndices);
            skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirts, 3));
            skirtGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
            skirtGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUVs, 2));

            geometry.computeBoundingSphere();
            geometry.computeBoundingBox();
            skirtGeometry.computeBoundingSphere();
            return shift;

        },
        generateSouthPoleTile: (geometry, skirtGeometry, resolution, bounds, elevation, llhToCartesian) => {
            if (resolution < 2) {
                console.log("unsupported resolution");
                return;
            }


            const stepY = (bounds.max.y - bounds.min.y) / (resolution - 1);
            let stepX = (bounds.max.x - bounds.min.x) / (resolution - 1);
            const tempVector = new THREE.Vector3();
            const tempVector2 = new THREE.Vector3();
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    let lon = bounds.min.x + stepX * x;
                    let lat = bounds.min.y + stepY * y
                    if (lat > halfPI) {
                        lon += Math.PI;
                        lat = halfPI - (lat - halfPI)
                    } else if (lat < -halfPI) {
                        lon += Math.PI;
                        lat = -halfPI - (lat + halfPI)
                    }
                    tempVector.set(
                        lon,
                        lat,
                        elevation[(y + 1) * (resolution + 2) + x + 1]
                    )
                    llhToCartesian(tempVector, true);
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

            tempVector.set(bounds.min.x, bounds.min.y, 0);

            llhToCartesian(tempVector, true);
            const shift = new THREE.Vector3(0, 0, tempVector.z);

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
                        tempVector.set(
                            verticesIncludingBorder[northPointIndex] - verticesIncludingBorder[southPointIndex],
                            verticesIncludingBorder[northPointIndex + 1] - verticesIncludingBorder[southPointIndex + 1],
                            verticesIncludingBorder[northPointIndex + 2] - verticesIncludingBorder[southPointIndex + 2]
                        )
                        tempVector2.set(
                            verticesIncludingBorder[easthPointIndex] - verticesIncludingBorder[westPointIndex],
                            verticesIncludingBorder[easthPointIndex + 1] - verticesIncludingBorder[westPointIndex + 1],
                            verticesIncludingBorder[easthPointIndex + 2] - verticesIncludingBorder[westPointIndex + 2]
                        )
                        tempVector.crossVectors(tempVector2, tempVector).normalize();
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

                        /* tempVector.set(
                            verticesIncludingBorder[northEast] - verticesIncludingBorder[southWest],
                            verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southWest + 1],
                            verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southWest + 2]
                        )
                        tempVector2.set(
                            verticesIncludingBorder[northWest] - verticesIncludingBorder[southEast],
                            verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southEast + 1],
                            verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southEast + 2]
                        ) */
                        if (y > 0) {

                            tempVector.set(
                                verticesIncludingBorder[northEast] - verticesIncludingBorder[southWest],
                                verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southWest + 1],
                                verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southWest + 2]
                            )
                            tempVector2.set(
                                verticesIncludingBorder[northWest] - verticesIncludingBorder[southEast],
                                verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southEast + 1],
                                verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southEast + 2]
                            )
                        } else {
                            tempVector.set(
                                verticesIncludingBorder[northEast] - verticesIncludingBorder[southEast],
                                verticesIncludingBorder[northEast + 1] - verticesIncludingBorder[southEast + 1],
                                verticesIncludingBorder[northEast + 2] - verticesIncludingBorder[southEast + 2]
                            )
                            tempVector2.set(
                                verticesIncludingBorder[northWest] - verticesIncludingBorder[southWest],
                                verticesIncludingBorder[northWest + 1] - verticesIncludingBorder[southWest + 1],
                                verticesIncludingBorder[northWest + 2] - verticesIncludingBorder[southWest + 2]
                            )
                        }
                        tempVector.crossVectors(tempVector, tempVector2).normalize();
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
            const first = (skirts.length/3) - resolution*2;
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(first + i * 2, first + (i + 1) * 2, first + i * 2 + 1);
                skirtIndices.push(first + (i + 1) * 2, first + (i + 1) * 2 + 1, first + i * 2 + 1);
            }




            geometry.setIndex(indices);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

            skirtGeometry.setIndex(skirtIndices);
            skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirts, 3));
            skirtGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
            skirtGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUVs, 2));
            //geometry.computeVertexNormals();
            geometry.computeBoundingSphere();
            geometry.computeBoundingBox();
            skirtGeometry.computeBoundingSphere();
            return shift;

        },
        generateBaseTile: (geometry, skirtGeometry, resolution, bounds, elevation, llhToCartesian) => {
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

            const tempVector = new THREE.Vector3();
            const tempVector2 = new THREE.Vector3();
            const verticesIncludingBorder = [];
            for (let y = -1; y < resolution + 1; y++) {
                for (let x = -1; x < resolution + 1; x++) {
                    tempVector.set(
                        bounds.min.x + stepX * x,
                        bounds.min.y + stepY * y,
                        elevation[(y + 1) * (resolution + 2) + x + 1]
                    )
                    llhToCartesian(tempVector, true);
                    verticesIncludingBorder.push(tempVector.x, tempVector.y, tempVector.z);
                }
            }


            tempVector.set(bounds.max.x, bounds.max.y, 0);

            llhToCartesian(tempVector, true);
            const shift = new THREE.Vector3(tempVector.x, tempVector.y, tempVector.z);

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

                    tempVector.set(xxN - xxS, yyN - yyS, zzN - zzS).normalize();
                    tempVector2.set(xxE - xxW, yyE - yyW, zzE - zzW).normalize();

                    tempVector.crossVectors(tempVector2, tempVector);
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
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4), (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (resolution - 1) * 2 + ((resolution - 2) * 4)+resolution*2);
            skirtIndices.push((resolution - 1) * 2 + ((resolution - 2) * 4)+resolution*2, (resolution - 1) * 2 + ((resolution - 2) * 4) + 1, (resolution - 1) * 2 + ((resolution - 2) * 4)+resolution*2+1);

            //fourth skirt
            const first = resolution * 2 + (resolution - 2) * 4;
            for (let i = 0; i < resolution - 1; i++) {
                skirtIndices.push(first + i * 2, first + (i + 1) * 2, first + i * 2 + 1);
                skirtIndices.push(first + (i + 1) * 2, first + (i + 1) * 2 + 1, first + i * 2 + 1);
            }

            geometry.setIndex(indices);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

            skirtGeometry.setIndex(skirtIndices);
            skirtGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skirts, 3));
            skirtGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(skirtNormals, 3));
            skirtGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUVs, 2));
            //geometry.normalizeNormals();
            //geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
            skirtGeometry.computeBoundingSphere();
            return shift;
        }
    }
}
export {
    TerrainMeshGenerator
}